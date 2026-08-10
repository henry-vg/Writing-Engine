function getCaretPosition() {
    return editorInput.selectionDirection === "backward"
        ? editorInput.selectionStart
        : editorInput.selectionEnd;
}

function getHighlightWindow(caretPosition) {
    const length = editorBody.length;

    if (length <= highlightWindowSize) {
        return { start: 0, end: length, step: 0 };
    }

    const step = Math.round((caretPosition - getMetadataLength()) / highlightWindowStep);
    const quantizedCenter = step * highlightWindowStep;
    const half = highlightWindowSize / 2;

    return {
        start: Math.max(0, quantizedCenter - half),
        end: Math.min(length, quantizedCenter + half),
        step,
    };
}

function getHighlightState(caretPosition, highlightWindow) {
    const offset = getMetadataLength();
    let activeTagRange = null;

    for (const [start, end] of editorTagPairs) {
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

    return `${isMetadataActive(caretPosition)}|${activeTagRangeKey}|${highlightWindow.step}`;
}

function renderHighlight(caretPosition, highlightWindow) {
    let highlighted = "";

    if (editorMetadata) {
        highlighted += highlightMetadata(caretPosition);
    }

    highlighted += highlightTags(caretPosition, highlightWindow);
    editorHighlight.innerHTML = highlighted;
}

function refreshHighlight() {
    if (!editorContent) return;

    const caretPosition = getCaretPosition();
    const highlightWindow = getHighlightWindow(caretPosition);
    const state = getHighlightState(caretPosition, highlightWindow);

    if (state === lastHighlightState) return;

    lastHighlightState = state;
    renderHighlight(caretPosition, highlightWindow);
}

function highlightMetadata(caretPosition) {
    if (!editorMetadata) return "";

    const raw = editorMetadata.raw;
    const classPrefix = isMetadataActive(caretPosition) ? "active" : "inactive";

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

function highlightTags(caretPosition, highlightWindow) {
    if (!editorBody) return "";

    function render(from, to) {
        let html = "";
        let i = from;

        while (i < to) {
            const escaped = getEscapeAt(editorBody, i);
            if (escaped) {
                html += `<span class="inactive-tag-bracket">${escapeHtml(tagSyntax.escape)}</span>`;
                html += escapeHtml(escaped.value);
                i += escaped.raw.length;
                continue;
            }

            const tagOpen = getTagOpen(editorBody, i);
            if (tagOpen && editorTagPairs.has(i)) {
                const end = editorTagPairs.get(i);
                const offset = getMetadataLength();
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
                && !getEscapeAt(editorBody, i)
                && !(getTagOpen(editorBody, i) && editorTagPairs.has(i))) {
                i++;
            }

            html += escapeHtml(editorBody.slice(start, i));
        }

        return html;
    }

    return escapeHtml(editorBody.slice(0, highlightWindow.start))
        + render(highlightWindow.start, highlightWindow.end)
        + escapeHtml(editorBody.slice(highlightWindow.end));
}
