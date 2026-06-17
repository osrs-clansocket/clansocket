import { CONTEXT_RESTORE_LOOP_THRESHOLD_MS } from "../../../shared/constants/voxlab/viewport-constants.js";

export class ContextRecoveryService extends EventTarget {
    private contextLostAt = 0;
    private canvas: HTMLCanvasElement | null = null;
    private handleLost = (e: Event): void => {
        e.preventDefault();
        this.contextLostAt = performance.now();
        console.warn("[voxlab] WebGL context lost — waiting for restore");
    };
    private handleRestored = (): void => {
        const elapsed = performance.now() - this.contextLostAt;
        if (elapsed < CONTEXT_RESTORE_LOOP_THRESHOLD_MS) {
            console.warn(
                `[voxlab] Context restored after ${Math.round(elapsed)}ms — skipping auto-rebuild to avoid a loop. Re-load the file to recover.`,
            );
            return;
        }
        console.warn("[voxlab] WebGL context restored — rebuilding mesh");
        this.dispatchEvent(new CustomEvent("rebuild-requested"));
    };

    start(canvas: HTMLCanvasElement): void {
        this.canvas = canvas;
        canvas.addEventListener("webglcontextlost", this.handleLost);
        canvas.addEventListener("webglcontextrestored", this.handleRestored);
    }

    stop(): void {
        if (!this.canvas) {
            return;
        }
        this.canvas.removeEventListener("webglcontextlost", this.handleLost);
        this.canvas.removeEventListener("webglcontextrestored", this.handleRestored);
        this.canvas = null;
    }
}
