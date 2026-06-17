// Vendored copy of @voxlab/raster-to-mesh — see ../../../package.json vendoringTodo.
// This is the entry barrel for voxlab consumers; do not import the internal
// modules directly so the dependency stays single-point.
export { rasterToMesh } from "./raster-to-mesh.js";
export type {
    ImageDataLike,
    MeshAttributes,
    MeshBounds,
    MeshData,
    MeshMetadata,
    Point2D,
    RasterToMeshOptions,
} from "./types.js";
export {
    DEFAULT_ALPHA_THRESHOLD,
    DEFAULT_BACK_FACE,
    DEFAULT_CORNER_ANGLE_DEGREES,
    DEFAULT_EXTRUSION_DEPTH,
    DEFAULT_NORMALIZE,
    DEFAULT_SMOOTHING_PASSES,
    DEFAULT_TAUBIN_ROUNDS,
    DEFAULT_VERTEX_COLOR,
    DEFAULT_VOXEL_RESOLUTION,
    MAX_CORNER_ANGLE_DEGREES,
    MAX_EXTRUSION_DEPTH,
    MAX_SMOOTHING_PASSES,
    MAX_TAUBIN_ROUNDS,
    MAX_VOXEL_RESOLUTION,
    MIN_CORNER_ANGLE_DEGREES,
    MIN_EXTRUSION_DEPTH,
    MIN_SMOOTHING_PASSES,
    MIN_TAUBIN_ROUNDS,
    MIN_VOXEL_RESOLUTION,
} from "./constants/defaults.js";
