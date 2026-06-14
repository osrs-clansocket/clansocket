export const MOODS = ["serious", "light", "meme"] as const;
export type Mood = (typeof MOODS)[number];

export const SERIOUS = MOODS[0];
export const LIGHT = MOODS[1];
export const MEME = MOODS[2];

export interface Quip {
    text: string;
    mood: Mood;
}

export type QuipSet = readonly Quip[];

export const MOOD_LABELS: Record<Mood, string> = {
    [SERIOUS]: "",
    [LIGHT]: "— Varez, probably",
    [MEME]: "— Varez, currently unreachable",
};

export function q(mood: Mood, text: string): Quip {
    return { text, mood };
}
