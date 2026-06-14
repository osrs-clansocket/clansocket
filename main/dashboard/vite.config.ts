import { defineConfig } from "vite";
import { resolve } from "path";
import fs from "fs";
import { compression } from "vite-plugin-compression2";
import { sri } from "vite-plugin-sri3";

const certDir = resolve(__dirname, "..", "server", "certs");
const keyPath = resolve(certDir, "key.pem");
const certPath = resolve(certDir, "cert.pem");

const httpsOpts =
    fs.existsSync(keyPath) && fs.existsSync(certPath)
        ? { key: fs.readFileSync(keyPath), cert: fs.readFileSync(certPath) }
        : true;

if (!process.env.DASHBOARD_PORT) throw new Error("DASHBOARD_PORT env var required");
if (!process.env.SERVER_PORT) throw new Error("SERVER_PORT env var required");
const DASHBOARD_PORT = parseInt(process.env.DASHBOARD_PORT, 10);
const PROXY_TARGET = "https://localhost:" + process.env.SERVER_PORT;

export default defineConfig(() => ({
    root: resolve(__dirname, "..", ".."),
    publicDir: resolve(__dirname, "..", "..", "public"),
    cacheDir: resolve(__dirname, "..", "..", ".cache", "vite-dashboard"),
    build: {
        outDir: resolve(__dirname, "..", "..", "dist"),
        emptyOutDir: true,
        target: "esnext",
        cssMinify: "lightningcss",
        modulePreload: { polyfill: false },
        rollupOptions: {
            input: resolve(__dirname, "..", "..", "index.html"),
            output: {
                manualChunks(id) {
                    if (id.includes("node_modules/marked")) return "vendor-marked";
                    if (id.includes("prismjs/components/")) return "vendor-prism-langs";
                    if (id.endsWith("ai/prism-setup.ts")) return "prism-setup";
                    if (id.includes("node_modules")) return "vendor";
                    if (id.includes("/state/")) return "state";
                    if (id.includes("/managers/")) return "managers";
                    if (id.includes("/components/")) return "components";
                },
                chunkFileNames: "assets/[name]-[hash].js",
                entryFileNames: "assets/[name]-[hash].js",
                assetFileNames: "assets/[name]-[hash][extname]",
            },
            onwarn(warning, defaultHandler) {
                if (typeof warning.message === "string" && warning.message.includes("didn't resolve at build time"))
                    return;
                defaultHandler(warning);
            },
        },
        reportCompressedSize: false,
        chunkSizeWarningLimit: 350,
    },
    resolve: {
        alias: {
            "@": resolve(__dirname, "src"),
            path: resolve(__dirname, "src/stubs/empty-path.ts"),
        },
    },
    plugins: [
        sri(),
        compression({ algorithms: ["brotliCompress"], exclude: [/\.(png|jpg|gif|woff2?)$/], threshold: 256 }),
    ],
    server: {
        https: httpsOpts,
        port: DASHBOARD_PORT,
        fs: {
            strict: true,
            deny: [
                "**/main/server/data/**",
                "**/main/server/certs/**",
                "**/main/server/src/**",
                "**/main/discord/**",
                "**/.env",
                "**/.env.*",
                "**/*.db",
                "**/*.db-journal",
                "**/*.db-wal",
                "**/*.db-shm",
                "**/*.pem",
                "**/*.key",
                "**/.git/**",
                "**/ecosystem.config.*",
                "**/package-lock.json",
                "**/.gitignore",
                "**/.gitattributes",
                "**/.npmrc",
                "**/CLAUDE.md",
            ],
        },
        watch: {
            ignored: [
                "**/main/server/data/**",
                "**/main/server/certs/**",
                "**/.cache/**",
                "**/dist/**",
                "**/.lint-reports/**",
                "**/.lint-cleanup/**",
                "**/node_modules/**",
                "**/public/resources/osrs/**",
            ],
        },
        proxy: {
            "/api": {
                target: PROXY_TARGET,
                changeOrigin: true,
                secure: false,
            },
        },
    },
    optimizeDeps: {
        include: ["marked", "prismjs"],
    },
}));
