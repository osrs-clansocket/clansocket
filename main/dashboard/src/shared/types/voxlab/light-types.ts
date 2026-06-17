export interface LightSettings {
    ambientIntensity: number;
    keyIntensity: number;
    keyPositionX: number;
    keyPositionY: number;
    keyPositionZ: number;
    fillIntensity: number;
    fillColor: string;
    fillPositionX: number;
    fillPositionY: number;
    fillPositionZ: number;
    shadowBias: number;
    shadowRadius: number;
}

export interface EnvironmentSettings {
    enabled: boolean;
    intensity: number;
    hdrName: string | null;
}

export interface HemisphereSettings {
    skyColor: string;
    groundColor: string;
    intensity: number;
}

export interface RimLightSettings {
    intensity: number;
    color: string;
    positionX: number;
    positionY: number;
    positionZ: number;
}

export interface TopLightSettings {
    intensity: number;
    color: string;
}

export interface BottomLightSettings {
    intensity: number;
    color: string;
}
