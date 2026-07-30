
function updatePreviewFromTemplate() {
    if (!templateContent) return;

    let merged = templateContent;

    for (const [key, value] of Object.entries(editorMetadata ?? {})) {
        const placeholder = `$${key}$`;
        merged = merged.replaceAll(placeholder, value);
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


    merged = merged.replaceAll("$body$", renderBodyToHtml(editorBody));

    preview.srcdoc = merged;
}
