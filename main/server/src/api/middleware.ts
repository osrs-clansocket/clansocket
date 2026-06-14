import type { Request, Response, NextFunction } from "express";
import { HTTP_BAD_REQUEST, HTTP_INTERNAL_ERROR, HTTP_UNAUTHORIZED } from "../shared/http/http-status.js";

const CHAR_0 = 48;
const CHAR_9 = 57;

function isNumericString(str: string): boolean {
    if (str.length === 0) return false;
    for (let i = 0; i < str.length; i++) {
        const code = str.charCodeAt(i);
        if (code < CHAR_0 || code > CHAR_9) return false;
    }
    return true;
}

export function authenticate(req: Request, res: Response, next: NextFunction) {
    const token = req.headers.authorization?.replace("Bearer ", "");
    const validToken = process.env.API_TOKEN;
    if (!validToken) return res.status(HTTP_INTERNAL_ERROR).json({ error: "API not configured" });
    if (!token || token !== validToken) return res.status(HTTP_UNAUTHORIZED).json({ error: "Unauthorized" });
    next();
}

export function validateGuildId(req: Request, res: Response, next: NextFunction) {
    const { guildId } = req.params;
    if (!guildId || Array.isArray(guildId) || !isNumericString(guildId))
        return res.status(HTTP_BAD_REQUEST).json({ error: "Invalid guild ID" });
    next();
}

export function handleAsync(fn: (req: Request, res: Response, next: NextFunction) => Promise<void>) {
    return (req: Request, res: Response, next: NextFunction) => {
        Promise.resolve(fn(req, res, next)).catch(next);
    };
}
