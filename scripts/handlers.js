function handleWindowBlur() {
    closeAllMenuDropdowns();
}

function handleDocumentClick() {
    closeAllMenuDropdowns();
}

function handleDocumentKeyDown(e) {
    if (e.key == "Escape") {
        closeAllMenuDropdowns();
    }

    if (document.activeElement === editorInput) {
        const ctrlOrCmd = e.ctrlKey || e.metaKey;

        if (!ctrlOrCmd) return;

        switch (e.key.toLowerCase()) {
            case "1":
                e.preventDefault();
                title1Button.click();
                break;
            case "2":
                e.preventDefault();
                title2Button.click();
                break;
            case "3":
                e.preventDefault();
                title3Button.click();
                break;
            case "b":
                e.preventDefault();
                boldButton.click();
                break;
            case "i":
                e.preventDefault();
                italicButton.click();
                break;
            case "u":
                e.preventDefault();
                underlineButton.click();
                break;
        }
    }
}

function handleDocumentSelectionChange() {
    if (document.activeElement === editorInput) highlightEditor();
}

function handleEditorInputInput() {
    highlightEditor();
    updatePreviewFromTemplate();
}

function handleEditorInputDoubleClick() {
    requestAnimationFrame(() => {
        const value = editorInput.value;
        let start = editorInput.selectionStart;
        let end = editorInput.selectionEnd;

        while (start < end && /\s/.test(value[start])) start++;
        while (end > start && /\s/.test(value[end - 1])) end--;

        if (start !== editorInput.selectionStart || end !== editorInput.selectionEnd) {
            editorInput.setSelectionRange(start, end);
        }
    });
}

function handleEditorInputScroll() {
    editorHighlight.scrollTop = editorInput.scrollTop;
    editorHighlight.scrollLeft = editorInput.scrollLeft;
}

function handleFormattingButtonClick(tag) {
    editorInput.focus();

    // TODO : revisar código (antigo "addEditorTag")
    const selectionStart = editorInput.selectionStart;
    const selectionEnd = editorInput.selectionEnd;
    const value = editorInput.value;

    const targetTagKey = tagKeyByValue[tag] ?? tag;

    const tagOpen = `{${tag} `;
    const tagClose = `}`;

    const isWordChar = (c) => c != null && /\p{L}/u.test(c);

    function findPairsForTag(targetKey) {
        const stack = [];
        const pairs = [];

        for (let i = 0; i < value.length; i++) {
            const ch = value[i];

            if (ch === "{") {
                let j = i + 1;
                while (j < value.length && value[j] !== " " && value[j] !== "}") j++;

                if (value[j] !== " ") continue;

                const foundTag = value.slice(i + 1, j);
                if (!foundTag || !validTags.has(foundTag)) continue;

                const foundKey = tagKeyByValue[foundTag] ?? foundTag;

                // j é o índice do espaço; tagEnd = j-1; conteúdo começa em j+1
                stack.push({ open: i, key: foundKey, contentStart: j + 1 });

                i = j - 1;
                continue;
            }

            if (ch === "}") {
                if (!stack.length) continue;

                const openTag = stack.pop();
                if (openTag.key === targetKey) {
                    pairs.push({
                        open: openTag.open,
                        close: i,
                        contentStart: openTag.contentStart, // inclusive
                        contentEnd: i, // exclusivo (antes do '}')
                    });
                }
            }
        }

        return pairs;
    }

    const pairs = findPairsForTag(targetTagKey);

    function removeTagPair(pair, newCaretOrSelectionStart, newSelectionEnd = null) {
        const inner = value.slice(pair.contentStart, pair.contentEnd);
        editorInput.value = value.slice(0, pair.open) + inner + value.slice(pair.close + 1);

        if (newSelectionEnd == null) {
            editorInput.setSelectionRange(newCaretOrSelectionStart, newCaretOrSelectionStart);
        } else {
            editorInput.setSelectionRange(newCaretOrSelectionStart, newSelectionEnd);
        }
    }

    // ------------------------
    // 1) SELEÇÃO: se selecionou exatamente "{tag ...}" => remove
    // ------------------------
    if (selectionStart !== selectionEnd) {
        const pair = pairs.find(p => p.open === selectionStart && (p.close + 1) === selectionEnd);
        if (pair) {
            const innerLen = pair.contentEnd - pair.contentStart;
            removeTagPair(pair, pair.open, pair.open + innerLen);
            editorInput.dispatchEvent(new Event("input", { bubbles: true }));
            return;
        }

        // caso normal: envolver seleção
        const selectedText = value.slice(selectionStart, selectionEnd);
        const wrapped = tagOpen + selectedText + tagClose;

        editorInput.value = value.slice(0, selectionStart) + wrapped + value.slice(selectionEnd);

        editorInput.setSelectionRange(selectionStart, selectionStart + wrapped.length);

        editorInput.dispatchEvent(new Event("input", { bubbles: true }));
        return;
    }

    // ------------------------
    // 2) SEM SELEÇÃO: palavra sob o caret
    // ------------------------
    const caret = selectionStart;

    let wordStart = caret;
    let wordEnd = caret;

    const isInsideWord = isWordChar(value[caret - 1]) && isWordChar(value[caret]);

    if (isInsideWord) {
        while (wordStart > 0 && isWordChar(value[wordStart - 1])) wordStart--;
        while (wordEnd < value.length && isWordChar(value[wordEnd])) wordEnd++;
    }

    // se não está sobre palavra, comportamento antigo: inserir tag vazia
    if (wordStart === wordEnd) {
        // Se o caret está dentro de uma tag vazia do mesmo tipo (ex: "{b }"), remove.
        const emptyPair = pairs.find(p => p.contentStart === caret && p.contentEnd === caret);
        if (emptyPair) {
            removeTagPair(emptyPair, emptyPair.open);
            editorInput.dispatchEvent(new Event("input", { bubbles: true }));
            return;
        }

        const insertion = tagOpen + tagClose;
        editorInput.value = value.slice(0, caret) + insertion + value.slice(caret);

        const caretPos = caret + tagOpen.length;
        editorInput.setSelectionRange(caretPos, caretPos);

        editorInput.dispatchEvent(new Event("input", { bubbles: true }));
        return;
    }

    // Se existe um {tag ...} cujo conteúdo é exatamente essa palavra => remove
    const exactPair = pairs.find(p => p.contentStart === wordStart && p.contentEnd === wordEnd);
    if (exactPair) {
        const newCaret = exactPair.open + (caret - exactPair.contentStart);
        removeTagPair(exactPair, newCaret);
        editorInput.dispatchEvent(new Event("input", { bubbles: true }));
        return;
    }

    // Caso contrário: envolver a palavra (mesmo se estiver dentro de um {tag ...} maior)
    const selectedText = value.slice(wordStart, wordEnd);
    const wrapped = tagOpen + selectedText + tagClose;

    editorInput.value = value.slice(0, wordStart) + wrapped + value.slice(wordEnd);

    // mantém o caret na mesma posição relativa dentro da palavra
    const newCaret = wordStart + tagOpen.length + (caret - wordStart);
    editorInput.setSelectionRange(newCaret, newCaret);

    editorInput.dispatchEvent(new Event("input", { bubbles: true }));
}

