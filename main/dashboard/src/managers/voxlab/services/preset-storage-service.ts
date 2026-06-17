import { formatSnapshotAsJson } from "../../../voxlab/formatters/snapshot-formatter.js";
import { parseSnapshotJson } from "../../../voxlab/parsers/snapshot-parser.js";
import type { SceneSnapshot } from "../../../shared/types/voxlab/snapshot-types.js";

const DB_NAME = "voxlab.presets";
const DB_VERSION = 1;
const STORE = "presets";

export interface UserPreset {
    id: string;
    name: string;
    snapshot: SceneSnapshot;
    createdAt: number;
}

export class PresetStorageService {
    private dbPromise: Promise<IDBDatabase> | null = null;

    async list(): Promise<UserPreset[]> {
        try {
            const db = await this.openDb();
            return await new Promise<UserPreset[]>((resolve, reject) => {
                const tx = db.transaction(STORE, "readonly");
                const req = tx.objectStore(STORE).getAll();
                req.onsuccess = () => resolve((req.result as UserPreset[] | undefined) ?? []);
                req.onerror = () => reject(req.error);
            });
        } catch (err) {
            console.warn("[voxlab] presets list failed", err);
            return [];
        }
    }

    async save(preset: UserPreset): Promise<void> {
        try {
            const db = await this.openDb();
            await new Promise<void>((resolve, reject) => {
                const tx = db.transaction(STORE, "readwrite");
                tx.objectStore(STORE).put(preset);
                tx.oncomplete = () => resolve();
                tx.onerror = () => reject(tx.error);
            });
        } catch (err) {
            console.warn("[voxlab] presets save failed", err);
        }
    }

    async remove(id: string): Promise<void> {
        try {
            const db = await this.openDb();
            await new Promise<void>((resolve, reject) => {
                const tx = db.transaction(STORE, "readwrite");
                tx.objectStore(STORE).delete(id);
                tx.oncomplete = () => resolve();
                tx.onerror = () => reject(tx.error);
            });
        } catch (err) {
            console.warn("[voxlab] presets remove failed", err);
        }
    }

    serialize(snapshot: SceneSnapshot): string {
        return formatSnapshotAsJson(snapshot);
    }

    deserialize(text: string): SceneSnapshot {
        return parseSnapshotJson(text, text.length).data;
    }

    private openDb(): Promise<IDBDatabase> {
        if (this.dbPromise) {
            return this.dbPromise;
        }
        this.dbPromise = new Promise((resolve, reject) => {
            const req = indexedDB.open(DB_NAME, DB_VERSION);
            req.onupgradeneeded = () => {
                const db = req.result;
                if (!db.objectStoreNames.contains(STORE)) {
                    db.createObjectStore(STORE, { keyPath: "id" });
                }
            };
            req.onsuccess = () => resolve(req.result);
            req.onerror = () => reject(req.error);
        });
        return this.dbPromise;
    }
}
