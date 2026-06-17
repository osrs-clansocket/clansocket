import {
    ACESFilmicToneMapping,
    AgXToneMapping,
    CineonToneMapping,
    Color,
    LinearToneMapping,
    NoToneMapping,
    ReinhardToneMapping,
    SRGBColorSpace,
    UnsignedByteType,
    Vector2,
    WebGLRenderTarget,
    type Camera,
    type Object3D,
    type Scene,
    type ToneMapping,
    type WebGLRenderer,
} from "three";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { OutlinePass } from "three/examples/jsm/postprocessing/OutlinePass.js";
import { OutputPass } from "three/examples/jsm/postprocessing/OutputPass.js";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js";
import { ShaderPass } from "three/examples/jsm/postprocessing/ShaderPass.js";
import { UnrealBloomPass } from "three/examples/jsm/postprocessing/UnrealBloomPass.js";
import { FXAAShader } from "three/examples/jsm/shaders/FXAAShader.js";
import { DEFAULT_EFFECTS } from "../../shared/constants/voxlab/effect-constants.js";
import { CHROMATIC_ABERRATION_SHADER } from "../../shared/constants/voxlab/shaders/chromatic-aberration-shader-constants.js";
import { CONTRAST_SHADER } from "../../shared/constants/voxlab/shaders/contrast-shader-constants.js";
import { VIGNETTE_SHADER } from "../../shared/constants/voxlab/shaders/vignette-shader-constants.js";
import type { EffectsSettings, ToneMappingMode } from "../../shared/types/voxlab/effects-types.js";

const TONE_MAPPING_MAP: Record<ToneMappingMode, ToneMapping> = {
    none: NoToneMapping,
    linear: LinearToneMapping,
    reinhard: ReinhardToneMapping,
    cineon: CineonToneMapping,
    aces: ACESFilmicToneMapping,
    agx: AgXToneMapping,
};

interface OnscreenPasses {
    composer: EffectComposer;
    outline: OutlinePass;
    bloom: UnrealBloomPass;
    vignette: ShaderPass;
    chroma: ShaderPass;
    contrast: ShaderPass;
    fxaa: ShaderPass;
}

interface OffscreenPasses {
    composer: EffectComposer;
    outline: OutlinePass;
    bloom: UnrealBloomPass;
    vignette: ShaderPass;
    chroma: ShaderPass;
    contrast: ShaderPass;
    fxaa: ShaderPass;
}

export class EffectsManager {
    private onscreen!: OnscreenPasses;
    private offscreen: OffscreenPasses | null = null;
    private readonly bgColor = new Color();
    private cachedSettings: EffectsSettings = { ...DEFAULT_EFFECTS };
    private currentWidth: number;
    private currentHeight: number;
    private cachedSamples = -1;

    constructor(
        private readonly renderer: WebGLRenderer,
        private readonly scene: Scene,
        private readonly camera: Camera,
        initialSize: { width: number; height: number },
    ) {
        this.currentWidth = initialSize.width;
        this.currentHeight = initialSize.height;
        this.rebuildOnscreen(clampSamples(DEFAULT_EFFECTS.msaaSamples));
        this.applySettings(DEFAULT_EFFECTS);
    }

    get composer(): EffectComposer {
        return this.onscreen.composer;
    }

    render(): void {
        this.onscreen.composer.render();
    }

    resize(width: number, height: number): void {
        this.currentWidth = width;
        this.currentHeight = height;
        this.onscreen.composer.setSize(width, height);
        const pr = this.renderer.getPixelRatio();
        // composer.setSize already multiplies by pixelRatio internally for the
        // ping-pong targets, but individual passes need the actual pixel
        // dimensions passed in. Without this bloom + outline run at logical
        // size while the scene renders at pixel size → bloom pyramid is
        // half-res, upsampled bloom ≈ extra blur.
        this.onscreen.outline.setSize(width * pr, height * pr);
        this.onscreen.bloom.setSize(width * pr, height * pr);
        this.onscreen.fxaa.material.uniforms.resolution.value.set(1 / (width * pr), 1 / (height * pr));
    }

    setSelectedObjects(objects: Object3D[]): void {
        this.onscreen.outline.selectedObjects = objects;
    }

    getSupersample(): number {
        return clampSupersample(this.cachedSettings.supersample);
    }

