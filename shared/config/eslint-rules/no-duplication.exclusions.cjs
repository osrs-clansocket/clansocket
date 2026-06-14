/**
 * Files exempt from lvi/no-duplication.
 *
 * Legitimate exemption: registry files whose CONTENT is the duplication.
 * A table-name registry naming the same SQL identifiers across N entries is
 * not a DRY violation — it IS the registry's job to enumerate those names.
 *
 * Path is matched as a suffix against the file's normalized path
 * (forward slashes, relative from repo root). Whole file is exempt.
 */
module.exports = [
    {
        path: "main/dashboard/src/dom/data-rights/table-meta.ts",
        reason: "registry — declares SQL column-names + bootstrap-icon names per table for the data-rights tree summary. literal string repetition (column names, icon names) IS the registry content; SQL schemas are the source-of-truth.",
    },
];
