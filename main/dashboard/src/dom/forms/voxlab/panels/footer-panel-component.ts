import { button, div, section, type Instance } from "../../../factory/index.js";
import { BaseVoxlabComponent } from "../../../../managers/voxlab/base/base-voxlab-component.js";
import { readStored, writeStored } from "../../../../state/persistence/index.js";
import { SnapshotRegistry, snapshotRegistry } from "../../../../state/voxlab/registries/snapshot-registry.js";
import {
    FOOTER_BTN_SECONDARY_CLASS,
    FOOTER_PANEL_ACTIONS_CLASS,
    FOOTER_PANEL_CLASS,
    FOOTER_PANEL_SECTIONS_CLASS,
    TABS_HOST_CLASS,
} from "../../../../shared/constants/voxlab/voxlab-classes-constants.js";
import {
    createAmbientSection,
    createBackgroundSection,
    createBloomSection,
    createBottomLightSection,
    createChromaticAberrationSection,
    createCoatSheenSection,
    createColorSpaceSection,
    createContrastSection,
    createEmissiveSection,
    createEnvironmentSection,
    createFillLightSection,
    createGridAxesSection,
    createHemisphereSection,
    createKeyLightSection,
    createOutlineSection,
    createPixelRatioSection,
    createQualitySection,
    createRimLightSection,
    createShadingSection,
    createShadowsSection,
    createStressSection,
    createSurfaceSection,
    createToneExposureSection,
    createTopLightSection,
    createVignetteSection,
    createWireframeSection,
} from "../sections/split-sections.js";
import { CameraSectionComponent } from "../sections/camera-section-component.js";
import { MeshSectionComponent } from "../sections/mesh-section-component.js";
import { MotionSectionComponent } from "../sections/motion-section-component.js";
import { TargetFpsSectionComponent } from "../sections/target-fps-section-component.js";
import { AlbedoSection } from "../texture/sections/albedo-section.js";
import { GradientSection } from "../texture/sections/gradient-section.js";
import { PaintSection } from "../texture/sections/paint-section.js";
import { PartsSection } from "../texture/sections/parts-section.js";
import { PbrGenerationSection } from "../texture/sections/pbr-generation-section.js";
import { PbrMapsSection } from "../texture/sections/pbr-maps-section.js";
import { TabBarComponent, type TabChangeDetail } from "./tab-bar-component.js";

const TAB_STORAGE_KEY = "clansocket:voxlab.tab.left";
const FALLBACK_TAB = "effects";
const VALID_TABS = new Set(["effects", "color", "texture", "mesh", "presets", "light", "animations"]);

const TAB_DEFS: ReadonlyArray<{ id: string; label: string }> = [
    { id: "effects", label: "Effects" },
    { id: "color", label: "Color" },
    { id: "texture", label: "Texture" },
    { id: "mesh", label: "Mesh" },
    { id: "presets", label: "Presets" },
    { id: "light", label: "Light" },
    { id: "animations", label: "Anim" },
];

export class FooterPanelComponent extends BaseVoxlabComponent {
    readonly mesh = new MeshSectionComponent();
    readonly surface = createSurfaceSection();
    readonly emissive = createEmissiveSection();
    readonly coatSheen = createCoatSheenSection();
    readonly wireframe = createWireframeSection();
    readonly background = createBackgroundSection();
    readonly gridAxes = createGridAxesSection();
    readonly camera = new CameraSectionComponent();
    readonly motion = new MotionSectionComponent();
    readonly quality = createQualitySection();
    readonly bloom = createBloomSection();
    readonly outline = createOutlineSection();
    readonly stress = createStressSection();
    readonly pixelRatio = createPixelRatioSection();
    readonly vignette = createVignetteSection();
    readonly contrast = createContrastSection();
    readonly chromaticAberration = createChromaticAberrationSection();
    readonly colorSpace = createColorSpaceSection();
    readonly targetFps = new TargetFpsSectionComponent();
    readonly environment = createEnvironmentSection();
    readonly toneExposure = createToneExposureSection();
    readonly shading = createShadingSection();
    readonly shadows = createShadowsSection();
    readonly hemisphere = createHemisphereSection();
    readonly ambient = createAmbientSection();
    readonly keyLight = createKeyLightSection();
    readonly fillLight = createFillLightSection();
    readonly rimLight = createRimLightSection();
    readonly topLight = createTopLightSection();
    readonly bottomLight = createBottomLightSection();
    readonly parts = new PartsSection();
    readonly paint = new PaintSection();
    readonly gradient = new GradientSection();
    readonly albedo = new AlbedoSection();
    readonly pbrMaps = new PbrMapsSection();
    readonly pbrGeneration = new PbrGenerationSection();

