import type { Route } from "./types.js";

export interface RouteDef extends Route {
    description: string;
    example?: string;
}

const defs: RouteDef[] = [];

export function defineRoute(def: RouteDef): void {
    defs.push(def);
}

export function routeDefs(): readonly RouteDef[] {
    return defs;
}
