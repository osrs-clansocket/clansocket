const NUMERIC_OPERATORS: ReadonlySet<string> = new Set(["gt", "gte", "lt", "lte"]);

export function isNumericOperator(op: string): boolean {
    return NUMERIC_OPERATORS.has(op);
}

const CONTAINS_OPERATOR = "contains";

export function isContainsOperator(op: string): boolean {
    return op === CONTAINS_OPERATOR;
}
