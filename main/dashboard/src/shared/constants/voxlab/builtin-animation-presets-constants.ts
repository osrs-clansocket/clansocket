import type {
    AnimationPresetDefinition,
    GeneratedKeyframe,
    GeneratedTrack,
    PresetContext,
} from "../../types/voxlab/animation-preset-types.js";
import type { SceneSnapshot } from "../../types/voxlab/snapshot-types.js";

// ─── shared helpers ──────────────────────────────────────────────────────

function readNumber(snap: SceneSnapshot, part: string, key: string, fallback: number): number {
    const p = snap.parts[part];
    if (p && typeof p === "object" && key in (p as Record<string, unknown>)) {
        const v = (p as Record<string, unknown>)[key];
        if (typeof v === "number" && Number.isFinite(v)) return v;
    }
    return fallback;
}

function readString(snap: SceneSnapshot, part: string, key: string, fallback: string): string {
    const p = snap.parts[part];
    if (p && typeof p === "object" && key in (p as Record<string, unknown>)) {
        const v = (p as Record<string, unknown>)[key];
        if (typeof v === "string") return v;
    }
    return fallback;
}

/** Linear sample helper: count keys evenly spaced 0..durationMs, each driven by fn(u). */
function sample(durationMs: number, count: number, fn: (u: number) => number): GeneratedKeyframe[] {
    const out: GeneratedKeyframe[] = [];
    for (let i = 0; i <= count; i++) {
        const u = i / count;
        out.push({ t: u * durationMs, v: fn(u) });
    }
    return out;
}

function sampleColor(durationMs: number, count: number, fn: (u: number) => string): GeneratedKeyframe[] {
    const out: GeneratedKeyframe[] = [];
    for (let i = 0; i <= count; i++) {
        const u = i / count;
        out.push({ t: u * durationMs, v: fn(u) });
    }
    return out;
}

function track(property: string, type: GeneratedTrack["type"], keyframes: GeneratedKeyframe[]): GeneratedTrack {
    return { property, type, keyframes };
}

function hslHex(h: number, s: number, l: number): string {
    const sat = s / 100;
    const lit = l / 100;
    const k = (n: number): number => (n + h / 30) % 12;
    const a = sat * Math.min(lit, 1 - lit);
    const f = (n: number): number => lit - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
    const toHex = (x: number): string =>
        Math.round(x * 255)
            .toString(16)
            .padStart(2, "0");
    return `#${toHex(f(0))}${toHex(f(8))}${toHex(f(4))}`;
}

function lerpHex(a: string, b: string, u: number): string {
    const pa = parseHex(a);
    const pb = parseHex(b);
    const ch = (i: number): string =>
        Math.round(pa[i] + (pb[i] - pa[i]) * u)
            .toString(16)
            .padStart(2, "0");
    return `#${ch(0)}${ch(1)}${ch(2)}`;
}

function parseHex(hex: string): [number, number, number] {
    const t = hex.startsWith("#") ? hex.slice(1) : hex;
    return [Number.parseInt(t.slice(0, 2), 16), Number.parseInt(t.slice(2, 4), 16), Number.parseInt(t.slice(4, 6), 16)];
}

// ─── Camera presets ──────────────────────────────────────────────────────

