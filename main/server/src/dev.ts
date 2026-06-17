import logger from "@clansocket/logger";
import { spawn } from "child_process";
import https from "https";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
import { ensureCerts } from "./certs.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SERVER_ROOT = path.join(__dirname, "..");
const REPO_ROOT = path.join(SERVER_ROOT, "..", "..");
dotenv.config({ path: path.join(REPO_ROOT, ".env") });
if (!process.env.SERVER_PORT) throw new Error("SERVER_PORT env var required");
const PORT = parseInt(process.env.SERVER_PORT, 10);

function quoteArg(a: string): string {
    for (let i = 0; i < a.length; i++) {
        const c = a.charAt(i);
        if (c === " " || c === "\t") return `"${a}"`;
    }
    return a;
}

function buildServerCommand(serverScript: string): string {
    const parts = ["npx", "tsx", "--watch", serverScript];
    return parts.map(quoteArg).join(" ");
}

async function waitForServer(url: string, maxAttempts = 90): Promise<void> {
    for (let i = 0; i < maxAttempts; i++) {
        try {
            await new Promise<void>((resolve, reject) => {
                const req = https.get(url, { rejectUnauthorized: false }, (res) => {
                    res.resume();
                    resolve();
                });
                req.on("error", reject);
                req.setTimeout(500, () => {
                    req.destroy();
                    reject(new Error("timeout"));
                });
            });
            return;
        } catch {
            await new Promise((r) => setTimeout(r, 300));
        }
    }
    throw new Error(`Server not ready at ${url} after ${maxAttempts} attempts`);
}

async function main(): Promise<void> {
    logger.info("[dev] Ensuring certificates...");
    await ensureCerts();

    logger.info("[dev] Starting server...");
    const serverScript = path.join(__dirname, "index.ts");
    const server = spawn(buildServerCommand(serverScript), {
        stdio: "inherit",
        shell: true,
        cwd: SERVER_ROOT,
        env: { ...process.env, NODE_ENV: "development" },
    });

    server.on("exit", (code) => {
        if (code !== null && code !== 0) {
            logger.error(`[dev] Server exited with code ${code}`);
            process.exit(code);
        }
    });

    logger.info("[dev] Waiting for server...");
    await waitForServer(`https://localhost:${PORT}/`);
    logger.info("[dev] Server ready");

    const cleanup = (): void => {
        server.kill();
    };
    process.on("SIGTERM", cleanup);
    process.on("SIGINT", cleanup);
}

main();
