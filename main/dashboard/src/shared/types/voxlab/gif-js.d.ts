declare module "gif.js" {
    interface GIFOptions {
        workers?: number;
        quality?: number;
        width?: number;
        height?: number;
        workerScript?: string;
        transparent?: number | null;
        repeat?: number;
        debug?: boolean;
        background?: string;
        dither?: boolean | string;
    }

    interface FrameOptions {
        delay?: number;
        copy?: boolean;
        dispose?: number;
    }

    type GIFFrame =
        | HTMLCanvasElement
        | CanvasRenderingContext2D
        | ImageData
        | OffscreenCanvas
        | OffscreenCanvasRenderingContext2D;

    class GIF {
        constructor(options?: GIFOptions);
        addFrame(frame: GIFFrame, opts?: FrameOptions): void;
        render(): void;
        on(event: "finished", cb: (blob: Blob) => void): void;
        on(event: "progress", cb: (pct: number) => void): void;
        on(event: "abort", cb: () => void): void;
    }
    export default GIF;
}