const orbitSpin: AnimationPresetDefinition = {
    id: "camera.orbitSpin",
    name: "Orbit Spin",
    category: "Camera",
    defaultDurationMs: 3000,
    description: "Full 360° orbit around the model's pivot.",
    generate(ctx: PresetContext): GeneratedTrack[] {
        const cx = readNumber(ctx.snapshot, "camera", "positionX", 1.3);
        const cz = readNumber(ctx.snapshot, "camera", "positionZ", 1.6);
        const tx = readNumber(ctx.snapshot, "camera", "targetX", 0);
        const tz = readNumber(ctx.snapshot, "camera", "targetZ", 0);
        const dx = cx - tx;
        const dz = cz - tz;
        const radius = Math.sqrt(dx * dx + dz * dz);
        const phase0 = Math.atan2(dz, dx);
        const steps = 16;
        const xs: GeneratedKeyframe[] = [];
        const zs: GeneratedKeyframe[] = [];
        for (let i = 0; i <= steps; i++) {
            const u = i / steps;
            const ang = phase0 + u * Math.PI * 2;
            const t = u * ctx.durationMs;
            xs.push({ t, v: tx + Math.cos(ang) * radius });
            zs.push({ t, v: tz + Math.sin(ang) * radius });
        }
        return [track("camera.positionX", "number", xs), track("camera.positionZ", "number", zs)];
    },
};

const halfSpin: AnimationPresetDefinition = {
    id: "camera.halfSpin",
    name: "Half Spin",
    category: "Camera",
    defaultDurationMs: 2000,
    generate(ctx) {
        const cx = readNumber(ctx.snapshot, "camera", "positionX", 1.3);
        const cz = readNumber(ctx.snapshot, "camera", "positionZ", 1.6);
        const tx = readNumber(ctx.snapshot, "camera", "targetX", 0);
        const tz = readNumber(ctx.snapshot, "camera", "targetZ", 0);
        const dx = cx - tx,
            dz = cz - tz;
        const radius = Math.sqrt(dx * dx + dz * dz);
        const phase0 = Math.atan2(dz, dx);
        const xs = sample(ctx.durationMs, 10, (u) => tx + Math.cos(phase0 + u * Math.PI) * radius);
        const zs = sample(ctx.durationMs, 10, (u) => tz + Math.sin(phase0 + u * Math.PI) * radius);
        return [track("camera.positionX", "number", xs), track("camera.positionZ", "number", zs)];
    },
};

const push: AnimationPresetDefinition = {
    id: "camera.push",
    name: "Push (zoom in)",
    category: "Camera",
    defaultDurationMs: 1500,
    generate(ctx) {
        const cx = readNumber(ctx.snapshot, "camera", "positionX", 1.3);
        const cy = readNumber(ctx.snapshot, "camera", "positionY", 0.9);
        const cz = readNumber(ctx.snapshot, "camera", "positionZ", 1.6);
        const tx = readNumber(ctx.snapshot, "camera", "targetX", 0);
        const ty = readNumber(ctx.snapshot, "camera", "targetY", 0);
        const tz = readNumber(ctx.snapshot, "camera", "targetZ", 0);
        return [
            track(
                "camera.positionX",
                "number",
                sample(ctx.durationMs, 4, (u) => cx + (tx - cx) * u * 0.55),
            ),
            track(
                "camera.positionY",
                "number",
                sample(ctx.durationMs, 4, (u) => cy + (ty - cy) * u * 0.55),
            ),
            track(
                "camera.positionZ",
                "number",
                sample(ctx.durationMs, 4, (u) => cz + (tz - cz) * u * 0.55),
            ),
        ];
    },
};

const pull: AnimationPresetDefinition = {
    id: "camera.pull",
    name: "Pull (zoom out)",
    category: "Camera",
    defaultDurationMs: 1500,
    generate(ctx) {
        const cx = readNumber(ctx.snapshot, "camera", "positionX", 1.3);
        const cy = readNumber(ctx.snapshot, "camera", "positionY", 0.9);
        const cz = readNumber(ctx.snapshot, "camera", "positionZ", 1.6);
        const tx = readNumber(ctx.snapshot, "camera", "targetX", 0);
        const ty = readNumber(ctx.snapshot, "camera", "targetY", 0);
        const tz = readNumber(ctx.snapshot, "camera", "targetZ", 0);
        return [
            track(
                "camera.positionX",
                "number",
                sample(ctx.durationMs, 4, (u) => cx + (cx - tx) * u * 0.8),
            ),
            track(
                "camera.positionY",
                "number",
                sample(ctx.durationMs, 4, (u) => cy + (cy - ty) * u * 0.4),
            ),
            track(
                "camera.positionZ",
                "number",
                sample(ctx.durationMs, 4, (u) => cz + (cz - tz) * u * 0.8),
            ),
        ];
    },
};

