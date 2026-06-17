import { WOMClient } from "@wise-old-man/utils";
import type { VerifyStatus } from "../../clan-vault/shared/vault-types.js";
import { HTTP_FORBIDDEN, HTTP_NOT_FOUND, HTTP_TOO_MANY_REQUESTS } from "../../shared/http/http-status.js";
import type { WomPayload } from "../types/wom-types.js";

export interface VerifyWomResult {
    status: VerifyStatus;
    public_metadata?: {
        groupId: number;
        groupName: string;
    };
}

interface SdkError {
    statusCode?: number;
    message?: string;
}

function buildClient(payload: WomPayload): WOMClient {
    return new WOMClient({
        apiKey: payload.api_key,
        userAgent: payload.user_agent,
    });
}

function statusFromError(err: unknown): VerifyStatus {
    const sdkErr = err as SdkError;
    if (sdkErr.statusCode === HTTP_FORBIDDEN) return "auth-failed";
    if (sdkErr.statusCode === HTTP_NOT_FOUND) return "auth-failed";
    if (sdkErr.statusCode === HTTP_TOO_MANY_REQUESTS) return "rate-limited";
    return "unreachable";
}

export async function verifyWomCredentials(payload: WomPayload): Promise<VerifyWomResult> {
    const client = buildClient(payload);
    let groupDetails;
    try {
        groupDetails = await client.groups.getGroupDetails(payload.group_id);
    } catch (err) {
        return { status: statusFromError(err) };
    }
    if (groupDetails === undefined) return { status: "unreachable" };
    if (typeof groupDetails.id !== "number" || typeof groupDetails.name !== "string") {
        return { status: "auth-failed" };
    }
    try {
        const updateResult = await client.groups.updateAll(payload.group_id, payload.verification_code);
        if (updateResult === undefined) return { status: "unreachable" };
    } catch (err) {
        return { status: statusFromError(err) };
    }
    return {
        status: "ok",
        public_metadata: { groupId: groupDetails.id, groupName: groupDetails.name },
    };
}
