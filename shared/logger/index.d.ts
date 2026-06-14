export interface ErrorData {
    X?: string;
    Y?: string;
    Z?: string;
    W?: string;
    remediation?: string;
    stack?: string;
    error?: string;
}

export interface Logger {
    info(message: string): void;
    warn(message: string): void;
    error(message: string, data?: ErrorData | Error | string): void;
    debug(message: string, data?: Record<string, unknown>): void;
    write(level: "log" | "info" | "warn" | "error" | "debug", message: string, data?: Record<string, unknown>): void;
}

export declare const info: Logger["info"];
export declare const warn: Logger["warn"];
export declare const error: Logger["error"];
export declare const debug: Logger["debug"];
export declare const write: Logger["write"];

declare const logger: Logger;
export default logger;
