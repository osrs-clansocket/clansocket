import logger from "@clansocket/logger";
import fs from "fs";
import path from "path";
import { execSync } from "child_process";
import { fileURLToPath } from "url";
import selfsigned from "selfsigned";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CERT_DIR = path.join(__dirname, "..", "certs");
const KEY_PATH = path.join(CERT_DIR, "key.pem");
const CERT_PATH = path.join(CERT_DIR, "cert.pem");

export async function ensureCerts(): Promise<{ key: Buffer; cert: Buffer }> {
    if (!fs.existsSync(CERT_DIR)) fs.mkdirSync(CERT_DIR, { recursive: true });

    if (certsValid()) {
        logger.info("[certs] Valid certificate found");
        return { key: fs.readFileSync(KEY_PATH), cert: fs.readFileSync(CERT_PATH) };
    }

    logger.info("[certs] Generating self-signed certificate...");
    await generate();
    logger.info("[certs] Certificate written to certs/");

    return { key: fs.readFileSync(KEY_PATH), cert: fs.readFileSync(CERT_PATH) };
}

function certsValid(): boolean {
    if (!fs.existsSync(KEY_PATH) || !fs.existsSync(CERT_PATH)) return false;

    try {
        const certPem = fs.readFileSync(CERT_PATH, "utf-8");
        const keyPem = fs.readFileSync(KEY_PATH, "utf-8");

        if (!certPem.includes("BEGIN CERTIFICATE") || !keyPem.includes("PRIVATE KEY")) return false;

        if (opensslAvailable()) {
            const result = execSync(`openssl x509 -enddate -noout -in "${CERT_PATH}"`, { encoding: "utf-8" });
            const match = result.match(/notAfter=(.+)/);
            if (match && new Date(match[1]).getTime() < Date.now()) return false;
        } else {
            const ageDays = (Date.now() - fs.statSync(CERT_PATH).mtimeMs) / (1000 * 60 * 60 * 24);
            if (ageDays > 300) return false;
        }

        return true;
    } catch {
        return false;
    }
}

function opensslAvailable(): boolean {
    try {
        execSync("openssl version", { stdio: "ignore" });
        return true;
    } catch {
        return false;
    }
}

async function generate(): Promise<void> {
    const attrs = [{ name: "commonName", value: "localhost" }];
    const pems = await selfsigned.generate(attrs, {
        keySize: 2048,
        validity: 365,
        algorithm: "sha256",
        extensions: [
            {
                name: "subjectAltName",
                altNames: [
                    { type: 2, value: "localhost" },
                    { type: 7, ip: "127.0.0.1" },
                ],
            },
        ],
    } as Parameters<typeof selfsigned.generate>[1]);

    fs.writeFileSync(KEY_PATH, pems.private);
    fs.writeFileSync(CERT_PATH, pems.cert);
}
