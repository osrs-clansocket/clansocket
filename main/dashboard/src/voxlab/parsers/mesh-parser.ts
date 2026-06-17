import type { MeshData } from "../../shared/types/voxlab/mesh-types.js";

export interface ParsedMesh {
    data: MeshData;
    fileSize: number;
}

export function parseMeshJson(jsonText: string, fileSize: number): ParsedMesh {
    const raw: unknown = JSON.parse(jsonText);
    if (!isMeshLike(raw)) {
        throw new Error("File does not look like raster-to-mesh output (missing positions/indices/metadata)");
    }
    return { data: raw, fileSize };
}

function isMeshLike(value: unknown): value is MeshData {
    if (!value || typeof value !== "object") {
        return false;
    }
    const v = value as Record<string, unknown>;
    return (
        Array.isArray(v.positions) && Array.isArray(v.indices) && typeof v.metadata === "object" && v.metadata !== null
    );
}
