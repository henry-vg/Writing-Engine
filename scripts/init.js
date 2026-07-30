let editorContent = null;
let editorMetadata = null;
let editorBody = null;
let textContent = null;
let templateContent = null;
let needsSaving = false;

(async () => {
    const cachedText = await dbGet(DBTextKey);
    let name = noTextFileMessage;
    let content = null;
    if (cachedText) {
        name = cachedText.name;
        content = cachedText.content;
    }
    loadTextFile(name, content);
})();

(async () => {
    const cachedTemplate = await dbGet(DBTemplateKey);
    let name = noTemplateFileMessage;
    let content = null;
    if (cachedTemplate) {
        name = cachedTemplate.name;
        content = cachedTemplate.content;
    }
    loadTemplateFile(name, content);
})();

(async () => {
    const cachedTheme = await dbGet(DBThemeKey);
    if (cachedTheme) {
        loadTheme(cachedTheme);
    } else {
        loadTheme(defaultTheme);
    }
})();

(async () => {
    const cachedPreviewNegative = await dbGet(DBPreviewNegativeKey);
    if (cachedPreviewNegative) {
        loadPreviewNegative(cachedPreviewNegative);
    } else {
        loadPreviewNegative(defaultPreviewNegative);
    }
})();

editorInput.focus();
editorInput.spellcheck = false;
preview.toggleAttribute("hidden", true);

computeText();
computeTemplate();