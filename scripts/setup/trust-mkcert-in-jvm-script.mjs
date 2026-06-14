#!/usr/bin/env node
// Imports the mkcert local root CA into every JVM the clansocket-plugin
// might boot under, so OkHttp can validate the dev server's TLS cert.
// Idempotent: replaces any prior import with the same alias.
//
// Sources scanned (all unique resolved paths get the import):
//   --java-home <path>          (explicit, sole target if given)
//   clansocket-plugin/gradle.properties      org.gradle.java.home
//   clansocket-plugin/.idea/gradle.xml       gradleJvm (resolved via jdk.table.xml)
//   clansocket-plugin/.idea/misc.xml         project-jdk-name (resolved)
//   JAVA_HOME env var
//
// IntelliJ resolution uses the JDK table at:
//   Windows: %APPDATA%\JetBrains\<IDE>\options\jdk.table.xml
//   macOS:   ~/Library/Application Support/JetBrains/<IDE>/options/jdk.table.xml
//   linux:   ~/.config/JetBrains/<IDE>/options/jdk.table.xml
//
// Re-run after a JDK upgrade or after IntelliJ adds/changes a project SDK.

import { execSync, spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import url from "node:url";

const HERE = path.dirname(url.fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(HERE, "..", "..");
const WORKSPACE_ROOT = path.resolve(REPO_ROOT, "..");
const PLUGIN_DIR = path.join(WORKSPACE_ROOT, "clansocket-plugin");
const PLUGIN_GRADLE_PROPS = path.join(PLUGIN_DIR, "gradle.properties");
const IDEA_GRADLE_XML = path.join(PLUGIN_DIR, ".idea", "gradle.xml");
const IDEA_MISC_XML = path.join(PLUGIN_DIR, ".idea", "misc.xml");

const ALIAS = "clansocket-mkcert-local";
const STOREPASS = "changeit";

function info(msg) {
    process.stdout.write(`info  ${msg}\n`);
}
function ok(msg) {
    process.stdout.write(`ok    ${msg}\n`);
}
function warn(msg) {
    process.stdout.write(`warn  ${msg}\n`);
}
function fail(msg) {
    process.stderr.write(`fail  ${msg}\n`);
}

function cliArg(name) {
    const i = process.argv.indexOf(name);
    return i >= 0 && i + 1 < process.argv.length ? process.argv[i + 1] : null;
}

function mkcertAvailable() {
    return spawnSync("mkcert", ["-version"], { stdio: "ignore" }).status === 0;
}

function caRootFile() {
    const root = execSync("mkcert -CAROOT", { encoding: "utf8" }).trim();
    const file = path.join(root, "rootCA.pem");
    if (!fs.existsSync(file)) {
        throw new Error(`rootCA.pem not found at ${file}. run: npm run setup:certs`);
    }
    return file;
}

function expandIntellijMacros(p) {
    if (!p) return p;
    return p
        .replace(/\$USER_HOME\$/g, os.homedir())
        .replace(/\$APPLICATION_HOME_DIR\$/g, "")
        .replace(/\\/g, "/");
}

function readFileSafe(p) {
    try {
        return fs.existsSync(p) ? fs.readFileSync(p, "utf8") : null;
    } catch {
        return null;
    }
}

function readGradleJavaHome() {
    const text = readFileSafe(PLUGIN_GRADLE_PROPS);
    if (!text) return null;
    for (const line of text.split(/\r?\n/)) {
        const trimmed = line.trim();
        if (trimmed.startsWith("#") || trimmed.startsWith("!")) continue;
        const m = trimmed.match(/^org\.gradle\.java\.home\s*=\s*(.+)$/);
        if (m) return m[1].trim().replace(/\\\\/g, "/").replace(/\\/g, "/");
    }
    return null;
}

function readIdeaGradleJvm() {
    const text = readFileSafe(IDEA_GRADLE_XML);
    if (!text) return null;
    const m = text.match(/<option name="gradleJvm"\s+value="([^"]+)"\s*\/>/);
    return m ? m[1] : null;
}

function readIdeaProjectJdkName() {
    const text = readFileSafe(IDEA_MISC_XML);
    if (!text) return null;
    const m = text.match(/project-jdk-name="([^"]+)"/);
    return m ? m[1] : null;
}

