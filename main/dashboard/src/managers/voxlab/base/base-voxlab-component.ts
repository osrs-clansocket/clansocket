export abstract class BaseVoxlabComponent extends EventTarget {
    private rootEl: HTMLElement | null = null;
    private mounted = false;

    protected abstract build(): HTMLElement;

    protected onMount(): void {}

    protected onUnmount(): void {}

    protected get root(): HTMLElement {
        if (!this.rootEl) {
            this.rootEl = this.build();
        }
        return this.rootEl;
    }

    mount(parent: HTMLElement): void {
        if (this.mounted) {
            return;
        }
        this.mounted = true;
        parent.appendChild(this.root);
        this.onMount();
    }

    unmount(): void {
        if (!this.mounted) {
            return;
        }
        this.mounted = false;
        this.onUnmount();
        this.rootEl?.remove();
    }

    get element(): HTMLElement {
        return this.root;
    }

    protected emit<T>(type: string, detail: T): void {
        this.dispatchEvent(new CustomEvent<T>(type, { detail }));
    }
}
