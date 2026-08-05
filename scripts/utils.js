/* ---------- Shared ---------- */
function escapeHtml(text) {
    return text
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/\"/g, "&quot;")
        .replace(/'/g, "&#39;");
}

/* ---------- Files ---------- */
function normalizeLineBreaks(text) {
    return text.replaceAll("\r\n", "\n");
}

function hasFilePickers() {
    if (window.showOpenFilePicker && window.showSaveFilePicker) return true;

    showError("this browser cannot open or save files: the File System Access API is unavailable");
    return false;
}

async function pickFileToOpen(types) {
    if (!hasFilePickers()) return null;

    try {
        const [handle] = await window.showOpenFilePicker({ types });
        return handle;
    } catch (error) {
        if (error.name !== "AbortError") showError("could not open the file picker", error);
        return null;
    }
}

async function pickFileToSave(suggestedName, types) {
    if (!hasFilePickers()) return null;

    try {
        return await window.showSaveFilePicker({ suggestedName, types });
    } catch (error) {
        if (error.name !== "AbortError") showError("could not open the save dialog", error);
        return null;
    }
}

async function writeFile(handle, content) {
    try {
        const writable = await handle.createWritable();
        await writable.write(content);
        await writable.close();
        return true;
    } catch (error) {
        showError(`could not write to "${handle.name}"`, error);
        return false;
    }
}

async function hasWritePermission(handle) {
    const options = { mode: "readwrite" };

    try {
        if (await handle.queryPermission(options) === "granted") return true;

        return await handle.requestPermission(options) === "granted";
    } catch {
        return false;
    }
}

function setTemplateButtonsEnabled(enabled) {
    closeTemplateButton.toggleAttribute("disabled", !enabled);
    togglePreviewButton.toggleAttribute("disabled", !enabled);
}

function loadTemplateFile(name, content) {
    templateFilePath.textContent = name;

    if (!content) {
        templateContent = null;
        setTemplateButtonsEnabled(false);
        loadPreviewVisible(previewVisible);
        return;
    }

    content = normalizeLineBreaks(content);
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
    loadPreviewVisible(previewVisible);
    computePreview();
}

function closeTemplateFile() {
    templateFilePath.textContent = noTemplateFileMessage;
    templateContent = null;
    setTemplateButtonsEnabled(false);
    loadPreviewVisible(previewVisible);
    computePreview();
}

function loadTextFile(name, content) {
    if (content !== null) {
        content = normalizeLineBreaks(content);
    }

    textFilePath.textContent = name;
    closeTextButton.toggleAttribute("disabled", content === null);
    editorInput.value = content ?? "";
    textFileContent = content || null;
    computeEditor();
    computePreview();
}

function closeTextFile() {
    closeTextButton.toggleAttribute("disabled", true);
    textFilePath.textContent = noTextFileMessage;
    editorInput.value = "";
    textFileContent = null;
    textFileHandle = null;
    computeEditor();
    computePreview();
}

async function writeTextFile() {
    const content = editorInput.value;

    if (!await writeFile(textFileHandle, content)) return false;

    await dbSet(dbTextKey, { name: textFileHandle.name, content });

    textFilePath.textContent = textFileHandle.name;
    closeTextButton.toggleAttribute("disabled", false);
    textFileContent = content || null;
    computeEditor();
    return true;
}

async function saveTextFile() {
    if (textFileHandle && await hasWritePermission(textFileHandle)) return await writeTextFile();

    return await pickTextFileToSave() && await writeTextFile();
}

async function pickTextFileToSave() {
    const handle = await pickFileToSave(textFileHandle?.name ?? defaultTextFileName, textFileTypes);

    if (!handle) return false;

    textFileHandle = handle;
    await dbSet(dbTextHandleKey, handle);
    return true;
}

/* ---------- Preferences ---------- */
function loadTheme(theme) {
    document.documentElement.setAttribute("theme", theme);
}

function loadPreviewNegative(negative) {
    preview.toggleAttribute("negative", negative);
}

function loadPreviewVisible(visible) {
    previewVisible = visible;

    const shown = visible && templateContent !== null;

    preview.toggleAttribute("hidden", !shown);
    togglePreviewNegativeButton.toggleAttribute("disabled", !shown);
    exportToPDFButton.toggleAttribute("disabled", !shown);
}

function loadSpellcheck(enabled) {
    editorInput.spellcheck = enabled;
    toggleSpellcheckButton.textContent = enabled ? disableSpellcheckMessage : enableSpellcheckMessage;
}

/* ---------- Dialogs ---------- */
function openDialog(message, saveLabel, proceedLabel, cancelLabel) {
    closeDialog("cancel");

    dialogMessage.textContent = message;

    for (const [button, label] of [
        [dialogSaveButton, saveLabel],
        [dialogProceedButton, proceedLabel],
        [dialogCancelButton, cancelLabel],
    ]) {
        button.textContent = label ?? "";
        button.toggleAttribute("hidden", !label);
    }

    dialogWrapper.toggleAttribute("hidden", false);
    (cancelLabel ? dialogCancelButton : dialogProceedButton).focus();

    return new Promise((resolve) => {
        dialogResolve = resolve;
    });
}

function closeDialog(answer) {
    dialogWrapper.toggleAttribute("hidden", true);
    dialogResolve?.(answer);
    dialogResolve = null;
}

function getFileMessage(message, name) {
    return message.replace(fileNamePlaceholder, name);
}

async function confirmAction(message) {
    return await openDialog(message, null, dialogLabels.confirm, dialogLabels.cancel) === "proceed";
}

function showError(message, error) {
    const reason = error?.message ? ` (${error.message})` : "";

    return openDialog(`${errorMessagePrefix}${message}${reason}`, null, dialogLabels.confirm, null);
}

async function confirmDiscardChanges() {
    if (!needsSaving) return true;

    const answer = await openDialog(
        getFileMessage(saveChangesMessage, textFilePath.textContent),
        dialogLabels.save,
        dialogLabels.discard,
        dialogLabels.cancel
    );

    if (answer === "cancel") return false;

    if (answer === "proceed") return true;

    return await saveTextFile();
}

/* ---------- Menus ---------- */
function closeAllMenuDropdowns() {
    for (const { dropdown } of menuElements) {
        dropdown.toggleAttribute("hidden", true);
    }
}

function closeAllMenus() {
    closeAllMenuDropdowns();
    editorContextMenu.toggleAttribute("hidden", true);
}

function buildMenuItems() {
    for (const item of optionsMenuItems) {
        const button = document.getElementById(item.id);

        if (!button) {
            showError(`there is no menu item with the id "${item.id}"`);
            continue;
        }

        applyButtonConfig(button, item);
    }
}

function applyButtonConfig(button, config) {
    const tooltip = config.tooltip ?? config.label;

    if (config.icon) {
        button.innerHTML = `<svg viewBox="0 0 24 24"><path d="${config.icon}"></path></svg>`;
    } else if (config.label) {
        button.textContent = config.label;
    }

    if (tooltip) {
        const modifiers = config.shift ? shortcutModifiers.shift : shortcutModifiers.plain;
        button.title = config.shortcut
            ? `${tooltip} (${modifiers}+${config.shortcut.toUpperCase()})`
            : tooltip;
    }
}

function buildTagButtons() {
    const tagButtons = [];

    for (const tagConfig of Object.values(tags)) {
        const buttonConfig = tagConfig.button;
        if (!buttonConfig) continue;

        const container = tagButtonContainers[buttonConfig.container];
        if (!container) continue;

        const button = document.createElement("button");
        button.type = "button";
        button.className = container.className;
        applyButtonConfig(button, buttonConfig);

        container.element.appendChild(button);
        tagButtons.push({ button, tagValue: tagConfig.values[0] });
    }

    return tagButtons;
}

/* ---------- Metadata ---------- */
function getMetadataLine(key) {
    return `${key}: `;
}

function parseMetadataLine(line) {
    const match = line.match(/^([^:\n]+):(.*)$/);
    if (!match) return null;

    return {
        key: match[1].trim(),
        value: match[2].trim(),
        rawKey: match[1],
        rawValue: match[2],
    };
}

function parseMetadata(value) {
    const opening = `${metadataFence}\n`;

    if (!value.startsWith(opening)) return null;

    const fenceLine = `\n${metadataFence}`;
    let endIndex = value.indexOf(fenceLine, metadataFence.length);

    while (endIndex !== -1) {
        const lineEnd = endIndex + fenceLine.length;

        if (lineEnd === value.length || value[lineEnd] === "\n") {
            endIndex++;
            break;
        }

        endIndex = value.indexOf(fenceLine, lineEnd);
    }

    if (endIndex === -1) return null;

    const raw = value.slice(0, endIndex + metadataFence.length);
    const inner = value.slice(opening.length, endIndex);
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

function getMetadataLength() {
    return editorMetadata?.rawLength ?? 0;
}

function isMetadataActive(caretPosition) {
    return editorMetadata !== null && caretPosition <= editorMetadata.rawLength;
}

/* ---------- Tags ---------- */
function getTagConfig(tagValue) {
    for (const [key, tagConfig] of Object.entries(tags)) {
        if (!tagConfig.values.includes(tagValue)) continue;

        return {
            key,
            ...tagConfig,
        };
    }

    return null;
}

function getTagConfigByShortcut(shortcut) {
    for (const tagConfig of Object.values(tags)) {
        if (tagConfig.button?.shortcut === shortcut) return tagConfig;
    }

    return null;
}

function isSyntaxCharacter(character) {
    return character === tagSyntax.open
        || character === tagSyntax.close
        || character === tagSyntax.escape;
}

function getEscapeAt(value, index) {
    if (value[index] !== tagSyntax.escape || !isSyntaxCharacter(value[index + 1])) return null;

    return {
        value: value[index + 1],
        raw: value.slice(index, index + 2),
    };
}

function getTagOpen(value, index) {
    if (value[index] !== tagSyntax.open) return null;

    let end = index + 1;
    while (end < value.length && /[a-zA-Z0-9]/.test(value[end])) {
        end++;
    }

    if (end === index + 1 || value[end] !== tagSyntax.separator) return null;

    const tagValue = value.slice(index + 1, end);
    const tagConfig = getTagConfig(tagValue);
    if (!tagConfig) return null;

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
        const escaped = getEscapeAt(value, i);
        if (escaped) {
            i += escaped.raw.length - 1;
            continue;
        }

        const tagOpen = getTagOpen(value, i);
        if (tagOpen) {
            stack.push(i);
            i = tagOpen.contentStart - 1;
            continue;
        }

        if (value[i] === tagSyntax.close) {
            const start = stack.pop();
            if (start != null) {
                pairs.set(start, i);
            }
        }
    }

    return pairs;
}

function getTagPairsForKey(value, key, offset) {
    const pairs = [];

    for (const [start, end] of getTagPairs(value)) {
        const tagOpen = getTagOpen(value, start);
        if (tagOpen.key !== key) continue;

        pairs.push({
            start: offset + start,
            end: offset + end,
            contentStart: offset + tagOpen.contentStart,
        });
    }

    return pairs;
}

function isTagPairSelected(pair, selectionStart, selectionEnd) {
    const wholeTag = pair.start === selectionStart && pair.end + 1 === selectionEnd;
    const onlyContent = pair.contentStart === selectionStart && pair.end === selectionEnd;

    return wholeTag || onlyContent;
}

/* ---------- Editor ---------- */
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

function replaceEditorRange(start, end, text) {
    editorInput.focus();
    editorInput.setSelectionRange(start, end);

    if (document.execCommand("insertText", false, text)) {
        return;
    }

    const value = editorInput.value;
    editorInput.value = value.slice(0, start) + text + value.slice(end);
    computeEditor();
    computePreview();
}

function wrapEditorRange(start, end, tagValue) {
    const tagOpen = tagSyntax.open + tagValue + tagSyntax.separator;
    const content = editorInput.value.slice(start, end);
    const contentStart = start + tagOpen.length;

    replaceEditorRange(start, end, tagOpen + content + tagSyntax.close);
    editorInput.setSelectionRange(contentStart, contentStart + content.length);
    computeEditor();
}

function moveCaretToMetadataValue(lineStart, key) {
    const caret = lineStart + (key ? getMetadataLine(key).length : 0);

    editorInput.setSelectionRange(caret, caret);
    editorInput.scrollTop = 0;
    editorHighlight.scrollTop = 0;
    computeEditor();
}

function removeEditorTagPair(pair) {
    const content = editorInput.value.slice(pair.contentStart, pair.end);

    replaceEditorRange(pair.start, pair.end + 1, content);
    editorInput.setSelectionRange(pair.start, pair.start + content.length);
    computeEditor();
}

function computeEditor() {
    editorContent = editorInput.value || null;

    needsSaving = textFileContent !== editorContent;
    textFilePathNeedsSaving.toggleAttribute("hidden", !needsSaving);

    if (!editorContent) {
        editorBody = null;
        editorMetadata = null;
        editorTagPairs = new Map();
        lastHighlightState = null;
        editorHighlight.innerHTML = "";
        return;
    }

    const metadata = parseMetadata(editorContent);

    editorMetadata = metadata;
    editorBody = metadata ? editorContent.slice(metadata.rawLength) : editorContent;
    editorTagPairs = getTagPairs(editorBody);

    const caretPosition = getCaretPosition();
    const highlightWindow = getHighlightWindow(caretPosition);

    lastHighlightState = getHighlightState(caretPosition, highlightWindow);
    renderHighlight(caretPosition, highlightWindow);
}

/* ---------- Rendering ---------- */
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
    if (!editorMetadata) return value;

    for (const [key, metadataValue] of Object.entries(editorMetadata.parsed)) {
        value = value.replaceAll(`$${key}$`, escapeHtml(metadataValue));
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

/* ---------- Highlight ---------- */
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

/* ---------- Preview ---------- */
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
