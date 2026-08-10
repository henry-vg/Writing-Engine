function getClassAttribute(classes) {
    if (!Array.isArray(classes) || !classes.length) return "";

    return ` class="${escapeHtml(classes.join(" "))}"`;
}

function getTemplateMetadataKeys() {
    if (!templateContent) return [];

    const placeholders = templateContent.match(/\$[a-zA-Z][\w-]*\$/g) ?? [];
    const keys = placeholders.map((placeholder) => placeholder.slice(1, -1));

    return [...new Set(keys)].filter((key) => key !== templateBodyKey);
}

function applyMetadataToTemplate(value) {
    const placeholders = value.match(/\$[a-zA-Z][\w-]*\$/g) ?? [];
    const keys = placeholders.map((placeholder) => placeholder.slice(1, -1));

    for (const key of [...new Set(keys)]) {
        if (key === templateBodyKey) continue;

        value = value.replaceAll(`$${key}$`, escapeHtml(editorMetadata?.parsed[key] ?? ""));
    }

    return value;
}

function renderBodyHtml() {
    if (!editorBody) return "";

    const value = editorBody;
    const pairs = editorTagPairs;
    const out = [];
    const stack = [];
    let openLineName = null;

    function isLineWrappingEnabled() {
        if (!stack.length) return true;

        return stack.every((item) => item.contentLineWrapping);
    }

    function getLineWrapping() {
        if (!stack.length) return defaultLineWrapping;

        return stack[stack.length - 1].contentLineWrapping;
    }

    function openLine() {
        if (!isLineWrappingEnabled() || openLineName) return;

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
        if (!openLineName) return;

        for (let i = stack.length - 1; i >= 0; i--) {
            if (!stack[i].isBlock) {
                out.push(`</${stack[i].name}>`);
            }
        }

        out.push(`</${openLineName}>`);
        openLineName = null;
    }

    function emitText(text) {
        if (!text) return;

        if (!isLineWrappingEnabled()) {
            if (!/\S/.test(text)) return;

            out.push(escapeHtml(text));
            return;
        }

        if (!openLineName && !/\S/.test(text)) return;

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
            emitText(tagSyntax.close);
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

        const escaped = getEscapeAt(value, i);
        if (escaped) {
            emitText(escaped.value);
            i += escaped.raw.length;
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
            emitText(tagSyntax.open);
            i++;
            continue;
        }

        if (value[i] === tagSyntax.close) {
            closeTag();
            i++;
            continue;
        }

        let start = i;
        while (i < value.length
            && value[i] !== "\n"
            && value[i] !== tagSyntax.close
            && !getTagOpen(value, i)
            && !getEscapeAt(value, i)) {
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

function computePreview() {
    clearTimeout(previewTimeout);

    let value = templateContent;

    if (!value) {
        preview.srcdoc = "";
        return;
    }

    value = applyMetadataToTemplate(value);
    value = value.replaceAll(`$${templateBodyKey}$`, renderBodyHtml());

    previewScroll = {
        x: preview.contentWindow?.scrollX ?? 0,
        y: preview.contentWindow?.scrollY ?? 0,
    };

    preview.srcdoc = value;
}

function computePreviewSoon() {
    clearTimeout(previewTimeout);
    previewTimeout = setTimeout(computePreview, previewDebounceDelay);
}
