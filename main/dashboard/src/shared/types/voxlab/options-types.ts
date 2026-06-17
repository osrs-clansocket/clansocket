export interface ConvertOptions {
    voxelResolution: number;
    extrusionDepth: number;
    smoothingPasses: number;
    taubinRounds: number;
    taubinLambda: number;
    taubinMu: number;
    cornerAngleDegrees: number;
    alphaThreshold: number;
    backFace: boolean;
    normalize: boolean;
    vertexColor: string;
}
