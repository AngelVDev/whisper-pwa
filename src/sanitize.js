const ALLOWED_EXTENSIONS = new Set([
  'mp3', 'm4a', 'wav', 'ogg', 'flac', 'opus', 'webm', 'aac', 'amr', 'wma',
]);

const ALLOWED_MIMES = new Set([
  'audio/mpeg',
  'audio/mp3',
  'audio/mp4',
  'audio/x-m4a',
  'audio/wav',
  'audio/x-wav',
  'audio/wave',
  'audio/ogg',
  'audio/flac',
  'audio/x-flac',
  'audio/opus',
  'audio/webm',
  'audio/aac',
  'audio/amr',
  'audio/x-ms-wma',
]);

const MAX_SIZE_BYTES = 100 * 1024 * 1024; // 100 MB

/**
 * Validate and sanitize an audio file.
 * Returns { ok, ext, safeName, error? }
 */
export function sanitizeFile(file) {
  if (!file) {
    return { ok: false, error: 'no_file' };
  }

  if (file.size > MAX_SIZE_BYTES) {
    return { ok: false, error: 'too_large' };
  }

  const name = file.name || '';
  const dotIdx = name.lastIndexOf('.');
  const ext = dotIdx > 0 ? name.slice(dotIdx + 1).toLowerCase() : '';

  if (!ALLOWED_EXTENSIONS.has(ext)) {
    return { ok: false, error: 'bad_extension' };
  }

  // MIME can be empty on mobile — only reject if present AND wrong
  if (file.type && !ALLOWED_MIMES.has(file.type)) {
    return { ok: false, error: 'bad_mime' };
  }

  return {
    ok: true,
    ext,
    safeName: `input.${ext}`,
  };
}
