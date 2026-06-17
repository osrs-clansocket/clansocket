const MODULE_NAME = "@voxlab/raster-to-mesh";
const MODULE_COLOR_BROWSER = "#0fb5b5";
const MODULE_COLOR_NODE = "\x1b[36m";

const LEVEL_COLORS = {
    trace: { browser: "#94a3b8", node: "\x1b[90m" },
    debug: { browser: "#a78bfa", node: "\x1b[35m" },
    info: { browser: "#60a5fa", node: "\x1b[34m" },
    warn: { browser: "#fbbf24", node: "\x1b[33m" },
    error: { browser: "#f87171", node: "\x1b[31m" },
};

const RESET_NODE = "\x1b[0m";
const GRAY_NODE = "\x1b[90m";
const PAD_WIDTH = 2;

export type LogLevel = "trace" | "debug" | "info" | "warn" | "error";

export interface RemediationHint {
    pattern: string;
    action: string;
    docsUrl?: string;
}

export interface LogContext {
    remediation?: RemediationHint;
    error?: Error;
    [key: string]: unknown;
}

export interface PackageLogger {
    setVerbose(verbose: boolean): void;
    isVerbose(): boolean;
    setMinLevel(level: LogLevel): void;
    trace(message: string, context?: LogContext): void;
    debug(message: string, context?: LogContext): void;
    info(message: string, context?: LogContext): void;
    warn(message: string, context?: LogContext): void;
    error(message: string, context?: LogContext): void;
}

const LEVEL_ORDER: Record<LogLevel, number> = { trace: 0, debug: 1, info: 2, warn: 3, error: 4 };

export interface LoggerOptions {
    verbose?: boolean;
    minLevel?: LogLevel;
}

interface FormatInput {
    level: LogLevel;
    message: string;
    context: LogContext | undefined;
    verbose: boolean;
}

const IS_BROWSER =
    typeof globalThis !== "undefined" && typeof (globalThis as { window?: unknown }).window !== "undefined";

function formatTimestamp(): string {
    const d = new Date();
    const pad = (n: number) => n.toString().padStart(PAD_WIDTH, "0");
    return `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

function formatRemediation(r: RemediationHint | undefined): string {
    if (!r) {
        return "";
    }
    return r.docsUrl ? ` ↪ ${r.action} (${r.docsUrl})` : ` ↪ ${r.action}`;
}

function formatNode(input: FormatInput): string {
    const ts = formatTimestamp();
    const c = LEVEL_COLORS[input.level].node;
    const stack = input.verbose && input.context?.error?.stack ? `\n${input.context.error.stack}` : "";
    const remediation = formatRemediation(input.context?.remediation);
    return `${GRAY_NODE}[${ts}]${RESET_NODE} ${MODULE_COLOR_NODE}${MODULE_NAME}${RESET_NODE} ${c}${input.level.toUpperCase()}${RESET_NODE} ${input.message}${remediation}${stack}`;
}

function formatBrowser(input: FormatInput): [string, ...string[]] {
    const ts = formatTimestamp();
    const c = LEVEL_COLORS[input.level].browser;
    const remediation = formatRemediation(input.context?.remediation);
    const fmt = `%c[${ts}] %c${MODULE_NAME} %c${input.level.toUpperCase()}%c ${input.message}${remediation}`;
    return [
        fmt,
        "color: #94a3b8",
        `color: ${MODULE_COLOR_BROWSER}; font-weight: bold`,
        `color: ${c}; font-weight: bold`,
        "color: inherit",
    ];
}

function writeConsole(level: LogLevel, args: unknown[]): void {
    if (level === "error") {
        console.error(...args);
    } else if (level === "warn") {
        console.warn(...args);
    } else {
        console.log(...args);
    }
}

class RasterToMeshLogger implements PackageLogger {
    private verbose: boolean;
    private minLevel: number;

    constructor(opts: LoggerOptions = {}) {
        this.verbose = opts.verbose ?? false;
        this.minLevel = LEVEL_ORDER[opts.minLevel ?? "info"];
    }

    setVerbose(verbose: boolean): void {
        this.verbose = verbose;
    }

    isVerbose(): boolean {
        return this.verbose;
    }

    setMinLevel(level: LogLevel): void {
        this.minLevel = LEVEL_ORDER[level];
    }

    private write(level: LogLevel, message: string, context?: LogContext): void {
        if (LEVEL_ORDER[level] < this.minLevel) {
            return;
        }
        const input: FormatInput = { level, message, context, verbose: this.verbose };
        if (IS_BROWSER) {
            writeConsole(level, formatBrowser(input));
            if (this.verbose && context?.error?.stack) {
                console.log(context.error.stack);
            }
        } else {
            writeConsole(level, [formatNode(input)]);
        }
    }

    trace(message: string, context?: LogContext): void {
        this.write("trace", message, context);
    }
    debug(message: string, context?: LogContext): void {
        this.write("debug", message, context);
    }
    info(message: string, context?: LogContext): void {
        this.write("info", message, context);
    }
    warn(message: string, context?: LogContext): void {
        this.write("warn", message, context);
    }
    error(message: string, context?: LogContext): void {
        this.write("error", message, context);
    }
}

export { RasterToMeshLogger as Logger };

export function createLogger(opts?: LoggerOptions): PackageLogger {
    return new RasterToMeshLogger(opts);
}

export const DEFAULT_LOGGER: PackageLogger = createLogger();