    private readonly tabBar = new TabBarComponent();
    private readonly hostsByTab = new Map<string, Instance>();
    private panelsHostInstance!: Instance;

    // Per-instance snapshot registry captured AFTER section field
    // initialisation. Section constructors register their parts on the
    // module-singleton `snapshotRegistry` as they're created (above field
    // declarations execute pre-constructor-body); this captures the global
    // state at that moment into an isolated SnapshotRegistry. Each
    // FooterPanelComponent's manager-chain (SnapshotManager + TimelineManager)
    // uses THIS registry — so multiple footers on the same page (tweaker
    // preview + N voxlab clan-avatars) each animate their own sections
    // without clobbering one another.
    readonly registry: SnapshotRegistry;

    constructor() {
        super();
        this.registry = new SnapshotRegistry();
        for (const part of snapshotRegistry.all()) {
            this.registry.register(part);
        }
    }

    get panelsContainer(): HTMLElement {
        void this.root;
        return this.panelsHostInstance.el;
    }
    get presetsContainer(): HTMLElement {
        void this.root;
        return this.requireHost("presets");
    }
    get lightContainer(): HTMLElement {
        void this.root;
        return this.requireHost("light");
    }
    get animationsContainer(): HTMLElement {
        void this.root;
        return this.requireHost("animations");
    }
    get meshContainer(): HTMLElement {
        void this.root;
        return this.requireHost("mesh");
    }
    get colorContainer(): HTMLElement {
        void this.root;
        return this.requireHost("color");
    }
    get textureContainer(): HTMLElement {
        void this.root;
        return this.requireHost("texture");
    }

    private requireHost(tabId: string): HTMLElement {
        const host = this.hostsByTab.get(tabId);
        if (!host) {
            throw new Error(`voxlab footer: tab host '${tabId}' not built`);
        }
        return host.el;
    }

    /** Force-builds every registered section component so each one's
     *  `.element` is materialised and internal input refs are populated.
     *  Used by VoxlabRenderer's headless footer: snapshotRegistry.applyState
     *  walks every section and the section.apply method writes to
     *  this.inputs.X.value — without this trigger, build() never runs and
     *  the first applyState call crashes on `this.inputs` being undefined. */
    buildAllSections(): void {
        for (const section of this.allSections) {
            void section.element;
        }
    }

    private get allSections(): ReadonlyArray<BaseVoxlabComponent> {
        return [
            this.mesh,
            this.surface,
            this.emissive,
            this.coatSheen,
            this.wireframe,
            this.background,
            this.gridAxes,
            this.camera,
            this.motion,
            this.quality,
            this.bloom,
            this.outline,
            this.stress,
            this.pixelRatio,
            this.vignette,
            this.contrast,
            this.chromaticAberration,
            this.colorSpace,
            this.targetFps,
            this.environment,
            this.toneExposure,
            this.shading,
            this.shadows,
            this.hemisphere,
            this.ambient,
            this.keyLight,
            this.fillLight,
            this.rimLight,
            this.topLight,
            this.bottomLight,
            this.parts,
            this.paint,
            this.gradient,
            this.albedo,
            this.pbrMaps,
            this.pbrGeneration,
        ];
    }

    get sectionsInOrder(): ReadonlyArray<{ id: string; title: string; component: BaseVoxlabComponent }> {
        return [
            { id: "motion", title: "Motion", component: this.motion },
            { id: "outline", title: "Outline", component: this.outline },
            { id: "chromatic-aberration", title: "Chromatic Aberration", component: this.chromaticAberration },
            { id: "stress", title: "Stress", component: this.stress },
        ];
    }

    get lightSections(): ReadonlyArray<BaseVoxlabComponent> {
        return [
            this.environment,
            this.shading,
            this.shadows,
            this.hemisphere,
            this.ambient,
            this.keyLight,
            this.fillLight,
            this.rimLight,
            this.topLight,
            this.bottomLight,
            this.emissive,
            this.bloom,
        ];
    }

    get cameraSections(): ReadonlyArray<BaseVoxlabComponent> {
        return [this.camera];
    }

