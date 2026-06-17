import {
    AmbientLight,
    Color,
    DataTexture,
    DirectionalLight,
    HemisphereLight,
    PMREMGenerator,
    type Scene,
    type Texture,
    type WebGLRenderer,
} from "three";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import { RGBELoader } from "three/examples/jsm/loaders/RGBELoader.js";
import {
    DEFAULT_BOTTOM_LIGHT,
    DEFAULT_ENVIRONMENT,
    DEFAULT_HEMISPHERE,
    DEFAULT_LIGHTING,
    DEFAULT_RIM_LIGHT,
    DEFAULT_SHADOW_NORMAL_BIAS,
    DEFAULT_TOP_LIGHT,
    SHADOW_CAMERA_FAR,
    SHADOW_CAMERA_HALF_EXTENT,
    SHADOW_CAMERA_NEAR,
    SHADOW_MAP_SIZE,
} from "../../shared/constants/voxlab/light-constants.js";
import type {
    BottomLightSettings,
    EnvironmentSettings,
    HemisphereSettings,
    LightSettings,
    RimLightSettings,
    TopLightSettings,
} from "../../shared/types/voxlab/light-types.js";

const TOP_LIGHT_POSITION: readonly [number, number, number] = [0, 6, 0.5];
const BOTTOM_LIGHT_POSITION: readonly [number, number, number] = [0, -4, 0.5];

export class LightingManager {
    private readonly ambient: AmbientLight;
    private readonly key: DirectionalLight;
    private readonly fill: DirectionalLight;
    private readonly rim: DirectionalLight;
    private readonly top: DirectionalLight;
    private readonly bottom: DirectionalLight;
    private readonly hemi: HemisphereLight;
    private readonly hemiSky = new Color();
    private readonly hemiGround = new Color();
    private readonly fillColor = new Color();
    private readonly rimColor = new Color();
    private readonly topColor = new Color();
    private readonly bottomColor = new Color();
    private readonly pmrem: PMREMGenerator;
    private proceduralEnv: Texture | null = null;
    private uploadedEnv: Texture | null = null;
    private uploadedHdrName: string | null = null;
    private environmentEnabled = DEFAULT_ENVIRONMENT.enabled;
    private environmentIntensity = DEFAULT_ENVIRONMENT.intensity;

    constructor(
        private readonly scene: Scene,
        renderer: WebGLRenderer,
    ) {
        this.ambient = new AmbientLight(0xffffff, DEFAULT_LIGHTING.ambientIntensity);
        this.key = new DirectionalLight(0xffffff, DEFAULT_LIGHTING.keyIntensity);
        this.key.castShadow = false;
        // Three.js DirectionalLight defaults to a 512² shadow map and a 10×10×500
        // orthographic frustum. For a normalized hero mesh at origin that's
        // microscopic texel density where the mesh actually sits. Tighten the
        // frustum to the user-scale envelope, lift mapSize to 2048², add a
        // normalBias to push grazing faces off self-occlusion. Pairs with the
        // existing shadow.bias slider to actually do something visible now that
        // the texels aren't huge.
        this.key.shadow.mapSize.set(SHADOW_MAP_SIZE, SHADOW_MAP_SIZE);
        this.key.shadow.camera.left = -SHADOW_CAMERA_HALF_EXTENT;
        this.key.shadow.camera.right = SHADOW_CAMERA_HALF_EXTENT;
        this.key.shadow.camera.top = SHADOW_CAMERA_HALF_EXTENT;
        this.key.shadow.camera.bottom = -SHADOW_CAMERA_HALF_EXTENT;
        this.key.shadow.camera.near = SHADOW_CAMERA_NEAR;
        this.key.shadow.camera.far = SHADOW_CAMERA_FAR;
        this.key.shadow.camera.updateProjectionMatrix();
        this.key.shadow.normalBias = DEFAULT_SHADOW_NORMAL_BIAS;
        this.fill = new DirectionalLight(this.fillColor, DEFAULT_LIGHTING.fillIntensity);
        this.rim = new DirectionalLight(this.rimColor, DEFAULT_RIM_LIGHT.intensity);
        this.top = new DirectionalLight(this.topColor, DEFAULT_TOP_LIGHT.intensity);
        this.bottom = new DirectionalLight(this.bottomColor, DEFAULT_BOTTOM_LIGHT.intensity);
        this.hemi = new HemisphereLight(0xffffff, 0xffffff, DEFAULT_HEMISPHERE.intensity);

        scene.add(this.ambient);
        scene.add(this.key);
        scene.add(this.fill);
        scene.add(this.rim);
        scene.add(this.top);
        scene.add(this.bottom);
        scene.add(this.hemi);

        this.pmrem = new PMREMGenerator(renderer);
        this.pmrem.compileEquirectangularShader();
        this.proceduralEnv = this.pmrem.fromScene(new RoomEnvironment(), 0.04).texture;

        this.applySettings(DEFAULT_LIGHTING);
        this.applyHemisphere(DEFAULT_HEMISPHERE);
        this.applyRim(DEFAULT_RIM_LIGHT);
        this.applyTop(DEFAULT_TOP_LIGHT);
        this.applyBottom(DEFAULT_BOTTOM_LIGHT);
        this.applyEnvironment(DEFAULT_ENVIRONMENT);
    }

