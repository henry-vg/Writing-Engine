function handleWindowBlur() {
    closeAllMenuDropdowns();
}

function handleDocumentClick() {
    closeAllMenuDropdowns();
}

function handleDocumentKeyDown(e) {
    if (e.key == "Escape") {
        closeAllMenuDropdowns();
    }

    if (document.activeElement !== editorInput) return;

    const ctrlOrCmd = e.ctrlKey || e.metaKey;

    if (!ctrlOrCmd) return;

    const tagConfig = getTagConfigByShortcut(e.key.toLowerCase());

    if (!tagConfig) return;

    e.preventDefault();
    handleFormattingButtonClick(tagConfig.values[0]);
}

function handleDocumentSelectionChange() {
    if (document.activeElement === editorInput) computeText();
}

function handleEditorInputInput() {
    computeText();
    computeTemplate();
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

function handleEditorInputScroll() {
    editorHighlight.scrollTop = editorInput.scrollTop;
    editorHighlight.scrollLeft = editorInput.scrollLeft;
}

function handleFormattingButtonClick(tagValue) {

}

function handleToggleThemeButtonClick() {
    const theme = document.documentElement.getAttribute("theme");
    const newTheme = theme === "dark" ? "light" : "dark";
    loadTheme(newTheme);
    dbSet(DBThemeKey, newTheme);
}

function handleToggleSpellcheckButtonClick() {
    editorInput.spellcheck = !editorInput.spellcheck;
}

function handleTogglePreviewButtonClick() {
    preview.toggleAttribute("hidden", !preview.hidden);
    togglePreviewNegativeButton.toggleAttribute("disabled", preview.hidden);
    exportToPDFButton.toggleAttribute("disabled", preview.hidden);
}

function handleTogglePreviewNegativeButtonClick() {
    const negative = preview.getAttribute("negative") === null;
    loadPreviewNegative(negative);
    dbSet(DBPreviewNegativeKey, negative);
}

function handleEditMetadataButtonClick() {
    editorInput.focus();

    const value = editorInput.value;
    const newline = value.includes("\r\n") ? "\r\n" : "\n";

    if (!editorMetadata) {
        const block = `---${newline}${newline}---${newline}`;

        editorInput.value = block + value;

        const caret = (`---${newline}`).length;
        editorInput.setSelectionRange(caret, caret);

        editorInput.scrollTop = 0;
        editorHighlight.scrollTop = 0;
        computeText();
        return;
    }
    editorInput.setSelectionRange(3 + newline.length, 3 + newline.length);
    editorInput.scrollTop = 0;
    editorHighlight.scrollTop = 0;
    computeText();
}

function handleMenuDropdownButtonClick(e, dropdown) {
    e.stopPropagation();
    const mustOpen = dropdown.hidden;
    closeAllMenuDropdowns();
    dropdown.toggleAttribute("hidden", !mustOpen);
}

function handleNewTextButtonClick() {

}

async function handleOpenTextButtonClick() {
    const file = await openFile(".txt, .md");

    if (!file) return;

    const name = file.name;
    const content = await file.text();
    await dbSet(DBTextKey, { name: name, content });

    loadTextFile(name, content);
}

function handleSaveTextButtonClick() {

}

function handleSaveTextAsButtonClick() {

}

async function handleCloseTextButtonClick() {
    // are you sure?
    await dbDelete(DBTextKey);
    closeTextFile();
}

async function handleOpenTemplateButtonClick() {
    const file = await openFile(".html, .htm, text/html");

    if (!file) return;

    const name = file.name;
    const content = await file.text();
    await dbSet(DBTemplateKey, { name: name, content });

    loadTemplateFile(name, content);
}

async function handleCloseTemplateButtonClick() {
    // are you sure?
    await dbDelete(DBTemplateKey);
    closeTemplateFile();
}

function handleExportToPDFButtonClick() {
    preview.contentWindow.print();
}

function handleHelpButtonClick() {
    helpDialogWrapper.toggleAttribute("hidden", false);
}

function handleHelpCloseButtonClick() {
    helpDialogWrapper.toggleAttribute("hidden", true);
}