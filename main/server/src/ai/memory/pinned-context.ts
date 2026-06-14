import { getDb, DB_NAMES } from "../../database/index.js";
import { promptLoader } from "../persona/prompt-loader/index.js";

interface PinOptions {
    auto?: boolean;
}

interface PinRow {
    pin_id: string;
}

export const pinnedContext = {
    list(siteAccountId: string): string[] {
        const rows = getDb(DB_NAMES.AI)
            .prepare("SELECT pin_id FROM varez_pins WHERE site_account_id = ? ORDER BY pinned_at ASC")
            .all(siteAccountId) as PinRow[];
        return rows.map((r) => r.pin_id).filter((id) => id !== "page-state");
    },

    pin(siteAccountId: string, ids: string[], opts: PinOptions = {}): string[] {
        if (ids.length === 0) return this.list(siteAccountId);
        const db = getDb(DB_NAMES.AI);
        const now = Date.now();
        const auto = opts.auto ? 1 : 0;
        const stmt = db.prepare(
            "INSERT OR IGNORE INTO varez_pins (site_account_id, pin_id, auto, pinned_at) VALUES (?, ?, ?, ?)",
        );
        db.transaction(() => {
            for (const id of ids) stmt.run(siteAccountId, id, auto, now);
        })();
        return this.list(siteAccountId);
    },

    unpin(siteAccountId: string, ids: string[]): string[] {
        if (ids.length === 0) return this.list(siteAccountId);
        const db = getDb(DB_NAMES.AI);
        const stmt = db.prepare("DELETE FROM varez_pins WHERE site_account_id = ? AND pin_id = ?");
        db.transaction(() => {
            for (const id of ids) stmt.run(siteAccountId, id);
        })();
        return this.list(siteAccountId);
    },

    clear(siteAccountId: string): void {
        getDb(DB_NAMES.AI).prepare("DELETE FROM varez_pins WHERE site_account_id = ?").run(siteAccountId);
    },

    resolve(siteAccountId: string): { id: string; content: string }[] {
        const ids = this.list(siteAccountId);
        if (ids.length === 0) return [];
        const files = promptLoader.resolveByIds(ids, { siteAccountId, pageState: null });
        return files.map((f) => ({ id: f.id, content: f.content }));
    },

    format(siteAccountId: string): string {
        const resolved = this.resolve(siteAccountId);
        if (resolved.length === 0) return "";
        const sections = resolved.map((f) => `[PINNED: ${f.id}]\n${f.content}`);
        return sections.join("\n\n---\n\n");
    },
};
