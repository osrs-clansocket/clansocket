export interface SessionEntry {
    turn: number;
    they: string;
    i: string;
    learned?: string;
    fix?: string;
    failure?: string;
}

export interface ProfileContext {
    identity: Record<string, string>;
    session: SessionEntry[];
    focus: string | null;
}

export interface StoredProfile {
    identity: Record<string, string>;
    session: SessionEntry[];
    focus: string | null;
    lastTurn: number;
    updatedAt: number;
}
