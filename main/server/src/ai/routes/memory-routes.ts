import express from "express";
import { memoryStore, type MemoryOp } from "../memory/memory-store/index.js";
import { HTTP_BAD_REQUEST, HTTP_NOT_FOUND } from "../../shared/http/http-status.js";
import { requireSiteAccount } from "../../auth/site-middleware.js";

const router = express.Router();

router.get("/", requireSiteAccount, (_req, res) => {
    res.json({ files: memoryStore.list() });
});

router.get("/:id", requireSiteAccount, (req, res) => {
    const file = memoryStore.get(req.params.id as string);
    if (!file) {
        res.status(HTTP_NOT_FOUND).json({ error: "not found" });
        return;
    }
    res.json(file);
});

router.post("/", requireSiteAccount, (req, res) => {
    const body = req.body as Partial<MemoryOp>;
    const result = memoryStore.apply({ ...body, action: "create" } as MemoryOp);
    if (!result.ok) {
        res.status(HTTP_BAD_REQUEST).json(result);
        return;
    }
    res.json(result);
});

router.put("/:id", requireSiteAccount, (req, res) => {
    const body = req.body as Partial<MemoryOp>;
    const result = memoryStore.apply({ ...body, id: req.params.id, action: "update" } as MemoryOp);
    if (!result.ok) {
        res.status(HTTP_BAD_REQUEST).json(result);
        return;
    }
    res.json(result);
});

router.delete("/:id", requireSiteAccount, (req, res) => {
    const result = memoryStore.apply({ id: req.params.id as string, action: "delete" });
    if (!result.ok) {
        res.status(HTTP_BAD_REQUEST).json(result);
        return;
    }
    res.json(result);
});

export default router;
