const UNICODE_BY_CATEGORY: Record<string, string> = {
    Loot: "💰",
    Drop: "💰",
    Pet: "🐾",
    Promote: "📈",
    Demote: "📉",
    Kick: "🚫",
    Join: "➕",
    Leave: "➖",
    Level: "⭐",
    Quest: "📜",
    Quests: "📜",
    Achievement: "🏆",
    Broadcast: "📢",
    Slayer: "☠️",
    Collection: "🗃️",
    CAs: "🎖️",
    Bank: "🏦",
    Diary: "📖",
    Diaries: "📖",
    Clue: "🗝️",
    Death: "💀",
    Actions: "🎮",
    Farming: "🌱",
};

export interface CategoryEmoji {
    unicode: string | null;
    appEmojiName: string | null;
    appEmojiId: string | null;
    publicAssetPath: string | null;
}

export function lookupCategoryEmoji(category: string): CategoryEmoji {
    return {
        unicode: UNICODE_BY_CATEGORY[category] ?? null,
        appEmojiName: null,
        appEmojiId: null,
        publicAssetPath: null,
    };
}