    setShadowsEnabled(enabled: boolean): void {
        this.key.castShadow = enabled;
    }

    applySettings(settings: LightSettings): void {
        this.ambient.intensity = settings.ambientIntensity;
        this.key.intensity = settings.keyIntensity;
        this.key.position.set(settings.keyPositionX, settings.keyPositionY, settings.keyPositionZ);
        this.key.shadow.bias = settings.shadowBias;
        this.key.shadow.radius = settings.shadowRadius;
        this.fill.intensity = settings.fillIntensity;
        this.fillColor.set(settings.fillColor);
        this.fill.color = this.fillColor;
        this.fill.position.set(settings.fillPositionX, settings.fillPositionY, settings.fillPositionZ);
    }

    applyHemisphere(s: HemisphereSettings): void {
        this.hemiSky.set(s.skyColor);
        this.hemiGround.set(s.groundColor);
        this.hemi.color = this.hemiSky;
        this.hemi.groundColor = this.hemiGround;
        this.hemi.intensity = s.intensity;
    }

    applyRim(s: RimLightSettings): void {
        this.rim.intensity = s.intensity;
        this.rimColor.set(s.color);
        this.rim.color = this.rimColor;
        this.rim.position.set(s.positionX, s.positionY, s.positionZ);
    }

    applyTop(s: TopLightSettings): void {
        this.top.intensity = s.intensity;
        this.topColor.set(s.color);
        this.top.color = this.topColor;
        this.top.position.set(TOP_LIGHT_POSITION[0], TOP_LIGHT_POSITION[1], TOP_LIGHT_POSITION[2]);
    }

    applyBottom(s: BottomLightSettings): void {
        this.bottom.intensity = s.intensity;
        this.bottomColor.set(s.color);
        this.bottom.color = this.bottomColor;
        this.bottom.position.set(BOTTOM_LIGHT_POSITION[0], BOTTOM_LIGHT_POSITION[1], BOTTOM_LIGHT_POSITION[2]);
    }

    applyEnvironment(s: EnvironmentSettings): void {
        this.environmentEnabled = s.enabled;
        this.environmentIntensity = s.intensity;
        this.uploadedHdrName = s.hdrName;
        this.refreshSceneEnvironment();
    }

    /**
     * Replace the uploaded HDR with the equirectangular RGBE blob supplied as
     * an ArrayBuffer. Generates a fresh PMREM, disposes the old one. Caller
     * passes `name` so the corresponding EnvironmentSettings can be saved.
     */
    async loadHdr(buffer: ArrayBuffer, name: string): Promise<void> {
        const loader = new RGBELoader();
        const blob = new Blob([buffer], { type: "application/octet-stream" });
        const url = URL.createObjectURL(blob);
        try {
            const tex = await loader.loadAsync(url);
            const pmremTex = this.pmrem.fromEquirectangular(tex).texture;
            tex.dispose();
            if (this.uploadedEnv) {
                this.uploadedEnv.dispose();
            }
            this.uploadedEnv = pmremTex;
            this.uploadedHdrName = name;
            this.refreshSceneEnvironment();
        } finally {
            URL.revokeObjectURL(url);
        }
    }

    clearHdr(): void {
        if (this.uploadedEnv) {
            this.uploadedEnv.dispose();
            this.uploadedEnv = null;
        }
        this.uploadedHdrName = null;
        this.refreshSceneEnvironment();
    }

    get hdrName(): string | null {
        return this.uploadedHdrName;
    }

    private refreshSceneEnvironment(): void {
        if (!this.environmentEnabled) {
            this.scene.environment = null;
            this.scene.environmentIntensity = 0;
            return;
        }
        const tex = this.uploadedEnv ?? this.proceduralEnv;
        this.scene.environment = tex as DataTexture | null;
        // Honor the user's authored intensity directly. Three.js r163+ uses
        // `environmentIntensity` on Scene; assign defensively. Prior attempt
        // to floor this at 1.5 backfired — ACES tonemapping on bright env
        // reflections saturated the F0 tint to white, killing gold.
        this.scene.environmentIntensity = this.environmentIntensity;
    }
}
