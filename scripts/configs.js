const dbName = "writing-engine";
const dbStore = "kv";
const dbTemplateKey = "template";
const dbTextKey = "text";
const dbTextHandleKey = "text-handle";
const dbThemeKey = "theme";
const dbPreviewVisibleKey = "preview-visible";
const dbPreviewNegativeKey = "preview-negative";
const dbSpellcheckKey = "spellcheck";
const dbFontKey = "font";
const defaultTheme = "dark";
const defaultPreviewVisible = true;
const defaultPreviewNegative = false;
const defaultSpellcheck = false;
const defaultFont = "Consolas";
const defaultTextFileName = "text.txt";
const templateBodyKey = "body";
const metadataFence = "---";
const defaultLineWrapping = { value: "p", classes: [] };
const tagSyntax = {
    open: "{",
    close: "}",
    separator: ":",
    escape: "\\"
};
const previewDebounceDelay = 250;
const searchDebounceDelay = 150;

const editorModeName = "writing-engine";
const activeMarkClass = "cm-active";
const matchHighlightClass = "match-highlight";
const wordCharacters = /[\p{L}\p{N}]/u;

const editorShortcuts = {
    "Shift-Alt-Up": "duplicateLineUp",
    "Shift-Alt-Down": "duplicateLineDown",
    "Shift-Ctrl-K": "deleteLines",
    "Ctrl-Alt-Up": "addCursorAbove",
    "Ctrl-Alt-Down": "addCursorBelow",
    "Ctrl-F2": "selectAllOccurrences",
    "Ctrl-F": "openSearch",
    "Ctrl-H": "openSearchAndReplace",
    "Ctrl-G": "findNextMatch",
    "Shift-Ctrl-G": "findPreviousMatch",
};

const disabledEditorShortcuts = ["Ctrl-D"];

const editorOptions = {
    mode: editorModeName,
    theme: "none",
    lineWrapping: true,
    inputStyle: "contenteditable",
    spellcheck: defaultSpellcheck,
    highlightSelectionMatches: {
        showToken: wordCharacters,
        style: matchHighlightClass,
    },
};

const previewScrollbarClass = "__preview-iframe-scrollbar";
const noTemplateFileMessage = "<No Template File>";
const noTextFileMessage = "<No Text File>";
const errorMessagePrefix = "ERROR: ";
const fileNamePlaceholder = "'$file$'";
const saveChangesMessage = "Save changes to '$file$' before closing?";
const closeFileMessage = "Close '$file$'?";
const clearDataMessage = "Clear the stored text, template and preferences?";
const enableSpellcheckMessage = "Enable Spellcheck";
const disableSpellcheckMessage = "Disable Spellcheck";

const dialogLabels = {
    save: "Save",
    discard: "Don't Save",
    confirm: "OK",
    cancel: "Cancel",
};

const shortcutModifiers = {
    plain: "Ctrl",
    shift: "Ctrl+Shift",
};

const textFileTypes = [{ description: "Text", accept: { "text/plain": [".txt", ".md"] } }];
const templateFileTypes = [{ description: "HTML", accept: { "text/html": [".html", ".htm"] } }];

