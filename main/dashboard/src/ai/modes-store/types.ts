export type ModeKey =
    | "mode_continuous"
    | "mode_dashboard_actions"
    | "mode_db_queries"
    | "mode_memory_authoring"
    | "mode_pin_unpin"
    | "mode_profile_updates"
    | "mode_suggested_replies"
    | "mode_banter"
    | "mode_inside_jokes"
    | "mode_spontaneous_reactions"
    | "mode_op_action"
    | "mode_op_guide"
    | "mode_op_tracker";

export type ModeTier = "live" | "capabilities" | "personality" | "operating";

export interface ModeMeta {
    readonly key: ModeKey;
    readonly tier: ModeTier;
    readonly displayName: string;
    readonly icon: string;
    readonly defaultOn: boolean;
    readonly dependsOn?: readonly ModeKey[];
}

export type ModesOverrides = Readonly<Partial<Record<ModeKey, boolean>>>;
