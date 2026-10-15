import { supabase, isSupabaseConfigured, uploadToStorage, normalizeStoragePath, getPublicUrl } from '../lib/supabase.js';
import { INITIAL_GALLERY } from '../data/eventData.js';

const LOCAL_STORAGE_SUBMISSIONS_KEY = 'xlvi_gallery_items_v2';

function isUUID(str) {
  if (!str || typeof str !== 'string') return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(str.trim());
}

function getLocalSubmissions() {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_SUBMISSIONS_KEY);
    return raw ? JSON.parse(raw) : INITIAL_GALLERY;
  } catch (e) {
    return INITIAL_GALLERY;
  }
}

function saveLocalSubmissions(items) {
  try {
    localStorage.setItem(LOCAL_STORAGE_SUBMISSIONS_KEY, JSON.stringify(items));
  } catch (e) {
    console.warn('LocalStorage save error:', e);
  }
}

/**
 * Converts dataURL string or remote URL into a valid Blob with size verification
 */
export async function ensureBlob(input, defaultMime = 'image/jpeg') {
  if (!input) return null;

  if (typeof HTMLCanvasElement !== 'undefined' && input instanceof HTMLCanvasElement) {
    const blob = await new Promise((res) => input.toBlob(res, defaultMime, 0.94));
    if (!blob || blob.size === 0) {
      throw new Error('Canvas toBlob menghasilkan Blob kosong.');
    }
    return blob;
  }

  if (input instanceof Blob || input instanceof File) {
    if (input.size === 0) {
      throw new Error('Canvas menghasilkan Blob kosong (size = 0).');
    }
    return input;
  }

  if (typeof input === 'string') {
    if (input.startsWith('data:')) {
      const parts = input.split(',');
      const mimeMatch = parts[0].match(/:(.*?);/);
      const mime = mimeMatch ? mimeMatch[1] : defaultMime;
      const bstr = atob(parts[1]);
      let n = bstr.length;
      if (n === 0) {
        throw new Error('DataURL menghasilkan ukuran buffer kosong.');
      }
      const u8arr = new Uint8Array(n);
      while (n--) {
        u8arr[n] = bstr.charCodeAt(n);
      }
      return new Blob([u8arr], { type: mime });
    }

    if (
      input.startsWith('blob:') ||
      input.startsWith('http://') ||
      input.startsWith('https://') ||
      input.startsWith('/')
    ) {
      try {
        const resp = await fetch(input);
        const fetchedBlob = await resp.blob();
        if (fetchedBlob.size === 0) {
          throw new Error('Fetched Blob is empty.');
        }
        return fetchedBlob;
      } catch (e) {
        console.warn('Could not fetch blob from URL:', input, e);
      }
    }
  }

  return null;
}

/**
 * Fetch submissions for public gallery strictly filtered by eventId
 */
