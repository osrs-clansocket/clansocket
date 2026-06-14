export function sameOriginFetch(input: RequestInfo, init: RequestInit = {}): Promise<Response> {
    return fetch(input, { ...init, credentials: "same-origin" });
}
