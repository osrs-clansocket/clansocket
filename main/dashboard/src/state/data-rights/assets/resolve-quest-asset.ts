const PATH = "/resources/osrs/game_tab/quests.webp";

export function resolveQuestAsset(
    _table: string,
    _column: string,
    _value: unknown,
    _row: Record<string, unknown>,
): string | null {
    return PATH;
}
