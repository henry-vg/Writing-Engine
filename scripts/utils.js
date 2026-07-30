function escapeHtml(text) {
    return text
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/\"/g, "&quot;")
        .replace(/'/g, "&#39;");
}

function normalizeLineBreaks(text) {
    return text.replaceAll("\r\n", "\n");
}

async function openFile(accept) {
    return await new Promise((resolve) => {
        const input = document.createElement("input");
        input.type = "file";
        input.accept = accept;
        input.addEventListener("change", () => resolve(input.files?.[0] ?? null), { once: true });
        input.addEventListener("cancel", () => resolve(null), { once: true });
        input.click();
    });
}

function setTemplateButtonsEnabled(enabled) {
    closeTemplateButton.toggleAttribute("disabled", !enabled);
    togglePreviewButton.toggleAttribute("disabled", !enabled);
    togglePreviewNegativeButton.toggleAttribute("disabled", !enabled);
    exportToPDFButton.toggleAttribute("disabled", !enabled);
}

function loadTemplateFile(name, content) {
    templateFilePath.textContent = name;

    if (!content) {
        templateContent = null;
        preview.toggleAttribute("hidden", true);
        setTemplateButtonsEnabled(false);
        return
    }

    content = normalizeLineBreaks(content);
    preview.toggleAttribute("hidden", false);
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
    computeTemplate();
}

function closeTemplateFile() {
    preview.toggleAttribute("hidden", true);
    setTemplateButtonsEnabled(false);
    templateFilePath.textContent = noTemplateFileMessage;
    templateContent = null;
    computeTemplate();
}

function loadTextFile(name, content) {
    textFilePath.textContent = name;
    if (content) {
        content = normalizeLineBreaks(content);
        closeTextButton.toggleAttribute("disabled", false);
    }
    else {
        closeTextButton.toggleAttribute("disabled", true);
    }
    editorInput.value = content;
    textContent = content;
    computeText();
    computeTemplate();
}

function closeTextFile() {
    closeTextButton.toggleAttribute("disabled", true);
    textFilePath.textContent = noTextFileMessage;
    editorInput.value = "";
    textContent = null;
    computeText();
    computeTemplate();
}

function loadTheme(theme) {
    document.documentElement.setAttribute("theme", theme);
}

function loadPreviewNegative(negative) {
    preview.toggleAttribute("negative", negative);
}

function closeAllMenuDropdowns() {
    for (const { dropdown } of menuElements) {
        dropdown.toggleAttribute("hidden", true);
    }
}

function parseMetadataLine(line) {
    const match = line.match(/^([^:\n]+):(.*)$/);
    if (!match) {
        return null;
    }

    return {
        key: match[1].trim(),
        value: match[2].trim(),
        rawKey: match[1],
        rawValue: match[2],
    };
}

function findMetadataEnd(value) {
    const endMatch = value.slice(4).match(/(?:^|\n)---(?=\n|$)/);
    if (!endMatch) {
        return null;
    }

    return 4 + endMatch.index + (endMatch[0].startsWith("\n") ? 1 : 0);
}

function parseMetadata(value) {
    if (!value.startsWith("---\n")) {
        return null;
    }

    const endIndex = findMetadataEnd(value);
    if (endIndex == null) {
        return null;
    }

    const raw = value.slice(0, endIndex + 3);
    const inner = value.slice(4, endIndex);
    const lines = inner.split("\n");
    const parsed = {};

    for (const line of lines) {
        if (!line.trim()) continue;

        const metadataLine = parseMetadataLine(line);
        if (!metadataLine) {
            return null;
        }

        parsed[metadataLine.key] = metadataLine.value;
    }

    return {
        parsed,
        raw,
        rawLength: raw.length,
    };
}

function getEditorBody(value, metadata) {
    return metadata ? value.slice(metadata.rawLength) : value;
}

function getTagConfig(tagValue) {
    for (const [key, tagConfig] of Object.entries(tags)) {
        if (!tagConfig.values.includes(tagValue)) {
            continue;
        }

        return {
            key,
            ...tagConfig,
        };
    }

    return null;
}

function getTagOpen(value, index) {
    if (value[index] !== "{") {
        return null;
    }

    let end = index + 1;
    while (end < value.length && /[a-zA-Z0-9]/.test(value[end])) {
        end++;
    }

    if (end === index + 1 || value[end] !== " ") {
        return null;
    }

    const tagValue = value.slice(index + 1, end);
    const tagConfig = getTagConfig(tagValue);
    if (!tagConfig) {
        return null;
    }

    return {
        ...tagConfig,
        value: tagValue,
        raw: value.slice(index + 1, end + 1),
        contentStart: end + 1,
    };
}

function getTagPairs(value) {
    const pairs = new Map();
    const stack = [];

    for (let i = 0; i < value.length; i++) {
        const tagOpen = getTagOpen(value, i);
        if (tagOpen) {
            stack.push(i);
            i = tagOpen.contentStart - 1;
            continue;
        }

        if (value[i] === "}") {
            const start = stack.pop();
            if (start != null) {
                pairs.set(start, i);
            }
        }
    }

    return pairs;
}

function getClassAttribute(classes) {
    if (!Array.isArray(classes) || !classes.length) {
        return "";
    }

    return ` class="${escapeHtml(classes.join(" "))}"`;
}

function applyMetadataToTemplate(value) {
    if (!editorMetadata) {
        return value;
    }

    for (const [key, metadataValue] of Object.entries(editorMetadata.parsed)) {
        value = value.replaceAll(`$${key}$`, metadataValue);
    }

    return value;
}

function renderBodyHtml(value) {
    if (!value) {
        return "";
    }

    const pairs = getTagPairs(value);
    const out = [];
    const stack = [];
    let openLineName = null;

    function isLineWrappingEnabled() {
        if (!stack.length) {
            return true;
        }

        return stack.every((item) => item.contentLineWrapping);
    }

    function getLineWrapping() {
        if (!stack.length) {
            return defaultLineWrapping;
        }

        return stack[stack.length - 1].contentLineWrapping;
    }

    function openLine() {
        if (!isLineWrappingEnabled() || openLineName) {
            return;
        }

        const lineWrapping = getLineWrapping();

        openLineName = lineWrapping.value;
        out.push(`<${openLineName}${getClassAttribute(lineWrapping.classes)}>`);

        for (const item of stack) {
            if (!item.isBlock) {
                out.push(item.openHtml);
            }
        }
    }

    function closeLine() {
        if (!openLineName) {
            return;
        }

        for (let i = stack.length - 1; i >= 0; i--) {
            if (!stack[i].isBlock) {
                out.push(`</${stack[i].name}>`);
            }
        }

        out.push(`</${openLineName}>`);
        openLineName = null;
    }

    function emitText(text) {
        if (!text) {
            return;
        }

        if (!isLineWrappingEnabled()) {
            if (!/\S/.test(text)) {
                return;
            }

            out.push(escapeHtml(text));
            return;
        }

        if (!openLineName && !/\S/.test(text)) {
            return;
        }

        openLine();
        out.push(escapeHtml(text));
    }

    function emitHtml(html) {
        if (isLineWrappingEnabled()) {
            openLine();
        }

        out.push(html);
    }

    function openTag(tagOpen) {
        const replacement = tagOpen.replacement;

        const isBlock = !!replacement.block;
        const openHtml = `<${replacement.value}${getClassAttribute(replacement.classes)}>`;

        if (isBlock) {
            closeLine();
            out.push(openHtml);
        } else {
            emitHtml(openHtml);
        }

        stack.push({
            contentLineWrapping: replacement.contentLineWrapping,
            isBlock,
            name: replacement.value,
            openHtml,
        });
    }

    function closeTag() {
        if (!stack.length) {
            emitText("}");
            return;
        }

        const tag = stack.pop();
        if (tag.isBlock) {
            closeLine();
            out.push(`</${tag.name}>`);
            return;
        }

        emitHtml(`</${tag.name}>`);
    }

    let i = 0;
    while (i < value.length) {
        if (value[i] === "\n") {
            closeLine();
            i++;
            continue;
        }

        const tagOpen = getTagOpen(value, i);
        if (tagOpen && pairs.has(i)) {
            const end = pairs.get(i);

            if (tagOpen.replacement.type === "none") {
                i = end + 1;
                continue;
            }

            if (tagOpen.replacement.type === "text") {
                emitText(tagOpen.replacement.value);
                i = end + 1;
                continue;
            }

            openTag(tagOpen);
            i = tagOpen.contentStart;
            continue;
        }

        if (tagOpen) {
            emitText("{");
            i++;
            continue;
        }

        if (value[i] === "}") {
            closeTag();
            i++;
            continue;
        }

        let start = i;
        while (i < value.length && value[i] !== "\n" && value[i] !== "}" && !getTagOpen(value, i)) {
            i++;
        }

        emitText(value.slice(start, i));
    }

    while (stack.length) {
        const tag = stack.pop();
        if (tag.isBlock) {
            closeLine();
            out.push(`</${tag.name}>`);
            continue;
        }

        emitHtml(`</${tag.name}>`);
    }

    closeLine();
    return out.join("");
}

function computeText() {
    editorContent = editorInput.value || null;

    needsSaving = textContent !== editorContent;
    textFilePathNeedsSaving.toggleAttribute("hidden", !needsSaving);

    if (!editorContent) {
        editorBody = null;
        editorMetadata = null;
        editorHighlight.innerHTML = "";
        return
    }

    const caretPosition = editorInput.selectionDirection === "backward"
        ? editorInput.selectionStart
        : editorInput.selectionEnd;

    const metadata = parseMetadata(editorContent);

    editorMetadata = metadata;

    let highlighted = "";
    let contentWithoutMetadata = editorContent;
    if (metadata) {
        contentWithoutMetadata = getEditorBody(editorContent, metadata);
        highlighted += highlightMetadata(caretPosition);
    }

    editorBody = contentWithoutMetadata;
    highlighted += highlightTags(caretPosition);

    editorHighlight.innerHTML = highlighted;
}

function highlightMetadata(caretPosition) {
    if (!editorMetadata) return "";

    const raw = editorMetadata.raw;
    const classPrefix = caretPosition >= 0 && caretPosition <= raw.length ? "active" : "inactive";

    const dashClass = `${classPrefix}-metadata-dashes`;
    const keyClass = `${classPrefix}-metadata-key`;
    const valueClass = `${classPrefix}-metadata-value`;
    const colonClass = `${classPrefix}-metadata-colon`;

    const lines = raw.split("\n");
    let html = "";

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];

        if (line === "---") {
            html += `<span class="${dashClass}">---</span>`;
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

function highlightTags(caretPosition) {
    if (!editorBody) return "";

    const pairs = getTagPairs(editorBody);

    function render(from, to) {
        let html = "";
        let i = from;

        while (i < to) {
            const tagOpen = getTagOpen(editorBody, i);
            if (tagOpen && pairs.has(i)) {
                const end = pairs.get(i);
                const offset = editorMetadata?.rawLength ?? 0;
                const absoluteStart = offset + i;
                const absoluteEnd = offset + end;

                const classPrefix =
                    caretPosition > absoluteStart && caretPosition < absoluteEnd + 1
                        ? "active"
                        : "inactive";

                const bracketClass = `${classPrefix}-tag-bracket`;
                const tagClass = `${classPrefix}-tag`;

                let content = render(tagOpen.contentStart, end);
                if (tagOpen.key === "comment") {
                    content = `<span class="${classPrefix}-comment">${content}</span>`;
                }

                html += `<span class="${bracketClass}">{</span>`;
                html += `<span class="${tagClass}">${escapeHtml(tagOpen.raw)}</span>`;
                html += content;
                html += `<span class="${bracketClass}">}</span>`;

                i = end + 1;
                continue;
            }

            html += escapeHtml(editorBody[i]);
            i++;
        }

        return html;
    }

    return render(0, editorBody.length);
}

function computeTemplate() {
    let value = templateContent;

    if (!value) {
        preview.srcdoc = "";
        return
    }

    value = applyMetadataToTemplate(value);
    value = value.replaceAll("$body$", renderBodyHtml(editorBody));

    preview.srcdoc = value;
}