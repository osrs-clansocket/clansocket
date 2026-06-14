import "dotenv/config";
import { spawn, spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const APP_ROOT = path.resolve(__dirname, "..", "..");

const RESET = "\x1b[0m";
const COLORS = {
	launcher: "\x1b[90m",
	server: "\x1b[97m",
	discord: "\x1b[94m",
	dashboard: "\x1b[93m",
};
const EMOJIS = {
	launcher: "📡",
	server: "⚡",
	discord: "👾",
	dashboard: "🖥️ ",
};
const MONTHS = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];

function requirePort(name) {
	const raw = process.env[name];
	if (!raw) throw new Error("env var " + name + " required (set in .env)");
	const n = parseInt(raw, 10);
	if (!Number.isFinite(n) || n <= 0) throw new Error("env var " + name + " invalid port: " + raw);
	return n;
}

const SERVER_PORT = requirePort("SERVER_PORT");
const DASHBOARD_PORT = requirePort("DASHBOARD_PORT");
const DEV_PORTS = [SERVER_PORT, DASHBOARD_PORT];

function pad2(n) {
	return n < 10 ? "0" + n : String(n);
}

function isDigit(c) {
	const k = c.charCodeAt(0);
	return k >= 48 && k <= 57;
}

function allDigits(s) {
	if (s.length === 0) return false;
	for (let i = 0; i < s.length; i++) {
		if (!isDigit(s.charAt(i))) return false;
	}
	return true;
}

function splitWhitespace(s) {
	const out = [];
	let buf = "";
	for (let i = 0; i < s.length; i++) {
		const c = s.charAt(i);
		if (c === " " || c === "\t" || c === "\r") {
			if (buf.length > 0) {
				out.push(buf);
				buf = "";
			}
		} else {
			buf += c;
		}
	}
	if (buf.length > 0) out.push(buf);
	return out;
}

function lineContainsPort(line, port) {
	const needle = ":" + port;
	let idx = line.indexOf(needle);
	while (idx >= 0) {
		const nextIdx = idx + needle.length;
		if (nextIdx >= line.length) return true;
		const nc = line.charAt(nextIdx);
		if (nc === " " || nc === "\t" || nc === "\r") return true;
		idx = line.indexOf(needle, nextIdx);
	}
	return false;
}

function formatTimestamp(d) {
	return (
		pad2(d.getDate()) + " " + MONTHS[d.getMonth()] + " " + pad2(d.getFullYear() % 100) +
		" - " + pad2(d.getHours()) + ":" + pad2(d.getMinutes()) + ":" + pad2(d.getSeconds())
	);
}

function stripIsoPrefix(line) {
	if (line.length < 6 || line.charAt(0) !== "[") return line;
	const close = line.indexOf("]");
	if (close < 5) return line;
	for (let i = 1; i < 5; i++) if (!isDigit(line.charAt(i))) return line;
	let rest = line.slice(close + 1);
	if (rest.charAt(0) === " ") rest = rest.slice(1);
	return rest;
}

function wrapLine(proc, line) {
	return (
		COLORS[proc] + EMOJIS[proc] + " [" + formatTimestamp(new Date()) +
		"](🛠️  " + proc + "): " + stripIsoPrefix(line) + RESET
	);
}

function logProc(proc, msg) {
	process.stdout.write(wrapLine(proc, msg) + "\n");
}

function flushLines(buf, proc) {
	let rest = buf;
	let nl = rest.indexOf("\n");
	while (nl >= 0) {
		const line = rest.slice(0, nl);
		if (line.length > 0) process.stdout.write(wrapLine(proc, line) + "\n");
		rest = rest.slice(nl + 1);
		nl = rest.indexOf("\n");
	}
	return rest;
}

function pipeChild(child, proc) {
	let outBuf = "";
	let errBuf = "";
	child.stdout.on("data", (c) => { outBuf = flushLines(outBuf + c.toString(), proc); });
	child.stderr.on("data", (c) => { errBuf = flushLines(errBuf + c.toString(), proc); });
}