const tags = {
    title1: {
        values: ["1", "title1", "title"],
        button: {
            container: "titlesDropdown",
            label: "Title 1",
            shortcut: "1"
        },
        replacement: {
            type: "htmlTag",
            value: "h1",
            block: true
        }
    },
    title2: {
        values: ["2", "title2", "subtitle"],
        button: {
            container: "titlesDropdown",
            label: "Title 2",
            shortcut: "2"
        },
        replacement: {
            type: "htmlTag",
            value: "h2",
            block: true
        }
    },
    title3: {
        values: ["3", "title3"],
        button: {
            container: "titlesDropdown",
            label: "Title 3",
            shortcut: "3"
        },
        replacement: {
            type: "htmlTag",
            value: "h3",
            block: true
        }
    },
    bold: {
        values: ["b", "bold"],
        button: {
            container: "contextMenu",
            tooltip: "Bold",
            shortcut: "b",
            icon: "M15.6 10.79c.97-.67 1.65-1.77 1.65-2.79 0-2.26-1.75-4-4-4H7v14h7.04c2.09 0 3.71-1.7 3.71-3.79 0-1.52-.86-2.82-2.15-3.42M10 6.5h3c.83 0 1.5.67 1.5 1.5s-.67 1.5-1.5 1.5h-3zm3.5 9H10v-3h3.5c.83 0 1.5.67 1.5 1.5s-.67 1.5-1.5 1.5"
        },
        replacement: {
            type: "htmlTag",
            value: "b",
            contentLineWrapping: {
                value: "p"
            }
        }
    },
    italic: {
        values: ["i", "italic"],
        button: {
            container: "contextMenu",
            tooltip: "Italic",
            shortcut: "i",
            icon: "M10 4v3h2.21l-3.42 8H6v3h8v-3h-2.21l3.42-8H18V4z"
        },
        replacement: {
            type: "htmlTag",
            value: "i",
            contentLineWrapping: {
                value: "p"
            }
        }
    },
    underline: {
        values: ["u", "under", "underline"],
        button: {
            container: "contextMenu",
            tooltip: "Underline",
            shortcut: "u",
            icon: "M12 17c3.31 0 6-2.69 6-6V3h-2.5v8c0 1.93-1.57 3.5-3.5 3.5S8.5 12.93 8.5 11V3H6v8c0 3.31 2.69 6 6 6m-7 2v2h14v-2z"
        },
        replacement: {
            type: "htmlTag",
            value: "u",
            contentLineWrapping: {
                value: "p"
            }
        }
    },
    strikethrough: {
        values: ["s", "strike", "strikethrough"],
        button: {
            container: "contextMenu",
            tooltip: "Strikethrough",
            icon: "M6.85 7.08C6.85 4.37 9.45 3 12.24 3c1.64 0 3 .49 3.9 1.28.77.65 1.46 1.73 1.46 3.24h-3.01c0-.31-.05-.59-.15-.85-.29-.86-1.2-1.28-2.25-1.28-1.86 0-2.34 1.02-2.34 1.7 0 .48.25.88.74 1.21.38.25.77.48 1.41.7H7.39c-.21-.34-.54-.89-.54-1.92M21 12v-2H3v2h9.62c1.15.45 1.96.75 1.96 1.97 0 1-.81 1.67-2.28 1.67-1.54 0-2.93-.54-2.93-2.51H6.4c0 .55.08 1.13.24 1.58.81 2.29 3.29 3.3 5.67 3.3 2.27 0 5.3-.89 5.3-4.05 0-.3-.01-1.16-.48-1.94H21z"
        },
        replacement: {
            type: "htmlTag",
            value: "s",
            contentLineWrapping: {
                value: "p"
            }
        }
    },
    comment: {
        values: ["c", "comment"],
        button: {
            container: "contextMenu",
            tooltip: "Comment",
            shortcut: ";",
            icon: "M22 4c0-1.1-.9-2-2-2H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h14l4 4zm-2 13.17L18.83 16H4V4h16zM13 5h-2v4H7v2h4v4h2v-4h4V9h-4z"
        },
        replacement: {
            type: "none"
        }
    },
    stanza: {
        values: ["stanza"],
        replacement: {
            type: "htmlTag",
            value: "div",
            block: true,
            classes: ["stanza"],
            contentLineWrapping: {
                value: "p"
            }
        }
    },
    doubleR: {
        values: ["doubleR"],
        replacement: {
            type: "text",
            value: "\u211d"
        }
    }
};

const searchMatchStyle = "searching";
const noMatchesMessage = "No results";
const matchCountMessage = "$index$ of $total$";
const matchIndexPlaceholder = "$index$";
const matchTotalPlaceholder = "$total$";

