let editorContent = null;
let editorMetadata = null;
let editorBody = null;
let textFileContent = null;
let templateContent = null;
let needsSaving = false;
let textFileHandle = null;
let dialogResolve = null;
let editorTagPairs = new Map();
let previewVisible = defaultPreviewVisible;
let previewTimeout = null;
let previewScroll = { x: 0, y: 0 };

(async () => {
    const cachedText = await dbGet(dbTextKey);
    loadTextFile(cachedText?.name ?? noTextFileMessage, cachedText?.content ?? null);

    const cachedTemplate = await dbGet(dbTemplateKey);
    loadTemplateFile(cachedTemplate?.name ?? noTemplateFileMessage, cachedTemplate?.content ?? null);

    textFileHandle = await dbGet(dbTextHandleKey);

    loadTheme(await dbGet(dbThemeKey) ?? defaultTheme);
    loadPreviewVisible(await dbGet(dbPreviewVisibleKey) ?? defaultPreviewVisible);
    loadPreviewNegative(await dbGet(dbPreviewNegativeKey) ?? defaultPreviewNegative);
    loadSpellcheck(await dbGet(dbSpellcheckKey) ?? defaultSpellcheck);
})();

buildMenuItems();

editor.focus();
preview.toggleAttribute("hidden", true);

computeEditor();
computePreview();
