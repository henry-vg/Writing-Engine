function isWordCharacter(character) {
    return character != null && /[\p{L}\p{N}]/u.test(character);
}

function getWordAt(value, index) {
    if (!isWordCharacter(value[index - 1]) || !isWordCharacter(value[index])) return null;

    let start = index;
    let end = index;

    while (start > 0 && isWordCharacter(value[start - 1])) start--;
    while (end < value.length && isWordCharacter(value[end])) end++;

    return { start, end };
}

function replaceEditorRange(start, end, text) {
    editorInput.focus();
    editorInput.setSelectionRange(start, end);

    if (document.execCommand("insertText", false, text)) {
        return;
    }

    const value = editorInput.value;
    editorInput.value = value.slice(0, start) + text + value.slice(end);
    computeEditor();
    computePreview();
}

function wrapEditorRange(start, end, tagValue) {
    const tagOpen = tagSyntax.open + tagValue + tagSyntax.separator;
    const content = editorInput.value.slice(start, end);
    const contentStart = start + tagOpen.length;

    replaceEditorRange(start, end, tagOpen + content + tagSyntax.close);
    editorInput.setSelectionRange(contentStart, contentStart + content.length);
    computeEditor();
}

function moveCaretToMetadataValue(lineStart, key) {
    const caret = lineStart + (key ? getMetadataLine(key).length : 0);

    editorInput.setSelectionRange(caret, caret);
    editorInput.scrollTop = 0;
    editorHighlight.scrollTop = 0;
    computeEditor();
}

function removeEditorTagPair(pair) {
    const content = editorInput.value.slice(pair.contentStart, pair.end);

    replaceEditorRange(pair.start, pair.end + 1, content);
    editorInput.setSelectionRange(pair.start, pair.start + content.length);
    computeEditor();
}

function computeEditor() {
    editorContent = editorInput.value || null;

    needsSaving = textFileContent !== editorContent;
    textFilePathNeedsSaving.toggleAttribute("hidden", !needsSaving);

    if (!editorContent) {
        editorBody = null;
        editorMetadata = null;
        editorTagPairs = new Map();
        lastHighlightState = null;
        editorHighlight.innerHTML = "";
        return;
    }

    const metadata = parseMetadata(editorContent);

    editorMetadata = metadata;
    editorBody = metadata ? editorContent.slice(metadata.rawLength) : editorContent;
    editorTagPairs = getTagPairs(editorBody);

    const caretPosition = getCaretPosition();
    const highlightWindow = getHighlightWindow(caretPosition);

    lastHighlightState = getHighlightState(caretPosition, highlightWindow);
    renderHighlight(caretPosition, highlightWindow);
}
