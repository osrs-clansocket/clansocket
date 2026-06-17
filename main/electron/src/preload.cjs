const { contextBridge, ipcRenderer } = require("electron");

const pathSep = process.platform === "win32" ? "\\" : "/";

function joinPathSegments(segments) {
    const joined = segments.filter(Boolean).join(pathSep);
    let result = "";
    let prevWasSep = false;
    for (let i = 0; i < joined.length; i++) {
        const ch = joined[i];
        const isSep = ch === "/" || ch === "\\";
        if (isSep) {
            if (!prevWasSep) result += pathSep;
            prevWasSep = true;
        } else {
            result += ch;
            prevWasSep = false;
        }
    }
    return result;
}

function lastSepIndex(filePath) {
    const fwd = filePath.lastIndexOf("/");
    const bck = filePath.lastIndexOf("\\");
    return fwd > bck ? fwd : bck;
}

function dirname(filePath) {
    const idx = lastSepIndex(filePath);
    return idx === -1 ? "." : filePath.slice(0, idx);
}

function basename(filePath) {
    const idx = lastSepIndex(filePath);
    return idx === -1 ? filePath : filePath.slice(idx + 1);
}

function parsePath(filePath) {
    const dir = dirname(filePath);
    const base = basename(filePath);
    const lastDot = base.lastIndexOf(".");
    return {
        dir,
        base,
        name: lastDot === -1 ? base : base.slice(0, lastDot),
        ext: lastDot === -1 ? "" : base.slice(lastDot),
    };
}

contextBridge.exposeInMainWorld("PRELOAD_CONFIG", {
    NODE_ENV: process.env.NODE_ENV || "production",
});

contextBridge.exposeInMainWorld("electronAPI", {
    isElectron: true,
    platform: process.platform,
    path: {
        join: (...paths) => joinPathSegments(paths),
        dirname,
        basename,
        resolve: (filePath) => filePath,
        parse: parsePath,
        sep: pathSep,
    },
    process: {
        cwd: () => process.cwd(),
    },
});

const HEADER_INTEGRATION_CSS = `
.dashboard__header {
    -webkit-app-region: drag;
}
.dashboard__header a,
.dashboard__header button,
.dashboard__header input,
.dashboard__header select,
.dashboard__header textarea,
.dashboard__header label,
.dashboard__header [role="button"],
.dashboard__header [tabindex] {
    -webkit-app-region: no-drag;
}
.electron-window-control .bi {
    font-size: var(--icon-md);
    line-height: var(--lh-flat);
}
.electron-window-control {
    transition:
        color var(--dur-fast) var(--ease-out),
        background var(--dur-fast) var(--ease-out),
        transform var(--dur-fast) var(--ease-out);
}
.electron-window-control:hover {
    transform: translateY(calc(-1 * var(--sp-hairline)));
}
.electron-window-control:active {
    transform: translateY(0);
}
.electron-window-control--min:hover,
.electron-window-control--max:hover {
    color: var(--base-gold-500);
    background: rgb(from var(--base-gold-500) r g b / 0.08);
}
.electron-window-control--close:hover {
    color: var(--base-ember-100);
    background: rgb(from var(--base-ember-300) r g b / 0.12);
}
`;

function injectHeaderCSS() {
    const style = document.createElement("style");
    style.id = "electron-header-integration";
    style.textContent = HEADER_INTEGRATION_CSS;
    document.head.appendChild(style);
}

function buildIconBtn(id, ariaLabel, biIconClass, modifierClass) {
    const btn = document.createElement("button");
    btn.id = id;
    btn.type = "button";
    btn.className = "iconbtn electron-window-control " + modifierClass;
    btn.setAttribute("aria-label", ariaLabel);
    btn.setAttribute("title", ariaLabel);
    const icon = document.createElement("span");
    icon.className = "bi " + biIconClass;
    icon.setAttribute("aria-hidden", "true");
    btn.appendChild(icon);
    return btn;
}

function buildWindowControls() {
    const min = buildIconBtn("electron-btn-min", "Minimize", "bi-dash", "electron-window-control--min");
    const max = buildIconBtn("electron-btn-max", "Maximize", "bi-square", "electron-window-control--max");
    const close = buildIconBtn("electron-btn-close", "Close", "bi-x", "electron-window-control--close");
    min.addEventListener("click", () => ipcRenderer.send("window-minimize"));
    max.addEventListener("click", () => ipcRenderer.send("window-maximize-toggle"));
    close.addEventListener("click", () => ipcRenderer.send("window-close"));
    return [min, max, close];
}

function mountIntoControls(controlsEl) {
    if (controlsEl.querySelector(".electron-window-control")) return;
    const buttons = buildWindowControls();
    for (const btn of buttons) controlsEl.appendChild(btn);
}

function waitForControls(callback) {
    const existing = document.querySelector(".dashboard__controls");
    if (existing) {
        callback(existing);
        return;
    }
    const observer = new MutationObserver(() => {
        const found = document.querySelector(".dashboard__controls");
        if (found) {
            observer.disconnect();
            callback(found);
        }
    });
    observer.observe(document.body, { childList: true, subtree: true });
}

function injectAll() {
    injectHeaderCSS();
    waitForControls(mountIntoControls);
}

if (document.readyState === "loading") {
    window.addEventListener("DOMContentLoaded", injectAll);
} else {
    injectAll();
}
