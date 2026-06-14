import dotenv from "dotenv";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { validateDeployEnv } from "./env/env-required.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, "..", "config", ".env.deploy") });

validateDeployEnv();
