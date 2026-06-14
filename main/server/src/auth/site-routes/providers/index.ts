import { Router } from "express";
import discordRouter from "./discord.js";
import discordBotInstallRouter from "./discord-bot-install.js";
import githubRouter from "./github.js";

const router: Router = Router();
router.use(githubRouter);
router.use(discordRouter);
router.use(discordBotInstallRouter);

export default router;
