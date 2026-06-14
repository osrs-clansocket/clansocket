const { getModuleForFile } = require("../resolve-paths.cjs");
const { build4DReport, trace } = require("./report-builder.cjs");

const HASH_WIDTHS = new Map([
    [32, "MD5"],
    [40, "SHA-1"],
    [56, "SHA-224"],
    [64, "SHA-256"],
    [96, "SHA-384"],
    [128, "SHA-512"],
]);

function isPureAlnum(s) {
    for (const c of s) {
        const code = c.charCodeAt(0);
        const isLetter = (code >= 65 && code <= 90) || (code >= 97 && code <= 122);
        const isDigit = code >= 48 && code <= 57;
        if (!isLetter && !isDigit) return false;
    }
    return true;
}

function containsLetter(s) {
    for (const c of s) {
        const code = c.charCodeAt(0);
        if ((code >= 65 && code <= 90) || (code >= 97 && code <= 122)) return true;
    }
    return false;
}

function isPureHex(s) {
    for (const c of s) {
        const code = c.charCodeAt(0);
        const isDigit = code >= 48 && code <= 57;
        const isLowerHex = code >= 97 && code <= 102;
        const isUpperHex = code >= 65 && code <= 70;
        if (!isDigit && !isLowerHex && !isUpperHex) return false;
    }
    return true;
}

function isUppercaseLettersSpacesHyphens(s) {
    for (const c of s) {
        const code = c.charCodeAt(0);
        const isUpperLetter = code >= 65 && code <= 90;
        const isSpace = c === " ";
        const isHyphen = c === "-";
        if (!isUpperLetter && !isSpace && !isHyphen) return false;
    }
    return true;
}

function isDnsSafeDomain(s) {
    for (const c of s) {
        const code = c.charCodeAt(0);
        const isLetter = (code >= 65 && code <= 90) || (code >= 97 && code <= 122);
        const isDigit = code >= 48 && code <= 57;
        const isDot = c === ".";
        const isHyphen = c === "-";
        if (!isLetter && !isDigit && !isDot && !isHyphen) return false;
    }
    return true;
}

function shannonEntropy(s) {
    const counts = new Map();
    for (const c of s) counts.set(c, (counts.get(c) || 0) + 1);
    let h = 0;
    const len = s.length;
    for (const count of counts.values()) {
        const p = count / len;
        h -= p * Math.log2(p);
    }
    return h;
}

function analyzePayload(s) {
    let hasLetter = false;
    let hasDigit = false;
    let separators = 0;
    for (const c of s) {
        const code = c.charCodeAt(0);
        if ((code >= 65 && code <= 90) || (code >= 97 && code <= 122)) hasLetter = true;
        else if (code >= 48 && code <= 57) hasDigit = true;
        else if (c === "_" || c === "-" || c === ".") separators++;
    }
    return { hasLetter, hasDigit, separatorRatio: separators / s.length };
}

function isRfcReservedIpv4(octets) {
    if (octets[0] === 0) return true;
    if (octets[0] === 10) return true;
    if (octets[0] === 127) return true;
    if (octets[0] === 169 && octets[1] === 254) return true;
    if (octets[0] === 172 && octets[1] >= 16 && octets[1] <= 31) return true;
    if (octets[0] === 192 && octets[1] === 168) return true;
    if (octets[0] === 192 && octets[1] === 0 && octets[2] === 2) return true;
    if (octets[0] === 198 && octets[1] === 51 && octets[2] === 100) return true;
    if (octets[0] === 203 && octets[1] === 0 && octets[2] === 113) return true;
    if (octets[0] === 100 && octets[1] >= 64 && octets[1] <= 127) return true;
    if (octets[0] >= 224) return true;
    return false;
}

function isRfcReservedIpv6(value) {
    if (value === "::") return true;
    if (value === "::1") return true;
    const lower = value.toLowerCase();
    if (lower.startsWith("2001:db8:") || lower === "2001:db8::") return true;
    const firstSegEnd = lower.indexOf(":");
    if (firstSegEnd <= 0) return false;
    const first = lower.substring(0, firstSegEnd);
    if (first.startsWith("fc") || first.startsWith("fd")) return true;
    if (first.startsWith("fe8") || first.startsWith("fe9") || first.startsWith("fea") || first.startsWith("feb")) return true;
    if (first.startsWith("ff")) return true;
    return false;
}

