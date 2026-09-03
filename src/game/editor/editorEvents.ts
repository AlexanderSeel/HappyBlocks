export const EDITOR_SELECTION_EVENT = "happyblocks:editor-selection";

export function notifyEditorSelection(entityId: string | null): void {
  window.dispatchEvent(
    new CustomEvent<string | null>(EDITOR_SELECTION_EVENT, { detail: entityId }),
  );
}

export function bindEditorSelection(
  onSelection: (entityId: string | null) => void,
): () => void {
  const listener = (event: Event): void => {
    onSelection((event as CustomEvent<string | null>).detail ?? null);
  };
  window.addEventListener(EDITOR_SELECTION_EVENT, listener);
  return () => window.removeEventListener(EDITOR_SELECTION_EVENT, listener);
}
