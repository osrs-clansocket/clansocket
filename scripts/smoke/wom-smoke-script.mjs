/**
 * WoM logic smoke — pure-function tests, no server, no db, no fetch.
 * Run: tsx scripts/smoke/wom-smoke-script.mjs
 * Exit 0 = all pass; exit 1 = any fail. CI-friendly.
 *
 * Covers:
 *  - placeholder-hash-builder (buildPlaceholderAccountHash, isPlaceholderAccountHash)
 *  - wom-default-ua-builder (buildDefaultWomUserAgent)
 *  - player-update-floor (isPlayerUpdateAllowed, isPlayerUpdateRecommended, msUntilPlayerUpdateAllowed)
 *  - wom-payload-validator (validateWomPayload positive + negative)
 *  - wom-account-type-mapper (mapWomAccountType)
 *  - wom-name-changes-mapper (mapGroupNameChanges with fixture)
 *
 * Excluded (need db or real WoM API):
 *  - queue / rate-window / dispatcher logic — needs sqlite + mocked SDK
 *  - verifier round-trip — needs real WoM credentials
 *  - route layer — needs server running
 */

import { buildPlaceholderAccountHash, isPlaceholderAccountHash } from "../../main/server/src/wom/builders/placeholder-hash-builder.ts";
import { buildDefaultWomUserAgent } from "../../main/server/src/wom/builders/wom-default-ua-builder.ts";
import {
    isPlayerUpdateAllowed,
    isPlayerUpdateRecommended,
    msUntilPlayerUpdateAllowed,
} from "../../main/server/src/wom/builders/player-update-floor.ts";
import { validateWomPayload } from "../../main/server/src/wom/validators/wom-payload-validator.ts";
import { mapWomAccountType } from "../../main/server/src/wom/mappers/wom-account-type-mapper.ts";
import { mapGroupNameChanges } from "../../main/server/src/wom/mappers/wom-name-changes-mapper.ts";

const ONE_HOUR_MS = 60 * 60 * 1000;
const SIX_HOURS_MS = 6 * ONE_HOUR_MS;
const TEN_MIN_MS = 10 * 60 * 1000;
const VALID_UA = "ClanSocket-clan-test";

const results = [];

function assert(name, cond, detail) {
    if (cond) {
        results.push({ name, ok: true });
    } else {
        results.push({ name, ok: false, detail: detail ?? "" });
    }
}

function eq(actual, expected) {
    return JSON.stringify(actual) === JSON.stringify(expected);
}

// placeholder-hash-builder
assert(
    "buildPlaceholderAccountHash composes wom:<group_id>:<rsn>",
    buildPlaceholderAccountHash(12345, "zezima") === "wom:12345:zezima",
);
assert(
    "isPlaceholderAccountHash true for placeholder",
    isPlaceholderAccountHash("wom:12345:zezima") === true,
);
assert(
    "isPlaceholderAccountHash false for real hash",
    isPlaceholderAccountHash("a1b2c3d4e5f6") === false,
);
assert(
    "isPlaceholderAccountHash false for empty string",
    isPlaceholderAccountHash("") === false,
);

// wom-default-ua-builder
assert(
    "buildDefaultWomUserAgent yields ClanSocket-clan-<id>",
    buildDefaultWomUserAgent("varietyz-uuid") === "ClanSocket-clan-varietyz-uuid",
);

// player-update-floor
const now = Date.now();
assert("isPlayerUpdateAllowed null lastUpdate -> true", isPlayerUpdateAllowed(null, now) === true);
assert(
    "isPlayerUpdateAllowed 10min ago -> false",
    isPlayerUpdateAllowed(now - TEN_MIN_MS, now) === false,
);
assert(
    "isPlayerUpdateAllowed 1h+ ago -> true",
    isPlayerUpdateAllowed(now - ONE_HOUR_MS - 1, now) === true,
);
assert(
    "isPlayerUpdateRecommended 1h ago -> false (under 6h)",
    isPlayerUpdateRecommended(now - ONE_HOUR_MS, now) === false,
);
assert(
    "isPlayerUpdateRecommended 6h+ ago -> true",
    isPlayerUpdateRecommended(now - SIX_HOURS_MS - 1, now) === true,
);
assert(
    "msUntilPlayerUpdateAllowed null -> 0",
    msUntilPlayerUpdateAllowed(null, now) === 0,
);
assert(
    "msUntilPlayerUpdateAllowed 10min ago -> ~50min",
    msUntilPlayerUpdateAllowed(now - TEN_MIN_MS, now) === ONE_HOUR_MS - TEN_MIN_MS,
);

