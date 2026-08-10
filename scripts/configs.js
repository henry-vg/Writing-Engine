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
