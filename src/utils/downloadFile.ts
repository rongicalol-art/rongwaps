/** Hands `data` to the browser as a downloaded pretty-printed JSON file. */
export function downloadJsonFile(filename: string, data: unknown): void {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  // Revoke after the click has been handled; Safari needs the URL alive briefly.
  window.setTimeout(() => URL.revokeObjectURL(url), 10_000);
}