const searchPanelButtons = [
    {
        id: "search-expand-button",
        tooltip: "Toggle Replace",
        icon: "M10 17V7l5 5z",
    },
    {
        id: "search-match-case-button",
        tooltip: "Match Case",
        icon: "M20.06 18c-.06-.01-.12-.05-.18-.11s-.09-.15-.09-.26V13.1c0-.61-.05-1.13-.15-1.58-.11-.44-.28-.81-.51-1.11a2.1 2.1 0 0 0-.9-.66c-.37-.15-.81-.22-1.32-.22s-.96.07-1.36.21c-.4.14-.73.32-1 .53s-.47.45-.6.71c-.14.26-.2.5-.2.73 0 .28.08.5.23.65.15.16.35.24.6.24.14 0 .27-.03.39-.08a.9.9 0 0 0 .3-.22.9.9 0 0 0 .19-.32c.05-.12.07-.25.07-.39 0-.14-.02-.26-.06-.36a.9.9 0 0 0-.16-.28.7.7 0 0 0-.24-.19.7.7 0 0 0-.29-.06h-.06c.06-.14.16-.27.29-.39.13-.12.29-.22.47-.31s.38-.15.6-.2c.22-.05.44-.07.67-.07.33 0 .61.05.85.15s.43.25.58.44c.15.19.26.43.33.71.07.28.11.6.11.96v.63l-2.13.3c-.5.07-.94.19-1.31.34-.37.15-.68.34-.93.57-.25.23-.43.49-.55.79-.12.3-.18.63-.18 1 0 .34.06.65.18.92.12.27.28.5.49.69.21.19.46.33.75.43.29.1.61.15.95.15.5 0 .93-.09 1.29-.27.36-.18.65-.42.87-.72h.03c.01.19.05.36.11.51.06.15.14.27.24.37.1.1.22.17.35.22.13.05.28.07.44.07.2 0 .38-.03.53-.08.15-.05.28-.13.4-.24l-.28-.63M17.5 14.9c0 .26-.05.5-.14.72-.09.22-.22.42-.38.58-.16.16-.36.29-.58.38-.22.09-.47.14-.73.14-.24 0-.46-.04-.65-.11-.19-.07-.35-.17-.48-.29-.13-.12-.23-.27-.3-.44-.07-.17-.1-.35-.1-.54 0-.24.04-.46.11-.65.07-.19.19-.36.36-.5.17-.14.39-.26.66-.36.27-.1.6-.18.99-.24l1.24-.18v1.49M8.75 7h-1.5L3 18h1.9l1.1-3h4l1.1 3H13L8.75 7m-2.2 6.5L8 9.5l1.45 4h-2.9Z",
    },
    {
        id: "search-whole-word-button",
        tooltip: "Match Whole Word",
        icon: "M3 15h18v2H3zm0-4h13v2H3zm0-4h18v2H3zm16 4h2v2h-2z",
    },
    {
        id: "search-regex-button",
        tooltip: "Use Regular Expression",
        icon: "M16 16.92c-.33.05-.66.08-1 .08s-.67-.03-1-.08v-3.16l-2.25 2.24c-.55-.39-1.03-.87-1.42-1.42L13.57 12H10.4c-.05-.33-.08-.66-.08-1s.03-.67.08-1h3.17l-2.24-2.24c.27-.28.57-.54.88-.76.18-.13.36-.25.55-.36L15 8.86V5.7c.33-.05.66-.08 1-.08s.67.03 1 .08v3.16l2.24-2.24c.55.39 1.04.87 1.43 1.42L18.43 10.3h3.16c.05.33.08.66.08 1s-.03.67-.08 1h-3.17l2.24 2.24c-.39.55-.87 1.03-1.42 1.42L17 13.72v3.2M5 19a2 2 0 1 1 4 0 2 2 0 0 1-4 0Z",
    },
    {
        id: "search-in-selection-button",
        tooltip: "Find In Selection",
        icon: "M3 5h2V3c-1.1 0-2 .9-2 2m0 8h2v-2H3zm4 8h2v-2H7zM3 9h2V7H3zm10-6h-2v2h2zm6 0v2h2c0-1.1-.9-2-2-2M5 21v-2H3c0 1.1.9 2 2 2m-2-4h2v-2H3zM9 3H7v2h2zm2 18h2v-2h-2zm8-8h2v-2h-2zm0 8c1.1 0 2-.9 2-2h-2zm0-12h2V7h-2zm0 8h2v-2h-2zm-4 4h2v-2h-2zm0-16h2V3h-2zM7 17h10V7H7zm2-8h6v6H9z",
    },
    {
        id: "search-previous-button",
        tooltip: "Previous Match",
        icon: "m7.41 15.41 4.59-4.58 4.59 4.58L18 14l-6-6-6 6z",
    },
    {
        id: "search-next-button",
        tooltip: "Next Match",
        icon: "M7.41 8.59 12 13.17l4.59-4.58L18 10l-6 6-6-6z",
    },
    {
        id: "search-close-button",
        tooltip: "Close",
        icon: "M19 6.41 17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z",
    },
    {
        id: "search-preserve-case-button",
        tooltip: "Preserve Case",
        icon: "M9.75 7h-1.5L4 18h1.9l1.1-3h4l1.1 3H14L9.75 7m-2.2 6.5L9 9.5l1.45 4h-2.9M20 12v6a2 2 0 0 1-2 2h-2v-2h2v-6h-2v-2h2a2 2 0 0 1 2 2Z",
    },
    {
        id: "search-replace-button",
        tooltip: "Replace",
        icon: "M11 6c0-1.1.9-2 2-2h6c1.1 0 2 .9 2 2v6c0 1.1-.9 2-2 2h-6c-1.1 0-2-.9-2-2zm2 0v6h6V6zM3 13v6c0 1.1.9 2 2 2h6c1.1 0 2-.9 2-2v-6c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2m2 0h6v6H5zM7 3v2H5c-1.1 0-2 .9-2 2v2h2V7h2v2l3-3-3-3",
    },
    {
        id: "search-replace-all-button",
        tooltip: "Replace All",
        icon: "M11 6c0-1.1.9-2 2-2h6c1.1 0 2 .9 2 2v6c0 1.1-.9 2-2 2h-6c-1.1 0-2-.9-2-2zm2 0v6h6V6zM3 13v6c0 1.1.9 2 2 2h6c1.1 0 2-.9 2-2v-6c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2m2 0h6v6H5zm2-10v2H5c-1.1 0-2 .9-2 2v2h2V7h2v2l3-3-3-3m10 12v2h2c1.1 0 2-.9 2-2v-2h-2v2h-2v-2l-3 3 3 3",
    },
];

