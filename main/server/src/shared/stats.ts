export function shannonDiversity(values: number[]): number {
    const filtered = values.filter((v) => v > 0);
    if (filtered.length <= 1) return 0;
    const total = filtered.reduce((s, v) => s + v, 0);
    if (total <= 0) return 0;
    let h = 0;
    for (const v of filtered) {
        const p = v / total;
        h -= p * Math.log(p);
    }
    return h / Math.log(filtered.length);
}