const dollyZoom: AnimationPresetDefinition = {
    id: "camera.dollyZoom",
    name: "Dolly Zoom",
    category: "Camera",
    defaultDurationMs: 2000,
    description: "Push in while FOV widens — vertigo.",
    generate(ctx) {
        const cz = readNumber(ctx.snapshot, "camera", "positionZ", 1.6);
        const fov = readNumber(ctx.snapshot, "camera", "fov", 45);
        return [
            track(
                "camera.positionZ",
                "number",
                sample(ctx.durationMs, 8, (u) => cz * (1 - 0.4 * u)),
            ),
            track(
                "camera.fov",
                "number",
                sample(ctx.durationMs, 8, (u) => fov * (1 + 0.6 * u)),
            ),
        ];
    },
};

const slowPan: AnimationPresetDefinition = {
    id: "camera.slowPan",
    name: "Slow Pan",
    category: "Camera",
    defaultDurationMs: 4000,
    generate(ctx) {
        const tx = readNumber(ctx.snapshot, "camera", "targetX", 0);
        return [
            track(
                "camera.targetX",
                "number",
                sample(ctx.durationMs, 6, (u) => tx + Math.sin(u * Math.PI * 2) * 0.6),
            ),
        ];
    },
};

const tiltSway: AnimationPresetDefinition = {
    id: "camera.tiltSway",
    name: "Tilt Sway",
    category: "Camera",
    defaultDurationMs: 3000,
    generate(ctx) {
        const cy = readNumber(ctx.snapshot, "camera", "positionY", 0.9);
        return [
            track(
                "camera.positionY",
                "number",
                sample(ctx.durationMs, 8, (u) => cy + Math.sin(u * Math.PI * 2) * 0.35),
            ),
        ];
    },
};

// ─── Material presets ────────────────────────────────────────────────────

const hueCycle: AnimationPresetDefinition = {
    id: "material.hueCycle",
    name: "Hue Cycle",
    category: "Material",
    defaultDurationMs: 4000,
    generate(ctx) {
        return [
            track(
                "surface.tint",
                "color",
                sampleColor(ctx.durationMs, 12, (u) => hslHex(u * 360, 70, 60)),
            ),
        ];
    },
};

const glowPulse: AnimationPresetDefinition = {
    id: "material.glowPulse",
    name: "Glow Pulse",
    category: "Material",
    defaultDurationMs: 2000,
    generate(ctx) {
        const base = readNumber(ctx.snapshot, "emissive", "emissiveIntensity", 0);
        return [
            track(
                "emissive.emissiveIntensity",
                "number",
                sample(ctx.durationMs, 12, (u) => base + Math.abs(Math.sin(u * Math.PI * 2)) * 1.2),
            ),
        ];
    },
};

const fadeIn: AnimationPresetDefinition = {
    id: "material.fadeIn",
    name: "Fade In",
    category: "Material",
    defaultDurationMs: 1000,
    generate(ctx) {
        return [
            track(
                "surface.opacity",
                "number",
                sample(ctx.durationMs, 4, (u) => u),
            ),
        ];
    },
};

const fadeOut: AnimationPresetDefinition = {
    id: "material.fadeOut",
    name: "Fade Out",
    category: "Material",
    defaultDurationMs: 1000,
    generate(ctx) {
        return [
            track(
                "surface.opacity",
                "number",
                sample(ctx.durationMs, 4, (u) => 1 - u),
            ),
        ];
    },
};

