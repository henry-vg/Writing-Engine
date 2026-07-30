let editorContent = null;
let editorMetadata = null;
let editorBody = null;
let textContent = null;
let templateContent = null;
let needsSaving = false;

(async () => {
    const cachedText = await dbGet(DBTextKey);
    loadTextFile(cachedText?.name ?? noTextFileMessage, cachedText?.content ?? null);

    const cachedTemplate = await dbGet(DBTemplateKey);
    loadTemplateFile(cachedTemplate?.name ?? noTemplateFileMessage, cachedTemplate?.content ?? null);

    loadTheme(await dbGet(DBThemeKey) ?? defaultTheme);
    loadPreviewNegative(await dbGet(DBPreviewNegativeKey) ?? defaultPreviewNegative);
})();

editorInput.focus();
editorInput.spellcheck = false;
preview.toggleAttribute("hidden", true);

computeText();
computeTemplate();