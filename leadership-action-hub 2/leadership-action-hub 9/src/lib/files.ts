import type { ActionFile } from "./types";

export const MAX_ATTACHMENT_BYTES = 4 * 1024 * 1024;
export const MAX_ATTACHMENTS = 8;

export function formatFileSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function readFileAsActionFile(file: File): Promise<ActionFile> {
  return new Promise((resolve, reject) => {
    if (file.size > MAX_ATTACHMENT_BYTES) {
      reject(new Error(`${file.name} is larger than 4 MB`));
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      resolve({
        name: file.name,
        size: file.size,
        type: file.type || "application/octet-stream",
        dataUrl: typeof reader.result === "string" ? reader.result : undefined,
      });
    };
    reader.onerror = () => reject(new Error(`Could not read ${file.name}`));
    reader.readAsDataURL(file);
  });
}

export async function readFilesAsActionFiles(list: FileList | File[]) {
  const files = Array.from(list);
  return Promise.all(files.map(readFileAsActionFile));
}

export function downloadActionFile(file: ActionFile) {
  if (!file.dataUrl) return;
  const a = document.createElement("a");
  a.href = file.dataUrl;
  a.download = file.name;
  a.rel = "noopener";
  document.body.appendChild(a);
  a.click();
  a.remove();
}
