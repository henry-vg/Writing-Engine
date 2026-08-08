function getHighlightWindow(documentModel, caretPosition) {
    const length = documentModel.body?.length ?? 0;

    if (length <= highlightWindowSize) {
        return { start: 0, end: length, step: 0 };
    }

    const step = Math.round((caretPosition - documentModel.metadataLength) / highlightWindowStep);
    const quantizedCenter = step * highlightWindowStep;
    const half = highlightWindowSize / 2;

    return {
        start: Math.max(0, quantizedCenter - half),
        end: Math.min(length, quantizedCenter + half),
        step,
    };
}

function getHighlightState(documentModel, caretPosition, highlightWindow) {
    const offset = documentModel.bodyOffset;
    let activeTagRange = null;

    for (const [start, end] of documentModel.tagPairs) {
        if (caretPosition <= offset + start || caretPosition > offset + end) {
            continue;
        }

        if (!activeTagRange || start > activeTagRange.start) {
            activeTagRange = { start, end };
        }
    }

    const activeTagRangeKey = activeTagRange
        ? `${activeTagRange.start}-${activeTagRange.end}`
        : null;

    return `${isMetadataActive(documentModel, caretPosition)}|${activeTagRangeKey}|${highlightWindow.step}`;
}

function renderEditorHighlight() {
    const caretPosition = editor.getMainCursor();
    const highlightWindow = getHighlightWindow(editorDocument, caretPosition);

    lastHighlightState = getHighlightState(editorDocument, caretPosition, highlightWindow);
    editor.setHighlightHtml(getHighlightedDocumentHtml(editorDocument, caretPosition, highlightWindow));
}

function refreshHighlight() {
    if (!editorDocument.content) return;

    const caretPosition = editor.getMainCursor();
    const highlightWindow = getHighlightWindow(editorDocument, caretPosition);
    const state = getHighlightState(editorDocument, caretPosition, highlightWindow);

    if (state === lastHighlightState) return;

    lastHighlightState = state;
    editor.setHighlightHtml(getHighlightedDocumentHtml(editorDocument, caretPosition, highlightWindow));
}

function getHighlightedDocumentHtml(documentModel, caretPosition, highlightWindow) {
    let highlighted = "";

    if (documentModel.metadata) {
        highlighted += highlightMetadata(documentModel, caretPosition);
    }

    highlighted += highlightTags(documentModel, caretPosition, highlightWindow);
    return highlighted;
}

function highlightMetadata(documentModel, caretPosition) {
    if (!documentModel.metadata) return "";

    const raw = documentModel.metadata.raw;
    const classPrefix = isMetadataActive(documentModel, caretPosition) ? "active" : "inactive";

    const dashClass = `${classPrefix}-metadata-dashes`;
    const keyClass = `${classPrefix}-metadata-key`;
    const valueClass = `${classPrefix}-metadata-value`;
    const colonClass = `${classPrefix}-metadata-colon`;

    const lines = raw.split("\n");
    let html = "";

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];

        if (line === metadataFence) {
            html += `<span class="${dashClass}">${escapeHtml(metadataFence)}</span>`;
        } else {
            const metadataLine = parseMetadataLine(line);

            if (metadataLine) {
                html += `<span class="${keyClass}">${escapeHtml(metadataLine.rawKey)}</span>`;
                html += `<span class="${colonClass}">:</span>`;
                html += `<span class="${valueClass}">${escapeHtml(metadataLine.rawValue)}</span>`;
            } else {
                html += escapeHtml(line);
            }
        }

        if (i < lines.length - 1) {
            html += "\n";
        }
    }

    return html;
}

function highlightTags(documentModel, caretPosition, highlightWindow) {
    if (!documentModel.body) return "";

    const body = documentModel.body;
    const pairs = documentModel.tagPairs;

    function render(from, to) {
        let html = "";
        let i = from;

        while (i < to) {
            const escaped = getEscapeAt(body, i);
            if (escaped) {
                html += `<span class="inactive-tag-bracket">${escapeHtml(tagSyntax.escape)}</span>`;
                html += escapeHtml(escaped.value);
                i += escaped.raw.length;
                continue;
            }

            const tagOpen = getTagOpen(body, i);
            if (tagOpen && pairs.has(i)) {
                const end = pairs.get(i);
                const offset = documentModel.bodyOffset;
                const absoluteStart = offset + i;
                const absoluteEnd = offset + end;

                const classPrefix =
                    caretPosition > absoluteStart && caretPosition < absoluteEnd + 1
                        ? "active"
                        : "inactive";

                const bracketClass = `${classPrefix}-tag-bracket`;
                const tagClass = `${classPrefix}-tag`;

                let content = render(tagOpen.contentStart, end);
                if (tagOpen.replacement.type === "none") {
                    content = `<span class="${classPrefix}-comment">${content}</span>`;
                }

                html += `<span class="${bracketClass}">${escapeHtml(tagSyntax.open)}</span>`;
                html += `<span class="${tagClass}">${escapeHtml(tagOpen.raw)}</span>`;
                html += content;
                html += `<span class="${bracketClass}">${escapeHtml(tagSyntax.close)}</span>`;

                i = end + 1;
                continue;
            }

            let start = i;
            while (i < to
                && !getEscapeAt(body, i)
                && !(getTagOpen(body, i) && pairs.has(i))) {
                i++;
            }

            html += escapeHtml(body.slice(start, i));
        }

        return html;
    }

    return escapeHtml(body.slice(0, highlightWindow.start))
        + render(highlightWindow.start, highlightWindow.end)
        + escapeHtml(body.slice(highlightWindow.end));
}
