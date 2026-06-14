import { ZipFile } from "yazl";
import type { Response } from "express";
import type { ZipEntry } from "./collect-user/index.js";

export function streamZipToResponse(entries: ZipEntry[], res: Response, filename: string): Promise<void> {
    return new Promise((resolveDone, rejectDone) => {
        res.setHeader("Content-Type", "application/zip");
        res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);

        const zip = new ZipFile();
        zip.outputStream.on("error", rejectDone);
        zip.outputStream.on("end", () => resolveDone());
        zip.outputStream.pipe(res);

        for (const entry of entries) {
            if (entry.buffer) {
                zip.addBuffer(entry.buffer, entry.path, { compress: false });
            } else if (entry.json !== undefined) {
                zip.addBuffer(Buffer.from(JSON.stringify(entry.json, null, 2), "utf8"), entry.path, {
                    compress: true,
                });
            }
        }
        zip.end();
    });
}
