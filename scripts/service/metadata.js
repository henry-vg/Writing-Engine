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

function getMetadataLength() {
    return editorMetadata?.rawLength ?? 0;
}

function isMetadataActive(caretPosition) {
    return editorMetadata !== null && caretPosition <= editorMetadata.rawLength;
}
