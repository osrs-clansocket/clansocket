const PATH = "/resources/osrs/game_tab/quests_green_achievement_diaries.webp";

export function resolveDiaryAsset(
    _table: string,
    _column: string,
    _value: unknown,
    _row: Record<string, unknown>,
): string | null {
    return PATH;
}
