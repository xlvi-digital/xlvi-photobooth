import { createClient } from '@supabase/supabase-js';

// Retrieve environment variables
const rawSupabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const rawSupabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

/**
 * Sanitizes the Supabase URL to ensure it is strictly the base project URL.
 * Prevents "Invalid path specified in request URL" errors caused by:
 * - Trailing slashes (e.g., https://xyz.supabase.co/)
 * - Accidental REST / Storage / Auth subpaths (e.g., https://xyz.supabase.co/rest/v1)
 * - Leading / trailing whitespace or accidental quotes
 */
export function sanitizeSupabaseUrl(url) {
  if (!url || typeof url !== 'string') return '';
  let clean = url.trim().replace(/^['"]+|['"]+$/g, '');

  // Strip trailing slashes
  clean = clean.replace(/\/+$/, '');

  // Strip any accidental subpaths like /rest/v1, /storage/v1, /auth/v1
  clean = clean.replace(/\/(rest|storage|auth)(\/v\d+)?(\/.*)?$/i, '');

  // Final trim of trailing slashes
  clean = clean.replace(/\/+$/, '');
  return clean;
}

/**
 * Sanitizes storage file paths so that:
 * 1. They are strictly RELATIVE paths (no leading slashes: /foo/bar -> foo/bar)
 * 2. They do NOT contain the bucket prefix (frames/event-id/... -> event-id/...)
 * 3. They do NOT contain full URLs (https://... -> event-id/...)
 * 4. They do NOT contain double slashes (// -> /)
 */
export function normalizeStoragePath(bucketName, rawPath) {
  if (!rawPath || typeof rawPath !== 'string') return '';
  let path = rawPath.trim();

  // If a full Supabase storage URL was passed, extract the relative path
  if (path.startsWith('http://') || path.startsWith('https://')) {
    const urlPattern = new RegExp(`/(?:storage/v1/object/(?:public|authenticated|sign)/)?${bucketName}/(.*)$`, 'i');
    const match = path.match(urlPattern);
    if (match && match[1]) {
      path = match[1];
    } else {
      try {
        const parsed = new URL(path);
        path = parsed.pathname;
      } catch (e) {
        // fallback
      }
    }
  }

  // Remove leading and trailing slashes
  path = path.replace(/^\/+/, '').replace(/\/+$/, '');

  // Remove redundant bucket prefix if present
  if (bucketName && path.toLowerCase().startsWith(`${bucketName.toLowerCase()}/`)) {
    path = path.slice(bucketName.length + 1).replace(/^\/+/, '');
  }

  // Replace duplicate sequential slashes
  path = path.replace(/\/+/g, '/');

  return path;
}

/**
 * Validates Supabase environment variables.
 * Returns descriptive error messages if configuration is missing or invalid.
 */
export function validateSupabaseConfig() {
  const errors = [];
  const rawUrl = typeof rawSupabaseUrl === 'string' ? rawSupabaseUrl.trim() : '';
  const rawKey = typeof rawSupabaseAnonKey === 'string' ? rawSupabaseAnonKey.trim() : '';

  if (!rawUrl || rawUrl.length === 0 || rawUrl.includes('your-project-id')) {
    errors.push('Supabase configuration is missing: VITE_SUPABASE_URL');
  }

  if (!rawKey || rawKey.length === 0 || rawKey.includes('your-anon-key')) {
    errors.push('Supabase configuration is missing: VITE_SUPABASE_ANON_KEY');
  } else if (rawKey.length < 20 || /^\*+$/.test(rawKey)) {
    errors.push('Supabase configuration contains a placeholder: VITE_SUPABASE_ANON_KEY');
  }

  if (rawUrl) {
    try {
      const parsedUrl = new URL(sanitizeSupabaseUrl(rawUrl));
      if (!['https:', 'http:'].includes(parsedUrl.protocol) || !parsedUrl.hostname) {
        errors.push('Supabase configuration is invalid: VITE_SUPABASE_URL');
      }
    } catch {
      errors.push('Supabase configuration is invalid: VITE_SUPABASE_URL');
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    sanitizedUrl: sanitizeSupabaseUrl(rawUrl),
  };
}

export const isSupabaseConfigured = () => {
  return validateSupabaseConfig().isValid;
};

// Check config and log friendly feedback once on startup
const configValidation = validateSupabaseConfig();
if (!configValidation.isValid) {
  configValidation.errors.forEach((msg) => {
    console.warn(`[Supabase Config Warning] ${msg}`);
  });
}

const sanitizedBaseUrl = sanitizeSupabaseUrl(rawSupabaseUrl);

/**
 * Supabase client instance initialized with sanitized project base URL
 */
export const supabase = isSupabaseConfigured()
  ? createClient(sanitizedBaseUrl, rawSupabaseAnonKey.trim(), {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
      },
    })
  : createClient(
      'https://dummy-project.supabase.co',
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.dummy',
      {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
        },
      }
    );

/**
 * Upload helper to Supabase Storage with strict relative path validation
 * Default bucket: 'frames'
 */
export async function uploadToStorage(bucketName = 'frames', filePath, fileOrBlob, contentType = 'image/png', upsert = true) {
  if (!isSupabaseConfigured()) {
    console.warn(`Supabase storage upload simulated (credentials not configured) for: ${bucketName}/${filePath}`);
    if (fileOrBlob instanceof Blob || fileOrBlob instanceof File) {
      return {
        path: normalizeStoragePath(bucketName, filePath),
        publicUrl: URL.createObjectURL(fileOrBlob),
        isMock: true,
      };
    }
    return { path: normalizeStoragePath(bucketName, filePath), publicUrl: fileOrBlob, isMock: true };
  }

  // Ensure filePath is strictly relative to the bucket
  const cleanPath = normalizeStoragePath(bucketName, filePath);
  if (!cleanPath) {
    throw new Error(`Invalid storage path provided for bucket "${bucketName}".`);
  }

  const bucket = supabase.storage.from(bucketName);
  const detectedType = fileOrBlob?.type || contentType;

  const { data, error } = await bucket.upload(cleanPath, fileOrBlob, {
    contentType: detectedType,
    upsert,
  });

  if (error) {
    console.error(`Storage upload error in bucket "${bucketName}" at path "${cleanPath}":`, error);
    throw error;
  }

  const { data: publicUrlData } = bucket.getPublicUrl(data.path);
  return {
    path: data.path,
    publicUrl: publicUrlData.publicUrl,
    isMock: false,
  };
}

/**
 * Get Public URL using official Supabase Storage API
 */
export function getPublicUrl(bucketName = 'frames', filePath) {
  if (!filePath) return '';
  if (
    filePath.startsWith('http://') ||
    filePath.startsWith('https://') ||
    filePath.startsWith('blob:') ||
    filePath.startsWith('data:')
  ) {
    return filePath;
  }

  if (!isSupabaseConfigured()) {
    return filePath;
  }

  const cleanPath = normalizeStoragePath(bucketName, filePath);
  const { data } = supabase.storage.from(bucketName).getPublicUrl(cleanPath);
  return data?.publicUrl || filePath;
}

/**
 * Delete helper for Supabase Storage
 */
export async function deleteFromStorage(bucketName = 'frames', filePaths) {
  if (!isSupabaseConfigured() || !filePaths) return { success: true };
  const rawList = Array.isArray(filePaths) ? filePaths : [filePaths];
  const cleanPaths = rawList.map((p) => normalizeStoragePath(bucketName, p)).filter(Boolean);

  if (cleanPaths.length === 0) return { success: true };

  const { data, error } = await supabase.storage.from(bucketName).remove(cleanPaths);
  if (error) {
    console.warn(`Storage delete warning in "${bucketName}":`, error);
  }
  return { data, error };
}
