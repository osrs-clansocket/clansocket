import {
    BufferGeometry,
    type BufferAttribute,
    CanvasTexture,
    Color,
    Group,
    LineBasicMaterial,
    LineSegments,
    Mesh,
    MeshDepthMaterial,
    MeshNormalMaterial,
    MeshPhysicalMaterial,
    MeshStandardMaterial,
    SRGBColorSpace,
    type Texture,
    WireframeGeometry,
    type Material,
    type Scene,
} from "three";
import { acceleratedRaycast, computeBoundsTree, disposeBoundsTree } from "three-mesh-bvh";

// Module-level prototype patch — one-time BVH-accelerated raycast for ALL meshes
// in the app (not just voxlab). cost: ~30KB dep + O(N) tree build per mesh.
// benefit: O(log N) raycast vs O(N), measurable on >5k triangle meshes.
BufferGeometry.prototype.computeBoundsTree = computeBoundsTree;
BufferGeometry.prototype.disposeBoundsTree = disposeBoundsTree;
Mesh.prototype.raycast = acceleratedRaycast;
import { rasterToMesh } from "../../voxlab/conversion/raster-to-mesh";
import { buildGeometryFromMesh } from "../../voxlab/formatters/geometry-formatter.js";
import { buildMaterialByVariant } from "../../voxlab/formatters/material-formatter.js";
import { DEFAULT_MATERIAL_SETTINGS } from "../../shared/constants/voxlab/material-constants.js";
import type { MaterialSettings } from "../../shared/types/voxlab/material-types.js";
import type { ConvertOptions } from "../../shared/types/voxlab/options-types.js";
import type { ImagePixels, MeshData } from "../../shared/types/voxlab/mesh-types.js";
import type { PbrMapSlot } from "../../shared/types/voxlab/paint-types.js";
import type { MaterialVariant } from "../../shared/types/voxlab/viewport-types.js";

export class MeshManager extends EventTarget {
    // userScaleGroup is the OUTER group — applies the user's runtime scale slider.
    // meshGroup is the INNER group that motion-manager drives every frame (breathe/bob/tilt).
    // Without the split, motion's per-frame group.scale.setScalar() overwrites the user
    // scale on every tick and the Mesh-section slider visually does nothing.
    readonly userScaleGroup = new Group();
    readonly meshGroup = new Group();
    private currentMesh: Mesh | null = null;
    private currentWireframe: LineSegments | null = null;
    private currentMeshData: MeshData | null = null;
    private currentMaterial: MaterialVariant = "standard";
    private smoothShading = false;
    private castShadows = false;
    private wireframeColor = "#f5ca7a";
    private wireframeOpacity = 0.35;
    private materialSettings: MaterialSettings = { ...DEFAULT_MATERIAL_SETTINGS };
    private sourceTexture: Texture | null = null;
    private textureEnabled = false;
    private originalImagePixels: ImagePixels | null = null;
    private pbrTextures: Record<PbrMapSlot, Texture | null> = {
        normal: null,
        roughness: null,
        metalness: null,
        ao: null,
    };
    private pbrIntensities: Record<PbrMapSlot, number> = {
        normal: 1,
        roughness: 1,
        metalness: 1,
        ao: 1,
    };

    constructor(private readonly scene: Scene) {
        super();
        this.userScaleGroup.add(this.meshGroup);
        this.scene.add(this.userScaleGroup);
    }

    convertImage(pixels: ImagePixels, options: ConvertOptions): MeshData {
        this.originalImagePixels = {
            data: pixels.data,
            width: pixels.width,
            height: pixels.height,
        };
        return rasterToMesh({
            imageData: { data: pixels.data, width: pixels.width, height: pixels.height },
            voxelResolution: options.voxelResolution,
            extrusionDepth: options.extrusionDepth,
            smoothingPasses: options.smoothingPasses,
            taubinRounds: options.taubinRounds,
            taubinLambda: options.taubinLambda,
            taubinMu: options.taubinMu,
            cornerAngleDegrees: options.cornerAngleDegrees,
            alphaThreshold: options.alphaThreshold,
            backFace: options.backFace,
            normalize: options.normalize,
            vertexColor: hexToRgbTriple(options.vertexColor),
        });
    }

    loadMesh(meshData: MeshData, withWireframe: boolean): Mesh {
        this.disposeCurrent();
        const geometry = buildGeometryFromMesh(meshData, this.smoothShading);
        geometry.computeBoundsTree();
        const mesh = new Mesh(geometry, this.createMaterials(this.currentMaterial));
        mesh.castShadow = this.castShadows;
        mesh.receiveShadow = this.castShadows;
        this.meshGroup.add(mesh);
        this.currentMesh = mesh;
        this.currentMeshData = meshData;
        this.applyMaterialSettings(this.materialSettings);
        this.applyTextureToCurrent();
        this.applyPbrMapsToCurrent();
        if (withWireframe) {
            this.showWireframe();
        }
        this.dispatchEvent(new CustomEvent("mesh-loaded", { detail: mesh }));
        return mesh;
    }