function handleToggleThemeButtonClick() {
    theme = document.documentElement.getAttribute("theme");
    newTheme = theme === "dark" ? "light" : "dark";
    loadTheme(newTheme);
    dbSet(DBThemeKey, newTheme);
}

function handleToggleSpellcheckButtonClick() {
    editorInput.spellcheck = !editorInput.spellcheck;
}

function handleTogglePreviewButtonClick() {
    preview.toggleAttribute("hidden", !preview.hidden);
}

function handleEditMetadataButtonClick() {
    editorInput.focus();

    const value = editorInput.value;
    const newline = value.includes("\r\n") ? "\r\n" : "\n";

    if (!currentTextMetadata) {
        const block = `---${newline}${newline}---${newline}`;

        editorInput.value = block + value;

        const caret = (`---${newline}`).length;
        editorInput.setSelectionRange(caret, caret);

        editorInput.scrollTop = 0;
        editorHighlight.scrollTop = 0;
        highlightEditor();
        return;
    }
    editorInput.setSelectionRange(3 + newline.length, 3 + newline.length);
    editorInput.scrollTop = 0;
    editorHighlight.scrollTop = 0;
    highlightEditor();
}

function handleMenuDropdownButtonClick(e, dropdown) {
    e.stopPropagation();
    const mustOpen = dropdown.hidden;
    closeAllMenuDropdowns();
    dropdown.toggleAttribute("hidden", !mustOpen);
}

function handleNewTextButtonClick() {

}

async function handleOpenTextButtonClick() {
    const file = await openFile(".txt");

    if (!file) return;

    const name = file.name;
    const content = await file.text();
    await dbSet(DBTextKey, { name: name, content });

    loadTextFile(name, content);
}

function handleSaveTextAsButtonClick() {

}

function handleSaveTextButtonClick() {

}

function handleCloseTextButtonClick() {

}

async function handleOpenTemplateButtonClick() {
    const file = await openFile(".html, .htm, text/html");

    if (!file) return;

    const name = file.name;
    const content = await file.text();
    await dbSet(DBTemplateKey, { name: name, content });

    loadTemplateFile(name, content);
}

function handleCloseTemplateButtonClick() {

}

function handleExportToPDFButtonClick() {
    preview.contentWindow.print();
}

function handleHelpButtonClick() {
    helpDialogWrapper.toggleAttribute("hidden", false);
}

function handleHelpCloseButtonClick() {
    helpDialogWrapper.toggleAttribute("hidden", true);
}