const metallicSweep: AnimationPresetDefinition = {
    id: "material.metallicSweep",
    name: "Metallic Sweep",
    category: "Material",
    defaultDurationMs: 2500,
    generate(ctx) {
        const base = readNumber(ctx.snapshot, "surface", "metalness", 0.25);
        return [
            track(
                "surface.metalness",
                "number",
                sample(ctx.durationMs, 8, (u) => base + (1 - base) * Math.abs(Math.sin(u * Math.PI))),
            ),
            track(
                "surface.roughness",
                "number",
                sample(ctx.durationMs, 8, (u) => 0.05 + 0.5 * (1 - Math.abs(Math.sin(u * Math.PI)))),
            ),
        ];
    },
};

const emissiveThrob: AnimationPresetDefinition = {
    id: "material.emissiveThrob",
    name: "Emissive Throb",
    category: "Material",
    defaultDurationMs: 3000,
    generate(ctx) {
        const baseColor = readString(ctx.snapshot, "emissive", "emissiveColor", "#321f0a");
        return [
            track(
                "emissive.emissiveIntensity",
                "number",
                sample(ctx.durationMs, 16, (u) => 0.1 + Math.abs(Math.sin(u * Math.PI * 3)) * 1.5),
            ),
            track(
                "emissive.emissiveColor",
                "color",
                sampleColor(ctx.durationMs, 16, (u) =>
                    lerpHex(baseColor, "#ffd089", 0.3 + 0.4 * Math.sin(u * Math.PI * 3)),
                ),
            ),
        ];
    },
};

// ─── Lighting presets ────────────────────────────────────────────────────

const sunArc: AnimationPresetDefinition = {
    id: "lighting.sunArc",
    name: "Sun Arc",
    category: "Lighting",
    defaultDurationMs: 4000,
    generate(ctx) {
        return [
            track(
                "keyLight.keyPositionX",
                "number",
                sample(ctx.durationMs, 10, (u) => Math.cos(u * Math.PI) * 4),
            ),
            track(
                "keyLight.keyPositionY",
                "number",
                sample(ctx.durationMs, 10, (u) => Math.abs(Math.sin(u * Math.PI)) * 5),
            ),
        ];
    },
};

const lightPulse: AnimationPresetDefinition = {
    id: "lighting.lightPulse",
    name: "Light Pulse",
    category: "Lighting",
    defaultDurationMs: 1800,
    generate(ctx) {
        const base = readNumber(ctx.snapshot, "keyLight", "keyIntensity", 1.1);
        return [
            track(
                "keyLight.keyIntensity",
                "number",
                sample(ctx.durationMs, 12, (u) => base * (0.6 + 0.7 * Math.abs(Math.sin(u * Math.PI * 2)))),
            ),
        ];
    },
};

const colorTempShift: AnimationPresetDefinition = {
    id: "lighting.colorTempShift",
    name: "Color Temp Shift",
    category: "Lighting",
    defaultDurationMs: 3500,
    generate(ctx) {
        return [
            track(
                "fillLight.fillColor",
                "color",
                sampleColor(ctx.durationMs, 6, (u) => lerpHex("#ffb15a", "#7aa7d8", u)),
            ),
        ];
    },
};

const tripleLightCycle: AnimationPresetDefinition = {
    id: "lighting.tripleLightCycle",
    name: "Triple-Light Cycle",
    category: "Lighting",
    defaultDurationMs: 3000,
    description: "Key / Fill / Rim swap dominant in sequence.",
    generate(ctx) {
        const ki = readNumber(ctx.snapshot, "keyLight", "keyIntensity", 1.1);
        const fi = readNumber(ctx.snapshot, "fillLight", "fillIntensity", 0.4);
        const ri = readNumber(ctx.snapshot, "rimLight", "intensity", 0.8);
        const wave = (u: number, phase: number): number => 0.3 + Math.max(0, Math.sin(u * Math.PI * 2 - phase)) * 1.0;
        return [
            track(
                "keyLight.keyIntensity",
                "number",
                sample(ctx.durationMs, 16, (u) => ki * wave(u, 0)),
            ),
            track(
                "fillLight.fillIntensity",
                "number",
                sample(ctx.durationMs, 16, (u) => fi * wave(u, (Math.PI * 2) / 3)),
            ),
            track(
                "rimLight.intensity",
                "number",
                sample(ctx.durationMs, 16, (u) => ri * wave(u, (Math.PI * 4) / 3)),
            ),
        ];
    },
};