    get sceneSections(): ReadonlyArray<BaseVoxlabComponent> {
        return [this.background, this.gridAxes];
    }

    get meshSections(): ReadonlyArray<BaseVoxlabComponent> {
        return [this.mesh, this.wireframe];
    }

    get colorSections(): ReadonlyArray<BaseVoxlabComponent> {
        return [this.surface, this.coatSheen, this.parts, this.paint, this.gradient];
    }

    get textureSections(): ReadonlyArray<BaseVoxlabComponent> {
        return [this.albedo, this.pbrMaps, this.pbrGeneration];
    }

    get displaySections(): ReadonlyArray<BaseVoxlabComponent> {
        return [
            this.pixelRatio,
            this.toneExposure,
            this.quality,
            this.vignette,
            this.contrast,
            this.colorSpace,
            this.targetFps,
        ];
    }

    protected build(): HTMLElement {
        const initialTab = loadTabSelection();
        const panel = section({ classes: [FOOTER_PANEL_CLASS], context: null, meta: null });
        this.tabBar.setTabs(TAB_DEFS, initialTab);
        this.tabBar.mount(panel.el);

        for (const def of TAB_DEFS) {
            const host = this.buildTabHost(def.id, initialTab);
            this.hostsByTab.set(def.id, host);
            panel.addChild(host.el);
        }

        const actions = this.buildActions();
        panel.addChild(actions.el);

        this.tabBar.addEventListener("tab-change", (e) => {
            const { id } = (e as CustomEvent<TabChangeDetail>).detail;
            this.activateTab(id);
            saveTabSelection(id);
        });

        return panel.el;
    }

    private buildTabHost(tabId: string, initialTab: string): Instance {
        const host = div({
            classes: [TABS_HOST_CLASS],
            data: { active: tabId === initialTab ? "true" : "false" },
            context: null,
            meta: null,
        });
        if (tabId === "effects") {
            this.panelsHostInstance = div({
                classes: [FOOTER_PANEL_SECTIONS_CLASS],
                context: null,
                meta: null,
            });
            host.addChild(this.panelsHostInstance.el);
        }
        return host;
    }

    private buildActions(): Instance {
        const resetButton = button({
            classes: [FOOTER_BTN_SECONDARY_CLASS],
            text: "Reset all",
            type: "button",
            context: "reset every voxlab section value back to its default",
            meta: ["action"],
            onClick: () => this.resetAllSections(),
        });
        return div({ classes: [FOOTER_PANEL_ACTIONS_CLASS], context: null, meta: null }, [resetButton.el]);
    }

    private activateTab(activeId: string): void {
        for (const [tabId, instance] of this.hostsByTab) {
            instance.setAttr("data-active", tabId === activeId ? "true" : "false");
        }
    }

    private resetAllSections(): void {
        const groups: ReadonlyArray<ReadonlyArray<BaseVoxlabComponent>> = [
            this.sectionsInOrder.map((s) => s.component),
            this.lightSections,
            this.cameraSections,
            this.sceneSections,
            this.meshSections,
            this.colorSections,
            this.textureSections,
            this.displaySections,
        ];
        for (const group of groups) {
            for (const sec of group) {
                const candidate = sec as { reset?: () => void };
                if (typeof candidate.reset === "function") {
                    candidate.reset();
                }
            }
        }
        this.emit<void>("reset-all", undefined);
    }

    protected onUnmount(): void {
        this.tabBar.unmount();
        for (const { component } of this.sectionsInOrder) {
            component.unmount();
        }
        for (const sec of this.lightSections) {
            sec.unmount();
        }
        for (const sec of this.cameraSections) {
            sec.unmount();
        }
        for (const sec of this.sceneSections) {
            sec.unmount();
        }
        for (const sec of this.meshSections) {
            sec.unmount();
        }
        for (const sec of this.colorSections) {
            sec.unmount();
        }
        for (const sec of this.textureSections) {
            sec.unmount();
        }
        for (const sec of this.displaySections) {
            sec.unmount();
        }
    }
}

function loadTabSelection(): string {
    const raw = readStored<string>(TAB_STORAGE_KEY);
    if (raw === "room") {
        return "light";
    }
    if (raw && VALID_TABS.has(raw)) {
        return raw;
    }
    return FALLBACK_TAB;
}

function saveTabSelection(id: string): void {
    writeStored(TAB_STORAGE_KEY, id);
}