const menuElements = [
    { button: fontButton, dropdown: fontDropdown },
    { button: titlesButton, dropdown: titlesDropdown },
    { button: optionsButton, dropdown: optionsDropdown },
];

const optionsMenuItems = [
    { id: "new-text-button", label: "New Text..." },
    { id: "open-text-button", label: "Open Text...", shortcut: "o" },
    { id: "save-text-button", label: "Save Text", shortcut: "s" },
    { id: "save-text-as-button", label: "Save Text As...", shortcut: "s", shift: true },
    { id: "close-text-button", label: "Close Text" },
    { id: "open-template-button", label: "Open Template..." },
    { id: "close-template-button", label: "Close Template" },
    { id: "export-to-pdf-button", label: "Export To PDF..." },
    { id: "toggle-spellcheck-button", tooltip: "Toggle Spellcheck" },
    { id: "clear-data-button", label: "Clear Stored Data..." },
    { id: "help-button", label: "Help" },
];

const fontMeasureText = "mmmmmmmmmmlliWWWWWWWW1234567890";
const fontMeasureSize = "72px";
const fontMeasureFallbacks = ["monospace", "sans-serif"];

const fontCandidates = [
    "Arial", "Arial Black", "Bahnschrift", "Baskerville Old Face", "Bookman Old Style",
    "Cambria", "Candara", "Cascadia Code", "Cascadia Mono", "Centaur", "Century Gothic",
    "Comic Sans MS", "Consolas", "Constantia", "Corbel", "Courier New", "DejaVu Sans Mono",
    "Ebrima", "Fira Code", "Franklin Gothic Medium", "Gabriola", "Garamond", "Georgia",
    "Gill Sans MT", "Helvetica", "Impact", "Ink Free", "Iosevka", "JetBrains Mono",
    "Lucida Console", "Lucida Sans Unicode", "Menlo", "Monaco", "Palatino Linotype",
    "Perpetua", "Rockwell", "Segoe Print", "Segoe Script", "Segoe UI", "Sitka Text",
    "Source Code Pro", "Sylfaen", "Tahoma", "Times New Roman", "Trebuchet MS", "Verdana",
];

const tagButtonContainers = {
    contextMenu: { element: contextMenuTagButtons, className: "button" },
    titlesDropdown: { element: titlesDropdown, className: "menu-item" }
};
