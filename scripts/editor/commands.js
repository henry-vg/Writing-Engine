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
    if (editor.replaceRange(start, end, text)) {
        return;
    }

    computeEditor();
    computePreview();
}

function wrapEditorRange(start, end, tagValue) {
    const tagOpen = tagSyntax.open + tagValue + tagSyntax.separator;
    const content = editor.getText().slice(start, end);
    const contentStart = start + tagOpen.length;

    replaceEditorRange(start, end, tagOpen + content + tagSyntax.close);
    editor.setMainSelection(contentStart, contentStart + content.length);
    computeEditor();
}

function moveCaretToMetadataValue(lineStart, key) {
    const caret = lineStart + (key ? getMetadataLine(key).length : 0);

    editor.setMainSelection(caret, caret);
    editor.scrollToTop();
    computeEditor();
}

function removeEditorTagPair(pair) {
    const content = editor.getText().slice(pair.contentStart, pair.end);

    replaceEditorRange(pair.start, pair.end + 1, content);
    editor.setMainSelection(pair.start, pair.start + content.length);
    computeEditor();
}

function formatEditorSelection(tagValue) {
    const tagConfig = getTagConfig(tagValue);

    if (!tagConfig) {
        showError(`there is no tag configured for "${tagValue}"`);
        return;
    }

    editor.focus();

    const selection = editor.getMainSelection();

    if (selection.start < editorDocument.metadataLength) return;

    const pairs = getTagPairsForKey(editorDocument.body ?? "", tagConfig.key, editorDocument.bodyOffset);

    const selectedPair = pairs.find((pair) => isTagPairSelected(pair, selection.start, selection.end));
    if (selectedPair) {
        removeEditorTagPair(selectedPair);
        return;
    }

    if (selection.start !== selection.end) {
        wrapEditorRange(selection.start, selection.end, tagValue);
        return;
    }

    const word = getWordAt(editor.getText(), selection.start);
    if (word) {
        const wordPair = pairs.find((pair) => pair.contentStart === word.start && pair.end === word.end);

        if (wordPair) {
            removeEditorTagPair(wordPair);
            return;
        }

        wrapEditorRange(word.start, word.end, tagValue);
        return;
    }

    wrapEditorRange(selection.start, selection.start, tagValue);
}

function editEditorMetadata() {
    editor.focus();

    const existingKeys = editorDocument.metadata ? Object.keys(editorDocument.metadata.parsed) : [];
    const missingKeys = getTemplateMetadataKeys(templateContent).filter((key) => !existingKeys.includes(key));
    const lines = missingKeys.map(getMetadataLine).join("\n");
    const fenceLine = `${metadataFence}\n`;

    if (!editorDocument.metadata) {
        replaceEditorRange(0, 0, `${fenceLine}${lines}\n${fenceLine}`);
        moveCaretToMetadataValue(fenceLine.length, missingKeys[0]);
        return;
    }

    if (missingKeys.length) {
        const insertAt = editorDocument.metadataLength - metadataFence.length;

        replaceEditorRange(insertAt, insertAt, `${lines}\n`);
        moveCaretToMetadataValue(insertAt, missingKeys[0]);
        return;
    }

    moveCaretToMetadataValue(fenceLine.length, null);
}
