import { spawn } from "child_process";
import { mkdirSync, writeFileSync, readFileSync, existsSync } from "fs";
import { resolve, dirname, relative } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..", "..");
const OUT_DIR = resolve(ROOT, ".lint-reports");

function ensureDir(p) {
    if (!existsSync(p)) mkdirSync(p, { recursive: true });
}

function runCapture(cmd, args, env = {}) {
    return new Promise((resolveFn) => {
        const child = spawn(cmd, args, {
            cwd: ROOT,
            shell: true,
            env: { ...process.env, ...env },
        });
        let stdout = "";
        let stderr = "";
        child.stdout.on("data", (d) => (stdout += d.toString()));
        child.stderr.on("data", (d) => (stderr += d.toString()));
        child.on("close", (code) => resolveFn({ code, stdout, stderr }));
    });
}

function writeLog(name, result) {
    const log = `# exit ${result.code}\n\n## STDOUT\n${result.stdout}\n\n## STDERR\n${result.stderr}\n`;
    writeFileSync(resolve(OUT_DIR, name), log, "utf-8");
    return result;
}

function parseEslintJson(jsonText) {
    try {
        const data = JSON.parse(jsonText);
        const rollup = {
            totalErrors: 0,
            totalWarnings: 0,
            byFile: {},
            byRule: {},
        };
        for (const fileEntry of data) {
            if (fileEntry.errorCount === 0 && fileEntry.warningCount === 0) continue;
            const rel = relative(ROOT, fileEntry.filePath).split("\\").join("/");
            rollup.byFile[rel] = rollup.byFile[rel] ?? { errors: 0, warnings: 0, rules: {} };
            rollup.byFile[rel].errors += fileEntry.errorCount;
            rollup.byFile[rel].warnings += fileEntry.warningCount;
            rollup.totalErrors += fileEntry.errorCount;
            rollup.totalWarnings += fileEntry.warningCount;
            for (const msg of fileEntry.messages) {
                const rule = msg.ruleId ?? "(no-rule)";
                rollup.byFile[rel].rules[rule] = (rollup.byFile[rel].rules[rule] ?? 0) + 1;
                rollup.byRule[rule] = (rollup.byRule[rule] ?? 0) + 1;
            }
        }
        return rollup;
    } catch (err) {
        return { error: String(err), totalErrors: 0, totalWarnings: 0, byFile: {}, byRule: {} };
    }
}

function parseStylelintJson(jsonText) {
    try {
        const data = JSON.parse(jsonText);
        const rollup = { totalErrors: 0, byFile: {}, byRule: {} };
        for (const file of data) {
            if (file.warnings.length === 0) continue;
            const rel = relative(ROOT, file.source).split("\\").join("/");
            rollup.byFile[rel] = rollup.byFile[rel] ?? { count: 0, rules: {} };
            rollup.byFile[rel].count += file.warnings.length;
            rollup.totalErrors += file.warnings.length;
            for (const w of file.warnings) {
                const rule = w.rule ?? "(no-rule)";
                rollup.byFile[rel].rules[rule] = (rollup.byFile[rel].rules[rule] ?? 0) + 1;
                rollup.byRule[rule] = (rollup.byRule[rule] ?? 0) + 1;
            }
        }
        return rollup;
    } catch (err) {
        return { error: String(err), totalErrors: 0, byFile: {}, byRule: {} };
    }
}

function parseTscOutput(text) {
    const rollup = { totalErrors: 0, byFile: {} };
    const lines = text.split("\n");
    for (const raw of lines) {
        const line = raw.trim();
        if (line.length === 0) continue;
        if (!line.includes(": error TS")) continue;
        const parenIdx = line.indexOf("(");
        if (parenIdx < 0) continue;
        const filePart = line.slice(0, parenIdx);
        const rel = filePart.split("\\").join("/");
        rollup.byFile[rel] = (rollup.byFile[rel] ?? 0) + 1;
        rollup.totalErrors += 1;
    }
    return rollup;
}

function fmtRollupTable(byFile) {
    const entries = Object.entries(byFile).sort((a, b) => {
        const aErr = a[1].errors ?? a[1].count ?? a[1];
        const bErr = b[1].errors ?? b[1].count ?? b[1];
        return bErr - aErr;
    });
    const rows = [];
    for (const [path, info] of entries) {
        if (typeof info === "number") {
            rows.push(`| ${path} | ${info} | — |`);
            continue;
        }
        const count = info.errors ?? info.count ?? 0;
        const rules = Object.keys(info.rules ?? {}).sort().join(", ");
        rows.push(`| ${path} | ${count} | ${rules} |`);
    }
    return rows;
}

function fmtRuleHistogram(byRule) {
    const entries = Object.entries(byRule).sort((a, b) => b[1] - a[1]);
    return entries.map(([rule, count]) => `- \`${rule}\` × ${count}`);
}

