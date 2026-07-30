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