function spawnChild(cmd, args, proc) {
	const child = spawn(cmd, args, {
		stdio: ["ignore", "pipe", "pipe"],
		shell: true,
		cwd: APP_ROOT,
		env: { ...process.env },
	});
	pipeChild(child, proc);
	return child;
}

function killTree(child) {
	if (!child || child.killed) return;
	if (process.platform === "win32") {
		spawnSync("taskkill", ["/pid", String(child.pid), "/f", "/t"], { stdio: "ignore" });
	} else {
		child.kill();
	}
}

function collectPidsHoldingPort(stdout, port) {
	const pids = new Set();
	const lines = stdout.split("\n");
	for (const line of lines) {
		if (!lineContainsPort(line, port)) continue;
		const tokens = splitWhitespace(line);
		const last = tokens[tokens.length - 1];
		if (last && allDigits(last) && last !== "0") pids.add(last);
	}
	return pids;
}

function freePort(port) {
	if (process.platform === "win32") {
		const result = spawnSync("netstat", ["-ano"], { encoding: "utf8" });
		if (!result.stdout) return;
		const pids = collectPidsHoldingPort(result.stdout, port);
		for (const pid of pids) {
			spawnSync("taskkill", ["/F", "/PID", pid], { stdio: "ignore" });
		}
	} else {
		spawnSync("sh", ["-c", "lsof -ti:" + port + " | xargs -r kill -9"], { stdio: "ignore" });
	}
}

function freePorts() {
	for (const port of DEV_PORTS) {
		logProc("launcher", "freeing port " + port);
		freePort(port);
	}
}

function waitForChildLog(child, needle, timeoutMs = 30000) {
	return new Promise((resolve, reject) => {
		let buf = "";
		const timer = setTimeout(() => {
			child.stdout.off("data", listener);
			reject(new Error("timeout waiting for '" + needle + "'"));
		}, timeoutMs);
		const listener = (chunk) => {
			buf += chunk.toString();
			if (buf.indexOf(needle) >= 0) {
				clearTimeout(timer);
				child.stdout.off("data", listener);
				resolve();
			}
		};
		child.stdout.on("data", listener);
	});
}

async function main() {
	logProc("launcher", "starting dev environment");
	logProc("launcher", "server=" + SERVER_PORT + " dashboard=" + DASHBOARD_PORT);
	freePorts();

	const server = spawnChild("npx", ["tsx", "main/server/src/dev.ts"], "server");
	server.on("exit", (code) => {
		logProc("launcher", "server exited with code " + code);
		process.exit(code || 0);
	});

	logProc("launcher", "waiting for server ready");
	await waitForChildLog(server, "Server ready");
	logProc("launcher", "server ready, spawning discord");

	const discord = spawnChild("npx", ["tsx", "--watch", "main/discord/src/index.ts"], "discord");
	discord.on("exit", () => logProc("launcher", "discord exited"));

	logProc("launcher", "waiting for discord login");
	try {
		await waitForChildLog(discord, "Logged in as");
	} catch {
		logProc("launcher", "discord wait timeout, continuing anyway");
	}
	logProc("launcher", "discord ready, spawning dashboard");

	const dashboard = spawnChild("npx", ["vite", "--config", "main/dashboard/vite.config.ts"], "dashboard");

	logProc("launcher", "waiting for dashboard ready");
	try {
		await waitForChildLog(dashboard, "ready in");
	} catch {
		logProc("launcher", "dashboard wait timeout, continuing anyway");
	}
	const { existsSync } = await import("node:fs");

	const cleanup = () => {
		killTree(discord);
		killTree(dashboard);
		killTree(server);
		process.exit(0);
	};
	dashboard.on("exit", () => {
		logProc("launcher", "dashboard exited");
		cleanup();
	});
	process.on("SIGTERM", cleanup);
	process.on("SIGINT", cleanup);
}

main().catch((err) => {
	logProc("launcher", "fatal: " + err.message);
	process.exit(1);
});
