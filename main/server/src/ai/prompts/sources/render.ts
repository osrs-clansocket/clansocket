export function mappedSection<T>(items: readonly T[], render: (item: T) => string, joiner: string = "\n"): string {
    return items.map(render).join(joiner);
}

export function objectLiteral<T>(items: readonly T[], render: (item: T) => string): string {
    return `{\n${mappedSection(items, render, ",\n")}\n    }`;
}
