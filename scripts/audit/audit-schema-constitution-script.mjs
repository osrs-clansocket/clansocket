#!/usr/bin/env node
// Audits `scripts/script-data/field-rules.mjs` for fields lacking documented provenance.
// Every field in every rule entry must carry `src` describing where its value
// originates (plugin payload, catalog JOIN, server-derived, server-generated,
// or caller-supplied at a server boundary).
//
// Usage (from clansocket-app/):
//   node scripts/audit/audit-schema-constitution-script.mjs
//
// Exit code: 0 = all annotated, 1 = at least one field unannotated.
//
// Wire into CI / pre-commit when sql-schema-constitution.md becomes load-bearing.

import { rules } from "../script-data/field-rules.mjs";

let missing = 0;
for (const [table, def] of Object.entries(rules)) {
    if (!def.fields) continue;
    for (const [field, rule] of Object.entries(def.fields)) {
        if (!rule || typeof rule !== "object") continue;
        if (!rule.src) {
            console.log(`UNANNOTATED: ${table}.${field} (axis=${rule.axis ?? "?"}, type=${rule.type ?? "?"})`);
            missing++;
        }
    }
}

if (missing === 0) {
    console.log("PASS: every field carries documented provenance (src).");
    process.exit(0);
} else {
    console.log(`\nFAIL: ${missing} field(s) lack provenance annotation.`);
    process.exit(1);
}
