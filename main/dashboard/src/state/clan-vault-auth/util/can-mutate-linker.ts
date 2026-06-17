export interface LinkerGateInput {
    linkerSiteAccountId: string;
    clanOwnerSiteAccountId: string | null;
}

export interface LinkerGateResult {
    canMutate: boolean;
    isOwnerOverride: boolean;
    canReassign: boolean;
}

export function canMutateLinker(input: LinkerGateInput, currentUserId: string): LinkerGateResult {
    const isLinker = currentUserId === input.linkerSiteAccountId;
    const isClanOwner = input.clanOwnerSiteAccountId !== null && currentUserId === input.clanOwnerSiteAccountId;
    const canMutate = isLinker || isClanOwner;
    const isOwnerOverride = canMutate && !isLinker;
    const canReassign = isClanOwner && !isLinker;
    return { canMutate, isOwnerOverride, canReassign };
}
