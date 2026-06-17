import {
    DoubleSide,
    MeshBasicMaterial,
    MeshDepthMaterial,
    MeshNormalMaterial,
    MeshPhysicalMaterial,
    type Material,
} from "three";
import { STANDARD_METALNESS, STANDARD_ROUGHNESS } from "../../shared/constants/voxlab/material-constants.js";
import { GOLD_COLOR } from "../../shared/constants/voxlab/viewport-constants.js";
import type { MaterialVariant } from "../../shared/types/voxlab/viewport-types.js";

export function buildMaterialByVariant(variant: MaterialVariant): Material {
    switch (variant) {
        case "normal":
            return new MeshNormalMaterial({ side: DoubleSide });
        case "depth":
            return new MeshDepthMaterial({ side: DoubleSide });
        case "basic":
            return new MeshBasicMaterial({ color: GOLD_COLOR, side: DoubleSide });
        case "standard":
        default:
            return new MeshPhysicalMaterial({
                vertexColors: true,
                metalness: STANDARD_METALNESS,
                roughness: STANDARD_ROUGHNESS,
                side: DoubleSide,
            });
    }
}
