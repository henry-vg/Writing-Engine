function openDialog(message, saveLabel, proceedLabel, cancelLabel) {
    closeDialog("cancel");

    dialogMessage.textContent = message;

    for (const [button, label] of [
        [dialogSaveButton, saveLabel],
        [dialogProceedButton, proceedLabel],
        [dialogCancelButton, cancelLabel],
    ]) {
        button.textContent = label ?? "";
        button.toggleAttribute("hidden", !label);
    }

    dialogWrapper.toggleAttribute("hidden", false);
    (cancelLabel ? dialogCancelButton : dialogProceedButton).focus();

    return new Promise((resolve) => {
        dialogResolve = resolve;
    });
}

function closeDialog(answer) {
    dialogWrapper.toggleAttribute("hidden", true);
    dialogResolve?.(answer);
    dialogResolve = null;
}

function getFileMessage(message, name) {
    return message.replace(fileNamePlaceholder, name);
}

async function confirmAction(message) {
    return await openDialog(message, null, dialogLabels.confirm, dialogLabels.cancel) === "proceed";
}

function showError(message, error) {
    const reason = error?.message ? ` (${error.message})` : "";

    return openDialog(`${errorMessagePrefix}${message}${reason}`, null, dialogLabels.confirm, null);
}
