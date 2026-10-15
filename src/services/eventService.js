import { supabase, isSupabaseConfigured, uploadToStorage } from '../lib/supabase.js';

const LOCAL_STORAGE_EVENTS_KEY = 'xlvi_events_db_cache';

// Seed default initial event state
const DEFAULT_EVENT = {
  id: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
  name: 'Nela & Fadli',
  slug: 'nela-fadli',
  theme_id: 'ruby',
  description: 'Pernikahan Nela & Fadli — The Glass House Grand Ballroom, Jakarta',
  event_date: '2026-12-27',
  location: 'The Glass House Grand Ballroom, Jakarta',
  cover_image: null,
  status: 'active',
  created_at: new Date().toISOString(),
  event_settings: {
    theme_id: 'ruby',
    welcome_title: 'The Wedding Of',
    welcome_subtitle: 'Abadikan momenmu bersama kami',
    couple_name: 'Nela & Fadli',
    primary_color: '#B4232C',
    secondary_color: '#7F1D1D',
    allow_photo: true,
    allow_boomerang: true,
    allow_multi_photo: true,
    allow_voice: true,
    max_voice_duration: 30,
    gallery_enabled: true,
    download_enabled: true,
    share_enabled: true,
  },
};

function getLocalEvents() {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_EVENTS_KEY);
    return raw ? JSON.parse(raw) : [DEFAULT_EVENT];
  } catch (e) {
    return [DEFAULT_EVENT];
  }
}

function saveLocalEvents(events) {
  try {
    localStorage.setItem(LOCAL_STORAGE_EVENTS_KEY, JSON.stringify(events));
  } catch (e) {
    console.warn('LocalStorage save error:', e);
  }
}

/**
 * Sanitizes and normalizes theme identifier strictly to 'ruby' | 'blue' | 'green'
 */
export function sanitizeThemeId(raw) {
  if (!raw) return null;
  const str = String(raw).trim().toLowerCase();
  if (
    str === 'green' ||
    str === 'emerald' ||
    str === 'emerald-green' ||
    str.includes('green') ||
    str.includes('emerald')
  ) {
    return 'green';
  }
  if (
    str === 'ruby' ||
    str === 'red' ||
    str === 'ruby-red' ||
    str.includes('ruby') ||
    str.includes('red')
  ) {
    return 'ruby';
  }
  if (str === 'blue' || str === 'royal-blue' || str.includes('blue')) {
    return 'blue';
  }
  return null;
}

/**
 * Normalizes an event data object from Supabase or LocalStorage.
 * Ensures theme_id is strictly 'ruby' | 'blue' | 'green'.
 * Fallback to 'blue' occurs ONLY if database value is truly NULL/undefined.
 */
export function normalizeEvent(ev) {
  if (!ev) return null;
  const settings = Array.isArray(ev.event_settings)
    ? ev.event_settings[0] || {}
    : ev.event_settings || {};

  // 1. Theme determination from event.theme_id or event_settings.theme_id
  let theme_id = sanitizeThemeId(ev.theme_id) || sanitizeThemeId(settings.theme_id);

  // 2. Smart fallback from primary_color if theme_id was missing
  if (!theme_id && settings.primary_color) {
    const pColor = String(settings.primary_color).toLowerCase();
    if (pColor === '#16805b' || pColor.includes('green') || pColor.includes('emerald')) {
      theme_id = 'green';
    } else if (pColor === '#b4232c' || pColor.includes('red') || pColor.includes('ruby')) {
      theme_id = 'ruby';
    } else if (pColor === '#2563eb' || pColor.includes('blue')) {
      theme_id = 'blue';
    }
  }

  // 3. Fallback to 'blue' ONLY if database values were completely NULL/undefined
  if (!theme_id) {
    theme_id = 'blue';
  }

  return {
    ...ev,
    id: ev.id,
    name: ev.name || 'Acara Pernikahan',
    slug: ev.slug,
    theme_id,
    event_date: ev.event_date || null,
    location: (ev.location || '').trim(),
    status: ev.status || 'active',
    event_settings: {
      ...settings,
      theme_id,
      welcome_title: settings.welcome_title || 'The Wedding Of',
      welcome_subtitle: settings.welcome_subtitle || 'Abadikan momenmu bersama kami',
      couple_name: settings.couple_name || ev.name,
      primary_color:
        theme_id === 'ruby' ? '#B4232C' : theme_id === 'green' ? '#16805B' : '#2563EB',
      secondary_color:
        theme_id === 'ruby' ? '#7F1D1D' : theme_id === 'green' ? '#065F46' : '#1E3A8A',
    },
  };
}

/**
 * Fetch event by slug strictly for photobooth user.
 * Returns null if not found (NO silent fallback to old hardcoded events!).
 */
