let editorContent = null;
let editorMetadata = null;
let editorBody = null;
let textContent = null;
let templateContent = null;
let needsSaving = false;
let textFileHandle = null;
let confirmDialogResolve = null;
let editorTagPairs = new Map();
let lastHighlightState = null;
let previewVisible = defaultPreviewVisible;
let previewTimeout = null;
let previewScroll = { x: 0, y: 0 };

(async () => {
    const cachedText = await dbGet(DBTextKey);
    loadTextFile(cachedText?.name ?? noTextFileMessage, cachedText?.content ?? null);

    const cachedTemplate = await dbGet(DBTemplateKey);
    loadTemplateFile(cachedTemplate?.name ?? noTemplateFileMessage, cachedTemplate?.content ?? null);

    textFileHandle = await dbGet(DBTextHandleKey);

    loadTheme(await dbGet(DBThemeKey) ?? defaultTheme);
    loadPreviewVisible(await dbGet(DBPreviewVisibleKey) ?? defaultPreviewVisible);
    loadPreviewNegative(await dbGet(DBPreviewNegativeKey) ?? defaultPreviewNegative);
    loadSpellcheck(await dbGet(DBSpellcheckKey) ?? defaultSpellcheck);
})();

for (const { button, label, shortcut, shift } of menuShortcuts) {
    button.title = getShortcutTitle(label, shortcut, shift);
}

editorInput.focus();
preview.toggleAttribute("hidden", true);

computeText();
computeTemplate();