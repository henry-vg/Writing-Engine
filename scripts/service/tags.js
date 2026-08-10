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
