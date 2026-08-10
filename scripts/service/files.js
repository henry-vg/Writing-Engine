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
    editorInput.value = content ?? "";
    textFileContent = content || null;
    computeEditor();
    computePreview();
}

function closeTextFile() {
    closeTextButton.toggleAttribute("disabled", true);
    textFilePath.textContent = noTextFileMessage;
    editorInput.value = "";
    textFileContent = null;
    textFileHandle = null;
    computeEditor();
    computePreview();
}

async function writeTextFile() {
    const content = editorInput.value;

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
