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

    if (!editor.hasFocus()) return;

    const tagConfig = getTagConfigByShortcut(key);

    if (!tagConfig) return;

    e.preventDefault();
    handleFormattingButtonClick(tagConfig.values[0]);
}

function handleEditorCursorActivity() {
    refreshActiveMark();
}

function handleEditorChange(change) {
    if (change.origin === "setValue") return;

    computeEditor();
    computePreviewSoon();
}

function handleEditorContextMenu(e) {
    e.preventDefault();
    closeAllMenuDropdowns();
    editorContextMenu.toggleAttribute("hidden", false);

    const left = Math.min(e.clientX, window.innerWidth - editorContextMenu.offsetWidth);
    const top = e.clientY - editorContextMenu.offsetHeight;

    editorContextMenu.style.left = `${Math.max(0, left)}px`;
    editorContextMenu.style.top = `${Math.max(0, top)}px`;
}

function handleFormattingButtonClick(tagValue) {
    const tagConfig = getTagConfig(tagValue);

    if (!tagConfig) {
        showError(`there is no tag configured for "${tagValue}"`);
        return;
    }

    editor.focus();

    const metadataLength = getMetadataLength();
    const { start: selectionStart, end: selectionEnd } = getEditorSelection();

    if (selectionStart < metadataLength) return;

    const pairs = getTagPairsForKey(editorBody ?? "", tagConfig.key, metadataLength);

    const selectedPair = pairs.find((pair) => isTagPairSelected(pair, selectionStart, selectionEnd));
    if (selectedPair) {
        removeEditorTagPair(selectedPair);
        return;
    }

    if (selectionStart !== selectionEnd) {
        wrapEditorRange(selectionStart, selectionEnd, tagValue);
        return;
    }

    const word = getWordAt(editor.getValue(), selectionStart);
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
    dbSet(dbThemeKey, newTheme);
}

function handleToggleSpellcheckButtonClick() {
    const enabled = !editor.getWrapperElement().spellcheck;
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
    editor.focus();

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
