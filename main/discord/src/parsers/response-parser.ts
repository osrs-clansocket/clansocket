const HTTP_OK_MIN = 200;
const HTTP_OK_MAX = 300;
const HTTP_NOT_FOUND = 404;

interface ResponseLike {
    statusCode?: number;
    on: (event: string, cb: (chunk: Buffer) => void) => void;
}

export function parseResponse<T>(
    res: ResponseLike,
    resolve: (v: T | null) => void,
    reject: (e: Error) => void,
    path: string,
): void {
    const chunks: Buffer[] = [];
    res.on("data", (c: Buffer) => chunks.push(c));
    res.on("end", () => {
        const status = res.statusCode ?? 0;
        if (status === HTTP_NOT_FOUND) {
            resolve(null);
            return;
        }
        if (status < HTTP_OK_MIN || status >= HTTP_OK_MAX) {
            reject(new Error(`apiGet ${path}: HTTP ${status}`));
            return;
        }
        const body = JSON.parse(Buffer.concat(chunks).toString("utf8")) as T;
        resolve(body);
    });
}
