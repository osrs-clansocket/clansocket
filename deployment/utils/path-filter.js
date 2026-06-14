// Path-prefix allow/disallow filter with most-specific-match precedence.
//
// Model:
//   - One grammar: every entry is a path prefix (no globs, no extensions).
//   - prefixMatches: filePath equals prefix OR starts with prefix + "/".
//     Guards against "main/server" matching "main/server-other".
//   - isIncluded: longest matching prefix wins. Ties go to allow.
//     Both miss -> excluded by default (you only ship what you list).
//
// Example:
//   allow:    ["main/server", "main/server/data/map/world_map.db"]
//   disallow: ["main/server/data"]
//   "main/server/index.js"            -> allow(11)  > disallow(-1)  -> INCLUDE
//   "main/server/data/snapshots.json" -> allow(11)  < disallow(16)  -> EXCLUDE
//   "main/server/data/map/world_map.db" -> allow(35) > disallow(16) -> INCLUDE

export function prefixMatches(filePath, prefix) {
    if (filePath === prefix) return true;
    const withSlash = prefix.endsWith("/") ? prefix : `${prefix}/`;
    return filePath.startsWith(withSlash);
}

function longestMatchingPrefix(filePath, prefixes) {
    let bestLen = -1;
    for (const p of prefixes) {
        if (!prefixMatches(filePath, p)) continue;
        if (p.length > bestLen) bestLen = p.length;
    }
    return bestLen;
}

export function isIncluded(filePath, { allow, disallow }) {
    const allowLen = longestMatchingPrefix(filePath, allow);
    const disallowLen = longestMatchingPrefix(filePath, disallow);
    if (allowLen > disallowLen) return true;
    if (disallowLen > allowLen) return false;
    return allowLen >= 0;
}

// Tree-walk pruning helper. A directory is worth descending into iff:
//   1. some allow targets this dir or something inside it (otherwise nothing
//      under it can ever match an allow -> skip), AND
//   2. no disallow covers this dir UNLESS a more-specific allow points at
//      this dir or something deeper (then we must descend to reach the
//      carve-out leaves).
// Mirrors isIncluded's most-specific-wins precedence at the directory level
// so the walker doesn't pointlessly recurse into entirely-disallowed subtrees
// (e.g. main/server/node_modules with thousands of files).
export function canDescend(dirPath, { allow, disallow }) {
    const withSlash = dirPath.endsWith("/") ? dirPath : `${dirPath}/`;

    let allowReaches = false;
    for (const a of allow) {
        if (prefixMatches(dirPath, a) || a.startsWith(withSlash)) {
            allowReaches = true;
            break;
        }
    }
    if (!allowReaches) return false;

    let bestDisallowLen = -1;
    for (const d of disallow) {
        if (prefixMatches(dirPath, d) && d.length > bestDisallowLen) bestDisallowLen = d.length;
    }
    if (bestDisallowLen < 0) return true;

    for (const a of allow) {
        if (a.length <= bestDisallowLen) continue;
        if (prefixMatches(dirPath, a) || a.startsWith(withSlash)) return true;
    }
    return false;
}
