function escapeRegExp(text) {
    return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function getSearchQuery() {
    const text = searchField.value;

    if (!text) return null;

    if (!searchState.regex && !searchState.wholeWord) return text;

    const source = searchState.regex ? text : escapeRegExp(text);
    const boundary = wordCharacters.source;
    const pattern = searchState.wholeWord ? `(?<!${boundary})${source}(?!${boundary})` : source;
    const flags = (searchState.matchCase ? "" : "i") + (searchState.wholeWord ? "u" : "");

    try {
        return new RegExp(pattern, flags);
    } catch {
        return null;
    }
}

function getSearchOverlay(query) {
    const pattern = typeof query === "string"
        ? new RegExp(escapeRegExp(query), searchState.matchCase ? "g" : "gi")
        : new RegExp(query.source, query.flags.includes("g") ? query.flags : `${query.flags}g`);

    return {
        token: (stream) => {
            pattern.lastIndex = stream.pos;

            const match = pattern.exec(stream.string);

            if (match && match.index === stream.pos) {
                stream.pos += match[0].length || 1;
                return searchMatchStyle;
            }

            if (match) {
                stream.pos = match.index;
                return null;
            }

            stream.skipToEnd();
            return null;
        },
    };
}

function clearSearchMatches() {
    if (searchState.overlay) editor.removeOverlay(searchState.overlay);
    for (const mark of searchState.marks) mark.clear();
    searchState.annotation?.clear();

    searchState.overlay = null;
    searchState.marks = [];
    searchState.annotation = null;
    searchState.matches = [];
}

function findMatches() {
    clearTimeout(searchTimeout);
    clearSearchMatches();

    const query = getSearchQuery();

    searchField.toggleAttribute("invalid", !!searchField.value && !query);

    if (query) {
        const range = searchState.range;
        const cursor = editor.getSearchCursor(query, range?.from, {
            caseFold: !searchState.matchCase,
            multiline: true,
        });

        while (cursor.findNext()) {
            if (range && CodeMirror.cmpPos(cursor.to(), range.to) > 0) break;

            searchState.matches.push({ from: cursor.from(), to: cursor.to() });
        }

        if (searchState.range) {
            searchState.marks = searchState.matches.map((match) =>
                editor.markText(match.from, match.to, { className: `cm-${searchMatchStyle}` }));
        } else {
            searchState.overlay = getSearchOverlay(query);
            editor.addOverlay(searchState.overlay);
        }

        searchState.annotation = editor.showMatchesOnScrollbar(query, !searchState.matchCase);
    }

    showMatchCount();
}

function findMatchesSoon() {
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(findMatches, searchDebounceDelay);
}

function showMatchCount() {
    const total = searchState.matches.length;

    if (!total) {
        searchCount.textContent = searchField.value ? noMatchesMessage : "";
        return;
    }

    searchCount.textContent = matchCountMessage
        .replace(matchIndexPlaceholder, getCurrentMatchIndex() + 1)
        .replace(matchTotalPlaceholder, total);
}

function getCurrentMatchIndex() {
    const position = editor.getCursor("from");
    const index = searchState.matches.findIndex((match) =>
        CodeMirror.cmpPos(match.from, position) >= 0);

    return index === -1 ? searchState.matches.length - 1 : index;
}

function goToMatch(direction) {
    const matches = searchState.matches;

    if (!matches.length) return;

    const position = editor.getCursor(direction > 0 ? "to" : "from");

    const found = direction > 0
        ? matches.findIndex((match) => CodeMirror.cmpPos(match.from, position) >= 0)
        : matches.findLastIndex((match) => CodeMirror.cmpPos(match.to, position) <= 0);

    const index = found === -1 ? (direction > 0 ? 0 : matches.length - 1) : found;
    const match = matches[index];

    editor.setSelection(match.from, match.to);
    editor.scrollIntoView({ from: match.from, to: match.to }, 100);
    showMatchCount();
}

function getReplacement(original) {
    const replacement = searchReplaceField.value;

    if (!searchState.preserveCase || !original) return replacement;

    if (original === original.toUpperCase() && original !== original.toLowerCase()) {
        return replacement.toUpperCase();
    }

    if (original[0] === original[0].toUpperCase() && original.slice(1) === original.slice(1).toLowerCase()) {
        return replacement.charAt(0).toUpperCase() + replacement.slice(1);
    }

    return replacement;
}

function replaceCurrentMatch() {
    const matches = searchState.matches;
    const index = matches.findIndex((match) =>
        CodeMirror.cmpPos(match.from, editor.getCursor("from")) === 0);

    if (index === -1) {
        goToMatch(1);
        return;
    }

    const match = matches[index];

    editor.replaceRange(getReplacement(editor.getRange(match.from, match.to)), match.from, match.to);
    findMatches();
    goToMatch(1);
}

function replaceAllMatches() {
    if (!searchState.matches.length) return;

    editor.operation(() => {
        for (const match of [...searchState.matches].reverse()) {
            editor.replaceRange(getReplacement(editor.getRange(match.from, match.to)),
                match.from, match.to);
        }
    });

    findMatches();
}

function setSearchReplaceVisible(visible) {
    searchReplaceRow.toggleAttribute("hidden", !visible);
    searchExpandButton.toggleAttribute("selected", visible);
}

function openSearchPanel(withReplace) {
    const selection = editor.getSelection();

    searchPanel.toggleAttribute("hidden", false);
    setSearchReplaceVisible(withReplace || !searchReplaceRow.hidden);

    if (selection && !selection.includes("\n")) searchField.value = selection;

    searchField.focus();
    searchField.select();
    findMatches();
}

function closeSearchPanel() {
    if (searchPanel.hidden) return;

    searchPanel.toggleAttribute("hidden", true);
    clearSearchMatches();
    editor.focus();
}

function toggleSearchOption(option, button) {
    searchState[option] = !searchState[option];
    button.toggleAttribute("selected", searchState[option]);

    if (option === "inSelection") {
        searchState.range = searchState.inSelection
            ? { from: editor.getCursor("from"), to: editor.getCursor("to") }
            : null;
    }

    findMatches();
}

CodeMirror.commands.openSearch = () => openSearchPanel(false);
CodeMirror.commands.openSearchAndReplace = () => openSearchPanel(true);
CodeMirror.commands.findNextMatch = () => goToMatch(1);
CodeMirror.commands.findPreviousMatch = () => goToMatch(-1);
