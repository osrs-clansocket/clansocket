const SEPARATOR = " | ";
const MIDDLE_DOT = " · ";
const UNKNOWN_RSN = "?";

export interface CategoryUsernameInput {
    emoji: string | null;
    category: string;
    subject: string | null;
    clanName: string | null;
}

export function assembleCategoryUsername(input: CategoryUsernameInput): string {
    const head = input.emoji !== null && input.emoji.length > 0 ? `${input.emoji} ${input.category}` : input.category;
    const segments: string[] = [head];
    if (input.subject !== null && input.subject.length > 0) segments.push(input.subject);
    if (input.clanName !== null && input.clanName.length > 0) segments.push(input.clanName);
    return segments.join(SEPARATOR);
}

export interface ClanChatUsernameInput {
    emoji: string | null;
    rsn: string;
    rank: string | null;
    clanName: string | null;
}

function clanChatRsnSegment(rsn: string, clanName: string | null): string {
    if (rsn.length === 0) return clanName !== null && clanName.length > 0 ? clanName : UNKNOWN_RSN;
    if (clanName !== null && rsn.toLowerCase() === clanName.toLowerCase()) return clanName;
    return rsn;
}

export function assembleClanChatUsername(input: ClanChatUsernameInput): string {
    const rsnSegment = clanChatRsnSegment(input.rsn, input.clanName);
    const head = input.emoji !== null && input.emoji.length > 0 ? `${input.emoji} ${rsnSegment}` : rsnSegment;
    const withRank = input.rank !== null && input.rank.length > 0 ? `${head}${MIDDLE_DOT}${input.rank}` : head;
    if (input.clanName !== null && input.clanName.length > 0 && rsnSegment !== input.clanName) {
        return `${withRank}${SEPARATOR}${input.clanName}`;
    }
    return withRank;
}