function detectPem(value) {
    const BEGIN = "-----BEGIN ";
    const END = "-----";
    const beginIdx = value.indexOf(BEGIN);
    if (beginIdx < 0) return null;
    const after = value.substring(beginIdx + BEGIN.length);
    const endIdx = after.indexOf(END);
    if (endIdx <= 0) return null;
    const blockType = after.substring(0, endIdx).trim();
    if (blockType.length === 0) return null;
    if (!isUppercaseLettersSpacesHyphens(blockType)) return null;
    return {
        label: "PEM block opener",
        detail: `Detected -----BEGIN ${blockType}----- marker inside a string literal.`,
        remediation: `Remove the PEM literal. Load keys/certs from filesystem (fs.readFileSync from a gitignored cert dir) or generate at runtime — see clansocket-app/main/server/src/certs.ts for the auto-generation pattern.`,
    };
}

function detectNamedPrefixCredential(value) {
    if (value.length < 24) return null;
    if (value.length > 500) return null;
    let sepIdx = -1;
    const upper = Math.min(20, value.length - 1);
    for (let i = 2; i <= upper; i++) {
        const c = value[i];
        if (c === "_" || c === "-") {
            sepIdx = i;
            break;
        }
    }
    if (sepIdx < 0) return null;
    const prefix = value.substring(0, sepIdx);
    if (!isPureAlnum(prefix)) return null;
    if (!containsLetter(prefix)) return null;
    const payload = value.substring(sepIdx + 1);
    if (payload.length < 18) return null;
    const stats = analyzePayload(payload);
    if (!stats.hasLetter || !stats.hasDigit) return null;
    if (stats.separatorRatio > 0.2) return null;
    const entropy = shannonEntropy(payload);
    if (entropy < 4.0) return null;
    return {
        label: "named-prefix credential shape",
        detail: `Detected token shape prefix="${prefix}" with high-entropy payload (H=${entropy.toFixed(2)}, len=${payload.length}).`,
        remediation: `Credential-shaped tokens never belong in source. Read via process.env.${prefix.toUpperCase()} (or equivalent) and add the key to env files. Rotate the literal value at the upstream provider before deleting.`,
    };
}

function detectHexHashDigest(value) {
    const knownWidth = HASH_WIDTHS.get(value.length);
    if (!knownWidth) return null;
    if (!isPureHex(value)) return null;
    return {
        label: `${knownWidth} hex digest`,
        detail: `Detected a ${value.length}-character hex string matching ${knownWidth} digest width.`,
        remediation: `Hardcoded hash digests in source usually indicate identity bindings, password hashes, or file integrity values that should derive at runtime or load from DB. Move the literal out — compute it via the relevant hash function or load from a row.`,
    };
}

function detectIpv4(value) {
    const parts = value.split(".");
    if (parts.length !== 4) return null;
    const octets = [];
    for (const part of parts) {
        if (part.length === 0 || part.length > 3) return null;
        if (part.length > 1 && part[0] === "0") return null;
        let n = 0;
        for (const c of part) {
            const code = c.charCodeAt(0);
            if (code < 48 || code > 57) return null;
            n = n * 10 + (code - 48);
        }
        if (n > 255) return null;
        octets.push(n);
    }
    if (isRfcReservedIpv4(octets)) return null;
    return {
        label: "IPv4 address",
        detail: `Detected public #.#.#.# pattern (${value}).`,
        remediation: `Public IP addresses in source restrict deployment + leak infrastructure shape. Load from env (process.env.HOST), config file, or DNS resolution.`,
    };
}

