/**
 * Files exempt from lvi/no-cross-file-duplication.
 *
 * Legitimate exemption: registry files whose CONTENT is the duplication.
 * A table-name registry naming the same SQL identifiers across N entries is
 * not a DRY violation — it IS the registry's job to enumerate those names.
 * The SQL schema files are the authoritative source-of-truth; TypeScript
 * cannot reach into SQL to dedupe. Extracting `TABLE_X = "x"` constants per
 * row creates ~N constants of pure syntactic noise.
 *
 * Path is matched as a suffix against the file's normalized path
 * (forward slashes, relative from repo root). Whole file is exempt.
 */
module.exports = [
    {
        path: "main/dashboard/src/dom/data-rights/table-meta.ts",
        reason: "registry — declares SQL column-names + bootstrap-icon names per table for the data-rights tree summary. literal string repetition IS the registry content; SQL schemas are the source-of-truth.",
    },
    {
        path: "main/server/src/database/plugin/saturated-tables.ts",
        reason: "registry — declares plugin_* SQL table-name references for RSN/account-hash saturation passes. table-name string repetition IS the registry content; database/schemas/plugin/*.sql is the source-of-truth.",
    },
];