export async function fetchSubmissionsForEvent(eventId = null, filterMode = 'all') {
  if (!eventId) {
    return [];
  }

  if (!isSupabaseConfigured()) {
    throw new Error('Galeri bersama memerlukan konfigurasi Supabase yang valid.');
  }

  try {
    const pageSize = 500;
    const rows = [];
    let rangeStart = 0;

    while (true) {
      let query = supabase
        .from('submissions')
        .select(`
          *,
          submission_media (*),
          voice_notes (*)
        `)
        .eq('event_id', eventId)
        .eq('upload_status', 'completed')
        .order('created_at', { ascending: false })
        .range(rangeStart, rangeStart + pageSize - 1);

      if (filterMode === 'boomerang') {
        query = query.eq('media_type', 'boomerang');
      }

      const { data, error } = await query;
      if (error) throw error;
      rows.push(...(data || []));
      if (!data || data.length < pageSize) break;
      rangeStart += pageSize;
    }

    const mapped = rows.map((sub) => {
      const primaryMedia = (sub.submission_media || []).find((media) => media.upload_status === 'completed');
      const voice = (sub.voice_notes || []).find((note) =>
        note.upload_status === 'completed' && !!note.file_url
      );
      const voiceDurationSeconds = Number(voice?.duration);
      const formattedVoiceDuration = Number.isFinite(voiceDurationSeconds)
        ? `${String(Math.floor(voiceDurationSeconds / 60)).padStart(2, '0')}:${String(Math.floor(voiceDurationSeconds % 60)).padStart(2, '0')}`
        : null;
      const voiceUrl = voice?.file_url
        ? getPublicUrl('submissions', voice.file_url)
        : null;

      return {
        id: sub.id,
        eventId: sub.event_id,
        type: sub.media_type,
        guestName: sub.guest_name,
        guestMessage: sub.guest_message,
        guestPhoto: primaryMedia
          ? getPublicUrl('submissions', primaryMedia.thumbnail_url || primaryMedia.file_url)
          : null,
        mediaUrl: primaryMedia?.file_url ? getPublicUrl('submissions', primaryMedia.file_url) : null,
        thumbnailUrl: primaryMedia
          ? getPublicUrl('submissions', primaryMedia.thumbnail_url || primaryMedia.file_url)
          : null,
        frameId: sub.frame_id,
        frameName: sub.frame_name || 'Wedding Frame',
        hasVoiceNote: !!voiceUrl,
        voiceDuration: formattedVoiceDuration,
        voiceUrl,
        likes: sub.likes || 0,
        createdAt: new Date(sub.created_at).toLocaleDateString('id-ID', {
          day: 'numeric',
          month: 'short',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        }),
      };
    });

    if (filterMode === 'voice') {
      return mapped.filter((item) => item.hasVoiceNote);
    }

    return mapped;
  } catch (err) {
    console.error('fetchSubmissionsForEvent exception:', err);
    throw err;
  }
}

/**
 * Fetch all submissions for Admin with detailed filters
 */
export async function fetchAllSubmissionsAdmin({ eventId = null, mediaType = 'all', search = '' }) {
  if (!isSupabaseConfigured()) {
    const local = getLocalSubmissions();
    return local.filter((item) => {
      const matchesEvent = !eventId || eventId === 'all' || item.eventId === eventId;
      const matchesMedia = mediaType === 'all' || item.type === mediaType;
      const matchesSearch =
        !search ||
        item.guestName.toLowerCase().includes(search.toLowerCase()) ||
        (item.guestMessage || '').toLowerCase().includes(search.toLowerCase());
      return matchesEvent && matchesMedia && matchesSearch;
    });
  }

  try {
    let query = supabase
      .from('submissions')
      .select(`
        *,
        events (id, name, slug),
        frames (id, name),
        submission_media (*),
        voice_notes (*)
      `)
      .order('created_at', { ascending: false });

    if (eventId && eventId !== 'all') {
      query = query.eq('event_id', eventId);
    }

    if (mediaType && mediaType !== 'all') {
      query = query.eq('media_type', mediaType);
    }

    if (search && search.trim().length > 0) {
      query = query.ilike('guest_name', `%${search.trim()}%`);
    }

    let { data, error } = await query;

    // Fallback if relations aren't resolved in schema cache
    if (error && (error.code === 'PGRST200' || error.message?.includes('relationship'))) {
      let fallbackQuery = supabase
        .from('submissions')
        .select(`
          *,
          submission_media (*),
          voice_notes (*)
        `)
        .order('created_at', { ascending: false });

      if (eventId && eventId !== 'all') {
        fallbackQuery = fallbackQuery.eq('event_id', eventId);
      }
      if (mediaType && mediaType !== 'all') {
        fallbackQuery = fallbackQuery.eq('media_type', mediaType);
      }
      if (search && search.trim().length > 0) {
        fallbackQuery = fallbackQuery.ilike('guest_name', `%${search.trim()}%`);
      }

      const fallbackResult = await fallbackQuery;
      if (!fallbackResult.error) {
        data = fallbackResult.data;
        error = null;
      }
    }

    if (error) {
      console.warn('fetchAllSubmissionsAdmin error:', error);
      return getLocalSubmissions();
    }

    return (data || []).map((sub) => {
      const primaryMedia = (sub.submission_media || []).find((media) => media.upload_status === 'completed');
      const voice = (sub.voice_notes || []).find((note) =>
        note.upload_status === 'completed' && !!note.file_url
      );
      const voiceDurationSeconds = Number(voice?.duration);
      const formattedVoiceDuration = Number.isFinite(voiceDurationSeconds)
        ? `${String(Math.floor(voiceDurationSeconds / 60)).padStart(2, '0')}:${String(Math.floor(voiceDurationSeconds % 60)).padStart(2, '0')}`
        : null;
      return {
        id: sub.id,
        type: sub.media_type,
        guestName: sub.guest_name,
        guestMessage: sub.guest_message,
        mediaUrl: primaryMedia?.file_url ? getPublicUrl('submissions', primaryMedia.file_url) : null,
        thumbnailUrl: primaryMedia
          ? getPublicUrl('submissions', primaryMedia.thumbnail_url || primaryMedia.file_url)
          : null,
        frameName: sub.frames?.name || sub.frame_name || 'Wedding Frame',
        eventName: sub.events?.name || 'Wedding Event',
        eventId: sub.event_id,
        hasVoiceNote: !!voice,
        voiceDuration: formattedVoiceDuration,
        voiceUrl: voice?.file_url ? getPublicUrl('submissions', voice.file_url) : null,
        likes: sub.likes || 0,
        upload_status: sub.upload_status,
        created_at: sub.created_at,
      };
    });
  } catch (err) {
    console.error('fetchAllSubmissionsAdmin error:', err);
    return getLocalSubmissions();
  }
}

