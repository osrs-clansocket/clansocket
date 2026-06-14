export function printUsage(logger) {
    logger.log("Usage:");
    logger.log("  npm run nginx:push                - Upload local config to remote (default)");
    logger.log("  npm run nginx:pull                - Download remote site config to backup");
    logger.log("  npm run nginx:pull-full           - Download ENTIRE /etc/nginx to backup");
    logger.log("");
    logger.log("Aliases:");
    logger.log("  push: upload, to-remote");
    logger.log("  pull: download, from-remote");
    logger.log("  pull-full: full, pull-all");
}
