import path from "node:path";
import { DEPLOYMENT_CONSTANTS } from "../constants/index.js";

function normalizeSeparators(s) {
    return s.split("\\").join("/");
}

export function safeRemotePath(dest) {
    if (typeof dest !== "string" || dest.length === 0) {
        throw new Error(`Dest path must be a non-empty string. Got: ${JSON.stringify(dest)}`);
    }
    if (path.isAbsolute(dest)) {
        throw new Error(`Dest path must be relative to REMOTE_PATH (no leading slash). Got absolute: ${dest}`);
    }
    const root = DEPLOYMENT_CONSTANTS.REMOTE_PATH;
    if (!root) {
        throw new Error("DEPLOY_REMOTE_PATH env var not set");
    }
    const normalizedRoot = normalizeSeparators(root);
    const normalizedDest = normalizeSeparators(dest);
    const resolved = path.posix.normalize(`${normalizedRoot}/${normalizedDest}`);
    const rootWithSlash = normalizedRoot.endsWith("/") ? normalizedRoot : `${normalizedRoot}/`;
    if (resolved !== normalizedRoot && !resolved.startsWith(rootWithSlash)) {
        throw new Error(`Dest escapes REMOTE_PATH (root: ${normalizedRoot}, resolved: ${resolved})`);
    }
    return resolved;
}