const stageFlicker: AnimationPresetDefinition = {
    id: "lighting.stageFlicker",
    name: "Stage Flicker",
    category: "Lighting",
    defaultDurationMs: 1200,
    generate(ctx) {
        const base = readNumber(ctx.snapshot, "ambient", "ambientIntensity", 0.45);
        const samples: GeneratedKeyframe[] = [];
        for (let i = 0; i <= 18; i++) {
            const u = i / 18;
            const noise = Math.sin(u * 60) * 0.5 + Math.sin(u * 23) * 0.5;
            samples.push({ t: u * ctx.durationMs, v: Math.max(0.05, base + noise * 0.4) });
        }
        return [track("ambient.ambientIntensity", "number", samples)];
    },
};

// ─── Post-FX presets ─────────────────────────────────────────────────────

const bloomThrob: AnimationPresetDefinition = {
    id: "postfx.bloomThrob",
    name: "Bloom Throb",
    category: "Post-FX",
    defaultDurationMs: 2500,
    generate(ctx) {
        const base = readNumber(ctx.snapshot, "bloom", "bloomStrength", 0.6);
        return [
            track(
                "bloom.bloomStrength",
                "number",
                sample(ctx.durationMs, 14, (u) => base + Math.abs(Math.sin(u * Math.PI * 2)) * 1.0),
            ),
        ];
    },
};

const vignetteBreath: AnimationPresetDefinition = {
    id: "postfx.vignetteBreath",
    name: "Vignette Breath",
    category: "Post-FX",
    defaultDurationMs: 4000,
    generate(ctx) {
        return [
            track(
                "vignette.vignetteAmount",
                "number",
                sample(ctx.durationMs, 10, (u) => 0.1 + 0.6 * (Math.sin(u * Math.PI * 2) * 0.5 + 0.5)),
            ),
        ];
    },
};

const contrastPunch: AnimationPresetDefinition = {
    id: "postfx.contrastPunch",
    name: "Contrast Punch",
    category: "Post-FX",
    defaultDurationMs: 800,
    generate(ctx) {
        return [
            track("contrast.contrastAmount", "number", [
                { t: 0, v: 0 },
                { t: ctx.durationMs * 0.2, v: 0.6 },
                { t: ctx.durationMs * 0.5, v: 0.15 },
                { t: ctx.durationMs * 0.8, v: 0.35 },
                { t: ctx.durationMs, v: 0 },
            ]),
        ];
    },
};

const chromaticWave: AnimationPresetDefinition = {
    id: "postfx.chromaticWave",
    name: "Chromatic Wave",
    category: "Post-FX",
    defaultDurationMs: 3000,
    generate(ctx) {
        return [
            track(
                "chromaticAberration.chromaticAberrationAmount",
                "number",
                sample(ctx.durationMs, 12, (u) => 0.05 + Math.abs(Math.sin(u * Math.PI * 3)) * 0.4),
            ),
        ];
    },
};

const stressBurst: AnimationPresetDefinition = {
    id: "postfx.stressBurst",
    name: "Stress Burst",
    category: "Post-FX",
    defaultDurationMs: 1500,
    generate(ctx) {
        return [
            track(
                "stress.radius",
                "number",
                sample(ctx.durationMs, 10, (u) => 0.3 + Math.abs(Math.sin(u * Math.PI * 4)) * 1.2),
            ),
        ];
    },
};

