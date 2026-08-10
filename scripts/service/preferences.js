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
    editor.getWrapperElement().spellcheck = enabled;
    toggleSpellcheckButton.textContent = enabled ? disableSpellcheckMessage : enableSpellcheckMessage;
}