async function main() {
    ensureDir(OUT_DIR);

    console.log("[lint-audit] eslint discord ...");
    const eslintDiscordJsonPath = resolve(OUT_DIR, "eslint-discord.json");
    const discordRes = await runCapture("npx", [
        "eslint",
        "--config",
        "shared/config/eslint.discord.config.js",
        "main/discord/src/**/*.js",
        "--format",
        "json",
        "-o",
        eslintDiscordJsonPath,
    ]);
    writeLog("eslint-discord.log", discordRes);
    const discordJson = existsSync(eslintDiscordJsonPath) ? readFileSync(eslintDiscordJsonPath, "utf-8") : "[]";
    const discordRollup = parseEslintJson(discordJson);

    console.log("[lint-audit] eslint dashboard ...");
    const eslintDashJsonPath = resolve(OUT_DIR, "eslint-dashboard.json");
    const dashRes = await runCapture("npx", [
        "eslint",
        "--config",
        "shared/config/eslint.dashboard.config.js",
        "main/dashboard/src/**/*.ts",
        "--format",
        "json",
        "-o",
        eslintDashJsonPath,
    ]);
    writeLog("eslint-dashboard.log", dashRes);
    const dashJson = existsSync(eslintDashJsonPath) ? readFileSync(eslintDashJsonPath, "utf-8") : "[]";
    const dashRollup = parseEslintJson(dashJson);

    console.log("[lint-audit] eslint server ...");
    const eslintSrvJsonPath = resolve(OUT_DIR, "eslint-server.json");
    const srvRes = await runCapture("npx", [
        "eslint",
        "--config",
        "shared/config/eslint.server.config.js",
        "main/server/src/**/*.ts",
        "--format",
        "json",
        "-o",
        eslintSrvJsonPath,
    ]);
    writeLog("eslint-server.log", srvRes);
    const srvJson = existsSync(eslintSrvJsonPath) ? readFileSync(eslintSrvJsonPath, "utf-8") : "[]";
    const srvRollup = parseEslintJson(srvJson);

    console.log("[lint-audit] stylelint ...");
    const stylelintJsonPath = resolve(OUT_DIR, "stylelint.json");
    const cssRes = await runCapture("npx", [
        "stylelint",
        "--config",
        "shared/config/.stylelintrc.json",
        "main/dashboard/src/styles/**/*.css",
        "--formatter",
        "json",
        "-o",
        stylelintJsonPath,
    ]);
    writeLog("stylelint.log", cssRes);
    const cssJson = existsSync(stylelintJsonPath) ? readFileSync(stylelintJsonPath, "utf-8") : "[]";
    const cssRollup = parseStylelintJson(cssJson);

    console.log("[lint-audit] cross-file dup check ...");
    const dupRes = await runCapture("node", ["scripts/audit/audit-cross-file-duplication-script.mjs"]);
    writeLog("dup-check.log", dupRes);

    console.log("[lint-audit] tsc server ...");
    const tscSrvRes = await runCapture("npx", ["tsc", "-p", "main/server/tsconfig.json", "--noEmit"]);
    writeLog("tsc-server.log", tscSrvRes);
    const tscSrvRollup = parseTscOutput(tscSrvRes.stdout + tscSrvRes.stderr);

    console.log("[lint-audit] tsc dashboard ...");
    const tscDashRes = await runCapture("npx", ["tsc", "-p", "main/dashboard/tsconfig.json", "--noEmit"]);
    writeLog("tsc-dashboard.log", tscDashRes);
    const tscDashRollup = parseTscOutput(tscDashRes.stdout + tscDashRes.stderr);

    console.log("[lint-audit] vite build ...");
    const viteRes = await runCapture(
        "npx",
        ["vite", "build", "--config", "main/dashboard/vite.config.ts"],
    );
    writeLog("vite-build.log", viteRes);

    const summary = {
        eslint: {
            discord: { errors: discordRollup.totalErrors, warnings: discordRollup.totalWarnings, files: Object.keys(discordRollup.byFile).length, byRule: discordRollup.byRule },
            dashboard: { errors: dashRollup.totalErrors, warnings: dashRollup.totalWarnings, files: Object.keys(dashRollup.byFile).length, byRule: dashRollup.byRule },
            server: { errors: srvRollup.totalErrors, warnings: srvRollup.totalWarnings, files: Object.keys(srvRollup.byFile).length, byRule: srvRollup.byRule },
        },
        stylelint: { errors: cssRollup.totalErrors, files: Object.keys(cssRollup.byFile).length, byRule: cssRollup.byRule },
        dupCheck: { exitCode: dupRes.code },
        tsc: {
            server: { errors: tscSrvRollup.totalErrors, files: Object.keys(tscSrvRollup.byFile).length },
            dashboard: { errors: tscDashRollup.totalErrors, files: Object.keys(tscDashRollup.byFile).length },
        },
        viteBuild: { exitCode: viteRes.code },
    };

    writeFileSync(resolve(OUT_DIR, "summary.json"), JSON.stringify(summary, null, 2), "utf-8");

    const md = [];
    md.push("# lint-audit summary");
    md.push("");
    md.push("ran via `node scripts/lint/run-lint-script.mjs`. each section is the rollup for one verify-related tool.");
    md.push("full per-tool stdout/stderr in `.lint-reports/<tool>.log`. machine-readable per-eslint-tool data in `.lint-reports/<tool>.json`.");
    md.push("");
    md.push("## totals");
    md.push("");
    md.push(`| tool | errors | warnings | distinct files |`);
    md.push(`| --- | --- | --- | --- |`);
    md.push(`| eslint:discord | ${summary.eslint.discord.errors} | ${summary.eslint.discord.warnings} | ${summary.eslint.discord.files} |`);
    md.push(`| eslint:dashboard | ${summary.eslint.dashboard.errors} | ${summary.eslint.dashboard.warnings} | ${summary.eslint.dashboard.files} |`);
    md.push(`| eslint:server | ${summary.eslint.server.errors} | ${summary.eslint.server.warnings} | ${summary.eslint.server.files} |`);
    md.push(`| stylelint | ${summary.stylelint.errors} | — | ${summary.stylelint.files} |`);
    md.push(`| tsc:server | ${summary.tsc.server.errors} | — | ${summary.tsc.server.files} |`);
    md.push(`| tsc:dashboard | ${summary.tsc.dashboard.errors} | — | ${summary.tsc.dashboard.files} |`);
    md.push(`| dup-check exit | ${summary.dupCheck.exitCode} | — | — |`);
    md.push(`| vite-build exit | ${summary.viteBuild.exitCode} | — | — |`);
    md.push("");

    function appendSection(title, rollup) {
        md.push(`## ${title}`);
        md.push("");
        if (Object.keys(rollup.byRule).length > 0) {
            md.push("### by rule");
            md.push("");
            md.push(...fmtRuleHistogram(rollup.byRule));
            md.push("");
        }
        if (Object.keys(rollup.byFile).length > 0) {
            md.push("### by file");
            md.push("");
            md.push(`| file | count | rules |`);
            md.push(`| --- | --- | --- |`);
            md.push(...fmtRollupTable(rollup.byFile));
            md.push("");
        }
    }

    appendSection("eslint:discord", discordRollup);
    appendSection("eslint:dashboard", dashRollup);
    appendSection("eslint:server", srvRollup);
    appendSection("stylelint", cssRollup);

    md.push("## tsc:server");
    md.push("");
    md.push(`| file | error count |`);
    md.push(`| --- | --- |`);
    md.push(...fmtRollupTable(tscSrvRollup.byFile));
    md.push("");

    md.push("## tsc:dashboard");
    md.push("");
    md.push(`| file | error count |`);
    md.push(`| --- | --- |`);
    md.push(...fmtRollupTable(tscDashRollup.byFile));
    md.push("");

    md.push("## vite-build");
    md.push("");
    md.push(`exit code ${summary.viteBuild.exitCode}. full output in \`.lint-reports/vite-build.log\`.`);
    md.push("");

    md.push("## dup-check");
    md.push("");
    md.push(`exit code ${summary.dupCheck.exitCode}. full output in \`.lint-reports/dup-check.log\`.`);
    md.push("");

    writeFileSync(resolve(OUT_DIR, "summary.md"), md.join("\n"), "utf-8");

    console.log("");
    console.log("[lint-audit] complete. reports in .lint-reports/");
    console.log(`  eslint:discord   ${summary.eslint.discord.errors} errors across ${summary.eslint.discord.files} files`);
    console.log(`  eslint:dashboard ${summary.eslint.dashboard.errors} errors across ${summary.eslint.dashboard.files} files`);
    console.log(`  eslint:server    ${summary.eslint.server.errors} errors across ${summary.eslint.server.files} files`);
    console.log(`  stylelint        ${summary.stylelint.errors} errors across ${summary.stylelint.files} files`);
    console.log(`  tsc:server       ${summary.tsc.server.errors} errors across ${summary.tsc.server.files} files`);
    console.log(`  tsc:dashboard    ${summary.tsc.dashboard.errors} errors across ${summary.tsc.dashboard.files} files`);
    console.log(`  dup-check        exit ${summary.dupCheck.exitCode}`);
    console.log(`  vite-build       exit ${summary.viteBuild.exitCode}`);
}

main().catch((err) => {
    console.error("[lint-audit] failed:", err);
    process.exit(1);
});
