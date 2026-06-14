import { LOG_CONSTANTS, TIMING_CONSTANTS } from "../../constants/index.js";

export class DeployLogger {
    constructor() {
        this.steps = [];
        this.lastStepTime = Date.now();
    }

    log(message) {
        const timestamp = new Date().toLocaleTimeString();
        this.steps.push(`[${timestamp}] ${message}`);
        console.log(message);
    }

    stepDuration() {
        const now = Date.now();
        const duration = ((now - this.lastStepTime) / TIMING_CONSTANTS.MILLISECONDS_TO_SECONDS).toFixed(2);
        this.lastStepTime = now;
        return duration;
    }

    logWithDuration(message) {
        this.log(`${message} (${this.stepDuration()}s)`);
    }

    getSteps() {
        return this.steps;
    }

    getStepsSummary() {
        return this.steps.join("\n");
    }

    getTruncatedSteps(maxLength = LOG_CONSTANTS.MESSAGE_TRUNCATE_LENGTH) {
        const summary = this.getStepsSummary();
        return summary.length > maxLength ? `${summary.slice(0, maxLength)}... (truncated)` : summary;
    }

    error(...args) {
        console.error(...args);
    }

    warn(...args) {
        console.warn(...args);
    }
}