/**
 * Submit photobooth result to Supabase Storage & Database
 * Flow:
 * 1. Validate active event & event.id
 * 2. Generate submissionId using crypto.randomUUID()
 * 3. Ensure valid Blobs with image/jpeg for photos
 * 4. Upload relative paths to 'submissions' bucket
 * 5. Insert into 'submissions', 'submission_media', and 'voice_notes'
 * 6. Clean up uploaded storage files if database insert fails
 */
export async function createSubmission({
  eventId,
  guestName = 'Tamu Istimewa',
  guestMessage = '',
  mediaType = 'photo',
  frame = null,
  mediaBlobOrUrl = null,
  thumbnailBlobOrUrl = null,
  voiceBlob = null,
  voiceDuration = '00:15',
  rawPhotos = [],
}) {
  if (!eventId) {
    throw new Error('Event ID wajib tersedia sebelum foto disimpan.');
  }
  if (!isSupabaseConfigured()) {
    throw new Error('Supabase belum dikonfigurasi. Foto dan ucapan tidak dapat disimpan untuk galeri bersama.');
  }

  // 1. Generate crypto.randomUUID()
  const submissionId =
    typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
      ? crypto.randomUUID()
      : 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
          const r = (Math.random() * 16) | 0;
          const v = c === 'x' ? r : (r & 0x3) | 0x8;
          return v.toString(16);
        });

  const isVoice = !!voiceBlob;
  const isVideo = mediaType === 'boomerang';
  const uploadedFilesToCleanup = [];

  let uploadedMediaUrl = mediaBlobOrUrl;
  let uploadedThumbUrl = thumbnailBlobOrUrl || mediaBlobOrUrl;
  let uploadedVoiceUrl = null;
  let uploadedMediaPath = null;
  let uploadedThumbPath = null;
  let uploadedVoicePath = null;
  let uploadedVoiceMime = null;

  try {
      // 2a. Convert media to valid Blob
      const primaryBlob = await ensureBlob(
        mediaBlobOrUrl,
        isVideo ? 'video/mp4' : 'image/jpeg'
      );

      if (!primaryBlob || primaryBlob.size === 0) {
        throw new Error('File media capture tidak valid atau berukuran 0 byte.');
      }

      // 2b. Relative storage path: submissions/{eventId}/{submissionId}/photo.jpg
      const isWebmVideo = isVideo && (primaryBlob.type?.includes('webm'));
      const mediaExt = isVideo ? (isWebmVideo ? 'webm' : 'mp4') : 'jpg';
      const mediaMime = isVideo ? (primaryBlob.type || 'video/mp4') : 'image/jpeg';
      const mainRelativePath = `submissions/${eventId}/${submissionId}/${isVideo ? 'boomerang' : 'photo'}.${mediaExt}`;

      const uploadResult = await uploadToStorage('submissions', mainRelativePath, primaryBlob, mediaMime, false);
      uploadedMediaUrl = uploadResult.publicUrl;
      uploadedMediaPath = uploadResult.path;
      uploadedFilesToCleanup.push({ bucket: 'submissions', path: uploadResult.path });

      // 2c. Thumbnail upload (always JPEG)
      if (thumbnailBlobOrUrl && thumbnailBlobOrUrl !== mediaBlobOrUrl) {
        const thumbBlob = await ensureBlob(thumbnailBlobOrUrl, 'image/jpeg');
        if (thumbBlob && thumbBlob.size > 0) {
          const thumbPath = `submissions/${eventId}/${submissionId}/thumb.jpg`;
          const thumbResult = await uploadToStorage('submissions', thumbPath, thumbBlob, 'image/jpeg', false);
          uploadedThumbUrl = thumbResult.publicUrl;
          uploadedThumbPath = thumbResult.path;
          uploadedFilesToCleanup.push({ bucket: 'submissions', path: thumbResult.path });
        } else {
          uploadedThumbUrl = uploadedMediaUrl;
          uploadedThumbPath = uploadedMediaPath;
        }
      } else {
        uploadedThumbUrl = uploadedMediaUrl;
        uploadedThumbPath = uploadedMediaPath;
      }

      // 2d. Multi-photo: upload raw photos (photo-1.jpg, photo-2.jpg, photo-3.jpg)
      if (mediaType === 'multi-photo' && Array.isArray(rawPhotos) && rawPhotos.length > 0) {
        for (let i = 0; i < rawPhotos.length; i++) {
          const rawItem = rawPhotos[i];
          if (rawItem) {
            try {
              const rawBlob = await ensureBlob(rawItem, 'image/jpeg');
              if (rawBlob && rawBlob.size > 0) {
                const rawPath = `submissions/${eventId}/${submissionId}/photo-${i + 1}.jpg`;
                const rawResult = await uploadToStorage('submissions', rawPath, rawBlob, 'image/jpeg', false);
                uploadedFilesToCleanup.push({ bucket: 'submissions', path: rawResult.path });
              }
            } catch (rawErr) {
              console.warn(`Warning uploading raw photo ${i + 1}:`, rawErr);
            }
          }
        }
      }

      // 2e. Voice note upload
      if (voiceBlob) {
        const voiceAudio = await ensureBlob(voiceBlob, 'audio/webm');
        if (!voiceAudio || voiceAudio.size === 0) {
          throw new Error('File voice note kosong atau tidak valid.');
        }
        const voiceMime = voiceAudio.type || voiceBlob.type || 'application/octet-stream';
        uploadedVoiceMime = voiceMime;
        const voiceSubtype = voiceMime.split('/')[1]?.split(';')[0]?.toLowerCase() || 'audio';
        const voiceExtension = {
          'x-m4a': 'm4a',
          'mp4': 'm4a',
          'mpeg': 'mp3',
          'ogg': 'ogg',
          'wav': 'wav',
          'webm': 'webm',
          'aac': 'aac',
        }[voiceSubtype] || 'audio';
        const voicePath = `submissions/${eventId}/${submissionId}/voice.${voiceExtension}`;
        const voiceResult = await uploadToStorage('submissions', voicePath, voiceAudio, voiceMime, false);
        uploadedVoiceUrl = voiceResult.publicUrl;
        uploadedVoicePath = voiceResult.path;
        uploadedFilesToCleanup.push({ bucket: 'submissions', path: voiceResult.path });
      }

      // 3. Commit all linked records atomically after every asset upload succeeds.
      const frameIdToSave = frame?.id && isUUID(frame.id) ? frame.id : null;
      const [minutes = '0', seconds = '0'] = String(voiceDuration || '00:15').split(':');
      const voiceDurationSeconds = (parseInt(minutes, 10) || 0) * 60 + (parseInt(seconds, 10) || 0);
      const { error: commitError } = await supabase.rpc('create_public_submission', {
        p_submission_id: submissionId,
        p_event_id: eventId,
        p_guest_name: guestName.trim() || 'Tamu Istimewa',
        p_guest_message: guestMessage.trim() || null,
        p_media_type: mediaType,
        p_frame_id: frameIdToSave,
        p_frame_name: frame?.name || 'Wedding Frame',
        p_frame_snapshot_config: {
          frame_name: frame?.name,
          slots_count: frame?.photo_count || frame?.photoCount || 1,
          slots: frame?.frame_slots || frame?.slots || [],
        },
        p_media_path: uploadedMediaPath,
        p_thumbnail_path: uploadedThumbPath,
        p_media_duration: isVideo ? 2 : null,
        p_voice_path: uploadedVoicePath,
        p_voice_duration: uploadedVoicePath ? voiceDurationSeconds : null,
        p_voice_mime_type: uploadedVoicePath ? uploadedVoiceMime : null,
      });

      if (commitError) {
        console.error('[SUPABASE ATOMIC SUBMISSION ERROR]', commitError);
        throw commitError;
      }
  } catch (err) {
      console.error('[SUPABASE SAVE PHOTO FAILED - CLEANING UP ORPHAN FILES]', err);

      // Clean up any uploaded storage files to prevent orphan files
      if (uploadedFilesToCleanup.length > 0) {
        for (const item of uploadedFilesToCleanup) {
          try {
            const { error: cleanupError } = await supabase.storage.from(item.bucket).remove([item.path]);
            if (cleanupError) {
              console.warn('[CLEANUP ORPHAN FILE FAILED]', item.path, cleanupError);
            } else {
              console.log('[CLEANUP ORPHAN FILE SUCCESS]', item.path);
            }
          } catch (cleanErr) {
            console.warn('[CLEANUP ORPHAN FILE FAILED]', item.path, cleanErr);
          }
        }
      }

      throw err;
  }

  // Always update local cache for instant feedback
  const localItems = getLocalSubmissions();
  const newItem = {
    id: submissionId,
    eventId: eventId,
    type: mediaType,
    guestName: guestName.trim() || 'Tamu Istimewa',
    guestMessage: guestMessage.trim(),
    guestPhoto: uploadedThumbUrl || uploadedMediaUrl,
    mediaUrl: uploadedMediaUrl,
    thumbnailUrl: uploadedThumbUrl || uploadedMediaUrl,
    frameId: frame?.id,
    frameName: frame?.name || 'Wedding Frame',
    hasVoiceNote: isVoice,
    voiceDuration: isVoice ? voiceDuration : null,
    voiceUrl: uploadedVoiceUrl,
    voiceAudioBlob: voiceBlob,
    createdAt: 'Hari ini · Baru saja',
    likes: 1,
    isUserSubmission: true,
  };

  saveLocalSubmissions([newItem, ...localItems]);
  return newItem;
}

/**
 * Delete submission
 */
export async function deleteSubmission(submissionId) {
  if (!isSupabaseConfigured()) {
    const local = getLocalSubmissions();
    saveLocalSubmissions(local.filter((s) => s.id !== submissionId));
    return true;
  }

  const { error } = await supabase.from('submissions').delete().eq('id', submissionId);
  if (error) throw error;

  const local = getLocalSubmissions();
  saveLocalSubmissions(local.filter((s) => s.id !== submissionId));
  return true;
}

/**
 * Like submission
 */
export async function likeSubmission(submissionId) {
  if (isSupabaseConfigured()) {
    try {
      await supabase.rpc('increment_likes', { submission_row_id: submissionId });
    } catch (e) {
      // Fallback direct update
      const { data } = await supabase.from('submissions').select('likes').eq('id', submissionId).maybeSingle();
      if (data) {
        await supabase.from('submissions').update({ likes: (data.likes || 0) + 1 }).eq('id', submissionId);
      }
    }
  }

  const local = getLocalSubmissions();
  const updated = local.map((s) => (s.id === submissionId ? { ...s, likes: (s.likes || 0) + 1 } : s));
  saveLocalSubmissions(updated);
  return true;
}
