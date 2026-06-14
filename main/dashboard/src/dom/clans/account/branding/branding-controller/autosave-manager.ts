export class AutosaveManager {
    private timer: ReturnType<typeof setTimeout> | null = null;
    private saving = false;
    private pendingAfterSave = false;

    constructor(
        private debounceMs: number,
        private save: () => Promise<void>,
    ) {}

    schedule(): void {
        if (this.timer !== null) clearTimeout(this.timer);
        this.timer = setTimeout(() => {
            this.timer = null;
            void this.flush();
        }, this.debounceMs);
    }

    cancel(): void {
        if (this.timer !== null) {
            clearTimeout(this.timer);
            this.timer = null;
        }
    }

    private async flush(): Promise<void> {
        if (this.saving) {
            this.pendingAfterSave = true;
            return;
        }
        this.saving = true;
        try {
            await this.save();
        } finally {
            this.saving = false;
        }
        if (this.pendingAfterSave) {
            this.pendingAfterSave = false;
            this.schedule();
        }
    }
}
