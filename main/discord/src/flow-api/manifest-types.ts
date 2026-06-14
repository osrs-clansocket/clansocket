export type JSONSchema = Readonly<Record<string, unknown>>;

export interface SideEffectsDescriptor {
    readonly drafts_first?: boolean;
    readonly writes_audit?: boolean;
    readonly writes_outbound?: boolean;
    readonly rate_limit_route?: string;
    readonly emits?: readonly string[];
}

export interface ValidationDescriptor {
    readonly bot_permission?: string;
    readonly clansocket_permission?: string;
    readonly rate_limit_route?: string;
}

export interface OperationSpec<TInput = unknown, TOutput = unknown> {
    readonly input_schema: JSONSchema;
    readonly output_schema: JSONSchema;
    readonly side_effects: SideEffectsDescriptor;
    readonly validation: ValidationDescriptor;
    readonly handler: (input: TInput, ctx: unknown) => Promise<TOutput>;
}

export interface TriggerSpec<TPayload = unknown> {
    readonly event_source: string;
    readonly payload_schema: JSONSchema;
    readonly subscriber: (emit: (payload: TPayload) => void) => () => void;
}

export interface CapabilityManifest {
    readonly name: string;
    readonly version: string;
    readonly operations: Readonly<Record<string, OperationSpec>>;
    readonly triggers: Readonly<Record<string, TriggerSpec>>;
}