function intellijConfigRoots() {
    const platform = os.platform();
    const home = os.homedir();
    if (platform === "win32") {
        return [path.join(process.env.APPDATA || path.join(home, "AppData", "Roaming"), "JetBrains")];
    }
    if (platform === "darwin") {
        return [path.join(home, "Library", "Application Support", "JetBrains")];
    }
    return [path.join(home, ".config", "JetBrains")];
}

function findJdkTableFiles() {
    const tables = [];
    for (const root of intellijConfigRoots()) {
        if (!fs.existsSync(root)) continue;
        for (const entry of fs.readdirSync(root)) {
            const candidate = path.join(root, entry, "options", "jdk.table.xml");
            if (fs.existsSync(candidate)) tables.push(candidate);
        }
    }
    return tables;
}

function buildJdkNameMap() {
    const map = new Map();
    for (const file of findJdkTableFiles()) {
        const text = readFileSafe(file);
        if (!text) continue;
        const re = /<jdk[^>]*>([\s\S]*?)<\/jdk>/g;
        let m;
        while ((m = re.exec(text)) !== null) {
            const body = m[1];
            const nameMatch = body.match(/<name value="([^"]+)"\s*\/>/);
            const homeMatch = body.match(/<homePath value="([^"]+)"\s*\/>/);
            if (nameMatch && homeMatch) {
                map.set(nameMatch[1], expandIntellijMacros(homeMatch[1]));
            }
        }
    }
    return map;
}

function validJavaHome(p) {
    return !!p && fs.existsSync(path.join(p, "lib", "security", "cacerts"));
}

function collectTargets() {
    const explicit = cliArg("--java-home");
    if (explicit) {
        return [{ source: "--java-home", path: expandIntellijMacros(explicit) }];
    }
    const jdkMap = buildJdkNameMap();
    const candidates = [];

    const gradleProps = readGradleJavaHome();
    if (gradleProps) {
        candidates.push({ source: "gradle.properties (org.gradle.java.home)", path: gradleProps });
    }

    const ideaGradleJvm = readIdeaGradleJvm();
    if (ideaGradleJvm) {
        if (ideaGradleJvm.startsWith("#")) {
            if (ideaGradleJvm === "#JAVA_HOME" && process.env.JAVA_HOME) {
                candidates.push({ source: ".idea/gradle.xml gradleJvm=#JAVA_HOME", path: process.env.JAVA_HOME });
            } else {
                warn(`.idea/gradle.xml gradleJvm=${ideaGradleJvm} (special, not resolved)`);
            }
        } else if (jdkMap.has(ideaGradleJvm)) {
            candidates.push({
                source: `.idea/gradle.xml gradleJvm=${ideaGradleJvm}`,
                path: jdkMap.get(ideaGradleJvm),
            });
        } else {
            warn(`.idea/gradle.xml gradleJvm=${ideaGradleJvm} (no match in IntelliJ jdk.table.xml)`);
        }
    }

    const projectJdk = readIdeaProjectJdkName();
    if (projectJdk) {
        if (jdkMap.has(projectJdk)) {
            candidates.push({
                source: `.idea/misc.xml project-jdk-name=${projectJdk}`,
                path: jdkMap.get(projectJdk),
            });
        } else {
            warn(`.idea/misc.xml project-jdk-name=${projectJdk} (no match in IntelliJ jdk.table.xml)`);
        }
    }

    if (process.env.JAVA_HOME) {
        candidates.push({ source: "JAVA_HOME env", path: process.env.JAVA_HOME });
    }
    return candidates;
}

