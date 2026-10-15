import { supabase, isSupabaseConfigured, uploadToStorage, normalizeStoragePath } from '../lib/supabase.js';
import { FRAMES } from '../data/eventData.js';

const LOCAL_STORAGE_FRAMES_KEY = 'xlvi_frames_db_cache_v2';

// Seed default frames into local cache format
function getInitialLocalFrames() {
  return FRAMES.map((f, idx) => ({
    id: f.id,
    event_id: null, // global
    name: f.name,
    slug: f.id,
    type: f.type || 'single',
    photo_count: f.photoCount || 1,
    overlay_url: f.overlay_url || null,
    thumbnail_url: f.thumbnail_url || null,
    accent: f.accent || '',
    subtitle: f.subtitle || '',
    width: 1080,
    height: 1440,
    sort_order: idx + 1,
    is_active: true,
    version: 1,
    created_at: new Date().toISOString(),
    slots: f.slots || [
      {
        slot_number: 1,
        x: 72,
        y: 72,
        width: 936,
        height: 1080,
        border_radius: 16,
        rotation: 0,
        object_fit: 'cover',
      },
    ],
    frame_slots: f.slots || [
      {
        slot_number: 1,
        x: 72,
        y: 72,
        width: 936,
        height: 1080,
        border_radius: 16,
        rotation: 0,
        object_fit: 'cover',
      },
    ],
  }));
}

function getLocalFrames() {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_FRAMES_KEY);
    return raw ? JSON.parse(raw) : getInitialLocalFrames();
  } catch (e) {
    return getInitialLocalFrames();
  }
}

function saveLocalFrames(frames) {
  try {
    localStorage.setItem(LOCAL_STORAGE_FRAMES_KEY, JSON.stringify(frames));
  } catch (e) {
    console.warn('LocalStorage save error:', e);
  }
}

/**
 * Normalizes a frame object from Supabase or LocalStorage
 */
function normalizeFrame(item) {
  if (!item) return null;
  const rawSlots = item.frame_slots && item.frame_slots.length > 0
    ? item.frame_slots
    : (item.slots || []);

  const slots = [...rawSlots].sort((a, b) => (a.slot_number || 1) - (b.slot_number || 1));

  return {
    ...item,
    photoCount: item.photo_count || (slots.length > 0 ? slots.length : 1),
    slots,
    frame_slots: slots,
  };
}

/**
 * Generate a clean, URL-safe and storage-safe slug
 */
function sanitizeSlug(str) {
  if (!str) return 'frame-' + Date.now();
  return (
    str
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9_-]+/g, '-')
      .replace(/^-+|-+$/g, '') || 'frame-' + Date.now()
  );
}

/**
 * Fetch active frames for user photobooth
 * Filter: is_active = true AND (event_id IS NULL OR event_id = currentEventId)
 * Order: sort_order ASC
 */
export async function fetchActiveFramesForEvent(eventId = null) {
  if (!isSupabaseConfigured()) {
    const local = getLocalFrames();
    const active = local
      .filter((f) => {
        const matchesEvent = !f.event_id || !eventId || f.event_id === eventId;
        return f.is_active && matchesEvent;
      })
      .sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));

    return active.map(normalizeFrame);
  }

  try {
    let query = supabase
      .from('frames')
      .select(`
        *,
        frame_slots (*)
      `)
      .eq('is_active', true)
      .order('sort_order', { ascending: true });

    if (eventId) {
      query = query.or(`event_id.is.null,event_id.eq.${eventId}`);
    } else {
      query = query.is('event_id', null);
    }

    const { data, error } = await query;
    if (error) {
      console.warn('Supabase fetchActiveFrames error, using local fallback:', error);
      const local = getLocalFrames();
      return local
        .filter((f) => f.is_active && (!f.event_id || !eventId || f.event_id === eventId))
        .map(normalizeFrame);
    }

    return (data || []).map(normalizeFrame);
  } catch (err) {
    console.error('fetchActiveFramesForEvent exception:', err);
    const local = getLocalFrames();
    return local
      .filter((f) => f.is_active && (!f.event_id || !eventId || f.event_id === eventId))
      .map(normalizeFrame);
  }
}

/**
 * Fetch all frames for Admin Dashboard (active & inactive)
 */
