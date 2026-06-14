const KEY_ESCAPE = "Escape";
const KEY_ENTER = "Enter";

function matchKey(key: string): (e: KeyboardEvent) => boolean {
    return (e) => e.key === key;
}

const isEscape = matchKey(KEY_ESCAPE);
const isEnter = matchKey(KEY_ENTER);

export { isEscape, isEnter };
