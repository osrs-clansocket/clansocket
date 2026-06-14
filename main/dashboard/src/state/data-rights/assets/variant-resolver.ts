export type VariantTier = readonly [threshold: number, id: number];
export type VariantRegistry = Record<string, ReadonlyArray<VariantTier>>;

export function resolveVariant(registry: VariantRegistry, baseId: number, contextValue: number | null): number {
    const variants = registry[String(baseId)];
    if (variants === undefined || contextValue === null) return baseId;
    let chosen = baseId;
    for (const tier of variants) {
        if (contextValue >= tier[0]) chosen = tier[1];
    }
    return chosen;
}
