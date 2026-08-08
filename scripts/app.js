/* ---------- Files ---------- */
function hasFilePickers() {
    if (window.showOpenFilePicker && window.showSaveFilePicker) return true;

    showError("this browser cannot open or save files: the File System Access API is unavailable");
    return false;
}

async function pickFileToOpen(types) {
    if (!hasFilePickers()) return null;

    try {
        const [handle] = await window.showOpenFilePicker({ types });
        return handle;
    } catch (error) {
        if (error.name !== "AbortError") showError("could not open the file picker", error);
        return null;
    }
}

async function pickFileToSave(suggestedName, types) {
    if (!hasFilePickers()) return null;

    try {
        return await window.showSaveFilePicker({ suggestedName, types });
    } catch (error) {
        if (error.name !== "AbortError") showError("could not open the save dialog", error);
        return null;
    }
}

async function writeFile(handle, content) {
    try {
        const writable = await handle.createWritable();
        await writable.write(content);
        await writable.close();
        return true;
    } catch (error) {
        showError(`could not write to "${handle.name}"`, error);
        return false;
    }
}

async function hasWritePermission(handle) {
    const options = { mode: "readwrite" };

    try {
        if (await handle.queryPermission(options) === "granted") return true;

        return await handle.requestPermission(options) === "granted";
    } catch {
        return false;
    }
}

function setTemplateButtonsEnabled(enabled) {
    closeTemplateButton.toggleAttribute("disabled", !enabled);
    togglePreviewButton.toggleAttribute("disabled", !enabled);
}

function loadTemplateFile(name, content) {
    templateFilePath.textContent = name;

    if (!content) {
        templateContent = null;
        setTemplateButtonsEnabled(false);
        loadPreviewVisible(previewVisible);
        return;
    }

    content = normalizeLineBreaks(content);
    setTemplateButtonsEnabled(true);

    const appCss = previewScrollbarStyle.textContent;

    let withScrollBar = content.replace(
        /<head>/i,
        `<head><style>${appCss}</style>`
    );

    withScrollBar = withScrollBar.replace(/<html([^>]*)>/i, (match, attrs) => {
        if (/class\s*=/i.test(attrs)) {
            return match.replace(/class\s*=\s*"([^"]*)"/i, `class="$1 ${previewScrollbarClass}"`);
        }

        return `<html${attrs} class="${previewScrollbarClass}">`;
    });

    templateContent = withScrollBar;
    loadPreviewVisible(previewVisible);
    computePreview();
}

function closeTemplateFile() {
    templateFilePath.textContent = noTemplateFileMessage;
    templateContent = null;
    setTemplateButtonsEnabled(false);
    loadPreviewVisible(previewVisible);
    computePreview();
}

function loadTextFile(name, content) {
    if (content !== null) {
        content = normalizeLineBreaks(content);
    }

    textFilePath.textContent = name;
    closeTextButton.toggleAttribute("disabled", content === null);
    editor.setText(content ?? "");
    textFileContent = content || null;
    computeEditor();
    computePreview();
}

function closeTextFile() {
    closeTextButton.toggleAttribute("disabled", true);
    textFilePath.textContent = noTextFileMessage;
    editor.setText("");
    textFileContent = null;
    textFileHandle = null;
    computeEditor();
    computePreview();
}

async function writeTextFile() {
    const content = editor.getText();

    if (!await writeFile(textFileHandle, content)) return false;

    await dbSet(dbTextKey, { name: textFileHandle.name, content });

    textFilePath.textContent = textFileHandle.name;
    closeTextButton.toggleAttribute("disabled", false);
    textFileContent = content || null;
    computeEditor();
    return true;
}

async function saveTextFile() {
    if (textFileHandle && await hasWritePermission(textFileHandle)) return await writeTextFile();

    return await pickTextFileToSave() && await writeTextFile();
}

async function pickTextFileToSave() {
    const handle = await pickFileToSave(textFileHandle?.name ?? defaultTextFileName, textFileTypes);

    if (!handle) return false;

    textFileHandle = handle;
    await dbSet(dbTextHandleKey, handle);
    return true;
}

/* ---------- Preferences ---------- */
function loadTheme(theme) {
    document.documentElement.setAttribute("theme", theme);
}

function loadPreviewNegative(negative) {
    preview.toggleAttribute("negative", negative);
}

function loadPreviewVisible(visible) {
    previewVisible = visible;

    const shown = visible && templateContent !== null;

    preview.toggleAttribute("hidden", !shown);
    togglePreviewNegativeButton.toggleAttribute("disabled", !shown);
    exportToPDFButton.toggleAttribute("disabled", !shown);
}

