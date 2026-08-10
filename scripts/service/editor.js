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

function getEditorSelection() {
    return {
        start: editor.indexFromPos(editor.getCursor("from")),
        end: editor.indexFromPos(editor.getCursor("to")),
    };
}

function setEditorSelection(start, end) {
    editor.setSelection(editor.posFromIndex(start), editor.posFromIndex(end));
}

function replaceEditorRange(start, end, text) {
    editor.focus();
    editor.replaceRange(text, editor.posFromIndex(start), editor.posFromIndex(end));
}

function wrapEditorRange(start, end, tagValue) {
    const tagOpen = tagSyntax.open + tagValue + tagSyntax.separator;
    const content = editor.getValue().slice(start, end);
    const contentStart = start + tagOpen.length;

    replaceEditorRange(start, end, tagOpen + content + tagSyntax.close);
    setEditorSelection(contentStart, contentStart + content.length);
}

function moveCaretToMetadataValue(lineStart, key) {
    const caret = lineStart + (key ? getMetadataLine(key).length : 0);

    setEditorSelection(caret, caret);
    editor.scrollTo(0, 0);
}

function removeEditorTagPair(pair) {
    const content = editor.getValue().slice(pair.contentStart, pair.end);

    replaceEditorRange(pair.start, pair.end + 1, content);
    setEditorSelection(pair.start, pair.start + content.length);
}

function computeEditor() {
    editorContent = editor.getValue() || null;
    lastActiveRange = null;

    needsSaving = textFileContent !== editorContent;
    textFilePathNeedsSaving.toggleAttribute("hidden", !needsSaving);

    if (!editorContent) {
        editorBody = null;
        editorMetadata = null;
        editorTagPairs = new Map();
        refreshActiveMark();
        return;
    }

    const metadata = parseMetadata(editorContent);

    editorMetadata = metadata;
    editorBody = metadata ? editorContent.slice(metadata.rawLength) : editorContent;
    editorTagPairs = getTagPairs(editorBody);
    refreshActiveMark();
}

function configureEditorMouse(instance, repeat, event) {
    if (event.altKey && !event.shiftKey) return { addNew: true };

    return {};
}

function addCursor(instance, direction) {
    const ranges = instance.listSelections();
    const heads = ranges.map((range) => range.head);

    const edge = direction > 0
        ? heads.reduce((furthest, head) => (head.line > furthest.line ? head : furthest))
        : heads.reduce((furthest, head) => (head.line < furthest.line ? head : furthest));

    const line = edge.line + direction;

    if (line < instance.firstLine() || line > instance.lastLine()) return;

    const position = { line, ch: Math.min(edge.ch, instance.getLine(line).length) };

    instance.setSelections([...ranges, { anchor: position, head: position }], ranges.length);
}

CodeMirror.commands.addCursorBelow = (instance) => addCursor(instance, 1);
CodeMirror.commands.addCursorAbove = (instance) => addCursor(instance, -1);

CodeMirror.commands.duplicateLine = (instance) => {
    const lines = [...new Set(instance.listSelections().map((range) => range.head.line))];

    instance.operation(() => {
        for (const line of lines.sort((a, b) => b - a)) {
            const text = instance.getLine(line);

            instance.replaceRange(`\n${text}`, { line, ch: text.length });
        }

        instance.setSelections(instance.listSelections().map((range) => ({
            anchor: { line: range.anchor.line + 1, ch: range.anchor.ch },
            head: { line: range.head.line + 1, ch: range.head.ch },
        })));
    });
};

function getAppShortcutKeys() {
    const buttonConfigs = [...Object.values(tags).map((tagConfig) => tagConfig.button), ...optionsMenuItems];

    return buttonConfigs
        .filter((buttonConfig) => buttonConfig?.shortcut)
        .map((buttonConfig) => (buttonConfig.shift ? "Shift-Ctrl-" : "Ctrl-")
            + buttonConfig.shortcut.toUpperCase());
}

function getEditorExtraKeys() {
    const extraKeys = { ...editorShortcuts };

    for (const key of [...disabledEditorShortcuts, ...getAppShortcutKeys()]) {
        extraKeys[key] = false;
    }

    return extraKeys;
}

const editor = CodeMirror(editorWrapper, {
    ...editorOptions,
    extraKeys: getEditorExtraKeys(),
    configureMouse: configureEditorMouse,
});
