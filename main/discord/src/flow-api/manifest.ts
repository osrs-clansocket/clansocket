import type { CapabilityManifest, JSONSchema, OperationSpec } from "./manifest-types.js";
import { addSubscriber } from "./trigger-bus.js";

const CHANNEL_TRIGGER_PAYLOAD_SCHEMA: JSONSchema = {
    type: "object",
    properties: {
        id: { type: "string" },
        name: { type: "string" },
        guildId: { type: "string" },
        type: { type: "number" },
    },
    required: ["id", "name", "guildId", "type"],
};

const CHANNEL_STATE_SCHEMA: JSONSchema = {
    type: "object",
    properties: {
        name: { type: "string" },
        topic: { type: ["string", "null"] },
        nsfw: { type: "boolean" },
        rateLimitPerUser: { type: "number" },
        parentId: { type: ["string", "null"] },
    },
    required: ["name"],
};

const ENQUEUE_RESULT_SCHEMA: JSONSchema = {
    type: "object",
    properties: {
        sessionId: { type: "string" },
        changeId: { type: "string" },
        queueId: { type: "string" },
        tempId: { type: "string" },
    },
    required: ["sessionId", "changeId", "queueId"],
};

const TRIGGER_CHANNEL_CREATED = "discord:channels.created";
const TRIGGER_CHANNEL_UPDATED = "discord:channels.updated";
const TRIGGER_CHANNEL_DELETED = "discord:channels.deleted";

const BOT_PERM_MANAGE_CHANNELS = "ManageChannels";

const NOT_WIRED_MSG = "Flow engine integration pending; operation invocation deferred to flow engine workstream";

async function notYetWiredHandler(): Promise<never> {
    throw new Error(NOT_WIRED_MSG);
}

function makeChannelOp(
    clansocketPermission: string,
    rateLimitRoute: string,
    emits: readonly string[],
    inputSchema: JSONSchema,
): OperationSpec {
    return {
        input_schema: inputSchema,
        output_schema: ENQUEUE_RESULT_SCHEMA,
        side_effects: { drafts_first: true, writes_audit: true, rate_limit_route: rateLimitRoute, emits },
        validation: { bot_permission: BOT_PERM_MANAGE_CHANNELS, clansocket_permission: clansocketPermission },
        handler: notYetWiredHandler,
    };
}

const CREATE_INPUT: JSONSchema = {
    type: "object",
    properties: {
        userId: { type: "string" },
        name: { type: "string" },
        channelType: { type: "number" },
        parentId: { type: ["string", "null"] },
        topic: { type: ["string", "null"] },
        nsfw: { type: "boolean" },
        rateLimitPerUser: { type: "number" },
    },
    required: ["userId", "name", "channelType"],
};

const UPDATE_INPUT: JSONSchema = {
    type: "object",
    properties: {
        userId: { type: "string" },
        channelId: { type: "string" },
        before: CHANNEL_STATE_SCHEMA,
        after: CHANNEL_STATE_SCHEMA,
    },
    required: ["userId", "channelId", "before", "after"],
};

const DELETE_INPUT: JSONSchema = {
    type: "object",
    properties: {
        userId: { type: "string" },
        channelId: { type: "string" },
        channelName: { type: "string" },
        channelType: { type: "number" },
    },
    required: ["userId", "channelId", "channelName", "channelType"],
};

const MOVE_INPUT: JSONSchema = {
    type: "object",
    properties: {
        userId: { type: "string" },
        channelId: { type: "string" },
        beforePosition: { type: "number" },
        afterPosition: { type: "number" },
        beforeParentId: { type: ["string", "null"] },
        afterParentId: { type: ["string", "null"] },
    },
    required: ["userId", "channelId", "beforePosition", "afterPosition"],
};

const SET_PERMISSIONS_INPUT: JSONSchema = {
    type: "object",
    properties: {
        userId: { type: "string" },
        channelId: { type: "string" },
        channelName: { type: "string" },
        overwriteKind: { enum: ["role", "member"] },
        overwriteTargetId: { type: "string" },
        overwriteTargetName: { type: "string" },
        allow: { type: "string" },
        deny: { type: "string" },
    },
    required: ["userId", "channelId", "overwriteKind", "overwriteTargetId", "allow", "deny"],
};

export const manifest: CapabilityManifest = {
    name: "discord",
    version: "0.1.0",
    operations: {
        "discord:channels.create": makeChannelOp(
            "discord:channels.create",
            "/guilds/:id/channels",
            [TRIGGER_CHANNEL_CREATED],
            CREATE_INPUT,
        ),
        "discord:channels.update": makeChannelOp(
            "discord:channels.update",
            "/channels/:id",
            [TRIGGER_CHANNEL_UPDATED],
            UPDATE_INPUT,
        ),
        "discord:channels.delete": makeChannelOp(
            "discord:channels.delete",
            "/channels/:id",
            [TRIGGER_CHANNEL_DELETED],
            DELETE_INPUT,
        ),
        "discord:channels.move": makeChannelOp(
            "discord:channels.move",
            "/channels/:id",
            [TRIGGER_CHANNEL_UPDATED],
            MOVE_INPUT,
        ),
        "discord:channels.set-permissions": makeChannelOp(
            "discord:channels.set-permissions",
            "/channels/:id/permissions/:overwriteId",
            [TRIGGER_CHANNEL_UPDATED],
            SET_PERMISSIONS_INPUT,
        ),
    },
    triggers: {
        [TRIGGER_CHANNEL_CREATED]: {
            event_source: "discord.gateway.channelCreate",
            payload_schema: CHANNEL_TRIGGER_PAYLOAD_SCHEMA,
            subscriber: (emit) => addSubscriber(TRIGGER_CHANNEL_CREATED, emit),
        },
        [TRIGGER_CHANNEL_UPDATED]: {
            event_source: "discord.gateway.channelUpdate",
            payload_schema: CHANNEL_TRIGGER_PAYLOAD_SCHEMA,
            subscriber: (emit) => addSubscriber(TRIGGER_CHANNEL_UPDATED, emit),
        },
        [TRIGGER_CHANNEL_DELETED]: {
            event_source: "discord.gateway.channelDelete",
            payload_schema: CHANNEL_TRIGGER_PAYLOAD_SCHEMA,
            subscriber: (emit) => addSubscriber(TRIGGER_CHANNEL_DELETED, emit),
        },
    },
};
