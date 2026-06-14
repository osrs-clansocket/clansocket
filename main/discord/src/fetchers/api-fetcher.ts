import http from "http";
import https from "https";
import config from "../core/config.js";
import { parseResponse } from "../parsers/response-parser.js";

const BEHIND_PROXY = process.env.BEHIND_PROXY === "1";
const SCHEME = BEHIND_PROXY ? "http" : "https";

export function apiRequest<T>(method: string, path: string, body?: object): Promise<T | null> {
    const token = process.env.API_TOKEN;
    if (!token) throw new Error("API_TOKEN not set");
    const url = new URL(`${SCHEME}://localhost:${config.api.port}${path}`);
    const lib = url.protocol === "https:" ? https : http;
    const opts: object = {
        method,
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        rejectUnauthorized: false,
    };
    return new Promise((resolve, reject) => {
        const req = lib.request(url, opts, (res) => parseResponse<T>(res, resolve, reject, path));
        req.on("error", reject);
        if (body !== undefined) req.write(JSON.stringify(body));
        req.end();
    });
}

export function apiGet<T>(path: string): Promise<T | null> {
    return apiRequest<T>("GET", path);
}
