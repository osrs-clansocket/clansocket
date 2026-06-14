import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export const CONSOLE_SEPARATOR_WIDTH = 60;

export const SYNC_SEND_OPERATIONS = [
    { local: path.resolve(__dirname, "..", "public") },
];

// directories (relative to each SYNC_SEND_OPERATIONS.local root) that the
// optimizer must NOT traverse. icon font files inside public/fonts/ have
// canonical filenames referenced by generated CSS (auto-gen/icons/*.css,
// elements-global.css). normalizeName() would lowercase + hyphen→underscore
// those filenames, breaking the CSS @font-face url() references and silently
// killing every glyph.
export const EXCLUDED_DIRS = ["fonts"];
