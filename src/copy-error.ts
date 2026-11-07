export function showCopyableError(parent: HTMLElement, text: string): void {
  const message = document.createElement("span");
  message.className = "lpt-model-error-message";
  message.textContent = text;
  const copy = document.createElement("button");
  copy.type = "button";
  copy.className = "lpt-button lpt-copy-error";
  copy.textContent = "Copy";
  copy.setAttribute("aria-label", "Copy error message");
  copy.addEventListener("click", async () => {
    if (!copy.isConnected) return;
    try {
      await navigator.clipboard.writeText(text);
      copy.textContent = "Copied";
    } catch {
      const range = document.createRange();
      range.selectNodeContents(message);
      const selection = document.getSelection();
      selection?.removeAllRanges();
      selection?.addRange(range);
      copy.textContent = "Selected. Copy manually";
    }
  });
  parent.replaceChildren(message, copy);
}
