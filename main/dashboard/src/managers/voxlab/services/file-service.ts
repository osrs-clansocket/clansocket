export class FileService {
    async readText(file: File): Promise<string> {
        return file.text();
    }

    downloadBlob(payload: string, fileName: string, mimeType = "application/json"): void {
        const blob = new Blob([payload], { type: mimeType });
        this.saveBlob(blob, fileName);
    }

    saveBlob(blob: Blob, fileName: string): void {
        const url = URL.createObjectURL(blob);
        const anchor = document.createElement("a");
        anchor.href = url;
        anchor.download = fileName;
        anchor.rel = "noopener";
        document.body.appendChild(anchor);
        anchor.click();
        document.body.removeChild(anchor);
        // Defer revoke: synchronous revocation can cancel the download in
        // Chromium-based browsers because the download stream starts after
        // click() returns. A long-tailed timeout is safe.
        setTimeout(() => URL.revokeObjectURL(url), 60_000);
    }

    isJsonFile(file: File): boolean {
        return file.name.toLowerCase().endsWith(".json") || file.type === "application/json";
    }
}
