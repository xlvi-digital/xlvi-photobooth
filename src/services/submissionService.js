import { supabase, isSupabaseConfigured, uploadToStorage, normalizeStoragePath } from '../lib/supabase.js';
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
    const local = getLocalSubmissions();
    return local.filter((item) => {
      if (item.eventId !== eventId) return false;
      if (filterMode === 'boomerang') return item.type === 'boomerang';
      if (filterMode === 'voice') return item.hasVoiceNote;
      if (filterMode === 'mine') return item.isUserSubmission;
      return true;
    });
  }

  try {
    let query = supabase
      .from('submissions')
      .select(`
        *,
        submission_media (*),
        voice_notes (*)
      `)
      .eq('event_id', eventId)
      .eq('upload_status', 'completed')
      .order('created_at', { ascending: false });

    if (filterMode === 'boomerang') {
      query = query.eq('media_type', 'boomerang');
    }

    const { data, error } = await query;
    if (error) {
      console.error('[SUPABASE FETCH SUBMISSIONS ERROR]', error);
      const local = getLocalSubmissions();
      return local.filter((item) => {
        if (item.eventId !== eventId) return false;
        if (filterMode === 'boomerang') return item.type === 'boomerang';
        if (filterMode === 'voice') return item.hasVoiceNote;
        if (filterMode === 'mine') return item.isUserSubmission;
        return true;
      });
    }

    const mapped = (data || []).map((sub) => {
      const primaryMedia = sub.submission_media?.[0];
      const voice = sub.voice_notes?.[0];

      return {
        id: sub.id,
        eventId: sub.event_id,
        type: sub.media_type,
        guestName: sub.guest_name,
        guestMessage: sub.guest_message,
        guestPhoto: primaryMedia?.thumbnail_url || primaryMedia?.file_url,
        mediaUrl: primaryMedia?.file_url,
        thumbnailUrl: primaryMedia?.thumbnail_url || primaryMedia?.file_url,
        frameId: sub.frame_id,
        frameName: sub.frame_name || 'Wedding Frame',
        hasVoiceNote: !!voice,
        voiceDuration: voice ? `00:${String(Math.round(voice.duration || 15)).padStart(2, '0')}` : null,
        voiceUrl: voice?.file_url || null,
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
    return [];
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
      const primaryMedia = sub.submission_media?.[0];
      const voice = sub.voice_notes?.[0];
      return {
        id: sub.id,
        type: sub.media_type,
        guestName: sub.guest_name,
        guestMessage: sub.guest_message,
        mediaUrl: primaryMedia?.file_url,
        thumbnailUrl: primaryMedia?.thumbnail_url || primaryMedia?.file_url,
        frameName: sub.frames?.name || sub.frame_name || 'Wedding Frame',
        eventName: sub.events?.name || 'Wedding Event',
        eventId: sub.event_id,
        hasVoiceNote: !!voice,
        voiceDuration: voice ? `00:${String(Math.round(voice.duration || 15)).padStart(2, '0')}` : null,
        voiceUrl: voice?.file_url || null,
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

  // 2. Upload to Supabase Storage if configured
  if (isSupabaseConfigured()) {
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

      const uploadResult = await uploadToStorage('submissions', mainRelativePath, primaryBlob, mediaMime);
      uploadedMediaUrl = uploadResult.publicUrl;
      uploadedFilesToCleanup.push({ bucket: 'submissions', path: uploadResult.path });

      // 2c. Thumbnail upload (always JPEG)
      if (thumbnailBlobOrUrl && thumbnailBlobOrUrl !== mediaBlobOrUrl) {
        const thumbBlob = await ensureBlob(thumbnailBlobOrUrl, 'image/jpeg');
        if (thumbBlob && thumbBlob.size > 0) {
          const thumbPath = `submissions/${eventId}/${submissionId}/thumb.jpg`;
          const thumbResult = await uploadToStorage('submissions', thumbPath, thumbBlob, 'image/jpeg');
          uploadedThumbUrl = thumbResult.publicUrl;
          uploadedFilesToCleanup.push({ bucket: 'submissions', path: thumbResult.path });
        } else {
          uploadedThumbUrl = uploadedMediaUrl;
        }
      } else {
        uploadedThumbUrl = uploadedMediaUrl;
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
                const rawResult = await uploadToStorage('submissions', rawPath, rawBlob, 'image/jpeg');
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
        if (voiceAudio && voiceAudio.size > 0) {
          const voiceMime = voiceAudio.type || 'audio/webm';
          const voicePath = `submissions/${eventId}/${submissionId}/voice.webm`;
          const voiceResult = await uploadToStorage('submissions', voicePath, voiceAudio, voiceMime);
          uploadedVoiceUrl = voiceResult.publicUrl;
          uploadedFilesToCleanup.push({ bucket: 'submissions', path: voiceResult.path });
        }
      }

      // 3. Insert into `submissions` table
      const frameIdToSave = frame?.id && isUUID(frame.id) ? frame.id : null;

      const { error: subError } = await supabase
        .from('submissions')
        .insert([
          {
            id: submissionId,
            event_id: eventId,
            guest_name: guestName.trim() || 'Tamu Istimewa',
            guest_message: isVoice
              ? (guestMessage || 'Menyampaikan ucapan hangat melalui Voice Note 🎙️')
              : guestMessage.trim(),
            media_type: mediaType,
            frame_id: frameIdToSave,
            frame_name: frame?.name || 'Wedding Frame',
            frame_snapshot_config: {
              frame_name: frame?.name,
              slots_count: frame?.photo_count || frame?.photoCount || 1,
              slots: frame?.frame_slots || frame?.slots || [],
            },
            upload_status: 'completed',
            likes: 1,
          },
        ]);

      if (subError) {
        console.error('[SUPABASE SUBMISSION INSERT ERROR]', {
          code: subError.code,
          message: subError.message,
          details: subError.details,
          hint: subError.hint,
        });
        throw subError;
      }

      // 4. Insert into `submission_media`
      const { error: mediaError } = await supabase.from('submission_media').insert([
        {
          submission_id: submissionId,
          media_type: isVideo ? 'video' : 'photo',
          file_url: uploadedMediaUrl,
          thumbnail_url: uploadedThumbUrl,
          duration: isVideo ? 2 : null,
          upload_status: 'completed',
        },
      ]);

      if (mediaError) {
        console.error('[SUPABASE SUBMISSION_MEDIA INSERT ERROR]', {
          code: mediaError.code,
          message: mediaError.message,
          details: mediaError.details,
          hint: mediaError.hint,
        });
        throw mediaError;
      }

      // 5. Insert into `voice_notes` if voice note was provided
      if (uploadedVoiceUrl) {
        const sec = parseInt(String(voiceDuration).split(':')[1] || '15', 10);
        const { error: voiceError } = await supabase.from('voice_notes').insert([
          {
            submission_id: submissionId,
            file_url: uploadedVoiceUrl,
            duration: sec,
            mime_type: voiceBlob?.type || 'audio/webm',
            upload_status: 'completed',
          },
        ]);

        if (voiceError) {
          console.error('[SUPABASE VOICE_NOTES INSERT ERROR]', {
            code: voiceError.code,
            message: voiceError.message,
            details: voiceError.details,
            hint: voiceError.hint,
          });
          throw voiceError;
        }
      }
    } catch (err) {
      console.error('[SUPABASE SAVE PHOTO FAILED - CLEANING UP ORPHAN FILES]', err);

      // Clean up any uploaded storage files to prevent orphan files
      if (uploadedFilesToCleanup.length > 0) {
        for (const item of uploadedFilesToCleanup) {
          try {
            await supabase.storage.from(item.bucket).remove([item.path]);
            console.log('[CLEANUP ORPHAN FILE SUCCESS]', item.path);
          } catch (cleanErr) {
            console.warn('[CLEANUP ORPHAN FILE FAILED]', item.path, cleanErr);
          }
        }
      }

      throw err;
    }
  }

  // Always update local cache for instant feedback
  const localItems = getLocalSubmissions();
  const newItem = {
    id: submissionId,
    eventId: eventId,
    type: mediaType,
    guestName: guestName.trim() || 'Tamu Istimewa',
    guestMessage: isVoice
      ? guestMessage || 'Menyampaikan ucapan hangat melalui Voice Note 🎙️'
      : guestMessage.trim(),
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
