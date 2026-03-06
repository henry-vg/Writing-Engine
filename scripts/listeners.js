window.addEventListener("blur", () => handleWindowBlur())

document.addEventListener("click", () => handleDocumentClick())
document.addEventListener("keydown", (e) => handleDocumentKeyDown(e))

document.addEventListener("selectionchange", () => handleDocumentSelectionChange())

editorInput.addEventListener("input", () => handleEditorInputInput())
editorInput.addEventListener("dblclick", () => handleEditorInputDoubleClick())
editorInput.addEventListener("scroll", () => handleEditorInputScroll())

for (const { button, tag } of formattingElements) {
    button.addEventListener("click", () => handleFormattingButtonClick(tag))
}

toggleThemeButton.addEventListener("click", () => handleToggleThemeButtonClick())
toggleSpellcheckButton.addEventListener("click", () => handleToggleSpellcheckButtonClick())
togglePreviewButton.addEventListener("click", () => handleTogglePreviewButtonClick())

editMetadataButton.addEventListener("click", () => handleEditMetadataButtonClick())

for (const { button, dropdown } of menuElements) {
    button.addEventListener("click", (e) => handleMenuDropdownButtonClick(e, dropdown))
}

newTextButton.addEventListener("click", () => handleNewTextButtonClick())
openTextButton.addEventListener("click", () => handleOpenTextButtonClick())
saveTextAsButton.addEventListener("click", () => handleSaveTextAsButtonClick())
saveTextButton.addEventListener("click", () => handleSaveTextButtonClick())
closeTextButton.addEventListener("click", () => handleCloseTextButtonClick())
openTemplateButton.addEventListener("click", () => handleOpenTemplateButtonClick())
closeTemplateButton.addEventListener("click", () => handleCloseTemplateButtonClick())
exportToPDFButton.addEventListener("click", () => handleExportToPDFButtonClick())
helpButton.addEventListener("click", () => handleHelpButtonClick())

helpCloseButton.addEventListener("click", () => handleHelpCloseButtonClick())