export async function fetchAllFramesAdmin(filterEventId = null) {
  if (!isSupabaseConfigured()) {
    const local = getLocalFrames();
    if (filterEventId && filterEventId !== 'all') {
      return local.filter((f) => f.event_id === filterEventId || !f.event_id).map(normalizeFrame);
    }
    return local.map(normalizeFrame);
  }

  try {
    // Attempt query with events relationship; fallback if relationship doesn't exist
    let query = supabase
      .from('frames')
      .select(`
        *,
        events (id, name, slug),
        frame_slots (*)
      `)
      .order('sort_order', { ascending: true });

    if (filterEventId && filterEventId !== 'all') {
      query = query.or(`event_id.is.null,event_id.eq.${filterEventId}`);
    }

    let { data, error } = await query;

    // Graceful fallback if events foreign relation is not found in schema cache
    if (error && (error.code === 'PGRST200' || error.message?.includes('relationship'))) {
      const fallbackQuery = supabase
        .from('frames')
        .select(`
          *,
          frame_slots (*)
        `)
        .order('sort_order', { ascending: true });

      const fallbackResult = await fallbackQuery;
      if (!fallbackResult.error) {
        data = fallbackResult.data;
        error = null;
      }
    }

    if (error) {
      console.warn('Supabase fetchAllFramesAdmin error, falling back to local:', error);
      return getLocalFrames().map(normalizeFrame);
    }

    return (data || []).map(normalizeFrame);
  } catch (err) {
    console.error('fetchAllFramesAdmin exception:', err);
    return getLocalFrames().map(normalizeFrame);
  }
}

/**
 * Fetch single frame by ID
 */
export async function fetchFrameById(frameId) {
  if (!isSupabaseConfigured()) {
    const local = getLocalFrames();
    const found = local.find((f) => f.id === frameId);
    return found ? normalizeFrame(found) : null;
  }

  try {
    let { data, error } = await supabase
      .from('frames')
      .select(`
        *,
        events (id, name, slug),
        frame_slots (*)
      `)
      .eq('id', frameId)
      .maybeSingle();

    if (error && (error.code === 'PGRST200' || error.message?.includes('relationship'))) {
      const fallback = await supabase
        .from('frames')
        .select(`
          *,
          frame_slots (*)
        `)
        .eq('id', frameId)
        .maybeSingle();
      data = fallback.data;
      error = fallback.error;
    }

    if (error || !data) {
      const local = getLocalFrames();
      const found = local.find((f) => f.id === frameId);
      return found ? normalizeFrame(found) : null;
    }

    return normalizeFrame(data);
  } catch (err) {
    console.error('fetchFrameById error:', err);
    return null;
  }
}

/**
 * Create a new frame with slots & storage overlay upload
 * Uses bucket 'frames' with strictly relative storage path
 */
