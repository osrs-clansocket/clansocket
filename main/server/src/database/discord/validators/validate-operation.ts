import { validateClansocketPermission } from "./clansocket-permission.js";
import { validateRateLimitBudget } from "./rate-limit-budget.js";

export interface OperationContext {
    botId: string;
    clanId: string;
    guildId: string;
    userId: string;
}

export interface OperationValidationSpec {
    requiredClansocketPermission: string;
    rateLimitRoute: string;
    rateLimitScopeKey?: string;
}

export type ValidationFailureKind = "clansocket_permission" | "rate_limit";

export interface ValidationFailure {
    kind: ValidationFailureKind;
    message: string;
    retryAfterMs?: number;
}

export interface OperationValidationResult {
    ok: boolean;
    failures: ValidationFailure[];
}

export function validateOperation(spec: OperationValidationSpec, ctx: OperationContext): OperationValidationResult {
    const failures: ValidationFailure[] = [];
    const permOk = validateClansocketPermission({
        clanId: ctx.clanId,
        guildId: ctx.guildId,
        userId: ctx.userId,
        requiredKey: spec.requiredClansocketPermission,
    });
    if (!permOk) {
        failures.push({
            kind: "clansocket_permission",
            message: `User ${ctx.userId} lacks ${spec.requiredClansocketPermission} for guild ${ctx.guildId}`,
        });
    }
    const rl = validateRateLimitBudget({
        botId: ctx.botId,
        route: spec.rateLimitRoute,
        scopeKey: spec.rateLimitScopeKey,
    });
    if (!rl.ok) {
        failures.push({
            kind: "rate_limit",
            message: `Rate limit hit for route ${spec.rateLimitRoute}`,
            retryAfterMs: rl.retryAfterMs,
        });
    }
    return { ok: failures.length === 0, failures };
}
