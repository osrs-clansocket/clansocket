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

export interface AssembledPrompt {
    system: string;
    loadedIds: string[];
}

export type ChainMode = "reactive" | "continuous";

export interface DomElement {
    tag: string;
    classes: string;
    text: string;
    visible: boolean;
    context?: string;
    meta?: string;
    value?: string;
    placeholder?: string;
    checked?: boolean;
    disabled?: boolean;
    href?: string;
}
