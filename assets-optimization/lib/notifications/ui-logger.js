const LINE_WIDTH = 80;
const SEPARATOR_WIDTH = 60;

class UILogger {
    banner(title, details = {}) {
        console.log("=".repeat(SEPARATOR_WIDTH));
        console.log(title);
        console.log("=".repeat(SEPARATOR_WIDTH));
        Object.entries(details).forEach(([key, value]) => {
            console.log(`${key}: ${value}`);
        });
        console.log("=".repeat(SEPARATOR_WIDTH));
    }

    operation(direction, remotePath, fileCount, status) {
        const arrow = direction === "send" ? "→" : "←";
        if (status === "success") {
            console.log(`${direction.toUpperCase()} ${arrow} ${remotePath} (${fileCount} files)`);
        } else {
            console.error(`${direction.toUpperCase()} ${arrow} ${remotePath} (${fileCount} files)`);
        }
    }

    error(direction, remotePath, error) {
        console.error(`${direction.toUpperCase()} ERROR ${remotePath}: ${error.message}`);
    }

    summary(direction, operations, totalFiles) {
        console.log("\n" + "=".repeat(SEPARATOR_WIDTH));
        console.log(`${direction.toUpperCase()} COMPLETE: ${operations} operations, ${totalFiles} files total`);
        console.log("=".repeat(SEPARATOR_WIDTH));
    }

    info(message) {
        console.log(message);
    }

    force(message) {
        console.log(message);
    }

    progress(current, total, filename) {
        const pad = String(total).length;
        const counter = String(current).padStart(pad, " ");
        const line = `  ${counter} / ${total}  ${filename}`;
        process.stdout.write(`\r${line.padEnd(LINE_WIDTH)}`);
    }

    progressDone() {
        process.stdout.write("\n");
    }

    sectionStart(direction, operationCount) {
        console.log("\n" + "=".repeat(SEPARATOR_WIDTH));
        console.log(`${direction.toUpperCase()}: Starting ${operationCount} operations`);
        console.log("=".repeat(SEPARATOR_WIDTH));
    }

    fatal(message) {
        console.error("\nFATAL ERROR:", message);
    }
}

export const uiLogger = new UILogger();
