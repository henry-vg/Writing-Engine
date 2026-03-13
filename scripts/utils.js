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
    parseEditor();
    updatePreviewFromTemplate();
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

function parseEditor() {
    let value = editorInput.value;
    let highlighted = "";

    const caretPosition = editorInput.selectionDirection === "backward"
        ? editorInput.selectionStart
        : editorInput.selectionEnd;

    const metadata = getMetadata(value);

    if (metadata.raw) {
        value = value.slice(metadata.raw.length);
        highlighted += highlightMetadata(metadata, caretPosition);
    }

    highlighted += highlightTags(value, caretPosition, metadata.raw.length);
    editorHighlight.innerHTML = highlighted;
}

function getMetadata(value) {
    if (!value.startsWith("---\n")) {
        return { parsed: {}, raw: "" };
    }

    const endMatch = value.slice(4).match(/(?:^|\n)---(?=\n|$)/);
    if (!endMatch) {
        return { parsed: {}, raw: "" };
    }

    const endIndex = 4 + endMatch.index + (endMatch[0].startsWith("\n") ? 1 : 0);
    const raw = value.slice(0, endIndex + 3);

    const inner = value.slice(4, endIndex);
    const lines = inner.split("\n");
    const parsed = {};

    for (const line of lines) {
        if (!line.trim()) continue;

        const match = line.match(/^([^:\n]+):(.*)$/);
        if (!match) {
            return { parsed: {}, raw: "" };
        }

        parsed[match[1].trim()] = match[2].trim();
    }

    return { parsed, raw };
}

function highlightMetadata(metadata, caretPosition) {
    const raw = metadata.raw;
    const classPrefix = caretPosition > 0 && caretPosition < raw.length ? "active" : "inactive";

    const dashClass = `${classPrefix}-metadata-dashes`;
    const keyClass = `${classPrefix}-metadata-key`;
    const valueClass = `${classPrefix}-metadata-value`;

    const lines = raw.split("\n");
    let html = "";

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];

        if (line === "---") {
            html += `<span class="${dashClass}">---</span>`;
        } else if (!line.trim()) {
            html += "";
        } else {
            const match = line.match(/^([^:\n]+):(.*)$/);

            if (match) {
                const key = match[1];
                const value = match[2];

                html += `<span class="${keyClass}">${escapeHtml(key)}</span>`;
                html += `:`;
                html += `<span class="${valueClass}">${escapeHtml(value)}</span>`;
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

function highlightTags(value, caretPosition, offset = 0) {
    const pairs = new Map();
    const stack = [];

    for (let i = 0; i < value.length; i++) {
        if (value[i] === "{") {
            stack.push(i);
        } else if (value[i] === "}") {
            const start = stack.pop();
            if (start != null) {
                pairs.set(start, i);
            }
        }
    }

    function render(from, to) {
        let html = "";
        let i = from;

        while (i < to) {
            if (value[i] === "{" && pairs.has(i)) {
                const end = pairs.get(i);
                const inner = value.slice(i + 1, end);
                const match = inner.match(/^([a-zA-Z]+\s)/);

                if (match) {
                    const tag = match[1];
                    const tagExists = Object.keys(tags).find(key =>
                        tags[key].values.includes(tag.trim())
                    );

                    if (tagExists) {
                        const contentStart = i + 1 + match[0].length;
                        const absoluteStart = offset + i;
                        const absoluteEnd = offset + end;

                        const classPrefix =
                            caretPosition > absoluteStart && caretPosition < absoluteEnd + 1
                                ? "active"
                                : "inactive";

                        const bracketClass = `${classPrefix}-tag-bracket`;
                        const tagClass = `${classPrefix}-tag`;

                        html += `<span class="${bracketClass}">{</span>`;
                        html += `<span class="${tagClass}">${escapeHtml(tag)}</span>`;
                        html += render(contentStart, end);
                        html += `<span class="${bracketClass}">}</span>`;

                        i = end + 1;
                        continue;
                    }
                }
            }

            html += escapeHtml(value[i]);
            i++;
        }

        return html;
    }

    return render(0, value.length);
}