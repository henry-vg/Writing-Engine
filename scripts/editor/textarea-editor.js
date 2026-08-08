const editor = {
    getText() {
        return editorInput.value;
    },

    setText(text) {
        editorInput.value = text;
    },

    focus() {
        editorInput.focus();
    },

    isFocused() {
        return document.activeElement === editorInput;
    },

    getMainSelection() {
        return {
            start: editorInput.selectionStart,
            end: editorInput.selectionEnd,
            direction: editorInput.selectionDirection,
        };
    },

    setMainSelection(start, end, direction) {
        if (direction) {
            editorInput.setSelectionRange(start, end, direction);
            return;
        }

        editorInput.setSelectionRange(start, end);
    },

    getMainCursor() {
        const selection = this.getMainSelection();

        return selection.direction === "backward"
            ? selection.start
            : selection.end;
    },

    replaceRange(start, end, text) {
        this.focus();
        this.setMainSelection(start, end);

        if (document.execCommand("insertText", false, text)) {
            return true;
        }

        const value = this.getText();
        this.setText(value.slice(0, start) + text + value.slice(end));
        return false;
    },

    scrollToTop() {
        editorInput.scrollTop = 0;
        editorHighlight.scrollTop = 0;
    },

    syncHighlightScroll() {
        editorHighlight.scrollTop = editorInput.scrollTop;
        editorHighlight.scrollLeft = editorInput.scrollLeft;
    },

    setHighlightHtml(html) {
        editorHighlight.innerHTML = html;
    },

    clearHighlight() {
        editorHighlight.innerHTML = "";
    },

    setSpellcheck(enabled) {
        editorInput.spellcheck = enabled;
    },

    isSpellcheckEnabled() {
        return editorInput.spellcheck;
    },
};
