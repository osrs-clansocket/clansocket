// @ts-check

/** @type {import('knip').KnipConfig} */
const config = {
	// ── Package manifest ──────────────────────────────────────────────
	manifest: 'package.json',

	// ── Entry points – files knip traces imports from ─────────────────
	entry: [
		'src/main.js',
		'src/plugins/commands/**/*.js',
		'src/plugins/slash/**/*.js',
		'src/plugins/interactions/**/*.js',
		'src/plugins/messages/**/*.js',
		'scripts/*.js',
		'tests/**/*.js',
		'codebase-validation/**/*.js',
	],

	// ── Project globs – every source file knip may consider ───────────
	project: [
		'src/**/*.js',
		'scripts/**/*.js',
		'tests/**/*.js',
		'codebase-validation/**/*.js',
	],

	// ── Ignore dev-only quality / lint tooling packages ───────────────
	ignoreDependencies: [
		'eslint',
		'eslint-plugin-jsonc',
		'eslint-plugin-unused-imports',
		'globals',
		'jsonc-eslint-parser',
		'prettier',
		'knip',
		'depcheck',
		'nodemon',
	],

	// ── Ignore patterns – files knip should never report ──────────────
	ignore: [
		'node_modules/**',
		'data/**',
		'docs/**',
	],
};

module.exports = config;
