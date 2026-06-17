import type { CameraSettings } from "../../types/voxlab/camera-types.js";
import {
    CAMERA_DEFAULT_POSITION,
    CAMERA_DEFAULT_TARGET,
    CAMERA_FAR,
    CAMERA_FIT_DISTANCE_MULTIPLIER,
    CAMERA_FOV,
    CAMERA_FRONT_DISTANCE_MULTIPLIER,
    CAMERA_NEAR,
    ORBIT_DAMPING_FACTOR,
} from "./viewport-constants.js";

export const DEFAULT_CAMERA: CameraSettings = {
    fov: CAMERA_FOV,
    near: CAMERA_NEAR,
    far: CAMERA_FAR,
    positionX: CAMERA_DEFAULT_POSITION[0],
    positionY: CAMERA_DEFAULT_POSITION[1],
    positionZ: CAMERA_DEFAULT_POSITION[2],
    targetX: CAMERA_DEFAULT_TARGET[0],
    targetY: CAMERA_DEFAULT_TARGET[1],
    targetZ: CAMERA_DEFAULT_TARGET[2],
    dampingFactor: ORBIT_DAMPING_FACTOR,
    fitDistanceMultiplier: CAMERA_FIT_DISTANCE_MULTIPLIER,
    frontDistanceMultiplier: CAMERA_FRONT_DISTANCE_MULTIPLIER,
};

export const CAMERA_FOV_MIN = 10;
export const CAMERA_FOV_MAX = 120;
export const CAMERA_POSITION_MIN = -10;
export const CAMERA_POSITION_MAX = 10;
export const CAMERA_NEAR_MIN = 0.001;
export const CAMERA_NEAR_MAX = 5;
export const CAMERA_FAR_MIN = 1;
export const CAMERA_FAR_MAX = 1000;
export const CAMERA_DAMPING_MIN = 0.01;
export const CAMERA_DAMPING_MAX = 0.5;
export const CAMERA_FIT_MULTIPLIER_MIN = 1.0;
export const CAMERA_FIT_MULTIPLIER_MAX = 6.0;
