const editorElement = document.getElementById("editor");
const preview = document.getElementById("preview");
const previewScrollbarStyle = document.getElementById("preview-scrollbar-style");

const templateFilePath = document.getElementById("templateFilePath");
const textFilePath = document.getElementById("textFilePath");
const textFilePathNeedsSaving = document.getElementById("textFilePathNeedsSaving");

const titlesDropdown = document.getElementById("titles-dropdown");
const optionsDropdown = document.getElementById("options-dropdown");

const helpDialogWrapper = document.getElementById("help-dialog-wrapper");

const dialogWrapper = document.getElementById("dialog-wrapper");
const dialogMessage = document.getElementById("dialogMessage");
const dialogSaveButton = document.getElementById("dialog-save-button");
const dialogProceedButton = document.getElementById("dialog-proceed-button");
const dialogCancelButton = document.getElementById("dialog-cancel-button");

const fontButton = document.getElementById("font-button");
const fontDropdown = document.getElementById("font-dropdown");
const fontMeasureCanvas = document.createElement("canvas");

const toggleThemeButton = document.getElementById("toggle-theme-button");
const toggleSpellcheckButton = document.getElementById("toggle-spellcheck-button");
const togglePreviewButton = document.getElementById("toggle-preview-button");
const togglePreviewNegativeButton = document.getElementById("toggle-preview-negative-button");

const searchPanel = document.getElementById("searchPanel");
const searchField = document.getElementById("searchField");
const searchReplaceField = document.getElementById("searchReplaceField");
const searchReplaceRow = document.getElementById("searchReplaceRow");
const searchCount = document.getElementById("searchCount");
const searchExpandButton = document.getElementById("search-expand-button");
const searchMatchCaseButton = document.getElementById("search-match-case-button");
const searchWholeWordButton = document.getElementById("search-whole-word-button");
const searchRegexButton = document.getElementById("search-regex-button");
const searchInSelectionButton = document.getElementById("search-in-selection-button");
const searchPreviousButton = document.getElementById("search-previous-button");
const searchNextButton = document.getElementById("search-next-button");
const searchCloseButton = document.getElementById("search-close-button");
const searchPreserveCaseButton = document.getElementById("search-preserve-case-button");
const searchReplaceButton = document.getElementById("search-replace-button");
const searchReplaceAllButton = document.getElementById("search-replace-all-button");

const editorContextMenu = document.getElementById("editorContextMenu");
const contextMenuTagButtons = document.getElementById("contextMenuTagButtons");

const titlesButton = document.getElementById("titles-button");

const editMetadataButton = document.getElementById("edit-metadata-button");

const optionsButton = document.getElementById("options-button");
const newTextButton = document.getElementById("new-text-button");
const openTextButton = document.getElementById("open-text-button");
const saveTextAsButton = document.getElementById("save-text-as-button");
const saveTextButton = document.getElementById("save-text-button");
const closeTextButton = document.getElementById("close-text-button");
const openTemplateButton = document.getElementById("open-template-button");
const closeTemplateButton = document.getElementById("close-template-button");
const exportToPDFButton = document.getElementById("export-to-pdf-button");
const clearDataButton = document.getElementById("clear-data-button");
const helpButton = document.getElementById("help-button");

const helpCloseButton = document.getElementById("help-close-button");
