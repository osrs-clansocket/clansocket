export function fmtJoined(joinedAt: string | null): string {
    if (joinedAt === null) return "";
    const date = new Date(joinedAt);
    if (Number.isNaN(date.getTime())) return joinedAt;
    return `joined ${date.toLocaleDateString()}`;
}
