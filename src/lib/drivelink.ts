/** Lấy ID thư mục từ link Google Drive (hoặc chính ID dán thẳng vào). */
export function parseDriveFolderId(input: string): string | null {
  const s = input.trim();
  if (!s) return null;
  const m =
    /\/folders\/([A-Za-z0-9_-]{10,})/.exec(s) ??
    /[?&]id=([A-Za-z0-9_-]{10,})/.exec(s) ??
    /^([A-Za-z0-9_-]{20,})$/.exec(s);
  return m ? m[1] : null;
}

export function driveFolderUrl(id: string) {
  return `https://drive.google.com/drive/folders/${id}`;
}