export async function createFrame({ frameData, slotsData = [], overlayFile = null, thumbnailFile = null }) {
  const frameId = `fr-${Date.now()}`;
  const slug = sanitizeSlug(frameData.slug || frameData.name);
  const eventFolder = frameData.event_id && frameData.event_id !== 'all' ? frameData.event_id : 'global';

  let overlayUrl = frameData.overlay_url || null;
  let thumbnailUrl = frameData.thumbnail_url || null;

  // 1. Upload overlay PNG if provided as File or Blob to 'frames' bucket
  if (overlayFile instanceof Blob || overlayFile instanceof File) {
    // Relative path without leading slashes or bucket name
    const filePath = `${eventFolder}/${slug}/overlay_${Date.now()}.png`;
    const res = await uploadToStorage('frames', filePath, overlayFile, 'image/png');
    overlayUrl = res.publicUrl;
  }

  // 2. Upload thumbnail if provided as File or Blob to 'frames' bucket
  if (thumbnailFile instanceof Blob || thumbnailFile instanceof File) {
    const filePath = `${eventFolder}/${slug}/thumb_${Date.now()}.jpg`;
    const res = await uploadToStorage('frames', filePath, thumbnailFile, 'image/jpeg');
    thumbnailUrl = res.publicUrl;
  }

  if (!isSupabaseConfigured()) {
    const local = getLocalFrames();
    const newFrame = {
      ...frameData,
      id: frameId,
      slug,
      overlay_url: overlayUrl,
      thumbnail_url: thumbnailUrl,
      photo_count: frameData.photo_count || slotsData.length || 1,
      sort_order: (local.length > 0 ? Math.max(...local.map((l) => l.sort_order || 0)) : 0) + 1,
      is_active: frameData.is_active ?? true,
      version: 1,
      created_at: new Date().toISOString(),
      slots: slotsData.map((s, idx) => ({ ...s, slot_number: idx + 1 })),
      frame_slots: slotsData.map((s, idx) => ({ ...s, slot_number: idx + 1 })),
    };
    saveLocalFrames([...local, newFrame]);
    return normalizeFrame(newFrame);
  }

  // Insert into Supabase `frames`
  const { data: createdFrame, error: frameError } = await supabase
    .from('frames')
    .insert([
      {
        event_id: frameData.event_id && frameData.event_id !== 'all' ? frameData.event_id : null,
        name: frameData.name.trim(),
        slug,
        type: frameData.type || 'single',
        photo_count: Number(frameData.photo_count) || (slotsData.length > 0 ? slotsData.length : 1),
        overlay_url: overlayUrl,
        thumbnail_url: thumbnailUrl,
        accent: frameData.accent || '',
        subtitle: frameData.subtitle || '',
        width: Number(frameData.width) || 1080,
        height: Number(frameData.height) || 1440,
        sort_order: Number(frameData.sort_order) || 0,
        is_active: frameData.is_active ?? true,
        version: 1,
      },
    ])
    .select()
    .single();

  if (frameError) throw frameError;

  // Insert slots into `frame_slots`
  if (slotsData && slotsData.length > 0) {
    const slotsToInsert = slotsData.map((slot, index) => ({
      frame_id: createdFrame.id,
      slot_number: index + 1,
      x: Math.round(Number(slot.x) || 0),
      y: Math.round(Number(slot.y) || 0),
      width: Math.round(Number(slot.width) || 1080),
      height: Math.round(Number(slot.height) || 1440),
      rotation: Number(slot.rotation) || 0,
      border_radius: Number(slot.border_radius) || 12,
      object_fit: slot.object_fit || 'cover',
    }));

    const { error: slotsError } = await supabase.from('frame_slots').insert(slotsToInsert);
    if (slotsError) {
      console.warn('Frame slots insert warning:', slotsError);
    }
  }

  const fetched = await fetchFrameById(createdFrame.id);
  return fetched || normalizeFrame(createdFrame);
}

/**
 * Update existing frame
 */
export async function updateFrame(frameId, { frameData, slotsData = null, newOverlayFile = null, newThumbnailFile = null }) {
  let overlayUrl = frameData.overlay_url;
  let thumbnailUrl = frameData.thumbnail_url;
  const slug = sanitizeSlug(frameData.slug || frameData.name);
  const eventFolder = frameData.event_id && frameData.event_id !== 'all' ? frameData.event_id : 'global';

  if (newOverlayFile instanceof Blob || newOverlayFile instanceof File) {
    const filePath = `${eventFolder}/${slug}/overlay_${Date.now()}.png`;
    const res = await uploadToStorage('frames', filePath, newOverlayFile, 'image/png');
    overlayUrl = res.publicUrl;
  }

  if (newThumbnailFile instanceof Blob || newThumbnailFile instanceof File) {
    const filePath = `${eventFolder}/${slug}/thumb_${Date.now()}.jpg`;
    const res = await uploadToStorage('frames', filePath, newThumbnailFile, 'image/jpeg');
    thumbnailUrl = res.publicUrl;
  }

  if (!isSupabaseConfigured()) {
    const local = getLocalFrames();
    const updated = local.map((f) => {
      if (f.id === frameId) {
        const slots = slotsData || f.slots || [];
        return {
          ...f,
          ...frameData,
          slug,
          overlay_url: overlayUrl,
          thumbnail_url: thumbnailUrl,
          photo_count: frameData.photo_count || (slots.length > 0 ? slots.length : f.photo_count),
          slots: slots.map((s, idx) => ({ ...s, slot_number: idx + 1 })),
          frame_slots: slots.map((s, idx) => ({ ...s, slot_number: idx + 1 })),
          version: (f.version || 1) + 1,
          updated_at: new Date().toISOString(),
        };
      }
      return f;
    });
    saveLocalFrames(updated);
    return normalizeFrame(updated.find((f) => f.id === frameId));
  }

  // Update `frames` table
  const { error: frameError } = await supabase
    .from('frames')
    .update({
      event_id: frameData.event_id && frameData.event_id !== 'all' ? frameData.event_id : null,
      name: frameData.name?.trim(),
      slug,
      type: frameData.type || 'single',
      photo_count: Number(frameData.photo_count) || (slotsData?.length || 1),
      overlay_url: overlayUrl,
      thumbnail_url: thumbnailUrl,
      accent: frameData.accent || '',
      subtitle: frameData.subtitle || '',
      width: Number(frameData.width) || 1080,
      height: Number(frameData.height) || 1440,
      sort_order: Number(frameData.sort_order) || 0,
      is_active: frameData.is_active ?? true,
      updated_at: new Date().toISOString(),
    })
    .eq('id', frameId);

  if (frameError) throw frameError;

  // Replace slots if new slots provided
  if (slotsData && slotsData.length > 0) {
    await supabase.from('frame_slots').delete().eq('frame_id', frameId);

    const slotsToInsert = slotsData.map((slot, index) => ({
      frame_id: frameId,
      slot_number: index + 1,
      x: Math.round(Number(slot.x) || 0),
      y: Math.round(Number(slot.y) || 0),
      width: Math.round(Number(slot.width) || 1080),
      height: Math.round(Number(slot.height) || 1440),
      rotation: Number(slot.rotation) || 0,
      border_radius: Number(slot.border_radius) || 12,
      object_fit: slot.object_fit || 'cover',
    }));

    await supabase.from('frame_slots').insert(slotsToInsert);
  }

  const fetched = await fetchFrameById(frameId);
  return fetched;
}