function loadSpellcheck(enabled) {
    editor.setSpellcheck(enabled);
    toggleSpellcheckButton.textContent = enabled ? disableSpellcheckMessage : enableSpellcheckMessage;
}

/* ---------- Dialogs ---------- */
function openDialog(message, saveLabel, proceedLabel, cancelLabel) {
    closeDialog("cancel");

    dialogMessage.textContent = message;

    for (const [button, label] of [
        [dialogSaveButton, saveLabel],
        [dialogProceedButton, proceedLabel],
        [dialogCancelButton, cancelLabel],
    ]) {
        button.textContent = label ?? "";
        button.toggleAttribute("hidden", !label);
    }

    dialogWrapper.toggleAttribute("hidden", false);
    (cancelLabel ? dialogCancelButton : dialogProceedButton).focus();

    return new Promise((resolve) => {
        dialogResolve = resolve;
    });
}

function closeDialog(answer) {
    dialogWrapper.toggleAttribute("hidden", true);
    dialogResolve?.(answer);
    dialogResolve = null;
}

function getFileMessage(message, name) {
    return message.replace(fileNamePlaceholder, name);
}

async function confirmAction(message) {
    return await openDialog(message, null, dialogLabels.confirm, dialogLabels.cancel) === "proceed";
}

function showError(message, error) {
    const reason = error?.message ? ` (${error.message})` : "";

    return openDialog(`${errorMessagePrefix}${message}${reason}`, null, dialogLabels.confirm, null);
}

async function confirmDiscardChanges() {
    if (!needsSaving) return true;

    const answer = await openDialog(
        getFileMessage(saveChangesMessage, textFilePath.textContent),
        dialogLabels.save,
        dialogLabels.discard,
        dialogLabels.cancel
    );

    if (answer === "cancel") return false;

    if (answer === "proceed") return true;

    return await saveTextFile();
}

/* ---------- Menus ---------- */
function closeAllMenuDropdowns() {
    for (const { dropdown } of menuElements) {
        dropdown.toggleAttribute("hidden", true);
    }
}

function closeAllMenus() {
    closeAllMenuDropdowns();
    editorContextMenu.toggleAttribute("hidden", true);
}

function buildMenuItems() {
    for (const item of optionsMenuItems) {
        const button = document.getElementById(item.id);

        if (!button) {
            showError(`there is no menu item with the id "${item.id}"`);
            continue;
        }

        applyButtonConfig(button, item);
    }
}

function applyButtonConfig(button, config) {
    const tooltip = config.tooltip ?? config.label;

    if (config.icon) {
        button.innerHTML = `<svg viewBox="0 0 24 24"><path d="${config.icon}"></path></svg>`;
    } else if (config.label) {
        button.textContent = config.label;
    }

    if (tooltip) {
        const modifiers = config.shift ? shortcutModifiers.shift : shortcutModifiers.plain;
        button.title = config.shortcut
            ? `${tooltip} (${modifiers}+${config.shortcut.toUpperCase()})`
            : tooltip;
    }
}

function buildTagButtons() {
    const tagButtons = [];

    for (const tagConfig of Object.values(tags)) {
        const buttonConfig = tagConfig.button;
        if (!buttonConfig) continue;

        const container = tagButtonContainers[buttonConfig.container];
        if (!container) continue;

        const button = document.createElement("button");
        button.type = "button";
        button.className = container.className;
        applyButtonConfig(button, buttonConfig);

        container.element.appendChild(button);
        tagButtons.push({ button, tagValue: tagConfig.values[0] });
    }

    return tagButtons;
}

/* ---------- Compute ---------- */
function computeEditor() {
    editorDocument = parseDocument(editor.getText());

    needsSaving = textFileContent !== editorDocument.content;
    textFilePathNeedsSaving.toggleAttribute("hidden", !needsSaving);

    if (!editorDocument.content) {
        lastHighlightState = null;
        editor.clearHighlight();
        return;
    }

    renderEditorHighlight();
}

function computePreview() {
    clearTimeout(previewTimeout);

    if (!templateContent) {
        preview.srcdoc = "";
        return;
    }

    previewScroll = {
        x: preview.contentWindow?.scrollX ?? 0,
        y: preview.contentWindow?.scrollY ?? 0,
    };

    preview.srcdoc = renderTemplate(templateContent, editorDocument);
}

function computePreviewSoon() {
    clearTimeout(previewTimeout);
    previewTimeout = setTimeout(computePreview, previewDebounceDelay);
}
