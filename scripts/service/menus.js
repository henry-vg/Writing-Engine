function closeAllMenuDropdowns() {
    for (const { dropdown } of menuElements) {
        dropdown.toggleAttribute("hidden", true);
    }
}

function closeAllMenus() {
    closeAllMenuDropdowns();
    editorContextMenu.toggleAttribute("hidden", true);
}

function buildMenuItems() {
    for (const item of optionsMenuItems) {
        const button = document.getElementById(item.id);

        if (!button) {
            showError(`there is no menu item with the id "${item.id}"`);
            continue;
        }

        applyButtonConfig(button, item);
    }
}

function applyButtonConfig(button, config) {
    const tooltip = config.tooltip ?? config.label;

    if (config.icon) {
        button.innerHTML = `<svg viewBox="0 0 24 24"><path d="${config.icon}"></path></svg>`;
    } else if (config.label) {
        button.textContent = config.label;
    }

    if (tooltip) {
        const modifiers = config.shift ? shortcutModifiers.shift : shortcutModifiers.plain;
        button.title = config.shortcut
            ? `${tooltip} (${modifiers}+${config.shortcut.toUpperCase()})`
            : tooltip;
    }
}

function buildTagButtons() {
    const tagButtons = [];

    for (const tagConfig of Object.values(tags)) {
        const buttonConfig = tagConfig.button;
        if (!buttonConfig) continue;

        const container = tagButtonContainers[buttonConfig.container];
        if (!container) continue;

        const button = document.createElement("button");
        button.type = "button";
        button.className = container.className;
        applyButtonConfig(button, buttonConfig);

        container.element.appendChild(button);
        tagButtons.push({ button, tagValue: tagConfig.values[0] });
    }

    return tagButtons;
}
