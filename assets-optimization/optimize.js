#!/usr/bin/env node

import fs from "node:fs";
import { SYNC_SEND_OPERATIONS } from "./constants.js";
import { AssetOptimizer } from "./lib/assets/asset-optimizer.js";
import { ReferenceUpdater } from "./lib/reference-updater.js";
import { uiLogger } from "./lib/notifications/ui-logger.js";
import { DimensionEnforcer } from "./lib/assets/dimension-enforcer.js";

async function main() {
    const startTime = Date.now();
    const allStats = {};
    let totalReferenceUpdates = 0;

    try {
        uiLogger.banner("ASSET OPTIMIZE", {
            Mode: "In-place (converts assets, updates references)",
        });

        for (const op of SYNC_SEND_OPERATIONS) {
            if (!fs.existsSync(op.local)) {
                uiLogger.force(`⚠ Source not found: ${op.local}, skipping`);
                continue;
            }

            const optimizer = new AssetOptimizer();
            const { conversions, applied } = await optimizer.optimizeInPlace(op.local);

            for (const [key, count] of Object.entries(optimizer.stats)) {
                allStats[key] = (allStats[key] || 0) + count;
            }

            if (applied > 0) {
                const updater = new ReferenceUpdater();
                const refResult = await updater.updateReferences(conversions);
                totalReferenceUpdates += refResult || 0;
            } else {
                uiLogger.force("All assets already optimal");
            }
        }

        const enforcer = new DimensionEnforcer();
        if (await enforcer.init()) {
            for (const op of SYNC_SEND_OPERATIONS) {
                if (fs.existsSync(op.local)) {
                    await enforcer.enforce(op.local);
                }
            }
        }

        const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
        uiLogger.summary("optimize", SYNC_SEND_OPERATIONS.length, totalReferenceUpdates);

        const statEntries = Object.entries(allStats);
        if (statEntries.length > 0) {
            uiLogger.force(`Stats: ${statEntries.map(([k, v]) => `${v} ${k}`).join(", ")}`);
        }
        uiLogger.force(`Completed in ${elapsed}s`);

        process.exit(0);
    } catch (error) {
        uiLogger.fatal(error.message);
        process.exit(1);
    }
}

main();
