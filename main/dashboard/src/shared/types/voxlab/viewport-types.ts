export type MaterialVariant = "standard" | "normal" | "depth" | "basic";

export interface MaterialOption {
    value: MaterialVariant;
    label: string;
}

export interface CameraView {
    position: [number, number, number];
    target: [number, number, number];
}
