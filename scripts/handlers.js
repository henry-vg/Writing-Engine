function handleWindowBlur() {
    closeAllMenus();
}

function handleWindowError(e) {
    showError(e.message ?? "unexpected failure");
}

function handleWindowUnhandledRejection(e) {
    showError("unexpected failure", e.reason);
}

function handleWindowBeforeUnload(e) {
    if (!needsSaving) return;

    e.preventDefault();
}

function handleDocumentClick() {
    closeAllMenus();
}

function handleDocumentKeyDown(e) {
    if (e.key === "Escape") {
        closeAllMenus();

        if (!dialogWrapper.hidden) {
            closeDialog("cancel");
            return;
        }
    }

    if (!dialogWrapper.hidden) return;

    const ctrlOrCmd = e.ctrlKey || e.metaKey;

    if (!ctrlOrCmd) return;

    const key = e.key.toLowerCase();
    const menuShortcut = optionsMenuItems.find((item) =>
        item.shortcut === key && !!item.shift === e.shiftKey);

    if (menuShortcut) {
        e.preventDefault();
        document.getElementById(menuShortcut.id).click();
        return;
    }

    if (!editor.isFocused()) return;

    const tagConfig = getTagConfigByShortcut(key);

    if (!tagConfig) return;

    e.preventDefault();
    handleFormattingButtonClick(tagConfig.values[0]);
}

function handleDocumentSelectionChange() {
    if (editor.isFocused()) refreshHighlight();
}

function handleEditorInputInput() {
    computeEditor();
    computePreviewSoon();
}

function handleEditorInputDoubleClick() {
    requestAnimationFrame(() => {
        const value = editor.getText();
        const selection = editor.getMainSelection();
        let start = selection.start;
        let end = selection.end;

        while (start < end && /\s/.test(value[start])) start++;
        while (end > start && /\s/.test(value[end - 1])) end--;

        if (start !== selection.start || end !== selection.end) {
            editor.setMainSelection(start, end);
        }
    });
}

function handleEditorInputContextMenu(e) {
    e.preventDefault();
    closeAllMenuDropdowns();
    editorContextMenu.toggleAttribute("hidden", false);

    const left = Math.min(e.clientX, window.innerWidth - editorContextMenu.offsetWidth);
    const top = e.clientY - editorContextMenu.offsetHeight;

    editorContextMenu.style.left = `${Math.max(0, left)}px`;
    editorContextMenu.style.top = `${Math.max(0, top)}px`;
}

function handleEditorInputScroll() {
    editor.syncHighlightScroll();
}

function handleFormattingButtonClick(tagValue) {
    formatEditorSelection(tagValue);
}

function handleToggleThemeButtonClick() {
    const theme = document.documentElement.getAttribute("theme");
    const newTheme = theme === "dark" ? "light" : "dark";
    loadTheme(newTheme);
    dbSet(dbThemeKey, newTheme);
}

function handleToggleSpellcheckButtonClick() {
    const enabled = !editor.isSpellcheckEnabled();
    loadSpellcheck(enabled);
    dbSet(dbSpellcheckKey, enabled);
}

function handleTogglePreviewButtonClick() {
    const visible = preview.hidden;
    loadPreviewVisible(visible);
    dbSet(dbPreviewVisibleKey, visible);
}

function handlePreviewLoad() {
    preview.contentWindow.scrollTo(previewScroll.x, previewScroll.y);
}

function handleTogglePreviewNegativeButtonClick() {
    const negative = !preview.hasAttribute("negative");
    loadPreviewNegative(negative);
    dbSet(dbPreviewNegativeKey, negative);
}

function handleEditMetadataButtonClick() {
    editEditorMetadata();
}

function handleMenuDropdownButtonClick(e, dropdown) {
    e.stopPropagation();
    const mustOpen = dropdown.hidden;
    closeAllMenuDropdowns();
    dropdown.toggleAttribute("hidden", !mustOpen);
}

async function handleNewTextButtonClick() {
    if (!await confirmDiscardChanges()) return;
    if (!await pickTextFileToSave()) return;

    loadTextFile(textFileHandle.name, "");
    await saveTextFile();
}

async function handleOpenTextButtonClick() {
    if (!await confirmDiscardChanges()) return;

    const handle = await pickFileToOpen(textFileTypes);

    if (!handle) return;

    const content = await (await handle.getFile()).text();

    textFileHandle = handle;
    await dbSet(dbTextHandleKey, handle);
    await dbSet(dbTextKey, { name: handle.name, content });

    loadTextFile(handle.name, content);
}

async function handleSaveTextButtonClick() {
    await saveTextFile();
}

async function handleSaveTextAsButtonClick() {
    if (!await pickTextFileToSave()) return;

    await writeTextFile();
}

async function handleCloseTextButtonClick() {
    const confirmed = needsSaving
        ? await confirmDiscardChanges()
        : await confirmAction(getFileMessage(closeFileMessage, textFilePath.textContent));

    if (!confirmed) return;

    await dbDelete(dbTextKey);
    await dbDelete(dbTextHandleKey);
    closeTextFile();
}

async function handleOpenTemplateButtonClick() {
    const handle = await pickFileToOpen(templateFileTypes);

    if (!handle) return;

    const content = await (await handle.getFile()).text();
    await dbSet(dbTemplateKey, { name: handle.name, content });

    loadTemplateFile(handle.name, content);
}

async function handleCloseTemplateButtonClick() {
    if (!await confirmAction(getFileMessage(closeFileMessage, templateFilePath.textContent))) return;

    await dbDelete(dbTemplateKey);
    closeTemplateFile();
}

function handleExportToPDFButtonClick() {
    try {
        preview.contentWindow.print();
    } catch (error) {
        showError("could not open the print dialog", error);
    }
}

async function handleClearDataButtonClick() {
    if (!await confirmAction(clearDataMessage)) return;

    await dbClear();

    closeTextFile();
    closeTemplateFile();
    loadTheme(defaultTheme);
    loadPreviewVisible(defaultPreviewVisible);
    loadPreviewNegative(defaultPreviewNegative);
    loadSpellcheck(defaultSpellcheck);
}

function handleHelpButtonClick() {
    helpDialogWrapper.toggleAttribute("hidden", false);
}

function handleHelpCloseButtonClick() {
    helpDialogWrapper.toggleAttribute("hidden", true);
}
