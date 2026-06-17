import type { OkResult } from "./types.js";

const HEADER_CONTENT_TYPE = "content-type";
const MIME_JSON = "application/json";

let causalCorrelationId: string | null = null;

export function setCausalCorrelationId(id: string | null): void {
    causalCorrelationId = id;
}

export async function readError(res: Response): Promise<string> {
    const body = (await res.json().catch(() => ({}))) as { error?: string };
    return body.error ?? `error ${res.status}`;
}

export async function okResult<T>(res: Response, parse: (r: Response) => Promise<T>): Promise<OkResult<T>> {
    if (res.ok) return { ok: true, result: await parse(res) };
    return { ok: false, error: await readError(res) };
}

function buildInit(init: RequestInit): RequestInit {
    const headers = new Headers(init.headers ?? {});
    // Only force application/json for STRING bodies. For FormData / Blob /
    // URLSearchParams / ArrayBuffer, defer to the browser's auto-generated
    // Content-Type (e.g. `multipart/form-data; boundary=…` for FormData).
    // Mislabeling a FormData body as JSON makes body-parser try to parse it
    // and trip its 4mb limit on payloads multer would have accepted.
    if (init.body && typeof init.body === "string" && !headers.has(HEADER_CONTENT_TYPE)) {
        headers.set(HEADER_CONTENT_TYPE, MIME_JSON);
    }
    if (causalCorrelationId !== null && !headers.has("X-Caused-By")) {
        headers.set("X-Caused-By", causalCorrelationId);
    }
    return { ...init, headers, credentials: "same-origin" };
}

export async function authedFetch(path: string, init: RequestInit = {}): Promise<Response> {
    return fetch(path, buildInit(init));
}
