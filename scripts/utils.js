function escapeHtml(text) {
    return text
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/\"/g, "&quot;")
        .replace(/'/g, "&#39;");
}

async function openFile(accept) {
    return await new Promise((resolve) => {
        const input = document.createElement("input");
        input.type = "file";
        input.accept = accept;
        input.addEventListener("change", () => resolve(input.files?.[0] ?? null), { once: true });
        input.click();
    });
}

function renderBodyToHtml(bodyText) {
    // TODO : revisar código 
    if (!bodyText) return "";

    const text = String(bodyText);
    const out = [];
    const stack = [];

    const isParagraphWrappingEnabled = () => stack.every((x) => x.contentParagraphWrapping);

    const isBlockReplacement = (replacement) => {
        const tagName = replacement?.value;
        return tagName === "div" || tagName === "h1" || tagName === "h2" || tagName === "h3";
    };

    let paragraphOpen = false;

    const openParagraph = () => {
        if (!isParagraphWrappingEnabled()) return;
        if (paragraphOpen) return;
        out.push("<p>");
        paragraphOpen = true;
    };

    const closeParagraph = () => {
        if (!isParagraphWrappingEnabled()) return;
        if (!paragraphOpen) return;
        out.push("</p>");
        paragraphOpen = false;
    };

    const emitInlineHtml = (html) => {
        if (isParagraphWrappingEnabled()) {
            openParagraph();
            out.push(html);
            return;
        }

        out.push(html);
    };

    const emitText = (raw) => {
        if (!raw) return;

        if (!isParagraphWrappingEnabled()) {
            // Don't emit whitespace-only runs when paragraph wrapping is disabled.
            if (!/\S/.test(raw)) return;
            out.push(escapeHtml(raw));
            return;
        }

        // Don't create paragraphs for whitespace-only lines.
        if (!paragraphOpen && !/\S/.test(raw)) return;
        openParagraph();
        out.push(escapeHtml(raw));
    };

    const openTag = (tagValue) => {
        if (!validTags.has(tagValue)) return false;

        const key = tagKeyByValue[tagValue] ?? tagValue;
        const replacement = tags[key]?.replacement;
        if (!replacement?.value) return false;

        const classes = Array.isArray(replacement.classes) ? replacement.classes : [];
        const classAttr = classes.length ? ` class=\"${escapeHtml(classes.join(" "))}\"` : "";
        const html = `<${replacement.value}${classAttr}>`;

        const isBlock = isBlockReplacement(replacement);
        if (isBlock) closeParagraph();
        (isBlock ? out.push(html) : emitInlineHtml(html));

        stack.push({
            name: replacement.value,
            isBlock,
            contentParagraphWrapping: replacement.contentParagraphWrapping,
        });
        return true;
    };

    const closeTag = () => {
        if (!stack.length) {
            emitText("}");
            return;
        }

        const { name, isBlock } = stack.pop();
        if (isBlock) closeParagraph();
        (isBlock ? out.push(`</${name}>`) : emitInlineHtml(`</${name}>`));
    };

    let i = 0;
    while (i < text.length) {
        const ch = text[i];

        if (ch === "\n" || ch === "\r") {
            if (ch === "\r" && text[i + 1] === "\n") i++;
            i++;
            closeParagraph();
            continue;
        }

        if (ch === "{") {
            let j = i + 1;
            while (j < text.length && text[j] !== " " && text[j] !== "}" && text[j] !== "\n" && text[j] !== "\r") j++;

            const delim = text[j];
            if (delim === " " || delim === "\n" || delim === "\r") {
                const tagValue = text.slice(i + 1, j);
                if (openTag(tagValue)) {
                    // If delimiter is a space, consume it. If it's a newline, keep it so it becomes a paragraph break.
                    i = delim === " " ? (j + 1) : j;
                    continue;
                }
            }

            emitText("{");
            i++;
            continue;
        }

        if (ch === "}") {
            closeTag();
            i++;
            continue;
        }

        // Regular text chunk (escape)
        let start = i;
        while (i < text.length && text[i] !== "{" && text[i] !== "}" && text[i] !== "\n" && text[i] !== "\r") i++;
        emitText(text.slice(start, i));
    }

    closeParagraph();

    // Close any still-open tags to keep the HTML valid.
    while (stack.length) {
        const { name, isBlock } = stack.pop();
        if (isBlock) {
            closeParagraph();
            out.push(`</${name}>`);
            continue;
        }

        emitInlineHtml(`</${name}>`);
    }

    closeParagraph();
    return out.join("");
}

function updatePreviewFromTemplate() {
    if (!currentTemplateContent) return;

    let merged = currentTemplateContent;

    for (const [key, value] of Object.entries(currentTextMetadata ?? {})) {
        const placeholder = `$${key}$`;
        merged = merged.replaceAll(placeholder, value);
    }

    merged = merged.replaceAll("$body$", renderBodyToHtml(currentTextBody));

    preview.srcdoc = merged;
}

function loadTemplateFile(name, content) {
    templateFilePath.textContent = name;

    const appCss = document.querySelector("style")?.textContent ?? "";

    let prepared = content.replace(
        /<head>/i,
        `<head><style>${appCss}</style>`
    );

    prepared = prepared.replace(/<html([^>]*)>/i, (match, attrs) => {
        if (/class\s*=/i.test(attrs)) {
            return match.replace(/class\s*=\s*"([^"]*)"/i, `class="$1 ${previewScrollbarClass}"`);
        }

        return `<html${attrs} class="${previewScrollbarClass}">`;
    });

    currentTemplateContent = prepared;
    updatePreviewFromTemplate();
}

