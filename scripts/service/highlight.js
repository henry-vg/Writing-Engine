function isCommentContent(state) {
    return state.stack.some((item) => item.isComment);
}

function tokenizeMetadata(stream, state) {
    if (stream.string === metadataFence) {
        stream.skipToEnd();

        if (!state.metadataStart) {
            state.inMetadata = false;
        }

        state.metadataStart = false;
        return "metadata-dashes";
    }

    state.metadataStart = false;

    const metadataLine = parseMetadataLine(stream.string);

    if (!metadataLine) {
        stream.skipToEnd();
        return null;
    }

    if (stream.sol()) {
        stream.match(metadataLine.rawKey);
        return "metadata-key";
    }

    if (stream.peek() === ":") {
        stream.next();
        return "metadata-colon";
    }

    stream.skipToEnd();
    return "metadata-value";
}

function tokenizeBody(stream, state) {
    if (state.escaped) {
        state.escaped = false;
        stream.next();
        return isCommentContent(state) ? "comment" : null;
    }

    if (state.tagOpen) {
        const tagOpen = state.tagOpen;

        state.tagOpen = null;
        stream.match(tagOpen.raw);
        return "tag";
    }

    const character = stream.peek();

    if (character === tagSyntax.escape && isSyntaxCharacter(stream.string[stream.pos + 1])) {
        stream.next();
        state.escaped = true;
        return "tag-bracket";
    }

    if (character === tagSyntax.open) {
        const tagOpen = getTagOpen(stream.string, stream.pos);

        stream.next();

        if (!tagOpen) {
            return isCommentContent(state) ? "comment" : null;
        }

        state.tagOpen = tagOpen;
        state.stack.push({ isComment: tagOpen.replacement.type === "none" });
        return "tag-bracket";
    }

    if (character === tagSyntax.close && state.stack.length) {
        const wasComment = isCommentContent(state);

        stream.next();
        state.stack.pop();
        return wasComment && isCommentContent(state) ? "comment" : "tag-bracket";
    }

    while (!stream.eol()) {
        const next = stream.peek();

        if (next === tagSyntax.open || next === tagSyntax.close || next === tagSyntax.escape) break;

        stream.next();
    }

    if (stream.pos === stream.start) stream.next();

    return isCommentContent(state) ? "comment" : null;
}

CodeMirror.defineMode(editorModeName, () => ({
    startState: () => ({
        firstLine: true,
        metadataStart: false,
        inMetadata: false,
        escaped: false,
        tagOpen: null,
        stack: [],
    }),

    copyState: (state) => ({ ...state, stack: [...state.stack] }),

    token: (stream, state) => {
        if (state.firstLine && stream.sol()) {
            state.firstLine = false;
            state.inMetadata = stream.string === metadataFence;
            state.metadataStart = state.inMetadata;
        }

        return state.inMetadata ? tokenizeMetadata(stream, state) : tokenizeBody(stream, state);
    },
}));

function getActiveTagRange(caretPosition) {
    const offset = getMetadataLength();
    let activeRange = null;

    for (const [start, end] of editorTagPairs) {
        if (caretPosition <= offset + start || caretPosition > offset + end) continue;

        if (!activeRange || start > activeRange.start) activeRange = { start, end };
    }

    if (!activeRange) return null;

    return { start: offset + activeRange.start, end: offset + activeRange.end + 1 };
}

function refreshActiveMark() {
    const caretPosition = editor.indexFromPos(editor.getCursor("head"));

    const range = isMetadataActive(caretPosition)
        ? { start: 0, end: getMetadataLength() }
        : getActiveTagRange(caretPosition);

    const rangeKey = range ? `${range.start}-${range.end}` : null;

    if (rangeKey === lastActiveRange) return;

    lastActiveRange = rangeKey;
    activeMark?.clear();

    activeMark = range
        ? editor.markText(editor.posFromIndex(range.start), editor.posFromIndex(range.end),
            { className: activeMarkClass })
        : null;
}
