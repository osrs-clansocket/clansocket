import logger from "@clansocket/logger";
import dotenv from "dotenv";
import { app, BrowserWindow, ipcMain } from "electron";
import path from "path";
import { fileURLToPath } from "url";
import { DEV_SERVER, PATHS, PROD_SERVER, WINDOW } from "./constants.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();

const isDev = process.env.NODE_ENV === "development";

app.setPath("userData", path.join(app.getPath("appData"), PATHS.USER_DATA_DIR));

if (isDev) {
    app.commandLine.appendSwitch("ignore-certificate-errors");
}

ipcMain.on("window-minimize", (e) => {
    const w = BrowserWindow.fromWebContents(e.sender);
    if (w) w.minimize();
});

ipcMain.on("window-maximize-toggle", (e) => {
    const w = BrowserWindow.fromWebContents(e.sender);
    if (!w) return;
    if (w.isMaximized()) w.unmaximize();
    else w.maximize();
});

ipcMain.on("window-close", (e) => {
    const w = BrowserWindow.fromWebContents(e.sender);
    if (w) w.close();
});

async function createWindow() {
    const preloadPath = path.join(__dirname, "preload.cjs");

    const mainWindow = new BrowserWindow({
        width: WINDOW.DEFAULT_WIDTH,
        height: WINDOW.DEFAULT_HEIGHT,
        minWidth: WINDOW.MIN_WIDTH,
        minHeight: WINDOW.MIN_HEIGHT,
        autoHideMenuBar: !isDev,
        frame: false,
        icon: path.join(__dirname, PATHS.ICON_RELATIVE),
        show: false,
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            preload: preloadPath,
        },
    });

    const url = isDev ? DEV_SERVER.URL : PROD_SERVER.URL;

    logger.info(`Loading frontend from ${url}...`);
    try {
        await mainWindow.loadURL(url);
        mainWindow.show();
        logger.info("Frontend loaded successfully");
    } catch (err) {
        logger.error("Failed to load frontend", { error: err.message });
        await mainWindow.loadURL("data:text/html,<h1>Error loading frontend</h1><p>Error: " + err.message + "</p>");
        mainWindow.show();
    }
}

app.whenReady().then(createWindow);

app.on("window-all-closed", () => {
    if (process.platform !== "darwin") {
        app.quit();
    }
});

app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
        createWindow();
    }
});

app.on("before-quit", (event) => {
    event.preventDefault();
    const cleanup = async () => {
        const windows = BrowserWindow.getAllWindows();
        for (const window of windows) {
            window.close();
        }
    };
    cleanup().finally(() => {
        app.exit(0);
    });
});
