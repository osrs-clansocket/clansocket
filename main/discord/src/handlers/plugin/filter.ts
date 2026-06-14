function acceptsEvent(plugin: any, event: any) {
    return !plugin.filter || plugin.filter(event);
}

export { acceptsEvent };