    rebuild(withWireframe: boolean): Mesh | null {
        if (!this.currentMeshData) {
            return null;
        }
        return this.loadMesh(this.currentMeshData, withWireframe);
    }

    setMaterial(variant: MaterialVariant): void {
        this.currentMaterial = variant;
        if (!this.currentMesh) {
            return;
        }
        this.disposeMaterial(this.currentMesh.material);
        this.currentMesh.material = this.createMaterials(variant);
        this.applyMaterialSettings(this.materialSettings);
        this.applyTextureToCurrent();
        this.applyPbrMapsToCurrent();
    }

    setPbrMap(slot: PbrMapSlot, image: ImagePixels | null): void {
        const existing = this.pbrTextures[slot];
        if (existing) {
            existing.dispose();
            this.pbrTextures[slot] = null;
        }
        if (image) {
            const canvas = document.createElement("canvas");
            canvas.width = image.width;
            canvas.height = image.height;
            const ctx = canvas.getContext("2d");
            if (ctx) {
                const imageData = ctx.createImageData(image.width, image.height);
                imageData.data.set(image.data);
                ctx.putImageData(imageData, 0, 0);
                const tex = new CanvasTexture(canvas);
                tex.flipY = true;
                tex.needsUpdate = true;
                this.pbrTextures[slot] = tex;
            }
        }
        this.applyPbrMapsToCurrent();
    }

    setPbrIntensity(slot: PbrMapSlot, value: number): void {
        this.pbrIntensities[slot] = value;
        this.applyPbrMapsToCurrent();
    }

    private applyPbrMapsToCurrent(): void {
        if (!this.currentMesh) {
            return;
        }
        const materials = this.currentMesh.material;
        if (!Array.isArray(materials)) {
            return;
        }
        for (const m of materials) {
            if (m instanceof MeshStandardMaterial) {
                m.normalMap = this.pbrTextures.normal;
                m.roughnessMap = this.pbrTextures.roughness;
                m.metalnessMap = this.pbrTextures.metalness;
                m.aoMap = this.pbrTextures.ao;
                m.normalScale.set(this.pbrIntensities.normal, this.pbrIntensities.normal);
                m.aoMapIntensity = this.pbrIntensities.ao;
                if (this.pbrTextures.roughness) {
                    m.roughness = this.pbrIntensities.roughness;
                }
                if (this.pbrTextures.metalness) {
                    m.metalness = this.pbrIntensities.metalness;
                }
                m.needsUpdate = true;
            }
        }
    }

    setSmoothShading(enabled: boolean): void {
        this.smoothShading = enabled;
    }

    setShadowsEnabled(enabled: boolean): void {
        this.castShadows = enabled;
        if (this.currentMesh) {
            this.currentMesh.castShadow = enabled;
            this.currentMesh.receiveShadow = enabled;
        }
    }

    setUniformScale(scale: number): void {
        const safe = Number.isFinite(scale) && scale > 0 ? scale : 1;
        this.userScaleGroup.scale.setScalar(safe);
    }

    setWireframeColor(color: string): void {
        this.wireframeColor = color;
        if (this.currentWireframe) {
            const mat = this.currentWireframe.material as LineBasicMaterial;
            mat.color.set(color);
        }
    }

    setSourceTexture(image: ImagePixels | null): void {
        if (this.sourceTexture) {
            this.sourceTexture.dispose();
            this.sourceTexture = null;
        }
        if (image) {
            const canvas = document.createElement("canvas");
            canvas.width = image.width;
            canvas.height = image.height;
            const ctx = canvas.getContext("2d");
            if (ctx) {
                const imageData = ctx.createImageData(image.width, image.height);
                imageData.data.set(image.data);
                ctx.putImageData(imageData, 0, 0);
                const tex = new CanvasTexture(canvas);
                tex.colorSpace = SRGBColorSpace;
                tex.flipY = true;
                tex.needsUpdate = true;
                this.sourceTexture = tex;
            }
        }
        if (this.textureEnabled) {
            this.applyTextureToCurrent();
        }
    }

    setTextureEnabled(enabled: boolean): void {
        if (this.textureEnabled === enabled) {
            return;
        }
        this.textureEnabled = enabled;
        this.applyTextureToCurrent();
    }

    private applyTextureToCurrent(): void {
        if (!this.currentMesh) {
            return;
        }
        const materials = this.currentMesh.material;
        if (!Array.isArray(materials)) {
            return;
        }
        const tex = this.textureEnabled ? this.sourceTexture : null;
        // Material[0] = front+back face (geometry group 0). Sides keep vertex
        // colors only — pasting the texture there stretches the edge pixels.
        for (const m of materials) {
            if (m instanceof MeshStandardMaterial) {
                m.map = tex;
                m.needsUpdate = true;
            }
        }
    }

    setWireframeOpacity(opacity: number): void {
        const safe = Number.isFinite(opacity) ? Math.max(0, Math.min(1, opacity)) : 1;
        this.wireframeOpacity = safe;
        if (this.currentWireframe) {
            const mat = this.currentWireframe.material as LineBasicMaterial;
            mat.opacity = safe;
        }
    }

