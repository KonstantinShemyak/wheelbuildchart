/**
 * The element of index.html with this id. Throws if there is none, or it is
 * of another kind: the page is broken then, and failing at startup with the
 * id says so better than a control that silently does nothing.
 * @param type The element's class, e.g. HTMLSelectElement; checked at runtime
 */
export function requireElement<T extends HTMLElement>(
  id: string,
  type: { new (): T },
): T {
  const element = document.getElementById(id);
  if (!(element instanceof type)) {
    throw new Error(`Element #${id} is missing or not a ${type.name}`);
  }
  return element;
}