function loadTextFile(name, content) {
    textFilePath.textContent = name;
    editorInput.value = content;
    highlightEditor();
    updatePreviewFromTemplate();
}

function loadTheme(theme) {
    document.documentElement.setAttribute("theme", theme);
}

function closeAllMenuDropdowns() {
    for (const { dropdown } of menuElements) {
        dropdown.toggleAttribute("hidden", true);
    }
}

function highlightEditor() {
    // TODO : revisar código
    const value = editorInput.value;

    const caretPosition = editorInput.selectionDirection === "backward"
        ? editorInput.selectionStart
        : editorInput.selectionEnd;

    const stack = [];
    const tokensByIndex = new Map();

    currentTextMetadata = null;
    currentTextBody = value.trim();

    const addSpanToken = (start, endExclusive, className) => {
        if (start == null || endExclusive == null) return;
        if (start < 0 || endExclusive <= start) return;
        tokensByIndex.set(start, {
            end: endExclusive - 1,
            html: `<span class="${className}">${escapeHtml(value.slice(start, endExclusive))}</span>`,
        });
    };

    for (let i = 0; i < value.length; i++) {
        const currentChar = value[i];

        if (i === 0) {
            if (currentChar === "-" && value[1] === "-" && value[2] === "-" && (value[3] === "\n" || (value[3] === "\r" && value[4] === "\n"))) {
                const openingNewlineLen = value[3] === "\n" ? 1 : 2;
                const openingEndExclusive = 3 + openingNewlineLen;

                const nextLineEnd = (from) => {
                    const end = value.indexOf("\n", from);
                    return end === -1 ? value.length : end;
                };

                let cursor = openingEndExclusive;
                let closingDashesStart = -1;
                let metadataEndExclusive = 0;
                let isValid = true;
                const meta = {};

                while (cursor <= value.length) {
                    const lineStart = cursor;
                    const lineEnd = nextLineEnd(lineStart);
                    const lineEndExclusive = lineEnd < value.length ? lineEnd + 1 : lineEnd;

                    let logicalLineEnd = lineEnd;
                    if (logicalLineEnd > lineStart && value[logicalLineEnd - 1] === "\r") logicalLineEnd--;

                    const line = value.slice(lineStart, logicalLineEnd);

                    if (line === "---") {
                        closingDashesStart = lineStart;
                        metadataEndExclusive = lineEndExclusive;
                        break;
                    }

                    // Allow blank lines inside metadata: ignore them (don't parse into currentTextMetadata).
                    if (line.trim() === "") {
                        cursor = lineEndExclusive;
                        continue;
                    }

                    const colonIndex = line.indexOf(":");
                    if (colonIndex === -1) {
                        isValid = false;
                        break;
                    }

                    const key = line.slice(0, colonIndex).trim();
                    if (!key) {
                        isValid = false;
                        break;
                    }

                    meta[key] = line.slice(colonIndex + 1).trim();

                    cursor = lineEndExclusive;
                }

                if (isValid && metadataEndExclusive) {
                    currentTextMetadata = meta;
                    currentTextBody = value.slice(metadataEndExclusive).trim();
                    const isMetadataActive = caretPosition >= 0 && caretPosition < metadataEndExclusive;

                    // dashes (abertura e fechamento)
                    addSpanToken(0, 3, isMetadataActive ? "active-metadata-dashes" : "inactive-metadata-dashes");
                    if (closingDashesStart !== -1) {
                        addSpanToken(closingDashesStart, closingDashesStart + 3, isMetadataActive ? "active-metadata-dashes" : "inactive-metadata-dashes");
                    }

                    // linhas key: value
                    cursor = openingEndExclusive;
                    while (cursor < metadataEndExclusive) {
                        const lineStart = cursor;
                        const lineEnd = nextLineEnd(lineStart);
                        const lineEndExclusive = lineEnd < value.length ? lineEnd + 1 : lineEnd;

                        let logicalLineEnd = lineEnd;
                        if (logicalLineEnd > lineStart && value[logicalLineEnd - 1] === "\r") logicalLineEnd--;

                        const line = value.slice(lineStart, logicalLineEnd);
                        if (line === "---") break;

                        const colonIndex = line.indexOf(":");
                        if (colonIndex !== -1) {
                            const keyStart = lineStart;
                            const keyEndExclusive = lineStart + colonIndex + 1; // inclui ':'
                            const valueStart = keyEndExclusive;
                            const valueEndExclusive = logicalLineEnd;

                            addSpanToken(keyStart, keyEndExclusive, isMetadataActive ? "active-metadata-key" : "inactive-metadata-key");
                            addSpanToken(valueStart, valueEndExclusive, isMetadataActive ? "active-metadata-value" : "inactive-metadata-value");
                        }

                        cursor = lineEndExclusive;
                    }

                    // pula o metadata inteiro pra não aplicar highlight de tags dentro dele
                    i = metadataEndExclusive - 1;
                    continue;
                }
            }
        }

        if (currentChar === "{") {
            let j = i + 1;
            while (j < value.length && value[j] !== " " && value[j] !== "}" && value[j] !== "\n" && value[j] !== "\r") j++;

            if (value[j] !== " " && value[j] !== "\n" && value[j] !== "\r") continue;

            const tag = value.slice(i + 1, j);
            if (!tag || !validTags.has(tag)) continue;

            stack.push({ open: i, tagEnd: j - 1 });

            i = j - 1;
            continue;
        }

        if (currentChar === "}") {
            if (!stack.length) continue;

            const { open, tagEnd } = stack.pop();
            const isActive = caretPosition > open && caretPosition <= i;
            const tagStart = open + 1;
            const tag = value.slice(tagStart, tagEnd + 1);

            tokensByIndex.set(open, {
                end: open,
                html: `<span class="${isActive ? "active-tag-bracket" : "inactive-tag-bracket"}">{</span>`,
            });

            tokensByIndex.set(i, {
                end: i,
                html: `<span class="${isActive ? "active-tag-bracket" : "inactive-tag-bracket"}">}</span>`,
            });

            tokensByIndex.set(tagStart, {
                end: tagEnd,
                html: `<span class="${isActive ? "active-tag" : "inactive-tag"}">${escapeHtml(tag)}</span>`,
            });
        }
    }

    let highlighted = "";
    for (let i = 0; i < value.length; i++) {
        const token = tokensByIndex.get(i);
        if (token) {
            highlighted += token.html;
            i = token.end;
            continue;
        }

        highlighted += escapeHtml(value[i]);
    }

    editorHighlight.innerHTML = highlighted;
}