export async function fetchEventBySlug(slug) {
  if (!slug || typeof slug !== 'string') return null;
  const cleanSlug = slug.trim().toLowerCase();

  if (!isSupabaseConfigured()) {
    const local = getLocalEvents();
    const found = local.find((e) => e.slug?.toLowerCase() === cleanSlug);
    return found ? normalizeEvent(found) : null;
  }

  try {
    const { data, error } = await supabase
      .from('events')
      .select(`
        *,
        event_settings (*)
      `)
      .eq('slug', cleanSlug)
      .maybeSingle();

    if (error) {
      console.error('[EVENT LOAD ERROR]', error);
      // Fallback to local cache check if Supabase is temporarily unreachable
      const local = getLocalEvents();
      const found = local.find((e) => e.slug?.toLowerCase() === cleanSlug);
      return found ? normalizeEvent(found) : null;
    }

    if (!data) {
      return null;
    }

    const normalized = normalizeEvent(data);

    // Keep local cache fresh for this slug
    try {
      const local = getLocalEvents();
      const updated = [normalized, ...local.filter((l) => l.id !== normalized.id)];
      saveLocalEvents(updated);
    } catch (e) {}

    return normalized;
  } catch (err) {
    console.error('[EVENT LOAD ERROR]', err);
    return null;
  }
}

/**
 * Fetch all events for Admin
 */
export async function fetchAllEvents() {
  if (!isSupabaseConfigured()) {
    return getLocalEvents().map(normalizeEvent);
  }

  try {
    let { data, error } = await supabase
      .from('events')
      .select(`
        *,
        event_settings (*),
        frames (id),
        submissions (id)
      `)
      .order('created_at', { ascending: false });

    // Fallback if reverse foreign key relations frames/submissions aren't resolved
    if (error && (error.code === 'PGRST200' || error.message?.includes('relationship'))) {
      const fallback = await supabase
        .from('events')
        .select(`
          *,
          event_settings (*)
        `)
        .order('created_at', { ascending: false });
      data = fallback.data;
      error = fallback.error;
    }

    if (error) {
      console.warn('Error fetching events from Supabase:', error);
      return getLocalEvents().map(normalizeEvent);
    }

    const normalizedList = (data || []).map((ev) => {
      const norm = normalizeEvent(ev);
      return {
        ...norm,
        frames_count: ev.frames?.length || 0,
        submissions_count: ev.submissions?.length || 0,
      };
    });

    // Update local cache
    saveLocalEvents(normalizedList);
    return normalizedList;
  } catch (err) {
    console.error('fetchAllEvents error:', err);
    return getLocalEvents().map(normalizeEvent);
  }
}

/**
 * Create a new event with uniqueness validation and theme_id
 */
