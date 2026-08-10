function getTextWidth(fontFamily) {
    const context = fontMeasureCanvas.getContext("2d");

    context.font = `${fontMeasureSize} ${fontFamily}`;

    return context.measureText(fontMeasureText).width;
}

function isFontAvailable(family) {
    return fontMeasureFallbacks.some((fallback) =>
        getTextWidth(`"${family}", ${fallback}`) !== getTextWidth(fallback));
}

function getAvailableFonts() {
    const families = fontCandidates.filter(isFontAvailable);

    return families.includes(defaultFont) ? families : [defaultFont, ...families];
}

function loadFont(family) {
    document.documentElement.style.setProperty("--editor-font-family", `"${family}", monospace`);

    for (const item of fontDropdown.children) {
        item.toggleAttribute("selected", item.textContent === family);
    }

    editor.refresh();
}

function buildFontItems() {
    const fontItems = [];

    for (const family of getAvailableFonts()) {
        const button = document.createElement("button");

        button.type = "button";
        button.className = "menu-item";
        button.textContent = family;
        button.style.fontFamily = `"${family}", monospace`;

        fontDropdown.appendChild(button);
        fontItems.push({ button, family });
    }

    return fontItems;
}
