import { div, heading, span, type Instance } from "../../../factory/index.js";
import { BaseVoxlabComponent } from "../../../../managers/voxlab/base/base-voxlab-component.js";
import {
    formatBytes,
    formatNumber,
    formatOptional,
    formatRange,
} from "../../../../voxlab/formatters/display-formatter.js";
import type { MeshData } from "../../../../shared/types/voxlab/mesh-types.js";
import {
    SIDEBAR_PANEL_CLASS,
    SIDEBAR_PANEL_HEADING_CLASS,
    SIDEBAR_STAT_LABEL_CLASS,
    SIDEBAR_STAT_VALUE_CLASS,
} from "../../../../shared/constants/voxlab/voxlab-classes-constants.js";

const ROWS: readonly { id: string; label: string }[] = [
    { id: "file", label: "File" },
    { id: "verts", label: "Vertices" },
    { id: "tris", label: "Triangles" },
    { id: "size", label: "File size" },
    { id: "res", label: "Voxel res" },
    { id: "depth", label: "Depth" },
    { id: "x", label: "X range" },
    { id: "y", label: "Y range" },
    { id: "z", label: "Z range" },
];

const ZERO_DEFAULT = new Set(["verts", "tris"]);

export class StatsPanelComponent extends BaseVoxlabComponent {
    private values = new Map<string, Instance>();

    protected build(): HTMLElement {
        const headingEl = heading("h2", {
            classes: [SIDEBAR_PANEL_HEADING_CLASS],
            text: "Stats",
            context: null,
            meta: null,
        });
        const rows: HTMLElement[] = [headingEl.el];
        for (const row of ROWS) {
            const label = span({
                classes: [SIDEBAR_STAT_LABEL_CLASS],
                text: row.label,
                context: null,
                meta: null,
            });
            const value = span({
                classes: [SIDEBAR_STAT_VALUE_CLASS],
                text: ZERO_DEFAULT.has(row.id) ? "0" : "—",
                context: null,
                meta: null,
            });
            const rowInst = div({ classes: ["voxlab__control-stat-row"], context: null, meta: null }, [
                label.el,
                value.el,
            ]);
            rows.push(rowInst.el);
            this.values.set(row.id, value);
        }
        const panel = div({ classes: [SIDEBAR_PANEL_CLASS], context: null, meta: null }, rows);
        return panel.el;
    }

    update(meshData: MeshData, fileName: string, fileSize: number): void {
        const m = meshData.metadata;
        this.set("file", fileName);
        this.set("verts", formatNumber(m.vertexCount));
        this.set("tris", formatNumber(m.triangleCount));
        this.set("size", formatBytes(fileSize));
        this.set("res", m.voxelResolution !== undefined ? String(m.voxelResolution) : "—");
        this.set("depth", formatOptional(m.extrusionDepth));
        this.set("x", formatRange(m.bounds.min[0], m.bounds.max[0]));
        this.set("y", formatRange(m.bounds.min[1], m.bounds.max[1]));
        this.set("z", formatRange(m.bounds.min[2], m.bounds.max[2]));
    }

    private set(id: string, text: string): void {
        const el = this.values.get(id);
        if (el) {
            el.setText(text);
        }
    }
}
