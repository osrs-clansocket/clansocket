async function runPluginErrorHandler(plugin: any, event: any, error: any, fallback: any) {
    if (plugin.handleError) {
        await plugin.handleError(event, error);
        return;
    }
    await fallback();
}

export { runPluginErrorHandler };
