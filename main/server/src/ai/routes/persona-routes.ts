import express from "express";
import { personaDefaults } from "../persona/default-persona/index.js";
import { CONFIGURABLE_KEYS } from "../persona/default-persona/preferences/slot-registry.js";
import { requireSiteAccount } from "../../auth/site-middleware.js";

const router = express.Router();

router.get("/defaults", requireSiteAccount, (_req, res) => {
    const out: Record<string, string> = {};
    for (const key of CONFIGURABLE_KEYS) {
        const value = personaDefaults[`__${key}__`];
        if (typeof value === "string") out[key] = value;
    }
    res.json({ defaults: out });
});

export default router;
