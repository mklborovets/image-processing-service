export function sanitizeFilename(filename: string): string {
  return (
    filename
      .replace(/^.*[\\/]/, '')
      .replace(/[^a-zA-Z0-9.\-_ ]/g, '')
      .trim() || 'unnamed-file'
  );
}
