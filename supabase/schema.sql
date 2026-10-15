-- ==============================================================================
-- XLVI VIRTUAL PHOTOBOOTH — SUPABASE DATABASE MIGRATION SCRIPT
-- ==============================================================================
-- Instructions: Copy and paste this script directly into the Supabase SQL Editor.
-- This script provisions all tables, relations, constraints, indexes, triggers,
-- row-level security (RLS) policies, storage buckets, and seed data.
-- ==============================================================================

-- 1. EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. ENUMS & TYPES
DO $$ BEGIN
    CREATE TYPE user_role AS ENUM ('admin', 'super_admin');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE event_status AS ENUM ('draft', 'active', 'completed', 'archived');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE frame_type AS ENUM ('single', 'multi', 'boomerang');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE media_type_enum AS ENUM ('photo', 'multi-photo', 'boomerang');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE upload_status_enum AS ENUM ('pending', 'uploading', 'completed', 'failed');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 3. PROFILES TABLE (Admin Users)
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    role TEXT NOT NULL DEFAULT 'admin' CHECK (role IN ('admin', 'super_admin')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 4. EVENTS TABLE
CREATE TABLE IF NOT EXISTS public.events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    theme_id TEXT NOT NULL DEFAULT 'blue' CHECK (theme_id IN ('ruby', 'blue', 'green')),
    description TEXT,
    event_date DATE,
    location TEXT,
    cover_image TEXT,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('draft', 'active', 'completed', 'archived')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Ensure theme_id column exists if table was already created
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS theme_id TEXT NOT NULL DEFAULT 'blue';
DO $$ BEGIN
    ALTER TABLE public.events ADD CONSTRAINT events_theme_id_check CHECK (theme_id IN ('ruby', 'blue', 'green'));
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 5. EVENT_SETTINGS TABLE
CREATE TABLE IF NOT EXISTS public.event_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE UNIQUE,
    welcome_title TEXT DEFAULT 'The Wedding Of',
    welcome_subtitle TEXT DEFAULT 'Abadikan momenmu bersama kami',
    couple_name TEXT DEFAULT 'Nela & Fadli',
    welcome_image TEXT,
    primary_color TEXT DEFAULT '#5c4033',
    secondary_color TEXT DEFAULT '#7a5845',
    background_image TEXT,
    music_url TEXT,
    allow_photo BOOLEAN NOT NULL DEFAULT true,
    allow_boomerang BOOLEAN NOT NULL DEFAULT true,
    allow_multi_photo BOOLEAN NOT NULL DEFAULT true,
    allow_voice BOOLEAN NOT NULL DEFAULT true,
    max_voice_duration INTEGER NOT NULL DEFAULT 30,
    gallery_enabled BOOLEAN NOT NULL DEFAULT true,
    download_enabled BOOLEAN NOT NULL DEFAULT true,
    share_enabled BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 6. FRAMES TABLE
CREATE TABLE IF NOT EXISTS public.frames (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID REFERENCES public.events(id) ON DELETE CASCADE, -- NULL means Global frame
    name TEXT NOT NULL,
    slug TEXT NOT NULL,
    type TEXT NOT NULL DEFAULT 'single' CHECK (type IN ('single', 'multi', 'boomerang')),
    photo_count INTEGER NOT NULL DEFAULT 1 CHECK (photo_count >= 1 AND photo_count <= 3),
    overlay_url TEXT,
    thumbnail_url TEXT,
    width INTEGER NOT NULL DEFAULT 1080,
    height INTEGER NOT NULL DEFAULT 1440,
    sort_order INTEGER NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT true,
    version INTEGER NOT NULL DEFAULT 1,
    accent TEXT,
    subtitle TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 7. FRAME_SLOTS TABLE (Positions of camera photos on the 1080x1440 canvas)
CREATE TABLE IF NOT EXISTS public.frame_slots (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    frame_id UUID NOT NULL REFERENCES public.frames(id) ON DELETE CASCADE,
    slot_number INTEGER NOT NULL,
    x NUMERIC NOT NULL DEFAULT 0,
    y NUMERIC NOT NULL DEFAULT 0,
    width NUMERIC NOT NULL DEFAULT 1080,
    height NUMERIC NOT NULL DEFAULT 1440,
    rotation NUMERIC NOT NULL DEFAULT 0,
    border_radius NUMERIC NOT NULL DEFAULT 12,
    object_fit TEXT NOT NULL DEFAULT 'cover',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(frame_id, slot_number)
);

-- 8. SUBMISSIONS TABLE
CREATE TABLE IF NOT EXISTS public.submissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID REFERENCES public.events(id) ON DELETE CASCADE,
    guest_name TEXT NOT NULL DEFAULT 'Tamu Istimewa',
    guest_message TEXT,
    media_type TEXT NOT NULL CHECK (media_type IN ('photo', 'multi-photo', 'boomerang')),
    frame_id UUID REFERENCES public.frames(id) ON DELETE SET NULL,
    frame_name TEXT,
    frame_snapshot_config JSONB,
    upload_status TEXT NOT NULL DEFAULT 'completed' CHECK (upload_status IN ('pending', 'uploading', 'completed', 'failed')),
    likes INTEGER NOT NULL DEFAULT 0,
    is_favorite BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 9. SUBMISSION_MEDIA TABLE
CREATE TABLE IF NOT EXISTS public.submission_media (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    submission_id UUID NOT NULL REFERENCES public.submissions(id) ON DELETE CASCADE,
    media_type TEXT NOT NULL CHECK (media_type IN ('photo', 'video')),
    file_url TEXT NOT NULL,
    thumbnail_url TEXT,
    duration NUMERIC,
    upload_status TEXT NOT NULL DEFAULT 'completed' CHECK (upload_status IN ('pending', 'uploading', 'completed', 'failed')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 10. VOICE_NOTES TABLE
CREATE TABLE IF NOT EXISTS public.voice_notes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    submission_id UUID NOT NULL REFERENCES public.submissions(id) ON DELETE CASCADE UNIQUE,
    file_url TEXT NOT NULL,
    duration NUMERIC NOT NULL DEFAULT 15,
    mime_type TEXT NOT NULL DEFAULT 'audio/webm',
    upload_status TEXT NOT NULL DEFAULT 'completed' CHECK (upload_status IN ('pending', 'uploading', 'completed', 'failed')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 11. APP_SETTINGS TABLE
CREATE TABLE IF NOT EXISTS public.app_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    key TEXT UNIQUE NOT NULL,
    value JSONB NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Atomically create the linked submission, media, and optional voice-note rows.
CREATE OR REPLACE FUNCTION public.create_public_submission(
    p_submission_id UUID,
    p_event_id UUID,
    p_guest_name TEXT,
    p_guest_message TEXT,
    p_media_type TEXT,
    p_frame_id UUID,
    p_frame_name TEXT,
    p_frame_snapshot_config JSONB,
    p_media_path TEXT,
    p_thumbnail_path TEXT,
    p_media_duration NUMERIC,
    p_voice_path TEXT DEFAULT NULL,
    p_voice_duration NUMERIC DEFAULT NULL,
    p_voice_mime_type TEXT DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, pg_temp
AS $$
DECLARE
    expected_prefix TEXT;
BEGIN
    IF p_submission_id IS NULL OR p_event_id IS NULL THEN
        RAISE EXCEPTION 'Submission ID and event ID are required.' USING ERRCODE = '22023';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM public.events e
        WHERE e.id = p_event_id AND e.status = 'active'
    ) THEN
        RAISE EXCEPTION 'Event is not active or does not exist.' USING ERRCODE = '22023';
    END IF;

    IF p_guest_name IS NULL OR char_length(btrim(p_guest_name)) NOT BETWEEN 1 AND 40 THEN
        RAISE EXCEPTION 'Guest name must contain 1 to 40 characters.' USING ERRCODE = '22023';
    END IF;
    IF p_guest_message IS NOT NULL AND char_length(p_guest_message) > 200 THEN
        RAISE EXCEPTION 'Guest message must not exceed 200 characters.' USING ERRCODE = '22023';
    END IF;
    IF p_media_type IS NULL OR p_media_type NOT IN ('photo', 'multi-photo', 'boomerang') THEN
        RAISE EXCEPTION 'Unsupported submission media type.' USING ERRCODE = '22023';
    END IF;

    expected_prefix := p_event_id::TEXT || '/' || p_submission_id::TEXT || '/';
    IF p_media_path IS NULL OR left(p_media_path, char_length(expected_prefix)) <> expected_prefix
       OR split_part(p_media_path, '/', 3) !~ '^(photo\.jpg|boomerang\.(mp4|webm))$'
       OR NOT EXISTS (
           SELECT 1 FROM storage.objects o
           WHERE o.bucket_id = 'submissions' AND o.name = p_media_path
       ) THEN
        RAISE EXCEPTION 'Uploaded submission media was not found in the expected storage path.' USING ERRCODE = '22023';
    END IF;

    IF p_thumbnail_path IS NULL
       OR left(p_thumbnail_path, char_length(expected_prefix)) <> expected_prefix
       OR split_part(p_thumbnail_path, '/', 3) !~ '^(thumb\.jpg|photo\.jpg|boomerang\.(mp4|webm))$'
       OR NOT EXISTS (
           SELECT 1 FROM storage.objects o
           WHERE o.bucket_id = 'submissions' AND o.name = p_thumbnail_path
       ) THEN
        RAISE EXCEPTION 'Uploaded submission thumbnail was not found in the expected storage path.' USING ERRCODE = '22023';
    END IF;

    IF p_voice_path IS NOT NULL AND (
        left(p_voice_path, char_length(expected_prefix)) <> expected_prefix
        OR split_part(p_voice_path, '/', 3) !~ '^voice\.[a-z0-9]+$'
        OR p_voice_duration IS NULL
        OR p_voice_duration NOT BETWEEN 1 AND 60
        OR p_voice_mime_type IS NULL
        OR p_voice_mime_type NOT LIKE 'audio/%'
        OR NOT EXISTS (
            SELECT 1 FROM storage.objects o
            WHERE o.bucket_id = 'submissions' AND o.name = p_voice_path
        )
    ) THEN
        RAISE EXCEPTION 'Uploaded voice note is invalid or was not found.' USING ERRCODE = '22023';
    END IF;

    INSERT INTO public.submissions (
        id, event_id, guest_name, guest_message, media_type, frame_id,
        frame_name, frame_snapshot_config, upload_status, likes
    ) VALUES (
        p_submission_id, p_event_id, btrim(p_guest_name), p_guest_message, p_media_type, p_frame_id,
        p_frame_name, p_frame_snapshot_config, 'completed', 1
    );

    INSERT INTO public.submission_media (
        submission_id, media_type, file_url, thumbnail_url, duration, upload_status
    ) VALUES (
        p_submission_id,
        CASE WHEN p_media_type = 'boomerang' THEN 'video' ELSE 'photo' END,
        p_media_path,
        p_thumbnail_path,
        p_media_duration,
        'completed'
    );

    IF p_voice_path IS NOT NULL THEN
        INSERT INTO public.voice_notes (
            submission_id, file_url, duration, mime_type, upload_status
        ) VALUES (
            p_submission_id, p_voice_path, p_voice_duration, p_voice_mime_type, 'completed'
        );
    END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.create_public_submission(
    UUID, UUID, TEXT, TEXT, TEXT, UUID, TEXT, JSONB, TEXT, TEXT, NUMERIC, TEXT, NUMERIC, TEXT
) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_public_submission(
    UUID, UUID, TEXT, TEXT, TEXT, UUID, TEXT, JSONB, TEXT, TEXT, NUMERIC, TEXT, NUMERIC, TEXT
) TO anon, authenticated;

-- ==============================================================================
-- 12. INDEXES FOR HIGH-PERFORMANCE QUERIES
-- ==============================================================================
CREATE INDEX IF NOT EXISTS idx_events_slug ON public.events(slug);
CREATE INDEX IF NOT EXISTS idx_events_status ON public.events(status);
CREATE INDEX IF NOT EXISTS idx_frames_event_active ON public.frames(event_id, is_active, sort_order);
CREATE INDEX IF NOT EXISTS idx_frame_slots_frame_id ON public.frame_slots(frame_id);
CREATE INDEX IF NOT EXISTS idx_submissions_event_created ON public.submissions(event_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_submissions_status ON public.submissions(upload_status);
CREATE INDEX IF NOT EXISTS idx_submission_media_sub_id ON public.submission_media(submission_id);
CREATE INDEX IF NOT EXISTS idx_voice_notes_sub_id ON public.voice_notes(submission_id);

-- ==============================================================================
-- 13. ROW LEVEL SECURITY (RLS) POLICIES
-- ==============================================================================
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.frames ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.frame_slots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.submission_media ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.voice_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;

-- Helper function: Check if current auth user has admin role
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.profiles
        WHERE user_id = auth.uid() AND role IN ('admin', 'super_admin')
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- PROFILES POLICIES
DROP POLICY IF EXISTS "Admins can view profiles" ON public.profiles;
CREATE POLICY "Admins can view profiles" ON public.profiles
    FOR SELECT TO authenticated USING (auth.uid() = user_id OR public.is_admin());

DROP POLICY IF EXISTS "Admins can update profiles" ON public.profiles;
CREATE POLICY "Admins can update profiles" ON public.profiles
    FOR UPDATE TO authenticated USING (auth.uid() = user_id OR public.is_admin());

-- EVENTS POLICIES
-- Public: Read active events
DROP POLICY IF EXISTS "Public can view active events" ON public.events;
CREATE POLICY "Public can view active events" ON public.events
    FOR SELECT TO anon, authenticated USING (status = 'active' OR public.is_admin());

-- Admin: Full access to events
DROP POLICY IF EXISTS "Admin full access on events" ON public.events;
CREATE POLICY "Admin full access on events" ON public.events
    FOR ALL TO authenticated USING (public.is_admin());

-- EVENT SETTINGS POLICIES
DROP POLICY IF EXISTS "Public can view event settings" ON public.event_settings;
CREATE POLICY "Public can view event settings" ON public.event_settings
    FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "Admin full access on event settings" ON public.event_settings;
CREATE POLICY "Admin full access on event settings" ON public.event_settings
    FOR ALL TO authenticated USING (public.is_admin());

-- FRAMES POLICIES
DROP POLICY IF EXISTS "Public can view active frames" ON public.frames;
CREATE POLICY "Public can view active frames" ON public.frames
    FOR SELECT TO anon, authenticated USING (is_active = true OR public.is_admin());

DROP POLICY IF EXISTS "Admin full access on frames" ON public.frames;
CREATE POLICY "Admin full access on frames" ON public.frames
    FOR ALL TO authenticated USING (public.is_admin());

-- FRAME SLOTS POLICIES
DROP POLICY IF EXISTS "Public can view frame slots" ON public.frame_slots;
CREATE POLICY "Public can view frame slots" ON public.frame_slots
    FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "Admin full access on frame slots" ON public.frame_slots;
CREATE POLICY "Admin full access on frame slots" ON public.frame_slots
    FOR ALL TO authenticated USING (public.is_admin());

-- SUBMISSIONS POLICIES
DROP POLICY IF EXISTS "Public can view completed submissions" ON public.submissions;
CREATE POLICY "Public can view completed submissions" ON public.submissions
    FOR SELECT TO anon, authenticated USING (
        (
            upload_status = 'completed'
            AND EXISTS (
                SELECT 1 FROM public.events e
                WHERE e.id = submissions.event_id AND e.status = 'active'
            )
        )
        OR public.is_admin()
    );

DROP POLICY IF EXISTS "Public can insert submissions" ON public.submissions;

DROP POLICY IF EXISTS "Admin full access on submissions" ON public.submissions;
CREATE POLICY "Admin full access on submissions" ON public.submissions
    FOR ALL TO authenticated USING (public.is_admin());

-- SUBMISSION MEDIA POLICIES
DROP POLICY IF EXISTS "Public can view submission media" ON public.submission_media;
CREATE POLICY "Public can view submission media" ON public.submission_media
    FOR SELECT TO anon, authenticated USING (
        EXISTS (
            SELECT 1
            FROM public.submissions s
            JOIN public.events e ON e.id = s.event_id
            WHERE s.id = submission_media.submission_id
              AND s.upload_status = 'completed'
              AND e.status = 'active'
        )
        OR public.is_admin()
    );

DROP POLICY IF EXISTS "Public can insert submission media" ON public.submission_media;

DROP POLICY IF EXISTS "Admin full access on submission media" ON public.submission_media;
CREATE POLICY "Admin full access on submission media" ON public.submission_media
    FOR ALL TO authenticated USING (public.is_admin());

-- VOICE NOTES POLICIES
DROP POLICY IF EXISTS "Public can view voice notes" ON public.voice_notes;
CREATE POLICY "Public can view voice notes" ON public.voice_notes
    FOR SELECT TO anon, authenticated USING (
        EXISTS (
            SELECT 1
            FROM public.submissions s
            JOIN public.events e ON e.id = s.event_id
            WHERE s.id = voice_notes.submission_id
              AND s.upload_status = 'completed'
              AND e.status = 'active'
        )
        OR public.is_admin()
    );

DROP POLICY IF EXISTS "Public can insert voice notes" ON public.voice_notes;

DROP POLICY IF EXISTS "Admin full access on voice notes" ON public.voice_notes;
CREATE POLICY "Admin full access on voice notes" ON public.voice_notes
    FOR ALL TO authenticated USING (public.is_admin());

-- APP SETTINGS POLICIES
DROP POLICY IF EXISTS "Public read app settings" ON public.app_settings;
CREATE POLICY "Public read app settings" ON public.app_settings
    FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "Admin full access on app settings" ON public.app_settings;
CREATE POLICY "Admin full access on app settings" ON public.app_settings
    FOR ALL TO authenticated USING (public.is_admin());

-- ==============================================================================
-- 14. SUPABASE STORAGE BUCKET CONFIGURATION (Run in Supabase SQL editor)
-- ==============================================================================
INSERT INTO storage.buckets (id, name, public)
VALUES 
    ('frames', 'frames', true),
    ('events', 'events', true),
    ('submissions', 'submissions', true),
    ('voices', 'voices', true)
ON CONFLICT (id) DO NOTHING;

-- Storage RLS: Public reads, with public submission uploads scoped to active events.
DROP POLICY IF EXISTS "Public can read storage objects" ON storage.objects;
CREATE POLICY "Public can read storage objects" ON storage.objects
    FOR SELECT TO anon, authenticated
    USING (bucket_id IN ('frames', 'events', 'submissions', 'voices'));

DROP POLICY IF EXISTS "Public upload submissions and voices" ON storage.objects;
CREATE POLICY "Public upload submissions and voices" ON storage.objects
    FOR INSERT TO anon, authenticated
    WITH CHECK (
        bucket_id = 'submissions'
        AND cardinality(string_to_array(name, '/')) = 3
        AND split_part(name, '/', 1) ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
        AND split_part(name, '/', 2) ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
        AND split_part(name, '/', 3) ~ '^(photo\.jpg|boomerang\.(mp4|webm)|thumb\.jpg|photo-[1-3]\.jpg|voice\.[a-z0-9]+)$'
        AND EXISTS (
            SELECT 1 FROM public.events e
            WHERE e.id::TEXT = split_part(name, '/', 1) AND e.status = 'active'
        )
    );

DROP POLICY IF EXISTS "Admin manage all storage objects" ON storage.objects;
CREATE POLICY "Admin manage all storage objects" ON storage.objects
    FOR ALL TO authenticated
    USING (bucket_id IN ('frames', 'events', 'submissions', 'voices'));

-- ==============================================================================
-- 15. SEED INITIAL DATA (Default Wedding Event, Settings & Frames with Slots)
-- ==============================================================================

-- Insert default event: Nela & Fadli
INSERT INTO public.events (id, name, slug, description, event_date, location, status)
VALUES (
    'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
    'Nela & Fadli',
    'nela-fadli',
    'Pernikahan Nela & Fadli — The Glass House Grand Ballroom, Jakarta',
    '2026-12-27',
    'The Glass House Grand Ballroom, Jakarta',
    'active'
) ON CONFLICT (id) DO NOTHING;

-- Insert default event settings
INSERT INTO public.event_settings (
    event_id,
    welcome_title,
    welcome_subtitle,
    couple_name,
    primary_color,
    secondary_color,
    allow_photo,
    allow_boomerang,
    allow_multi_photo,
    allow_voice,
    max_voice_duration,
    gallery_enabled,
    download_enabled,
    share_enabled
) VALUES (
    'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
    'The Wedding Of',
    'Abadikan momenmu bersama kami',
    'Nela & Fadli',
    '#5c4033',
    '#7a5845',
    true,
    true,
    true,
    true,
    30,
    true,
    true,
    true
) ON CONFLICT (event_id) DO NOTHING;

-- Seed Default Frames
-- Frame 1: Minimal Elegant (Single)
INSERT INTO public.frames (id, event_id, name, slug, type, photo_count, sort_order, is_active, accent, subtitle)
VALUES (
    'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a01',
    NULL, -- Global
    'Minimal Elegant',
    'minimal-elegant',
    'single',
    1,
    1,
    true,
    'Gold & Fine Lines',
    'Garis ganda emas minimalis dengan tipografi klasik'
) ON CONFLICT (id) DO NOTHING;

INSERT INTO public.frame_slots (frame_id, slot_number, x, y, width, height, border_radius)
VALUES (
    'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a01',
    1,
    72,
    72,
    936,
    1080,
    16
) ON CONFLICT (frame_id, slot_number) DO NOTHING;

-- Frame 2: Botanical Romance (Single)
INSERT INTO public.frames (id, event_id, name, slug, type, photo_count, sort_order, is_active, accent, subtitle)
VALUES (
    'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a02',
    NULL,
    'Botanical Romance',
    'botanical-romance',
    'single',
    1,
    2,
    true,
    'Floral & Eucalyptus',
    'Ilustrasi daun eucalyptus & ranting lembut'
) ON CONFLICT (id) DO NOTHING;

INSERT INTO public.frame_slots (frame_id, slot_number, x, y, width, height, border_radius)
VALUES (
    'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a02',
    1,
    72,
    72,
    936,
    1080,
    16
) ON CONFLICT (frame_id, slot_number) DO NOTHING;

-- Frame 3: Luxury Warm Brown (Single)
INSERT INTO public.frames (id, event_id, name, slug, type, photo_count, sort_order, is_active, accent, subtitle)
VALUES (
    'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a03',
    NULL,
    'Luxury Warm Brown',
    'luxury-warm-brown',
    'single',
    1,
    3,
    true,
    'Antique Monogram',
    'Ornamen sudut mewah khas undangan bangsawan'
) ON CONFLICT (id) DO NOTHING;

INSERT INTO public.frame_slots (frame_id, slot_number, x, y, width, height, border_radius)
VALUES (
    'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a03',
    1,
    72,
    72,
    936,
    1080,
    16
) ON CONFLICT (frame_id, slot_number) DO NOTHING;

-- Frame 4: Three Moments — Trio Classic (Multi: 3 photos: 1 top, 2 bottom)
INSERT INTO public.frames (id, event_id, name, slug, type, photo_count, sort_order, is_active, accent, subtitle)
VALUES (
    'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a04',
    NULL,
    'Three Moments',
    'three-moments',
    'multi',
    3,
    4,
    true,
    '3 Foto (Trio Classic)',
    'Kolase 3 foto spesial: 1 foto utama atas + 2 foto bawah'
) ON CONFLICT (id) DO NOTHING;

INSERT INTO public.frame_slots (frame_id, slot_number, x, y, width, height, border_radius)
VALUES 
    ('b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a04', 1, 72, 64, 936, 560, 12),
    ('b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a04', 2, 72, 644, 456, 576, 12),
    ('b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a04', 3, 552, 644, 456, 576, 12)
ON CONFLICT (frame_id, slot_number) DO NOTHING;

-- Frame 5: Modern Editorial (Single)
INSERT INTO public.frames (id, event_id, name, slug, type, photo_count, sort_order, is_active, accent, subtitle)
VALUES (
    'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a05',
    NULL,
    'Modern Editorial',
    'modern-editorial',
    'single',
    1,
    5,
    true,
    'Clean Editorial',
    'Desain majalah kontemporer dengan stempel tanggal'
) ON CONFLICT (id) DO NOTHING;

INSERT INTO public.frame_slots (frame_id, slot_number, x, y, width, height, border_radius)
VALUES (
    'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a05',
    1,
    72,
    72,
    936,
    1080,
    16
) ON CONFLICT (frame_id, slot_number) DO NOTHING;

-- Frame 6: Trio Photostrip (Multi: 3 horizontal stacked photo slots)
INSERT INTO public.frames (id, event_id, name, slug, type, photo_count, sort_order, is_active, accent, subtitle)
VALUES (
    'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a06',
    NULL,
    'Trio Photostrip',
    'trio-photostrip',
    'multi',
    3,
    6,
    true,
    '3 Foto (Photostrip)',
    'Strip photobooth 3 foto vertikal memanjang bernuansa klasik'
) ON CONFLICT (id) DO NOTHING;

INSERT INTO public.frame_slots (frame_id, slot_number, x, y, width, height, border_radius)
VALUES 
    ('b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a06', 1, 108, 64, 864, 366, 10),
    ('b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a06', 2, 108, 450, 864, 366, 10),
    ('b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a06', 3, 108, 836, 864, 366, 10)
ON CONFLICT (frame_id, slot_number) DO NOTHING;

-- Frame 7: Trio Asymmetric (Multi: 1 tall left + 2 stacked right)
INSERT INTO public.frames (id, event_id, name, slug, type, photo_count, sort_order, is_active, accent, subtitle)
VALUES (
    'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a07',
    NULL,
    'Trio Asymmetric',
    'trio-asymmetric',
    'multi',
    3,
    7,
    true,
    '3 Foto (Asymmetric)',
    'Kolase modern: 1 foto tinggi di kiri + 2 foto di kanan'
) ON CONFLICT (id) DO NOTHING;

INSERT INTO public.frame_slots (frame_id, slot_number, x, y, width, height, border_radius)
VALUES 
    ('b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a07', 1, 72, 64, 456, 1148, 12),
    ('b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a07', 2, 552, 64, 456, 564, 12),
    ('b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a07', 3, 552, 648, 456, 564, 12)
ON CONFLICT (frame_id, slot_number) DO NOTHING;