/**
 * Toggle active/inactive
 */
export async function toggleFrameActive(frameId, currentStatus) {
  const nextStatus = !currentStatus;

  if (!isSupabaseConfigured()) {
    const local = getLocalFrames();
    const updated = local.map((f) => (f.id === frameId ? { ...f, is_active: nextStatus } : f));
    saveLocalFrames(updated);
    return nextStatus;
  }

  const { error } = await supabase
    .from('frames')
    .update({ is_active: nextStatus, updated_at: new Date().toISOString() })
    .eq('id', frameId);

  if (error) throw error;
  return nextStatus;
}

/**
 * Duplicate an existing frame with its slots
 */
export async function duplicateFrame(frameId) {
  const source = await fetchFrameById(frameId);
  if (!source) throw new Error('Frame tidak ditemukan.');

  const duplicatedData = {
    name: `${source.name} (Salinan)`,
    slug: `${source.slug}-copy-${Date.now().toString().slice(-4)}`,
    type: source.type,
    photo_count: source.photo_count || source.photoCount,
    overlay_url: source.overlay_url,
    thumbnail_url: source.thumbnail_url,
    accent: source.accent,
    subtitle: source.subtitle,
    width: source.width || 1080,
    height: source.height || 1440,
    is_active: false, // Default duplicated frame as inactive for review
    event_id: source.event_id,
  };

  const slots = (source.frame_slots || source.slots || []).map((s) => ({
    x: s.x,
    y: s.y,
    width: s.width,
    height: s.height,
    rotation: s.rotation,
    border_radius: s.border_radius,
    object_fit: s.object_fit,
  }));

  return await createFrame({
    frameData: duplicatedData,
    slotsData: slots,
  });
}

/**
 * Delete frame (safe delete, preserves past historical submissions)
 */
export async function deleteFrame(frameId) {
  if (!isSupabaseConfigured()) {
    const local = getLocalFrames();
    const filtered = local.filter((f) => f.id !== frameId);
    saveLocalFrames(filtered);
    return true;
  }

  const { error } = await supabase.from('frames').delete().eq('id', frameId);
  if (error) throw error;
  return true;
}

/**
 * Reorder frame sequence
 */
export async function updateFrameSortOrders(orderedFrames) {
  if (!isSupabaseConfigured()) {
    const local = getLocalFrames();
    const map = new Map(orderedFrames.map((f, index) => [f.id, index + 1]));
    const updated = local.map((f) => (map.has(f.id) ? { ...f, sort_order: map.get(f.id) } : f));
    saveLocalFrames(updated);
    return true;
  }

  const updates = orderedFrames.map((f, index) =>
    supabase.from('frames').update({ sort_order: index + 1 }).eq('id', f.id)
  );

  await Promise.all(updates);
  return true;
}
