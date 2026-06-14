/**
 * LVI/no-raw-read — data reads in render code must route through a state/ live store.
 *
 * The live-store layer (state/ stores fed by the tier-A projection) is the DATA
 * chokepoint, the read-side analogue of the factory's render chokepoint (no-raw-dom).
 * Render code under src/dom/** must read displayed state from a store (snapshot +
 * deltas) so the surface is realtime by construction. A one-shot `client.listX()` /
 * `client.getX()` inside render code renders a frozen snapshot that no projection delta
 * ever reaches — a dead read.
 *
 * Doctrine: data-sourced ⇒ dynamic ⇒ must be live. Any value read from a client is shared
 * state that can change at the source; a one-shot read in render code renders a frozen
 * snapshot that no projection delta ever reaches. Static = a literal written in code; every
 * read is dynamic by default.
 *
 * What it flags: ANY read-shaped call — get / list / browse / fetch / load / query / find /
 * read / count / lookup / resolve / retrieve / select / pull — arg-less OR arg'd, on a
 * binding imported from a `*-client` / `/client` module, inside src/dom/** (excluding the
 * factory + the live-store substrate consumers). By-key reads (getX(id)) are flagged too —
 * the keyed thing still changes and a renamed/updated record must propagate.
 *
 * What it does NOT flag: mutations/commands (set, reset, update, delete, create, save,
 * remove, ...), which stay callable from render code — the write flows back through the
 * projection then store then render. Genuinely static one-shot reads (session constants)
 * added to EXEMPT_METHODS with a reason. Live-source substrate files (a file whose whole job
 * is snapshot + stream, like live-list.ts) added to EXEMPT_PATH_SEGMENTS — their reads ARE
 * the snapshot half of snapshot+stream. And on-demand / already-live reads pinned to one file
 * via EXEMPT_SITES (method + path), kept site-specific because a method name alone is too
 * coarse (`get` collides with every keyed read; `getClan` must stay flagged).
 *
 * Enforced as error: every displayed read in dom/** routes through a state/ live store;
 * mutations stay direct.
 *
 * Escape hatch: precede the line with
 *   // eslint-disable-next-line lvi/no-raw-read
 */
const { getModuleForFile } = require("../resolve-paths.cjs");
const { build4DReport, trace } = require("./report-builder.cjs");

const READ_PREFIXES = [
    "get",
    "list",
    "browse",
    "fetch",
    "load",
    "query",
    "find",
    "read",
    "count",
    "lookup",
    "resolve",
    "retrieve",
    "select",
    "pull",
];
const EXEMPT_METHODS = new Set(["listMatches"]);
// on-demand / already-live reads pinned to one file. method name alone is too coarse, so each
// entry binds a method to the file where the read is legit; the same method elsewhere stays flagged.
const EXEMPT_SITES = [
    // by-key edit-load: opens the edit form for one memory. the list is live via memoryStore.files$().
    { method: "get", segment: "/dom/ai/memory/inline.ts" },
    // click-to-expand: the roster diff for one audit entry, fetched on demand.
    { method: "listRosterDiffs", segment: "/dom/pages/clans/manage/audit/expansion.ts" },
    // initial pinned-context snapshot. the ai bar updates reactively via the response/unpin flow.
    { method: "getPinnedContext", segment: "/dom/ai/panel/index.ts" },
];
const CLIENT_SOURCE_MARKERS = ["-client", "/client"];
const EXEMPT_PATH_SEGMENTS = [
    "/dom/factory/",
    "/dom/pages/routes/data-rights/rows/row-list/live-list.ts",
    // the audit feed is a live source: snapshot via listClanAudit + openClanAuditStream deltas,
    // same role as live-list.ts. its reads are the snapshot half of snapshot+stream.
    "/dom/pages/clans/manage/audit/state/cluster-feed.ts",
];

function normalizePath(raw) {
    return raw.split("\\").join("/");
}

function isExemptPath(p) {
    if (!p.includes("/dom/")) return true;
    for (const seg of EXEMPT_PATH_SEGMENTS) {
        if (p.includes(seg)) return true;
    }
    return false;
}

function isClientSource(src) {
    for (const marker of CLIENT_SOURCE_MARKERS) {
        if (src.includes(marker)) return true;
    }
    return false;
}

function isReadName(name) {
    for (const prefix of READ_PREFIXES) {
        if (name.startsWith(prefix)) return true;
    }
    return false;
}

function isExemptSite(method, p) {
    for (const site of EXEMPT_SITES) {
        if (site.method === method && p.includes(site.segment)) return true;
    }
    return false;
}

module.exports = {
    meta: {
        type: "suggestion",
        docs: { description: "Data reads in dom/** render code must route through a state/ live store." },
        schema: [],
        messages: { report: "{{ report }}" },
    },
    create(context) {
        const raw = normalizePath(context.filename || context.getFilename());
        if (isExemptPath(raw)) return {};
        const mod = getModuleForFile(raw);
        const clientBindings = new Set();

        function reportRead(node, label) {
            const t = trace(node, raw, mod);
            context.report({
                node,
                messageId: "report",
                data: {
                    report: build4DReport({
                        rule: "no-raw-read",
                        narrative:
                            `Render code read data via an ad-hoc client call (${label}). Displayed state must ` +
                            `flow from a state/ live store (snapshot + deltas) so the surface is realtime by ` +
                            `construction; a one-shot client read in dom/** renders a frozen snapshot that no ` +
                            `projection delta ever reaches.`,
                        graph: {
                            X: `${t.file}:${t.line} — client read ${label}() in ${t.context}`,
                            Y: `the live-store layer is bypassed — this surface shows a dead snapshot, no deltas reach it`,
                            Z: `no_separation — data access lives in render code instead of the store chokepoint`,
                            W: `each ad-hoc read drifts independently; realtime never propagates here; conversions must hunt each by hand`,
                        },
                        remediation:
                            `Read through a state/ store: bind the store's signal (scalar) or render with liveView ` +
                            `over a live-store (collection). Mutations (delete/update/create) stay direct — the write ` +
                            `flows back through the projection. If no store exposes this data yet, add one (it inherits ` +
                            `the delta-fed base) + a projection topic.`,
                        trace: t,
                    }),
                },
            });
        }

        return {
            ImportDeclaration(node) {
                const src = typeof node.source.value === "string" ? node.source.value : "";
                if (!isClientSource(src)) return;
                for (const spec of node.specifiers) {
                    if (spec.local && spec.local.name) clientBindings.add(spec.local.name);
                }
            },
            CallExpression(node) {
                const callee = node.callee;
                if (!callee) return;
                if (callee.type === "MemberExpression") {
                    const obj = callee.object;
                    const method = callee.property && callee.property.name;
                    if (
                        obj &&
                        obj.type === "Identifier" &&
                        clientBindings.has(obj.name) &&
                        method &&
                        isReadName(method) &&
                        !EXEMPT_METHODS.has(method) &&
                        !isExemptSite(method, raw)
                    ) {
                        reportRead(node, `${obj.name}.${method}`);
                    }
                    return;
                }
                if (
                    callee.type === "Identifier" &&
                    clientBindings.has(callee.name) &&
                    isReadName(callee.name) &&
                    !EXEMPT_METHODS.has(callee.name) &&
                    !isExemptSite(callee.name, raw)
                ) {
                    reportRead(node, callee.name);
                }
            },
        };
    },
};