export async function createEvent(eventData, settingsData = {}) {
  // Required validations
  if (!eventData.name?.trim()) throw new Error('Nama event wajib diisi.');
  if (!eventData.event_date) throw new Error('Tanggal event wajib diisi.');

  const rawSlug = (eventData.slug || eventData.name || '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
  const slug = rawSlug || `event-${Date.now()}`;
  const validThemes = ['ruby', 'blue', 'green'];
  const theme_id = validThemes.includes(eventData.theme_id) ? eventData.theme_id : 'blue';

  const preparedData = {
    name: eventData.name.trim(),
    slug,
    event_date: eventData.event_date,
    location: (eventData.location || '').trim(),
    theme_id,
    status: eventData.status || 'active',
  };

  console.log('[SAVE EVENT]', preparedData);

  if (!isSupabaseConfigured()) {
    const local = getLocalEvents();
    if (local.some((e) => e.slug?.toLowerCase() === slug.toLowerCase())) {
      throw new Error('Event slug sudah digunakan. Harap gunakan slug unik lainnya.');
    }

    const newEventId = typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `ev-${Date.now()}`;
    const created = {
      ...preparedData,
      id: newEventId,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      event_settings: {
        welcome_title: settingsData.welcome_title || 'The Wedding Of',
        welcome_subtitle: settingsData.welcome_subtitle || 'Abadikan momenmu bersama kami',
        couple_name: settingsData.couple_name || eventData.name,
        theme_id,
        primary_color: theme_id === 'ruby' ? '#B4232C' : theme_id === 'green' ? '#16805B' : '#2563EB',
        secondary_color: theme_id === 'ruby' ? '#7F1D1D' : theme_id === 'green' ? '#065F46' : '#1E3A8A',
        allow_photo: settingsData.allow_photo ?? true,
        allow_boomerang: settingsData.allow_boomerang ?? true,
        allow_multi_photo: settingsData.allow_multi_photo ?? true,
        allow_voice: settingsData.allow_voice ?? true,
        max_voice_duration: settingsData.max_voice_duration || 30,
        gallery_enabled: settingsData.gallery_enabled ?? true,
        download_enabled: settingsData.download_enabled ?? true,
        share_enabled: settingsData.share_enabled ?? true,
      },
    };
    saveLocalEvents([created, ...local]);
    return normalizeEvent(created);
  }

  // 1. Slug uniqueness check
  const { data: existingEvent } = await supabase
    .from('events')
    .select('id')
    .eq('slug', slug)
    .maybeSingle();

  if (existingEvent) {
    throw new Error('Event slug sudah digunakan. Harap gunakan slug unik lainnya.');
  }

  // 2. Insert into `events` table
  const insertPayload = {
    name: preparedData.name,
    slug: preparedData.slug,
    theme_id: preparedData.theme_id,
    event_date: preparedData.event_date,
    location: preparedData.location,
    description: eventData.description || '',
    cover_image: eventData.cover_image || null,
    status: preparedData.status,
  };

  const { data: createdEvent, error: insertError } = await supabase
    .from('events')
    .insert([insertPayload])
    .select(`
      *,
      event_settings (*)
    `)
    .single();

  if (insertError) {
    console.error('[SUPABASE CREATE EVENT ERROR]', insertError);
    throw insertError;
  }

  // 3. Insert into `event_settings` with matching colors & titles
  const primaryColor =
    theme_id === 'ruby' ? '#B4232C' : theme_id === 'green' ? '#16805B' : '#2563EB';
  const secondaryColor =
    theme_id === 'ruby' ? '#7F1D1D' : theme_id === 'green' ? '#065F46' : '#1E3A8A';

  try {
    await supabase.from('event_settings').insert([
      {
        event_id: createdEvent.id,
        welcome_title: settingsData.welcome_title || 'The Wedding Of',
        welcome_subtitle: settingsData.welcome_subtitle || 'Abadikan momenmu bersama kami',
        couple_name: settingsData.couple_name || preparedData.name,
        primary_color: primaryColor,
        secondary_color: secondaryColor,
        allow_photo: settingsData.allow_photo ?? true,
        allow_boomerang: settingsData.allow_boomerang ?? true,
        allow_multi_photo: settingsData.allow_multi_photo ?? true,
        allow_voice: settingsData.allow_voice ?? true,
        max_voice_duration: settingsData.max_voice_duration || 30,
        gallery_enabled: settingsData.gallery_enabled ?? true,
        download_enabled: settingsData.download_enabled ?? true,
        share_enabled: settingsData.share_enabled ?? true,
      },
    ]);
  } catch (settingsError) {
    console.warn('Event settings insert warning:', settingsError);
  }

  const fullEvent = {
    ...createdEvent,
    theme_id: preparedData.theme_id,
    event_date: preparedData.event_date,
    location: preparedData.location,
    event_settings: {
      ...settingsData,
      theme_id: preparedData.theme_id,
      primary_color: primaryColor,
      secondary_color: secondaryColor,
    },
  };

  // Sync to local cache
  try {
    const local = getLocalEvents();
    saveLocalEvents([fullEvent, ...local.filter((l) => l.id !== fullEvent.id)]);
  } catch (e) {}

  return normalizeEvent(fullEvent);
}

/**
 * Update existing event and settings
 */
export async function updateEvent(eventId, eventData, settingsData = {}) {
  // Required validations
  if (!eventData.name?.trim()) throw new Error('Nama event wajib diisi.');
  if (!eventData.event_date) throw new Error('Tanggal event wajib diisi.');

  const theme_id = sanitizeThemeId(eventData.theme_id) || 'blue';
  const rawSlug = (eventData.slug || eventData.name || '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
  const slug = rawSlug;

  const preparedData = {
    name: eventData.name.trim(),
    slug: slug || undefined,
    event_date: eventData.event_date,
    location: (eventData.location || '').trim(),
    theme_id,
    description: eventData.description || '',
    cover_image: eventData.cover_image || null,
    status: eventData.status || 'active',
  };

  console.log('[SAVE EVENT]', preparedData);

  if (!isSupabaseConfigured()) {
    const local = getLocalEvents();
    if (
      slug &&
      local.some((e) => e.id !== eventId && e.slug?.toLowerCase() === slug.toLowerCase())
    ) {
      throw new Error('Event slug sudah digunakan oleh event lain.');
    }

    const updated = local.map((ev) => {
      if (ev.id === eventId) {
        return {
          ...ev,
          ...preparedData,
          slug: slug || ev.slug,
          updated_at: new Date().toISOString(),
          event_settings: {
            ...ev.event_settings,
            ...settingsData,
            theme_id,
            primary_color:
              theme_id === 'ruby' ? '#B4232C' : theme_id === 'green' ? '#16805B' : '#2563EB',
            secondary_color:
              theme_id === 'ruby' ? '#7F1D1D' : theme_id === 'green' ? '#065F46' : '#1E3A8A',
          },
        };
      }
      return ev;
    });
    saveLocalEvents(updated);
    return normalizeEvent(updated.find((e) => e.id === eventId));
  }

  // Check slug uniqueness across other events
  if (slug) {
    const { data: existing } = await supabase
      .from('events')
      .select('id')
      .eq('slug', slug)
      .neq('id', eventId)
      .maybeSingle();

    if (existing) {
      throw new Error('Event slug sudah digunakan oleh event lain.');
    }
  }

  // Update `events` table
  const updatePayload = {
    name: preparedData.name,
    slug: preparedData.slug,
    theme_id: preparedData.theme_id,
    description: preparedData.description,
    event_date: preparedData.event_date,
    location: preparedData.location,
    cover_image: preparedData.cover_image,
    status: preparedData.status,
    updated_at: new Date().toISOString(),
  };

  const { data: updatedData, error: updateError } = await supabase
    .from('events')
    .update(updatePayload)
    .eq('id', eventId)
    .select(`
      *,
      event_settings (*)
    `)
    .single();

  if (updateError) {
    console.error('[SUPABASE UPDATE EVENT ERROR]', updateError);
    throw updateError;
  }

  // Update `event_settings` with primary_color & secondary_color
  const primaryColor =
    theme_id === 'ruby' ? '#B4232C' : theme_id === 'green' ? '#16805B' : '#2563EB';
  const secondaryColor =
    theme_id === 'ruby' ? '#7F1D1D' : theme_id === 'green' ? '#065F46' : '#1E3A8A';

  try {
    await supabase.from('event_settings').upsert({
      event_id: eventId,
      welcome_title: settingsData.welcome_title || 'The Wedding Of',
      welcome_subtitle: settingsData.welcome_subtitle || 'Abadikan momenmu bersama kami',
      couple_name: settingsData.couple_name || preparedData.name,
      primary_color: primaryColor,
      secondary_color: secondaryColor,
      updated_at: new Date().toISOString(),
    });
  } catch (err) {
    console.warn('Event settings upsert warning:', err);
  }

  const full = {
    ...updatedData,
    theme_id: preparedData.theme_id,
    event_date: preparedData.event_date,
    location: preparedData.location,
    event_settings: {
      ...settingsData,
      theme_id: preparedData.theme_id,
      primary_color: primaryColor,
      secondary_color: secondaryColor,
    },
  };

  // Sync to local cache
  try {
    const local = getLocalEvents();
    saveLocalEvents(local.map((l) => (l.id === eventId ? full : l)));
  } catch (e) {}

  return normalizeEvent(full);
}

/**
 * Delete event
 */
export async function deleteEvent(eventId) {
  if (!isSupabaseConfigured()) {
    const local = getLocalEvents();
    const filtered = local.filter((e) => e.id !== eventId);
    saveLocalEvents(filtered);
    return true;
  }

  const { error } = await supabase.from('events').delete().eq('id', eventId);
  if (error) throw error;

  try {
    const local = getLocalEvents();
    saveLocalEvents(local.filter((l) => l.id !== eventId));
  } catch (e) {}

  return true;
}

/**
 * Duplicate event
 */
export async function duplicateEvent(eventId) {
  const events = await fetchAllEvents();
  const source = events.find((e) => e.id === eventId);
  if (!source) throw new Error('Event tidak ditemukan');

  const copySlug = `${source.slug}-copy-${Date.now().toString().slice(-4)}`;

  return await createEvent(
    {
      name: `${source.name} (Salinan)`,
      slug: copySlug,
      theme_id: source.theme_id || 'blue',
      description: source.description,
      event_date: source.event_date,
      location: source.location,
      cover_image: source.cover_image,
      status: 'draft',
    },
    source.event_settings || {}
  );
}

/**
 * Uploads event cover image to Supabase Storage (1080x1920, 9:16, max ~2-3MB)
 * Storage path: covers/{slugOrId}_{timestamp}.ext in 'events' or 'frames' bucket
 */
export async function uploadEventCoverImage(file, eventSlugOrId = 'event') {
  if (!file) return null;
  const ext = file.name ? file.name.split('.').pop() : 'jpg';
  const cleanExt = ['jpg', 'jpeg', 'png', 'webp'].includes(ext.toLowerCase()) ? ext.toLowerCase() : 'jpg';
  const filePath = `covers/${eventSlugOrId}_${Date.now()}.${cleanExt}`;

  try {
    const res = await uploadToStorage('events', filePath, file, file.type || 'image/jpeg');
    return res.publicUrl;
  } catch (err) {
    console.warn("Could not upload to 'events' bucket, trying 'frames' bucket:", err);
    const res = await uploadToStorage('frames', filePath, file, file.type || 'image/jpeg');
    return res.publicUrl;
  }
}