    applyMaterialSettings(settings: MaterialSettings): void {
        this.materialSettings = settings;
        if (!this.currentMesh) {
            return;
        }
        const mat = this.currentMesh.material;
        if (Array.isArray(mat)) {
            for (const m of mat) {
                this.applyToOneMaterial(m, settings);
            }
        } else {
            this.applyToOneMaterial(mat, settings);
        }
    }

    showWireframe(): void {
        if (!this.currentMesh || this.currentWireframe) {
            return;
        }
        const wireMaterial = new LineBasicMaterial({
            color: this.wireframeColor,
            opacity: this.wireframeOpacity,
            transparent: true,
        });
        const wireframe = new LineSegments(new WireframeGeometry(this.currentMesh.geometry), wireMaterial);
        this.meshGroup.add(wireframe);
        this.currentWireframe = wireframe;
    }

    hideWireframe(): void {
        if (!this.currentWireframe) {
            return;
        }
        this.meshGroup.remove(this.currentWireframe);
        this.currentWireframe.geometry.dispose();
        this.disposeMaterial(this.currentWireframe.material);
        this.currentWireframe = null;
    }

    get sourceImagePixels(): ImagePixels | null {
        return this.originalImagePixels;
    }

    get mesh(): Mesh | null {
        return this.currentMesh;
    }

    get meshData(): MeshData | null {
        return this.currentMeshData;
    }

    exportPaintedMesh(): MeshData | null {
        if (!this.currentMeshData || !this.currentMesh) {
            return null;
        }
        const colorAttr = this.currentMesh.geometry.getAttribute("color") as BufferAttribute | undefined;
        if (!colorAttr) {
            return this.currentMeshData;
        }
        const painted = new Float32Array(colorAttr.array);
        return { ...this.currentMeshData, colors: painted };
    }

    private disposeCurrent(): void {
        if (this.currentMesh) {
            this.meshGroup.remove(this.currentMesh);
            this.currentMesh.geometry.disposeBoundsTree();
            this.currentMesh.geometry.dispose();
            this.disposeMaterial(this.currentMesh.material);
            this.currentMesh = null;
        }
        this.hideWireframe();
    }

    private disposeMaterial(material: Material | Material[]): void {
        if (Array.isArray(material)) {
            for (const m of material) {
                m.dispose();
            }
        } else {
            material.dispose();
        }
    }

    private applyToOneMaterial(material: Material, s: MaterialSettings): void {
        material.transparent = s.opacity < 1;
        material.opacity = s.opacity;
        const tintable = material as { color?: Color; flatShading?: boolean };
        if (
            tintable.color instanceof Color &&
            !(material instanceof MeshNormalMaterial) &&
            !(material instanceof MeshDepthMaterial)
        ) {
            tintable.color.set(s.tint);
        }
        if (material instanceof MeshStandardMaterial) {
            material.metalness = s.metalness;
            material.roughness = s.roughness;
            material.emissive.set(s.emissiveColor);
            material.emissiveIntensity = s.emissiveIntensity;
        }
        if (material instanceof MeshPhysicalMaterial) {
            material.clearcoat = s.clearcoat;
            material.clearcoatRoughness = s.clearcoatRoughness;
            material.ior = s.ior;
            material.sheen = s.sheen;
            material.sheenColor.set(s.sheenColor);
            material.anisotropy = s.anisotropy;
        }
        if ("flatShading" in material) {
            const role = material.userData?.voxlabRole as "flat" | "smooth" | undefined;
            const target = role === "smooth" ? false : role === "flat" ? s.flatShading : s.flatShading;
            if (tintable.flatShading !== target) {
                tintable.flatShading = target;
                material.needsUpdate = true;
            }
        }
    }

    private createMaterials(variant: MaterialVariant): Material[] {
        const flat = buildMaterialByVariant(variant);
        const smooth = buildMaterialByVariant(variant);
        flat.userData.voxlabRole = "flat";
        smooth.userData.voxlabRole = "smooth";
        if (smooth instanceof MeshStandardMaterial) {
            smooth.flatShading = false;
        }
        this.dispatchEvent(new CustomEvent("material-created", { detail: flat }));
        this.dispatchEvent(new CustomEvent("material-created", { detail: smooth }));
        return [flat, smooth];
    }
}

function hexToRgbTriple(hex: string): readonly [number, number, number] {
    const text = hex.startsWith("#") ? hex.slice(1) : hex;
    if (text.length !== 6) {
        return [1, 1, 1];
    }
    const r = Number.parseInt(text.slice(0, 2), 16);
    const g = Number.parseInt(text.slice(2, 4), 16);
    const b = Number.parseInt(text.slice(4, 6), 16);
    if (!Number.isFinite(r) || !Number.isFinite(g) || !Number.isFinite(b)) {
        return [1, 1, 1];
    }
    return [r / 255, g / 255, b / 255];
}