function detectIpv6(value) {
    if (!value.includes(":")) return null;
    if (value.length > 45) return null;
    let colonCount = 0;
    for (const c of value) if (c === ":") colonCount++;
    if (colonCount < 2) return null;
    const doubleColon = value.indexOf("::");
    if (doubleColon >= 0 && value.indexOf("::", doubleColon + 2) !== -1) return null;
    const segments = value.split(":");
    if (doubleColon < 0 && segments.length !== 8) return null;
    for (const seg of segments) {
        if (seg.length === 0) continue;
        if (seg.length > 4) {
            if (seg.includes(".")) {
                const v4 = detectIpv4(seg);
                if (!v4) return null;
                continue;
            }
            return null;
        }
        for (const c of seg) {
            const code = c.charCodeAt(0);
            const isDigit = code >= 48 && code <= 57;
            const isLowerHex = code >= 97 && code <= 102;
            const isUpperHex = code >= 65 && code <= 70;
            if (!isDigit && !isLowerHex && !isUpperHex) return null;
        }
    }
    if (isRfcReservedIpv6(value)) return null;
    return {
        label: "IPv6 address",
        detail: `Detected public IPv6 shape (${value}).`,
        remediation: `Same as IPv4 — public IP addresses in source restrict deployment + leak infrastructure. Load from env or config.`,
    };
}

function detectEmail(value) {
    if (value.length < 5 || value.length > 254) return null;
    const at = value.indexOf("@");
    if (at <= 0) return null;
    if (at === value.length - 1) return null;
    if (value.indexOf("@", at + 1) !== -1) return null;
    const local = value.substring(0, at);
    if (local.length === 0) return null;
    const domain = value.substring(at + 1);
    if (!isDnsSafeDomain(domain)) return null;
    const lastDot = domain.lastIndexOf(".");
    if (lastDot <= 0 || lastDot === domain.length - 1) return null;
    const tld = domain.substring(lastDot + 1);
    if (tld.length < 2 || tld.length > 24) return null;
    for (const c of tld) {
        const code = c.charCodeAt(0);
        const isLetter = (code >= 65 && code <= 90) || (code >= 97 && code <= 122);
        if (!isLetter) return null;
    }
    if (value.startsWith(".") || value.endsWith(".")) return null;
    return {
        label: "email address",
        detail: `Detected <local>@<domain>.<tld> shape (${value}).`,
        remediation: `Email literals in source leak PII + spam-target identifiers. Load via process.env / config / DB row. For test fixtures, use @example.com / @example.org / @example.net (RFC2606 reserved domains).`,
    };
}

const DETECTORS = [
    detectPem,
    detectNamedPrefixCredential,
    detectHexHashDigest,
    detectIpv4,
    detectIpv6,
    detectEmail,
];

function runDetectors(value) {
    if (typeof value !== "string" || value.length === 0) return null;
    for (const detector of DETECTORS) {
        const result = detector(value);
        if (result) return result;
    }
    return null;
}

module.exports = {
    meta: {
        type: "problem",
        docs: { description: "Ban credential / PII / network identifier shapes in string literals" },
        schema: [],
        messages: { report: "{{ report }}" },
    },
    create(context) {
        const raw = (context.filename || context.getFilename()).split("\\").join("/");
        const mod = getModuleForFile(raw);

        function reportNode(node, value, detection) {
            const t = trace(node, raw, mod);
            context.report({
                node,
                messageId: "report",
                data: {
                    report: build4DReport({
                        rule: "no-leak-shape",
                        narrative: `String literal matches ${detection.label}. ${detection.detail} Anything matching a credential / network / PII shape in source is either an actual leak, an infrastructure identifier that restricts deployment, or data that bypasses env-based rotation.`,
                        graph: {
                            X: `${t.file}:${t.line} — string literal in ${t.context}`,
                            Y: `consumers depend on the value being correct — hardcoding bypasses env-based rotation + leaks the value to git history on every commit`,
                            Z: `no_implicit (HomoiconicSovereignty) — sensitive values flow from env / config / secret store, never literal source code`,
                            W: `silent leak — the literal ships to every clone of the repo until git history is rewritten or the value is rotated`,
                        },
                        remediation: detection.remediation,
                        trace: t,
                    }),
                },
            });
        }

        return {
            Literal(node) {
                if (typeof node.value !== "string") return;
                const detection = runDetectors(node.value);
                if (!detection) return;
                reportNode(node, node.value, detection);
            },
            TemplateLiteral(node) {
                for (const quasi of node.quasis) {
                    const raw = quasi.value.cooked || quasi.value.raw;
                    const detection = runDetectors(raw);
                    if (!detection) continue;
                    reportNode(quasi, raw, detection);
                }
            },
        };
    },
};