const fxaaEdgeWave: AnimationPresetDefinition = {
    id: "postfx.fxaaEdgeWave",
    name: "FXAA Edge Wave",
    category: "Post-FX",
    defaultDurationMs: 2000,
    generate(ctx) {
        return [
            track(
                "outline.outlineThickness",
                "number",
                sample(ctx.durationMs, 10, (u) => 0.5 + Math.abs(Math.sin(u * Math.PI * 2)) * 4.5),
            ),
        ];
    },
};

// ─── Combos ──────────────────────────────────────────────────────────────

const hover: AnimationPresetDefinition = {
    id: "combo.hover",
    name: "Hover",
    category: "Combo",
    defaultDurationMs: 3000,
    generate(ctx) {
        const cy = readNumber(ctx.snapshot, "camera", "positionY", 0.9);
        return [
            track(
                "camera.positionY",
                "number",
                sample(ctx.durationMs, 12, (u) => cy + Math.sin(u * Math.PI * 2) * 0.15),
            ),
            track(
                "mesh.scale",
                "number",
                sample(ctx.durationMs, 12, (u) => 1 + Math.sin(u * Math.PI * 2) * 0.04),
            ),
        ];
    },
};

const reveal: AnimationPresetDefinition = {
    id: "combo.reveal",
    name: "Reveal",
    category: "Combo",
    defaultDurationMs: 2000,
    description: "Push + fade-in.",
    generate(ctx) {
        const cz = readNumber(ctx.snapshot, "camera", "positionZ", 1.6);
        return [
            track(
                "camera.positionZ",
                "number",
                sample(ctx.durationMs, 6, (u) => cz * (1 + (1 - u) * 0.6)),
            ),
            track(
                "surface.opacity",
                "number",
                sample(ctx.durationMs, 6, (u) => u),
            ),
        ];
    },
};

const floatCombo: AnimationPresetDefinition = {
    id: "combo.float",
    name: "Float",
    category: "Combo",
    defaultDurationMs: 4000,
    description: "Slow orbit + gentle vertical drift.",
    generate(ctx) {
        const cx = readNumber(ctx.snapshot, "camera", "positionX", 1.3);
        const cy = readNumber(ctx.snapshot, "camera", "positionY", 0.9);
        const cz = readNumber(ctx.snapshot, "camera", "positionZ", 1.6);
        const tx = readNumber(ctx.snapshot, "camera", "targetX", 0);
        const tz = readNumber(ctx.snapshot, "camera", "targetZ", 0);
        const dx = cx - tx,
            dz = cz - tz;
        const radius = Math.sqrt(dx * dx + dz * dz);
        const phase0 = Math.atan2(dz, dx);
        return [
            track(
                "camera.positionX",
                "number",
                sample(ctx.durationMs, 14, (u) => tx + Math.cos(phase0 + u * Math.PI * 2) * radius),
            ),
            track(
                "camera.positionZ",
                "number",
                sample(ctx.durationMs, 14, (u) => tz + Math.sin(phase0 + u * Math.PI * 2) * radius),
            ),
            track(
                "camera.positionY",
                "number",
                sample(ctx.durationMs, 14, (u) => cy + Math.sin(u * Math.PI * 4) * 0.12),
            ),
        ];
    },
};

const heroDrop: AnimationPresetDefinition = {
    id: "combo.heroDrop",
    name: "Hero Drop",
    category: "Combo",
    defaultDurationMs: 1800,
    description: "Spin in + emissive glow.",
    generate(ctx) {
        return [
            track(
                "mesh.scale",
                "number",
                sample(ctx.durationMs, 8, (u) => 0.1 + 0.9 * Math.min(1, u * 1.4)),
            ),
            track(
                "emissive.emissiveIntensity",
                "number",
                sample(ctx.durationMs, 8, (u) => Math.max(0, 1.5 - u * 1.5)),
            ),
            track(
                "surface.opacity",
                "number",
                sample(ctx.durationMs, 4, (u) => Math.min(1, u * 2)),
            ),
        ];
    },
};

