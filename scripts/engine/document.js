/* ---------- Metadata ---------- */
function getMetadataLine(key) {
    return `${key}: `;
}

function parseMetadataLine(line) {
    const match = line.match(/^([^:\n]+):(.*)$/);
    if (!match) return null;

    return {
        key: match[1].trim(),
        value: match[2].trim(),
        rawKey: match[1],
        rawValue: match[2],
    };
}

function parseMetadata(value) {
    const opening = `${metadataFence}\n`;

    if (!value.startsWith(opening)) return null;

    const fenceLine = `\n${metadataFence}`;
    let endIndex = value.indexOf(fenceLine, metadataFence.length);

    while (endIndex !== -1) {
        const lineEnd = endIndex + fenceLine.length;

        if (lineEnd === value.length || value[lineEnd] === "\n") {
            endIndex++;
            break;
        }

        endIndex = value.indexOf(fenceLine, lineEnd);
    }

    if (endIndex === -1) return null;

    const raw = value.slice(0, endIndex + metadataFence.length);
    const inner = value.slice(opening.length, endIndex);
    const lines = inner.split("\n");
    const parsed = {};

    for (const line of lines) {
        if (!line.trim()) continue;

        const metadataLine = parseMetadataLine(line);
        if (!metadataLine) {
            return null;
        }

        parsed[metadataLine.key] = metadataLine.value;
    }

    return {
        parsed,
        raw,
        rawLength: raw.length,
    };
}

function isMetadataActive(documentModel, caretPosition) {
    return documentModel.metadata !== null && caretPosition <= documentModel.metadataLength;
}

/* ---------- Tags ---------- */
function getTagConfig(tagValue) {
    for (const [key, tagConfig] of Object.entries(tags)) {
        if (!tagConfig.values.includes(tagValue)) continue;

        return {
            key,
            ...tagConfig,
        };
    }

    return null;
}

function getTagConfigByShortcut(shortcut) {
    for (const tagConfig of Object.values(tags)) {
        if (tagConfig.button?.shortcut === shortcut) return tagConfig;
    }

    return null;
}

function isSyntaxCharacter(character) {
    return character === tagSyntax.open
        || character === tagSyntax.close
        || character === tagSyntax.escape;
}

function getEscapeAt(value, index) {
    if (value[index] !== tagSyntax.escape || !isSyntaxCharacter(value[index + 1])) return null;

    return {
        value: value[index + 1],
        raw: value.slice(index, index + 2),
    };
}

function getTagOpen(value, index) {
    if (value[index] !== tagSyntax.open) return null;

    let end = index + 1;
    while (end < value.length && /[a-zA-Z0-9]/.test(value[end])) {
        end++;
    }

    if (end === index + 1 || value[end] !== tagSyntax.separator) return null;

    const tagValue = value.slice(index + 1, end);
    const tagConfig = getTagConfig(tagValue);
    if (!tagConfig) return null;

    return {
        ...tagConfig,
        value: tagValue,
        raw: value.slice(index + 1, end + 1),
        contentStart: end + 1,
    };
}

function getTagPairs(value) {
    const pairs = new Map();
    const stack = [];

    for (let i = 0; i < value.length; i++) {
        const escaped = getEscapeAt(value, i);
        if (escaped) {
            i += escaped.raw.length - 1;
            continue;
        }

        const tagOpen = getTagOpen(value, i);
        if (tagOpen) {
            stack.push(i);
            i = tagOpen.contentStart - 1;
            continue;
        }

        if (value[i] === tagSyntax.close) {
            const start = stack.pop();
            if (start != null) {
                pairs.set(start, i);
            }
        }
    }

    return pairs;
}

function getTagPairsForKey(value, key, offset) {
    const pairs = [];

    for (const [start, end] of getTagPairs(value)) {
        const tagOpen = getTagOpen(value, start);
        if (tagOpen.key !== key) continue;

        pairs.push({
            start: offset + start,
            end: offset + end,
            contentStart: offset + tagOpen.contentStart,
        });
    }

    return pairs;
}

function isTagPairSelected(pair, selectionStart, selectionEnd) {
    const wholeTag = pair.start === selectionStart && pair.end + 1 === selectionEnd;
    const onlyContent = pair.contentStart === selectionStart && pair.end === selectionEnd;

    return wholeTag || onlyContent;
}

/* ---------- Document ---------- */
function createEmptyDocument() {
    return {
        content: null,
        metadata: null,
        metadataLength: 0,
        body: null,
        bodyOffset: 0,
        tagPairs: new Map(),
    };
}

function parseDocument(text) {
    const content = text || null;
    if (!content) return createEmptyDocument();

    const metadata = parseMetadata(content);
    const bodyOffset = metadata ? metadata.rawLength : 0;
    const body = content.slice(bodyOffset);

    return {
        content,
        metadata,
        metadataLength: bodyOffset,
        body,
        bodyOffset,
        tagPairs: getTagPairs(body),
    };
}
