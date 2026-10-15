BEGIN;

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
    IF p_media_path IS NULL
       OR left(p_media_path, char_length(expected_prefix)) <> expected_prefix
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

DROP POLICY IF EXISTS "Public can insert submissions" ON public.submissions;
DROP POLICY IF EXISTS "Public can insert submission media" ON public.submission_media;
DROP POLICY IF EXISTS "Public can insert voice notes" ON public.voice_notes;

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

COMMIT;