const stealth: AnimationPresetDefinition = {
    id: "combo.stealth",
    name: "Stealth",
    category: "Combo",
    defaultDurationMs: 5000,
    description: "Slow orbit + dim ramp.",
    generate(ctx) {
        const cx = readNumber(ctx.snapshot, "camera", "positionX", 1.3);
        const cz = readNumber(ctx.snapshot, "camera", "positionZ", 1.6);
        const tx = readNumber(ctx.snapshot, "camera", "targetX", 0);
        const tz = readNumber(ctx.snapshot, "camera", "targetZ", 0);
        const dx = cx - tx,
            dz = cz - tz;
        const radius = Math.sqrt(dx * dx + dz * dz);
        const phase0 = Math.atan2(dz, dx);
        const ki = readNumber(ctx.snapshot, "keyLight", "keyIntensity", 1.1);
        return [
            track(
                "camera.positionX",
                "number",
                sample(ctx.durationMs, 16, (u) => tx + Math.cos(phase0 + u * Math.PI) * radius),
            ),
            track(
                "camera.positionZ",
                "number",
                sample(ctx.durationMs, 16, (u) => tz + Math.sin(phase0 + u * Math.PI) * radius),
            ),
            track(
                "keyLight.keyIntensity",
                "number",
                sample(ctx.durationMs, 8, (u) => ki * (0.4 + 0.3 * Math.cos(u * Math.PI * 2))),
            ),
            track(
                "vignette.vignetteAmount",
                "number",
                sample(ctx.durationMs, 8, (u) => 0.3 + 0.4 * u),
            ),
        ];
    },
};

const showcase: AnimationPresetDefinition = {
    id: "combo.showcase",
    name: "Showcase",
    category: "Combo",
    defaultDurationMs: 4000,
    description: "Orbit + bloom throb.",
    generate(ctx) {
        const cx = readNumber(ctx.snapshot, "camera", "positionX", 1.3);
        const cz = readNumber(ctx.snapshot, "camera", "positionZ", 1.6);
        const tx = readNumber(ctx.snapshot, "camera", "targetX", 0);
        const tz = readNumber(ctx.snapshot, "camera", "targetZ", 0);
        const dx = cx - tx,
            dz = cz - tz;
        const radius = Math.sqrt(dx * dx + dz * dz);
        const phase0 = Math.atan2(dz, dx);
        const bb = readNumber(ctx.snapshot, "bloom", "bloomStrength", 0.6);
        return [
            track(
                "camera.positionX",
                "number",
                sample(ctx.durationMs, 16, (u) => tx + Math.cos(phase0 + u * Math.PI * 2) * radius),
            ),
            track(
                "camera.positionZ",
                "number",
                sample(ctx.durationMs, 16, (u) => tz + Math.sin(phase0 + u * Math.PI * 2) * radius),
            ),
            track(
                "bloom.bloomStrength",
                "number",
                sample(ctx.durationMs, 16, (u) => bb + Math.abs(Math.sin(u * Math.PI * 4)) * 0.6),
            ),
        ];
    },
};

export const BUILTIN_ANIMATION_PRESETS: ReadonlyArray<AnimationPresetDefinition> = [
    orbitSpin,
    halfSpin,
    push,
    pull,
    dollyZoom,
    slowPan,
    tiltSway,
    hueCycle,
    glowPulse,
    fadeIn,
    fadeOut,
    metallicSweep,
    emissiveThrob,
    sunArc,
    lightPulse,
    colorTempShift,
    tripleLightCycle,
    stageFlicker,
    bloomThrob,
    vignetteBreath,
    contrastPunch,
    chromaticWave,
    stressBurst,
    fxaaEdgeWave,
    hover,
    reveal,
    floatCombo,
    heroDrop,
    stealth,
    showcase,
];
