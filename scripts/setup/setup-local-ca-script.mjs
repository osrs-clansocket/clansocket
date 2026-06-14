#!/usr/bin/env node
// Local CA setup for HTTPS dev. Uses mkcert to install a local root CA into
// every trust store on this machine, then issues a server cert covering
// localhost / 127.0.0.1 / ::1 signed by it. Browsers trust the cert with
// no warnings. Server uses the cert from main/server/certs/{cert,key}.pem
// (same paths vite.config.ts + main/server/src/certs.ts read from).

import { execSync, spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import url from "node:url";

const HERE = path.dirname(url.fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(HERE, "..", "..");
const CERT_DIR = path.resolve(REPO_ROOT, "main", "server", "certs");
const KEY_PATH = path.join(CERT_DIR, "key.pem");
const CERT_PATH = path.join(CERT_DIR, "cert.pem");
const HOSTNAMES = ["localhost", "127.0.0.1", "::1"];

function ok(msg) {
    process.stdout.write(`✅ ${msg}\n`);
}
function info(msg) {
    process.stdout.write(`ℹ️  ${msg}\n`);
}
function fail(msg) {
    process.stderr.write(`❌ ${msg}\n`);
}

function mkcertAvailable() {
    const result = spawnSync("mkcert", ["-version"], { stdio: "ignore" });
    return result.status === 0;
}

function printInstallInstructions() {
    const platform = os.platform();
    fail("mkcert is not installed or not on PATH.");
    process.stderr.write("\nInstall mkcert for your platform:\n\n");
    if (platform === "win32") {
        process.stderr.write("  Windows (choco):    choco install mkcert\n");
        process.stderr.write("  Windows (scoop):    scoop bucket add extras && scoop install mkcert\n");
        process.stderr.write("  Windows (manual):   https://github.com/FiloSottile/mkcert/releases\n");
    } else if (platform === "darwin") {
        process.stderr.write("  macOS (brew):       brew install mkcert nss\n");
        process.stderr.write("    nss is needed only if you use Firefox.\n");
    } else {
        process.stderr.write("  Debian/Ubuntu:      sudo apt install libnss3-tools && \\\n");
        process.stderr.write("                      curl -JLO 'https://dl.filippo.io/mkcert/latest?for=linux/amd64' && \\\n");
        process.stderr.write("                      chmod +x mkcert-* && sudo mv mkcert-* /usr/local/bin/mkcert\n");
        process.stderr.write("  Arch:               sudo pacman -S mkcert nss\n");
        process.stderr.write("  Other:              https://github.com/FiloSottile/mkcert#installation\n");
    }
    process.stderr.write("\nThen re-run: npm run setup:certs\n");
}

function ensureCertDir() {
    if (!fs.existsSync(CERT_DIR)) {
        fs.mkdirSync(CERT_DIR, { recursive: true });
        info(`created ${path.relative(REPO_ROOT, CERT_DIR)}/`);
    }
}

function installCa() {
    info("installing local CA into system trust store (may prompt for password/UAC)...");
    execSync("mkcert -install", { stdio: "inherit" });
    ok("local CA installed");
}

function issueServerCert() {
    info(`issuing server cert for: ${HOSTNAMES.join(", ")}`);
    const args = ["-key-file", KEY_PATH, "-cert-file", CERT_PATH, ...HOSTNAMES];
    const result = spawnSync("mkcert", args, { stdio: "inherit" });
    if (result.status !== 0) {
        throw new Error("mkcert failed to issue server cert");
    }
    ok(`cert: ${path.relative(REPO_ROOT, CERT_PATH)}`);
    ok(`key:  ${path.relative(REPO_ROOT, KEY_PATH)}`);
}

function showCaroot() {
    try {
        const root = execSync("mkcert -CAROOT", { encoding: "utf8" }).trim();
        info(`CA root location: ${root}`);
    } catch {
        // best-effort
    }
}

function main() {
    if (!mkcertAvailable()) {
        printInstallInstructions();
        process.exit(1);
    }
    ensureCertDir();
    installCa();
    issueServerCert();
    showCaroot();
    process.stdout.write("\n");
    ok("done. restart your dev server (npm run dev). HTTPS for your dev surfaces is now trusted by your browser.");
    process.stdout.write("\nTo undo: mkcert -uninstall (removes CA from trust stores; certs remain on disk).\n");
}

main();
