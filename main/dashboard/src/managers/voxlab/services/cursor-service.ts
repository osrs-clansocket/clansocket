export class CursorService extends EventTarget {
    readonly ndc = { x: 0, y: 0 };
    private container: HTMLElement | null = null;
    private handleMove = (e: PointerEvent): void => {
        if (!this.container) {
            return;
        }
        const rect = this.container.getBoundingClientRect();
        this.ndc.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
        this.ndc.y = -(((e.clientY - rect.top) / rect.height) * 2 - 1);
        this.dispatchEvent(new CustomEvent("pointer-move"));
    };
    private handleEnter = (e: PointerEvent): void => {
        this.handleMove(e);
        this.dispatchEvent(new CustomEvent("pointer-enter"));
    };
    private handleLeave = (): void => {
        this.dispatchEvent(new CustomEvent("pointer-leave"));
    };

    start(container: HTMLElement): void {
        this.container = container;
        container.addEventListener("pointermove", this.handleMove);
        container.addEventListener("pointerenter", this.handleEnter);
        container.addEventListener("pointerleave", this.handleLeave);
    }

    stop(): void {
        if (!this.container) {
            return;
        }
        this.container.removeEventListener("pointermove", this.handleMove);
        this.container.removeEventListener("pointerenter", this.handleEnter);
        this.container.removeEventListener("pointerleave", this.handleLeave);
        this.container = null;
    }
}
