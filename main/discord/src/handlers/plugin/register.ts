function registerByType(typeMap: any) {
    return (plugin: any) => {
        const targetMap = typeMap[plugin.type];
        if (targetMap && plugin.name) {
            targetMap.set(plugin.name, plugin);
        }
    };
}

export { registerByType };
