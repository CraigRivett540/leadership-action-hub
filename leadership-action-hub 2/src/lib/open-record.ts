export function openRecord(fn: () => void) {
  window.setTimeout(fn, 30);
}
