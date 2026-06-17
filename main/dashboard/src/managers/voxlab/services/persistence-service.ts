import { formatSnapshotAsJson } from "../../../voxlab/formatters/snapshot-formatter.js";
import { parseSnapshotJson } from "../../../voxlab/parsers/snapshot-parser.js";
import type { LoadedImage, MeshData } from "../../../shared/types/voxlab/mesh-types.js";
import type { SceneSnapshot } from "../../../shared/types/voxlab/snapshot-types.js";

const SETTINGS_KEY = "voxlab.settings.v1";
const DB_NAME = "voxlab";
const DB_VERSION = 1;
const STORE_MESH = "mesh";
const STORE_SOURCE = "source";
const RECORD_KEY = "current";

export interface PersistedMesh {
    data: MeshData;
    fileName: string;
    fileSize: number;
}

export class PersistenceService {
    private dbPromise: Promise<IDBDatabase> | null = null;

    saveSettings(snapshot: SceneSnapshot): void {
        try {
            const payload = formatSnapshotAsJson(snapshot);
            localStorage.setItem(SETTINGS_KEY, payload);
        } catch (err) {
            console.warn("[voxlab] settings persist failed", err);
        }
    }

    loadSettings(): SceneSnapshot | null {
        try {
            const raw = localStorage.getItem(SETTINGS_KEY);
            if (!raw) {
                return null;
            }
            return parseSnapshotJson(raw, raw.length).data;
        } catch (err) {
            console.warn("[voxlab] settings restore failed; clearing", err);
            try {
                localStorage.removeItem(SETTINGS_KEY);
            } catch {
                // ignore — localStorage may be unavailable in private mode
            }
            return null;
        }
    }

    async saveMesh(record: PersistedMesh): Promise<void> {
        try {
            const db = await this.openDb();
            await this.put(db, STORE_MESH, record);
        } catch (err) {
            console.warn("[voxlab] mesh persist failed", err);
        }
    }

    async loadMesh(): Promise<PersistedMesh | null> {
        try {
            const db = await this.openDb();
            return (await this.get(db, STORE_MESH)) as PersistedMesh | null;
        } catch (err) {
            console.warn("[voxlab] mesh restore failed", err);
            return null;
        }
    }

    async saveSource(image: LoadedImage): Promise<void> {
        try {
            const db = await this.openDb();
            await this.put(db, STORE_SOURCE, image);
        } catch (err) {
            console.warn("[voxlab] source persist failed", err);
        }
    }

    async loadSource(): Promise<LoadedImage | null> {
        try {
            const db = await this.openDb();
            return (await this.get(db, STORE_SOURCE)) as LoadedImage | null;
        } catch (err) {
            console.warn("[voxlab] source restore failed", err);
            return null;
        }
    }

    async clearAll(): Promise<void> {
        try {
            localStorage.removeItem(SETTINGS_KEY);
        } catch {
            // ignore
        }
        try {
            const db = await this.openDb();
            await this.clearStore(db, STORE_MESH);
            await this.clearStore(db, STORE_SOURCE);
        } catch (err) {
            console.warn("[voxlab] persistence clear failed", err);
        }
    }

    private openDb(): Promise<IDBDatabase> {
        if (this.dbPromise) {
            return this.dbPromise;
        }
        this.dbPromise = new Promise((resolve, reject) => {
            const req = indexedDB.open(DB_NAME, DB_VERSION);
            req.onupgradeneeded = () => {
                const db = req.result;
                if (!db.objectStoreNames.contains(STORE_MESH)) {
                    db.createObjectStore(STORE_MESH);
                }
                if (!db.objectStoreNames.contains(STORE_SOURCE)) {
                    db.createObjectStore(STORE_SOURCE);
                }
            };
            req.onsuccess = () => resolve(req.result);
            req.onerror = () => reject(req.error);
            req.onblocked = () => reject(new Error("voxlab IndexedDB open blocked"));
        });
        return this.dbPromise;
    }

    private put(db: IDBDatabase, store: string, value: unknown): Promise<void> {
        return new Promise((resolve, reject) => {
            const tx = db.transaction(store, "readwrite");
            tx.objectStore(store).put(value, RECORD_KEY);
            tx.oncomplete = () => resolve();
            tx.onerror = () => reject(tx.error);
            tx.onabort = () => reject(tx.error ?? new Error("transaction aborted"));
        });
    }

    private get(db: IDBDatabase, store: string): Promise<unknown> {
        return new Promise((resolve, reject) => {
            const tx = db.transaction(store, "readonly");
            const req = tx.objectStore(store).get(RECORD_KEY);
            req.onsuccess = () => resolve(req.result ?? null);
            req.onerror = () => reject(req.error);
        });
    }

    private clearStore(db: IDBDatabase, store: string): Promise<void> {
        return new Promise((resolve, reject) => {
            const tx = db.transaction(store, "readwrite");
            tx.objectStore(store).clear();
            tx.oncomplete = () => resolve();
            tx.onerror = () => reject(tx.error);
        });
    }
}
