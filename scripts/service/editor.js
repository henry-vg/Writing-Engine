function isWordCharacter(character) {
    return character != null && wordCharacters.test(character);
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
    const heads = instance.listSelections().map((range) => range.head);

    const edge = heads.reduce((furthest, head) =>
        CodeMirror.cmpPos(head, furthest) * direction > 0 ? head : furthest);
    const origin = heads.reduce((furthest, head) =>
        CodeMirror.cmpPos(head, furthest) * direction < 0 ? head : furthest);

    const goalColumn = instance.cursorCoords(origin, "div").left;
    const position = instance.findPosV(edge, direction, "line", goalColumn);

    if (position.hitSide) return;

    instance.addSelection(position);
}

CodeMirror.commands.addCursorBelow = (instance) => addCursor(instance, 1);
CodeMirror.commands.addCursorAbove = (instance) => addCursor(instance, -1);

function duplicateLines(instance, direction) {
    const heads = instance.listSelections().map((range) => range.head);
    const lines = [...new Set(heads.map((head) => head.line))].sort((a, b) => a - b);

    instance.operation(() => {
        for (const line of [...lines].reverse()) {
            instance.replaceRange(`${instance.getLine(line)}\n`, { line, ch: 0 });
        }

        instance.setSelections(heads.map((head) => {
            const copies = lines.filter((line) => line <= head.line).length;
            const line = head.line + copies - (direction > 0 ? 0 : 1);
            const position = { line, ch: head.ch };

            return { anchor: position, head: position };
        }));
    });
}

CodeMirror.commands.duplicateLineUp = (instance) => duplicateLines(instance, -1);
CodeMirror.commands.duplicateLineDown = (instance) => duplicateLines(instance, 1);

CodeMirror.commands.deleteLines = (instance) => {
    const heads = instance.listSelections().map((range) => range.head);
    const lines = [...new Set(heads.map((head) => head.line))];

    instance.operation(() => {
        CodeMirror.commands.deleteLine(instance);

        instance.setSelections(heads.map((head) => {
            const deletedAbove = lines.filter((line) => line < head.line).length;
            const line = Math.min(head.line - deletedAbove, instance.lastLine());
            const position = { line, ch: Math.min(head.ch, instance.getLine(line).length) };

            return { anchor: position, head: position };
        }));
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

const editor = CodeMirror(editorElement, {
    ...editorOptions,
    extraKeys: getEditorExtraKeys(),
    configureMouse: configureEditorMouse,
});
