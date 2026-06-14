/**
 * Shared-helper exemption registry for lvi/no-duplication + lvi/no-cross-file-duplication.
 *
 * Architectural-necessity exemption (per user consensual override):
 *   Shared-helper consumption is DRY working as intended, not a violation.
 *
 *   When an expression's AST subtree references an identifier IMPORTED FROM
 *   one of the registered shared roots below, the surrounding IfStatement /
 *   typeof-check / option-bag is exempt from dup bucketing.
 *
 *   The rules' hash function abstracts Identifier names to "I", so without
 *   this exemption every consumer of `asString` / `MS_PER_MINUTE` /
 *   `recordClanAudit` / factory functions etc. hash-collides with unrelated
 *   subsystems that happen to share AST shape. Mass adoption of a shared
 *   helper would PUNISH consumers — the opposite of what the rule wants.
 *
 * Path conventions:
 *   - Trailing slash → directory; any file under it is a shared root.
 *   - No trailing slash → specific file; extension (.ts/.js) optional.
 *   - Match is suffix-based on normalized forward-slash paths.
 *
 * Adding entries: register the LOCATION where a shared helper lives. The
 * exemption then applies to every file that imports from that location.
 * Do NOT add consumer paths.
 */
const path = require("node:path");

const ROOTS = [
    // dashboard centralization
    "main/dashboard/src/state/",
    "main/dashboard/src/dom/factory/",
    "main/dashboard/src/dom/auth/status-line.ts",
    "main/dashboard/src/dom/forms/form-classes.ts",
    "main/dashboard/src/managers/events.ts",
    "main/dashboard/src/managers/router/",
    "main/dashboard/src/ai/profile-store/",

    // server centralization
    "main/server/src/shared/",
    "main/server/src/auth/passkey/challenge-helpers.ts",
    "main/server/src/auth/passkey/passkey-helpers.ts",
    "main/server/src/auth/passkey/backup-code-helpers.ts",
    "main/server/src/auth/passkey/device-link-helpers.ts",
    "main/server/src/auth/site-routes/oauth-helpers.ts",
    "main/server/src/auth/site-session.ts",
    "main/server/src/auth/site-middleware.ts",
    "main/server/src/data-rights/scopes/",
    "main/server/src/data-rights/access/db-introspect.ts",
    "main/server/src/data-rights/streams/identity-stream.ts",
    "main/server/src/data-rights/streams/writes-stream.ts",
    "main/server/src/database/",
    "main/server/src/notifications/helpers.ts",
    "main/server/src/ai/queries/db-query/types.ts",
    "main/server/src/plugin-api/consent/eligible-ranks.ts",
    "main/server/src/plugin-api/logger/",
    "main/server/src/plugin-api/session/session-registry/",
];

function resolveImport(currentFile, importSource) {
    if (typeof importSource !== "string" || !importSource.startsWith(".")) return null;
    const lastSlash = currentFile.lastIndexOf("/");
    if (lastSlash === -1) return null;
    const dir = currentFile.substring(0, lastSlash);
    let resolved = path.posix.normalize(path.posix.join(dir, importSource));
    if (resolved.endsWith(".js") || resolved.endsWith(".ts")) resolved = resolved.slice(0, -3);
    return resolved;
}

function importFromSharedRoot(currentFile, importSource) {
    const resolved = resolveImport(currentFile, importSource);
    if (resolved === null) return false;
    for (const root of ROOTS) {
        if (root.endsWith("/")) {
            if (resolved.includes(root)) return true;
        } else {
            const noExt = root.replace(/\.(ts|js)$/, "");
            if (resolved.endsWith(noExt)) return true;
        }
    }
    return false;
}

function collectCentralizedNames(programNode, currentFile) {
    const names = new Set();
    if (!programNode || !programNode.body) return names;
    for (const stmt of programNode.body) {
        if (stmt.type !== "ImportDeclaration") continue;
        if (!stmt.source || typeof stmt.source.value !== "string") continue;
        if (!importFromSharedRoot(currentFile, stmt.source.value)) continue;
        for (const spec of stmt.specifiers || []) {
            if (spec.local && spec.local.name) names.add(spec.local.name);
        }
    }
    return names;
}

function containsCentralizedRef(node, names) {
    if (!names || names.size === 0) return false;
    if (!node || typeof node !== "object") return false;
    if (Array.isArray(node)) {
        for (const child of node) {
            if (containsCentralizedRef(child, names)) return true;
        }
        return false;
    }
    if (node.type === "Identifier" && names.has(node.name)) return true;
    for (const key of Object.keys(node)) {
        if (key === "parent" || key === "loc" || key === "range" || key === "start" || key === "end") continue;
        const child = node[key];
        if (child && typeof child === "object" && containsCentralizedRef(child, names)) return true;
    }
    return false;
}

module.exports = {
    ROOTS,
    collectCentralizedNames,
    containsCentralizedRef,
};
