import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DEPLOYMENT_DIR = path.resolve(__dirname, "..", "..");

const VAR_PATTERN = /\$\{([A-Z0-9_]+)\}/g;

export class TemplateRenderer {
    constructor(logger) {
        this.logger = logger;
    }

    renderString(source, sourcePath) {
        const unresolved = new Set();
        const output = source.replace(VAR_PATTERN, (_, key) => {
            const value = process.env[key];
            if (value === undefined || value === "") {
                unresolved.add(key);
                return `\${${key}}`;
            }
            return value;
        });
        if (unresolved.size > 0) {
            throw new Error(
                `Template ${sourcePath} has unresolved placeholders: ${[...unresolved].join(", ")}.\n` +
                    `Add them to deployment/config/.env.deploy.`,
            );
        }
        return output;
    }

    renderFile(templatePath) {
        if (!templatePath.endsWith(".template")) {
            throw new Error(`Refusing to render non-template file: ${templatePath}`);
        }
        const outputPath = templatePath.slice(0, -".template".length);
        const source = fs.readFileSync(templatePath, "utf8");
        const rendered = this.renderString(source, templatePath);
        fs.writeFileSync(outputPath, rendered, "utf8");
        if (this.logger) {
            const rel = path.relative(DEPLOYMENT_DIR, outputPath);
            this.logger.log(`  ✏️  rendered ${rel}`);
        }
        return outputPath;
    }

    renderNginxTemplates() {
        const sitesAvailableDir = path.join(DEPLOYMENT_DIR, "nginx", "sites-available");
        if (!fs.existsSync(sitesAvailableDir)) return [];
        const rendered = [];
        for (const entry of fs.readdirSync(sitesAvailableDir)) {
            if (!entry.endsWith(".template")) continue;
            const templatePath = path.join(sitesAvailableDir, entry);
            rendered.push(this.renderFile(templatePath));
        }
        return rendered;
    }

    renderScriptTemplates() {
        const rendered = [];
        const candidates = [path.join(DEPLOYMENT_DIR, "scripts", "check-deployment.sh.template")];
        for (const templatePath of candidates) {
            if (!fs.existsSync(templatePath)) continue;
            rendered.push(this.renderFile(templatePath));
        }
        return rendered;
    }

    renderAll() {
        if (this.logger) this.logger.log("📐 Rendering deployment templates...");
        const nginxOut = this.renderNginxTemplates();
        const scriptsOut = this.renderScriptTemplates();
        const total = nginxOut.length + scriptsOut.length;
        if (this.logger) this.logger.log(`✅ Rendered ${total} template${total === 1 ? "" : "s"}`);
        return { nginx: nginxOut, scripts: scriptsOut };
    }
}
