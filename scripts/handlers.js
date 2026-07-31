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
    if (e.key == "Escape") {
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
    const menuShortcut = getMenuShortcut(key, e.shiftKey);

    if (menuShortcut) {
        e.preventDefault();
        menuShortcut.button.click();
        return;
    }

    if (document.activeElement !== editorInput) return;

    const tagConfig = getTagConfigByShortcut(key);

    if (!tagConfig) return;

    e.preventDefault();
    handleFormattingButtonClick(tagConfig.values[0]);
}

function handleDocumentSelectionChange() {
    if (document.activeElement === editorInput) refreshHighlight();
}

function handleEditorInputInput() {
    computeText();
    computeTemplateSoon();
}

function handleEditorInputDoubleClick() {
    requestAnimationFrame(() => {
        const value = editorInput.value;
        let start = editorInput.selectionStart;
        let end = editorInput.selectionEnd;

        while (start < end && /\s/.test(value[start])) start++;
        while (end > start && /\s/.test(value[end - 1])) end--;

        if (start !== editorInput.selectionStart || end !== editorInput.selectionEnd) {
            editorInput.setSelectionRange(start, end);
        }
    });
}

function handleEditorInputContextMenu(e) {
    e.preventDefault();
    openEditorContextMenu(e.clientX, e.clientY);
}

function handleEditorInputScroll() {
    editorHighlight.scrollTop = editorInput.scrollTop;
    editorHighlight.scrollLeft = editorInput.scrollLeft;
}

function handleFormattingButtonClick(tagValue) {
    const tagConfig = getTagConfig(tagValue);

    if (!tagConfig) {
        showError(`there is no tag configured for "${tagValue}"`);
        return;
    }

    editorInput.focus();

    const metadataLength = getMetadataLength();
    const selectionStart = editorInput.selectionStart;
    const selectionEnd = editorInput.selectionEnd;

    if (selectionStart < metadataLength) return;

    const body = getEditorBody(editorInput.value, editorMetadata);
    const pairs = getTagPairsForKey(body, tagConfig.key, metadataLength);

    const selectedPair = pairs.find((pair) => isTagPairSelected(pair, selectionStart, selectionEnd));
    if (selectedPair) {
        removeEditorTagPair(selectedPair);
        return;
    }

    if (selectionStart !== selectionEnd) {
        wrapEditorRange(selectionStart, selectionEnd, tagValue);
        return;
    }

    const word = getWordAt(editorInput.value, selectionStart);
    if (word) {
        const wordPair = pairs.find((pair) => pair.contentStart === word.start && pair.end === word.end);

        if (wordPair) {
            removeEditorTagPair(wordPair);
            return;
        }

        wrapEditorRange(word.start, word.end, tagValue);
        return;
    }

    wrapEditorRange(selectionStart, selectionStart, tagValue);
}

function handleToggleThemeButtonClick() {
    const theme = document.documentElement.getAttribute("theme");
    const newTheme = theme === "dark" ? "light" : "dark";
    loadTheme(newTheme);
    dbSet(DBThemeKey, newTheme);
}

function handleToggleSpellcheckButtonClick() {
    const enabled = !editorInput.spellcheck;
    loadSpellcheck(enabled);
    dbSet(DBSpellcheckKey, enabled);
}

function handleTogglePreviewButtonClick() {
    const visible = preview.hidden;
    loadPreviewVisible(visible);
    dbSet(DBPreviewVisibleKey, visible);
}

function handlePreviewLoad() {
    preview.contentWindow.scrollTo(previewScroll.x, previewScroll.y);
}

function handleTogglePreviewNegativeButtonClick() {
    const negative = !preview.hasAttribute("negative");
    loadPreviewNegative(negative);
    dbSet(DBPreviewNegativeKey, negative);
}

function handleEditMetadataButtonClick() {
    editorInput.focus();

    const existingKeys = editorMetadata ? Object.keys(editorMetadata.parsed) : [];
    const missingKeys = getTemplateMetadataKeys().filter((key) => !existingKeys.includes(key));
    const lines = missingKeys.map(getMetadataLine).join("\n");
    const fenceLine = `${metadataFence}\n`;

    if (!editorMetadata) {
        replaceEditorRange(0, 0, `${fenceLine}${lines}\n${fenceLine}`);
        moveCaretToMetadataValue(fenceLine.length, missingKeys[0]);
        return;
    }

    if (missingKeys.length) {
        const insertAt = getMetadataLength() - metadataFence.length;

        replaceEditorRange(insertAt, insertAt, `${lines}\n`);
        moveCaretToMetadataValue(insertAt, missingKeys[0]);
        return;
    }

    moveCaretToMetadataValue(fenceLine.length, null);
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
    await dbSet(DBTextHandleKey, handle);
    await dbSet(DBTextKey, { name: handle.name, content });

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
        : await confirmAction(`Close ${textFilePath.textContent}?`);

    if (!confirmed) return;

    await dbDelete(DBTextKey);
    await dbDelete(DBTextHandleKey);
    closeTextFile();
}

async function handleOpenTemplateButtonClick() {
    const handle = await pickFileToOpen(templateFileTypes);

    if (!handle) return;

    const content = await (await handle.getFile()).text();
    await dbSet(DBTemplateKey, { name: handle.name, content });

    loadTemplateFile(handle.name, content);
}

async function handleCloseTemplateButtonClick() {
    if (!await confirmAction(`Close ${templateFilePath.textContent}?`)) return;

    await dbDelete(DBTemplateKey);
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