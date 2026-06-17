import type { Group } from "three";
import { DEFAULT_MOTION, TILT_LERP } from "../../shared/constants/voxlab/motion-constants.js";
import type { CursorService } from "./services/cursor-service.js";
import type { MotionSettings } from "../../shared/types/voxlab/motion-types.js";

export class MotionManager {
    private settings: MotionSettings = { ...DEFAULT_MOTION };
    private currentTiltX = 0;
    private currentTiltY = 0;

    constructor(private readonly cursor: CursorService) {}

    updateSettings(settings: MotionSettings): void {
        this.settings = settings;
    }

    apply(group: Group, nowMs: number): void {
        this.applyBreathe(group, nowMs);
        this.applyBob(group, nowMs);
        this.applyTilt(group);
    }

    reset(group: Group): void {
        group.scale.setScalar(1);
        group.position.y = 0;
        group.rotation.x = 0;
        group.rotation.y = 0;
        this.currentTiltX = 0;
        this.currentTiltY = 0;
    }

    private applyBreathe(group: Group, nowMs: number): void {
        if (!this.settings.breatheEnabled) {
            group.scale.setScalar(1);
            return;
        }
        const phase = (nowMs / this.settings.breathePeriodMs) * Math.PI * 2;
        group.scale.setScalar(1 + Math.sin(phase) * this.settings.breatheAmplitude);
    }

    private applyBob(group: Group, nowMs: number): void {
        if (!this.settings.bobEnabled) {
            group.position.y = 0;
            return;
        }
        const phase = (nowMs / this.settings.bobPeriodMs) * Math.PI * 2;
        group.position.y = Math.sin(phase) * this.settings.bobAmplitude;
    }

    private applyTilt(group: Group): void {
        const targetX = this.settings.tiltEnabled ? this.cursor.ndc.y * this.settings.tiltStrength : 0;
        const targetY = this.settings.tiltEnabled ? this.cursor.ndc.x * this.settings.tiltStrength : 0;
        this.currentTiltX += (targetX - this.currentTiltX) * TILT_LERP;
        this.currentTiltY += (targetY - this.currentTiltY) * TILT_LERP;
        group.rotation.x = this.currentTiltX;
        group.rotation.y = this.currentTiltY;
    }
}
