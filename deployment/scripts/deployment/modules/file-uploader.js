import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { DEPLOYMENT_CONSTANTS } from "../../../constants/index.js";
import { EcosystemGenerator } from "../../../utils/env/ecosystem-generator.js";
import { EnvMerger } from "../../../utils/env/env-merger.js";
import { loadFilter } from "../../../utils/filter-loader.js";
import { canDescend, isIncluded } from "../../../utils/path-filter.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DEFAULT_TARGET = "deploy-live";
const REMOVAL_TARGET = "removal";

export class FileUploader {
    constructor(sshClient, logger, { target = DEFAULT_TARGET, skipClean = false, skipEcosystem = false } = {}) {
        this.ssh = sshClient;
        this.logger = logger;
        this.projectRoot = path.join(__dirname, "..", "..", "..", "..");
        this.skipClean = skipClean;
        this.skipEcosystem = skipEcosystem;
        this.target = target;
        const { allow, disallow } = loadFilter(this.target);
        this.allow = allow;
        this.disallow = disallow;
        this.concurrency = DEPLOYMENT_CONSTANTS.UPLOAD_CONCURRENCY;
    }

    shouldInclude(relativePath) {
        return isIncluded(relativePath, { allow: this.allow, disallow: this.disallow });
    }

    canDescend(relativePath) {
        return canDescend(relativePath, { allow: this.allow, disallow: this.disallow });
    }

    getAllFiles(dir, baseDir = dir) {
        const fileList = [];
        for (const item of fs.readdirSync(dir)) {
            const fullPath = path.join(dir, item);
            const relativePath = path.relative(baseDir, fullPath).replace(/\\/g, "/");
            const stat = fs.lstatSync(fullPath);

            if (stat.isDirectory()) {
                if (!this.canDescend(relativePath)) continue;
                fileList.push(...this.getAllFiles(fullPath, baseDir));
            } else if (this.shouldInclude(relativePath)) {
                fileList.push(fullPath);
            }
        }
        return fileList;
    }

    async cleanRemoteDirectory() {
        const { disallow: preserve } = loadFilter(REMOVAL_TARGET);
        this.logger.log(`🗑️ Cleaning remote directory (preserving ${preserve.length} path(s))...`);
        const findClauses = preserve.map((p) => buildFindPreserveClause(p)).join(" ");
        const cmd = `cd ${DEPLOYMENT_CONSTANTS.REMOTE_PATH} && find . -mindepth 1 ${findClauses} -delete 2>/dev/null || true`;
        await this.ssh.execCommand(cmd);
        this.logger.logWithDuration("✅ Remote cleaned");
    }

    async generateEcosystemConfig() {
        this.logger.log("⚙️ Generating PM2 ecosystem configuration...");

        const envMerger = new EnvMerger(this.projectRoot);
        const mergedEnv = envMerger.getMergedEnv();

        const ecosystemGen = new EcosystemGenerator(DEPLOYMENT_CONSTANTS.REMOTE_PATH);
        const ecosystemContent = ecosystemGen.generate(mergedEnv);

        const ecosystemPath = path.join(this.projectRoot, "ecosystem.config.cjs");
        fs.writeFileSync(ecosystemPath, ecosystemContent, "utf8");

        this.logger.logWithDuration("✅ Ecosystem config generated");
        return ecosystemPath;
    }

    async upload() {
        this.logger.log(`📤 Deploying [${this.target}] to remote...`);

        if (!this.skipEcosystem) {
            await this.generateEcosystemConfig();
        }

        const allFiles = this.getAllFiles(this.projectRoot);
        const totalFileCount = allFiles.length;

        this.logger.log(
            `🔬 Found ${totalFileCount} file(s) to deploy (${this.allow.length} allow / ${this.disallow.length} disallow)${this.skipClean ? "" : " — remote will be cleaned"}`,
        );

        if (!this.skipClean) {
            await this.cleanRemoteDirectory();
        }

        let uploadedCount = 0;
        let failedCount = 0;
        let totalBytes = 0;

        await this.ssh.putDirectory(this.projectRoot, DEPLOYMENT_CONSTANTS.REMOTE_PATH, {
            recursive: true,
            concurrency: this.concurrency,
            validate: (localPath) => {
                const relativePath = path.relative(this.projectRoot, localPath).replace(/\\/g, "/");
                const stat = fs.lstatSync(localPath);
                if (stat.isDirectory()) return this.canDescend(relativePath);
                return this.shouldInclude(relativePath);
            },
            tick: (localPath, _remotePath, error) => {
                if (error) {
                    failedCount++;
                    this.logger.log(`❌ Failed: ${path.relative(this.projectRoot, localPath)}`);
                } else {
                    uploadedCount++;
                    totalBytes += fs.lstatSync(localPath).size;
                }
            },
        });

        this.logger.logWithDuration(
            `✅ Upload complete (${uploadedCount}/${totalFileCount} succeeded, ${failedCount} failed)`,
        );

        return { totalFileCount, uploadedCount, failedCount, totalBytes };
    }
}

// Build a find -path clause that preserves `prefix` and everything under it
// (strict prefix match: "./<prefix>" exact OR "./<prefix>/*"). Files literally
// named `.env` anywhere are matched by -name, not -path, since the original
// behavior preserved nested .env files too.
function buildFindPreserveClause(prefix) {
    if (prefix === ".env") return `! -name '.env'`;
    const p = prefix.replace(/'/g, "'\\''");
    return `! -path './${p}' ! -path './${p}/*'`;
}
