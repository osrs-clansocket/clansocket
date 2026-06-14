#!/usr/bin/env node

import fs from "node:fs";
import { SYNC_SEND_OPERATIONS } from "./constants.js";
import { DimensionEnforcer } from "./lib/assets/dimension-enforcer.js";
import { uiLogger } from "./lib/notifications/ui-logger.js";

async function main() {
    const startTime = Date.now();
    const targetDir = process.argv[2];

    try {
        uiLogger.banner("ASSET RESIZE", {
            Mode: "Dimension enforcement only (no conversion, no cache)",
        });

        const enforcer = new DimensionEnforcer();
        if (!(await enforcer.init())) {
            uiLogger.fatal("sharp is required for dimension enforcement");
            process.exit(1);
        }

        if (targetDir) {
            const resolved = fs.realpathSync(targetDir);
            uiLogger.force(`Target: ${resolved}`);
            await enforcer.enforce(resolved);
        } else {
            for (const op of SYNC_SEND_OPERATIONS) {
                if (!fs.existsSync(op.local)) {
                    uiLogger.force(`⚠ Source not found: ${op.local}, skipping`);
                    continue;
                }
                uiLogger.force(`Target: ${op.local}`);
                await enforcer.enforce(op.local);
            }
        }

        const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
        uiLogger.force(`\nCompleted in ${elapsed}s`);
        process.exit(0);
    } catch (error) {
        uiLogger.fatal(error.message);
        process.exit(1);
    }
}

main();