    applySettings(settings: EffectsSettings): void {
        const samples = clampSamples(settings.msaaSamples);
        const supersample = clampSupersample(settings.supersample);
        this.cachedSettings = settings;

        // Pixel ratio = display DPR × supersample multiplier.
        const targetPixelRatio = window.devicePixelRatio * supersample;
        if (Math.abs(this.renderer.getPixelRatio() - targetPixelRatio) > 1e-3) {
            this.renderer.setPixelRatio(targetPixelRatio);
            this.onscreen.composer.setPixelRatio(targetPixelRatio);
            // Re-prime FXAA inverse-resolution uniform after DPR change.
            this.resize(this.currentWidth, this.currentHeight);
        }

        // MSAA sample count change requires a composer rebuild (multisampled target).
        if (samples !== this.cachedSamples) {
            this.rebuildOnscreen(samples);
        }

        this.renderer.toneMapping = TONE_MAPPING_MAP[settings.toneMapping];
        this.renderer.toneMappingExposure = settings.exposure;
        this.bgColor.set(settings.backgroundColor);
        this.scene.background = this.bgColor;

        this.syncOnscreen(settings);

        if (this.offscreen) {
            this.syncOffscreen(this.offscreen, settings);
        }
    }

    renderOffscreen(width: number, height: number): WebGLRenderTarget {
        const passes = this.ensureOffscreen();
        passes.composer.setSize(width, height);
        passes.outline.setSize(width, height);
        passes.bloom.setSize(width, height);
        passes.fxaa.material.uniforms.resolution.value.set(1 / width, 1 / height);
        passes.composer.render();
        return passes.composer.readBuffer;
    }

    dispose(): void {
        this.onscreen.composer.dispose();
        if (this.offscreen) {
            this.offscreen.composer.dispose();
            this.offscreen = null;
        }
    }

    private rebuildOnscreen(samples: number): void {
        if (this.onscreen) {
            this.onscreen.composer.dispose();
        }
        const target = new WebGLRenderTarget(this.currentWidth, this.currentHeight, {
            type: UnsignedByteType,
            samples,
        });
        // OutputPass writes sRGB-encoded bytes; tagging the target's texture
        // matches the actual data so any downstream sampler (readPixels here,
        // future shader passes elsewhere) interprets it correctly. Without
        // this the bytes are treated as linear and pasted-as-sRGB into the
        // capture canvas, which looks like a darken / contrast filter.
        target.texture.colorSpace = SRGBColorSpace;
        const composer = new EffectComposer(this.renderer, target);
        composer.setPixelRatio(this.renderer.getPixelRatio());

        composer.addPass(new RenderPass(this.scene, this.camera));

        const initPr = this.renderer.getPixelRatio();
        const outline = new OutlinePass(
            new Vector2(this.currentWidth * initPr, this.currentHeight * initPr),
            this.scene,
            this.camera,
        );
        composer.addPass(outline);

        const bloom = new UnrealBloomPass(
            new Vector2(this.currentWidth * initPr, this.currentHeight * initPr),
            this.cachedSettings.bloomStrength,
            this.cachedSettings.bloomRadius,
            this.cachedSettings.bloomThreshold,
        );
        composer.addPass(bloom);

        const vignette = new ShaderPass(VIGNETTE_SHADER);
        composer.addPass(vignette);

        const chroma = new ShaderPass(CHROMATIC_ABERRATION_SHADER);
        composer.addPass(chroma);

        const contrast = new ShaderPass(CONTRAST_SHADER);
        composer.addPass(contrast);

        const fxaa = new ShaderPass(FXAAShader);
        composer.addPass(fxaa);

        composer.addPass(new OutputPass());

        this.onscreen = { composer, outline, bloom, vignette, chroma, contrast, fxaa };
        this.cachedSamples = samples;

        // After rebuild, FXAA uniforms must be primed with the current viewport size.
        const pr = this.renderer.getPixelRatio();
        fxaa.material.uniforms.resolution.value.set(1 / (this.currentWidth * pr), 1 / (this.currentHeight * pr));
        composer.setSize(this.currentWidth, this.currentHeight);
    }

