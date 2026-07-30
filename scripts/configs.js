const DBName = "writing-engine";
const DBStore = "kv";
const DBTemplateKey = "template";
const DBTextKey = "text";
const DBThemeKey = "theme";
const DBPreviewNegativeKey = "preview-negative";
const defaultTheme = "dark";
const defaultPreviewNegative = false;
const defaultLineWrapping = { value: "p", classes: [] };
const previewScrollbarClass = "__preview-iframe-scrollbar";
const noTemplateFileMessage = "<No Template File>";
const noTextFileMessage = "<No Text File>";

const tags = {
    "comment": {
        "values": ["c", "comment"],
        "replacement": {
            "type": "none",
        }
    },
    "title1": {
        "values": ["1", "title1", "title"],
        "replacement": {
            "type": "htmlTag",
            "value": "h1",
            "block": true,
        }
    },
    "title2": {
        "values": ["2", "title2", "subtitle"],
        "replacement": {
            "type": "htmlTag",
            "value": "h2",
            "block": true,
        }
    },
    "title3": {
        "values": ["3", "title3"],
        "replacement": {
            "type": "htmlTag",
            "value": "h3",
            "block": true,
        }
    },
    "bold": {
        "values": ["b", "bold"],
        "replacement": {
            "type": "htmlTag",
            "value": "b",
            "contentLineWrapping": {
                "value": "p"
            }
        }
    },
    "italic": {
        "values": ["i", "italic"],
        "replacement": {
            "type": "htmlTag",
            "value": "i",
            "contentLineWrapping": {
                "value": "p"
            }
        }
    },
    "underline": {
        "values": ["u", "under", "underline"],
        "replacement": {
            "type": "htmlTag",
            "value": "u",
            "contentLineWrapping": {
                "value": "p"
            }
        }
    },
    "strikethrough": {
        "values": ["s", "strike", "strikethrough"],
        "replacement": {
            "type": "htmlTag",
            "value": "s",
            "contentLineWrapping": {
                "value": "p"
            }
        }
    },
    "stanza": {
        "values": ["stanza"],
        "replacement": {
            "type": "htmlTag",
            "value": "div",
            "block": true,
            "classes": ["stanza"],
            "contentLineWrapping": {
                "value": "p"
            }
        }
    },
    "doubleR": {
        "values": ["doubleR"],
        "replacement": {
            "type": "text",
            "value": "\u211d"
        }
    }
}

const menuElements = [
    { button: titlesButton, dropdown: titlesDropdown },
    { button: optionsButton, dropdown: optionsDropdown },
];

const formattingElements = [
    { button: title1Button, tag: tags.title1.values[0] },
    { button: title2Button, tag: tags.title2.values[0] },
    { button: title3Button, tag: tags.title3.values[0] },
    { button: boldButton, tag: tags.bold.values[0] },
    { button: italicButton, tag: tags.italic.values[0] },
    { button: underlineButton, tag: tags.underline.values[0] },
    { button: strikethroughButton, tag: tags.strikethrough.values[0] },
];

const validTags = new Set(Object.values(tags).flatMap(x => x.values));