function dedupeAndValidate(candidates) {
    const seen = new Set();
    const targets = [];
    for (const c of candidates) {
        const normalized = path.resolve(c.path).replace(/\\/g, "/");
        if (seen.has(normalized)) {
            info(`skip ${c.source}: ${c.path} (duplicate)`);
            continue;
        }
        if (!validJavaHome(c.path)) {
            warn(`skip ${c.source}: ${c.path} (no lib/security/cacerts)`);
            continue;
        }
        seen.add(normalized);
        targets.push({ source: c.source, path: c.path });
    }
    return targets;
}

function keytoolPath(javaHome) {
    const exe = os.platform() === "win32" ? "keytool.exe" : "keytool";
    const p = path.join(javaHome, "bin", exe);
    if (!fs.existsSync(p)) throw new Error(`keytool not found at ${p}`);
    return p;
}

function aliasExists(kt, store) {
    return (
        spawnSync(kt, ["-list", "-alias", ALIAS, "-keystore", store, "-storepass", STOREPASS], {
            stdio: "ignore",
        }).status === 0
    );
}

function deleteAlias(kt, store) {
    spawnSync(kt, ["-delete", "-alias", ALIAS, "-keystore", store, "-storepass", STOREPASS], {
        stdio: "ignore",
    });
}

function importCa(kt, store, caFile) {
    const res = spawnSync(
        kt,
        [
            "-importcert",
            "-trustcacerts",
            "-alias",
            ALIAS,
            "-file",
            caFile,
            "-keystore",
            store,
            "-storepass",
            STOREPASS,
            "-noprompt",
        ],
        { encoding: "utf8" }
    );
    const out = `${res.stdout || ""}${res.stderr || ""}`;
    if (res.status !== 0) {
        const denied = /Access is denied|Permission denied/i.test(out);
        throw new Error(denied ? "Access denied (try elevated shell)" : (out.trim() || "keytool import failed"));
    }
}

function importInto(target, ca) {
    const store = path.join(target.path, "lib", "security", "cacerts");
    const kt = keytoolPath(target.path);
    if (aliasExists(kt, store)) {
        info(`  alias ${ALIAS} already present, replacing`);
        deleteAlias(kt, store);
    }
    importCa(kt, store, ca);
    ok(`  imported: ${store}`);
}

function main() {
    if (!mkcertAvailable()) {
        fail("mkcert not found on PATH. run: npm run setup:certs");
        process.exit(1);
    }

    const ca = caRootFile();
    info(`mkcert root: ${ca}`);

    const targets = dedupeAndValidate(collectTargets());
    if (targets.length === 0) {
        fail("no JVMs found to import into. pass --java-home <path> explicitly.");
        process.exit(1);
    }

    info(`importing into ${targets.length} JVM(s):`);
    const succeeded = [];
    const failed = [];
    for (const t of targets) {
        info(`- ${t.source}`);
        info(`  ${t.path}`);
        try {
            importInto(t, ca);
            succeeded.push(t);
        } catch (e) {
            fail(`  ${e.message}`);
            failed.push({ ...t, error: e.message });
        }
    }

    process.stdout.write(`\nalias: ${ALIAS}\n`);
    if (succeeded.length > 0) {
        ok(`succeeded (${succeeded.length}):`);
        for (const t of succeeded) process.stdout.write(`  ${t.path}\n`);
    }
    if (failed.length > 0) {
        process.stdout.write(`\n`);
        fail(`failed (${failed.length}):`);
        for (const t of failed) process.stderr.write(`  ${t.path}  (${t.error})\n`);
        if (failed.some((t) => /Access denied/i.test(t.error))) {
            process.stderr.write(
                `\nProgram Files paths need elevation. either:\n` +
                    `  - re-run this script from an Administrator PowerShell, or\n` +
                    `  - ignore (other JVMs already imported are enough if IntelliJ uses one of them)\n`
            );
        }
        if (succeeded.length === 0) process.exit(1);
    }
    process.stdout.write(
        "\nre-run this script after a JDK upgrade or when IntelliJ adds/changes a project SDK.\n"
    );
}

try {
    main();
} catch (e) {
    fail(e.message);
    process.exit(1);
}