    private syncOnscreen(settings: EffectsSettings): void {
        const p = this.onscreen;
        p.bloom.enabled = settings.bloomEnabled;
        p.bloom.strength = settings.bloomStrength;
        p.bloom.radius = settings.bloomRadius;
        p.bloom.threshold = settings.bloomThreshold;

        p.outline.enabled = settings.outlineEnabled;
        p.outline.edgeStrength = settings.outlineThickness;
        p.outline.visibleEdgeColor.set(settings.outlineColor);

        p.vignette.enabled = settings.vignetteEnabled;
        p.vignette.uniforms.amount.value = settings.vignetteAmount;
        (p.vignette.uniforms.color.value as Color).set(settings.vignetteColor);

        p.chroma.enabled = settings.chromaticAberrationEnabled;
        p.chroma.uniforms.amount.value = settings.chromaticAberrationAmount;

        p.contrast.enabled = settings.contrastEnabled;
        p.contrast.uniforms.amount.value = settings.contrastAmount;

        p.fxaa.enabled = settings.fxaaEnabled;
    }

    private ensureOffscreen(): OffscreenPasses {
        if (this.offscreen) {
            return this.offscreen;
        }
        const target = new WebGLRenderTarget(1, 1, {
            type: UnsignedByteType,
            samples: clampSamples(this.cachedSettings.msaaSamples),
        });
        target.texture.colorSpace = SRGBColorSpace;
        const composer = new EffectComposer(this.renderer, target);
        // Lock the offscreen composer to pixelRatio = 1. The renderer may have
        // pixelRatio = DPR × supersample for the live view; without this the
        // offscreen target ends up at (width × pr, height × pr) and our
        // readRenderTargetPixels(target, 0, 0, width, height) reads only the
        // bottom-left corner of the actual frame.
        composer.setPixelRatio(1);
        composer.addPass(new RenderPass(this.scene, this.camera));

        const outline = new OutlinePass(new Vector2(1, 1), this.scene, this.camera);
        composer.addPass(outline);

        const bloom = new UnrealBloomPass(
            new Vector2(1, 1),
            this.cachedSettings.bloomStrength,
            this.cachedSettings.bloomRadius,
            this.cachedSettings.bloomThreshold,
        );
        composer.addPass(bloom);

        const vignette = new ShaderPass(VIGNETTE_SHADER);
        composer.addPass(vignette);

        const chroma = new ShaderPass(CHROMATIC_ABERRATION_SHADER);
        composer.addPass(chroma);

        const contrast = new ShaderPass(CONTRAST_SHADER);
        composer.addPass(contrast);

        const fxaa = new ShaderPass(FXAAShader);
        composer.addPass(fxaa);

        const output = new OutputPass();
        output.renderToScreen = false;
        composer.addPass(output);

        const passes: OffscreenPasses = { composer, outline, bloom, vignette, chroma, contrast, fxaa };
        this.syncOffscreen(passes, this.cachedSettings);
        this.offscreen = passes;
        return passes;
    }

    private syncOffscreen(passes: OffscreenPasses, settings: EffectsSettings): void {
        passes.bloom.enabled = settings.bloomEnabled;
        passes.bloom.strength = settings.bloomStrength;
        passes.bloom.radius = settings.bloomRadius;
        passes.bloom.threshold = settings.bloomThreshold;

        passes.outline.enabled = settings.outlineEnabled;
        passes.outline.edgeStrength = settings.outlineThickness;
        passes.outline.visibleEdgeColor.set(settings.outlineColor);

        passes.vignette.enabled = settings.vignetteEnabled;
        passes.vignette.uniforms.amount.value = settings.vignetteAmount;
        (passes.vignette.uniforms.color.value as Color).set(settings.vignetteColor);

        passes.chroma.enabled = settings.chromaticAberrationEnabled;
        passes.chroma.uniforms.amount.value = settings.chromaticAberrationAmount;

        passes.contrast.enabled = settings.contrastEnabled;
        passes.contrast.uniforms.amount.value = settings.contrastAmount;

        passes.fxaa.enabled = settings.fxaaEnabled;
    }
}

function clampSamples(samples: number): number {
    if (!Number.isFinite(samples) || samples <= 0) {
        return 0;
    }
    if (samples >= 8) {
        return 8;
    }
    if (samples >= 4) {
        return 4;
    }
    return 2;
}

function clampSupersample(value: number): number {
    if (!Number.isFinite(value) || value <= 0) {
        return 1;
    }
    return Math.min(3, Math.max(1, value));
}