// wom-payload-validator
assert(
    "validateWomPayload accepts valid full payload",
    validateWomPayload({ group_id: 1, verification_code: "abc", api_key: "key", user_agent: VALID_UA }) === true,
);
assert(
    "validateWomPayload accepts without optional api_key",
    validateWomPayload({ group_id: 1, verification_code: "abc", user_agent: VALID_UA }) === true,
);
assert("validateWomPayload rejects empty object", validateWomPayload({}) === false);
assert(
    "validateWomPayload rejects non-positive group_id",
    validateWomPayload({ group_id: 0, verification_code: "abc", user_agent: VALID_UA }) === false,
);
assert(
    "validateWomPayload rejects string group_id",
    validateWomPayload({ group_id: "1", verification_code: "abc", user_agent: VALID_UA }) === false,
);
assert(
    "validateWomPayload rejects empty verification_code",
    validateWomPayload({ group_id: 1, verification_code: "", user_agent: VALID_UA }) === false,
);
assert(
    "validateWomPayload rejects UA with space",
    validateWomPayload({ group_id: 1, verification_code: "abc", user_agent: "Has Space" }) === false,
);
assert(
    "validateWomPayload rejects UA with semicolon",
    validateWomPayload({ group_id: 1, verification_code: "abc", user_agent: "no;semi" }) === false,
);
assert(
    "validateWomPayload rejects UA too short (1 char)",
    validateWomPayload({ group_id: 1, verification_code: "abc", user_agent: "a" }) === false,
);
assert(
    "validateWomPayload rejects UA too long (>64 chars)",
    validateWomPayload({
        group_id: 1,
        verification_code: "abc",
        user_agent: "a".repeat(65),
    }) === false,
);

// wom-account-type-mapper
assert("mapWomAccountType regular", mapWomAccountType("regular") === "regular");
assert("mapWomAccountType ironman", mapWomAccountType("ironman") === "ironman");
assert("mapWomAccountType hardcore -> hardcore_ironman", mapWomAccountType("hardcore") === "hardcore_ironman");
assert("mapWomAccountType ultimate -> ultimate_ironman", mapWomAccountType("ultimate") === "ultimate_ironman");
assert("mapWomAccountType case-insensitive", mapWomAccountType("IRONMAN") === "ironman");
assert("mapWomAccountType undefined -> unknown", mapWomAccountType(undefined) === "unknown");
assert("mapWomAccountType empty string -> unknown", mapWomAccountType("") === "unknown");
assert("mapWomAccountType garbage -> unknown", mapWomAccountType("foo-bar") === "unknown");

// wom-name-changes-mapper
const nameChangeFixture = [
    { id: 1, playerId: 100, oldName: "alpha", newName: "beta", status: "approved", resolvedAt: "2026-06-15T12:00:00Z" },
    { id: 2, playerId: 101, oldName: "gamma", newName: "delta", status: "pending", resolvedAt: null },
    { id: 3 }, // missing fields → skipped
    { playerId: 102, oldName: "eta", newName: "theta" }, // missing id → skipped
];
const mapped = mapGroupNameChanges(nameChangeFixture);
assert("mapGroupNameChanges drops malformed entries", mapped.length === 2);
assert(
    "mapGroupNameChanges maps first entry correctly",
    eq(mapped[0], {
        womChangeId: 1,
        womPlayerId: 100,
        oldRsn: "alpha",
        newRsn: "beta",
        status: "approved",
        resolvedAtMs: Date.parse("2026-06-15T12:00:00Z"),
    }),
);
assert(
    "mapGroupNameChanges null resolvedAt stays null",
    mapped[1].resolvedAtMs === null,
);

// Report
const passed = results.filter((r) => r.ok).length;
const failed = results.filter((r) => !r.ok);
console.log(`WoM logic smoke: ${passed}/${results.length} passed`);
if (failed.length > 0) {
    console.error(`\nFAILED (${failed.length}):`);
    for (const f of failed) console.error(`  ✗ ${f.name}${f.detail ? ": " + f.detail : ""}`);
    process.exit(1);
}
console.log("All passed.");
process.exit(0);
