const DBName = "writing-engine";
const DBStore = "kv";
const DBTemplateKey = "template";
const DBTextKey = "text";
const DBThemeKey = "theme";
const defaultTheme = "dark";
const previewScrollbarClass = "__preview-iframe-scrollbar";

const tags = {
    "title1": {
        "values": ["1", "title1", "title"],
        "replacement": {
            "value": "h1",
        }
    },
    "title2": {
        "values": ["2", "title2", "subtitle"],
        "replacement": {
            "value": "h2",
        }
    },
    "title3": {
        "values": ["3", "title3"],
        "replacement": {
            "value": "h3",
        }
    },
    "bold": {
        "values": ["b", "bold"],
        "replacement": {
            "value": "b",
            "contentParagraphWrapping": true
        }
    },
    "italic": {
        "values": ["i", "italic"],
        "replacement": {
            "value": "i",
            "contentParagraphWrapping": true
        }
    },
    "underline": {
        "values": ["u", "under", "underline"],
        "replacement": {
            "value": "u",
            "contentParagraphWrapping": true
        }
    },
    "strikethrough": {
        "values": ["s", "strike", "strikethrough"],
        "replacement": {
            "value": "s",
            "contentParagraphWrapping": true
        }
    },
    "stanza": {
        "values": ["stanza"],
        "replacement": {
            "value": "div",
            "classes": ["stanza"],
            "contentParagraphWrapping": true
        }
    },
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
    { button: stanzaButton, tag: tags.stanza.values[0] },
];

const validTags = new Set(Object.values(tags).flatMap(x => x.values));
const tagKeyByValue = Object.fromEntries(
    Object.entries(tags).flatMap(([key, { values }]) => values.map((value) => [value, key]))
);

