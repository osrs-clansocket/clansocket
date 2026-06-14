#!/usr/bin/env node
import { writeFileSync, mkdirSync } from "fs";
import { join, resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT_DIR = join(resolve(__dirname, "..", ".."), "main/server/src/ai/prompts/auto-gen");
const OUT_PATH = join(OUT_DIR, "table-caveats.json");

mkdirSync(OUT_DIR, { recursive: true });
writeFileSync(OUT_PATH, "{}\n");
process.stdout.write(`wrote ${OUT_PATH}\n`);
