const path = require("path");
const fs = require("fs");

const PATHS_FILE = path.join(__dirname, "paths.json");

let _cached = null;

function loadPaths() {
	if (_cached) return _cached;
	_cached = JSON.parse(fs.readFileSync(PATHS_FILE, "utf8"));
	return _cached;
}

function getProjectRoot() {
	return path.resolve(__dirname, "..", "..");
}

function getModuleRoots() {
	const config = loadPaths();
	const projectRoot = getProjectRoot();
	const roots = {};
	for (const [name, mod] of Object.entries(config.modules)) {
		roots[name] = path.resolve(projectRoot, mod.root);
	}
	return roots;
}

function getModuleForFile(filePath) {
	const normalized = filePath.replace(/\\/g, "/");
	const config = loadPaths();
	const projectRoot = getProjectRoot().replace(/\\/g, "/");

	for (const [name, mod] of Object.entries(config.modules)) {
		const moduleRoot = path.resolve(projectRoot, mod.root).replace(/\\/g, "/");
		if (normalized.startsWith(moduleRoot)) {
			return name;
		}
	}
	return null;
}

function areInSameModule(fileA, fileB) {
	const modA = getModuleForFile(fileA);
	const modB = getModuleForFile(fileB);
	if (!modA || !modB) return false;
	return modA === modB;
}

function getModuleConfig(name) {
	const config = loadPaths();
	return config.modules[name] || null;
}

function getGlobalExclude() {
	const config = loadPaths();
	return config.globalExclude || [];
}

function getLoggerImport(filePath) {
	const mod = getModuleForFile(filePath);
	if (!mod) return 'const logger = require("@clansocket/logger");';
	const config = loadPaths();
	return config.modules[mod]?.logger || 'const logger = require("@clansocket/logger");';
}

module.exports = {
	loadPaths,
	getProjectRoot,
	getModuleRoots,
	getModuleForFile,
	areInSameModule,
	getModuleConfig,
	getGlobalExclude,
	getLoggerImport,
};
