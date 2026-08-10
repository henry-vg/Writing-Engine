window.addEventListener("blur", () => handleWindowBlur());
window.addEventListener("beforeunload", (e) => handleWindowBeforeUnload(e));
window.addEventListener("error", (e) => handleWindowError(e));
window.addEventListener("unhandledrejection", (e) => handleWindowUnhandledRejection(e));

document.addEventListener("click", () => handleDocumentClick());
document.addEventListener("keydown", (e) => handleDocumentKeyDown(e));

editor.on("change", (instance, change) => handleEditorChange(change));
editor.on("cursorActivity", () => handleEditorCursorActivity());
editor.getWrapperElement().addEventListener("contextmenu", (e) => handleEditorContextMenu(e));

for (const { button, tagValue } of buildTagButtons()) {
    button.addEventListener("click", () => handleFormattingButtonClick(tagValue));
}

toggleThemeButton.addEventListener("click", () => handleToggleThemeButtonClick());
toggleSpellcheckButton.addEventListener("click", () => handleToggleSpellcheckButtonClick());
togglePreviewButton.addEventListener("click", () => handleTogglePreviewButtonClick());
preview.addEventListener("load", () => handlePreviewLoad());
togglePreviewNegativeButton.addEventListener("click", () => handleTogglePreviewNegativeButtonClick());

editMetadataButton.addEventListener("click", () => handleEditMetadataButtonClick());

for (const { button, dropdown } of menuElements) {
    button.addEventListener("click", (e) => handleMenuDropdownButtonClick(e, dropdown));
}

newTextButton.addEventListener("click", () => handleNewTextButtonClick());
openTextButton.addEventListener("click", () => handleOpenTextButtonClick());
saveTextAsButton.addEventListener("click", () => handleSaveTextAsButtonClick());
saveTextButton.addEventListener("click", () => handleSaveTextButtonClick());
closeTextButton.addEventListener("click", () => handleCloseTextButtonClick());
openTemplateButton.addEventListener("click", () => handleOpenTemplateButtonClick());
closeTemplateButton.addEventListener("click", () => handleCloseTemplateButtonClick());
exportToPDFButton.addEventListener("click", () => handleExportToPDFButtonClick());
clearDataButton.addEventListener("click", () => handleClearDataButtonClick());
helpButton.addEventListener("click", () => handleHelpButtonClick());

helpCloseButton.addEventListener("click", () => handleHelpCloseButtonClick());

dialogSaveButton.addEventListener("click", () => closeDialog("save"));
dialogProceedButton.addEventListener("click", () => closeDialog("proceed"));
dialogCancelButton.addEventListener("click", () => closeDialog("cancel"));
