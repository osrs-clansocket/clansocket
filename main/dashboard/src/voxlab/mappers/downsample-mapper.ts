export async function downsampleDataUrlIfNeeded(dataUrl: string, maxDim: number): Promise<string> {
    try {
        const blob = await (await fetch(dataUrl)).blob();
        const bitmap = await createImageBitmap(blob);
        const largerDim = Math.max(bitmap.width, bitmap.height);
        if (largerDim <= maxDim) {
            return dataUrl;
        }
        const scale = maxDim / largerDim;
        const w = Math.max(1, Math.floor(bitmap.width * scale));
        const h = Math.max(1, Math.floor(bitmap.height * scale));
        const canvas = document.createElement("canvas");
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
            return dataUrl;
        }
        ctx.drawImage(bitmap, 0, 0, w, h);
        return canvas.toDataURL("image/png");
    } catch {
        return dataUrl;
    }
}
