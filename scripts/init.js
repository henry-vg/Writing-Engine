let currentTextMetadata = null;
let currentTextBody = null;
let currentTemplateContent = null;

(async () => {
    const cachedText = await dbGet(DBTextKey);
    if (cachedText) {
        loadTextFile(cachedText.name, cachedText.content);
    }
})();

(async () => {
    const cachedTemplate = await dbGet(DBTemplateKey);
    if (cachedTemplate) {
        loadTemplateFile(cachedTemplate.name, cachedTemplate.content);
    }
})();

(async () => {
    const cachedTheme = await dbGet(DBThemeKey);
    if (cachedTheme) {
        loadTheme(cachedTheme);
    } else {
        loadTheme(defaultTheme);
    }
})();

editorInput.focus();
editorInput.spellcheck = false;
preview.toggleAttribute("hidden", false);
highlightEditor();