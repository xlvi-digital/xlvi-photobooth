BEGIN;

CREATE OR REPLACE FUNCTION public.is_active_submission_event(p_event_id_text TEXT)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = pg_catalog
SET row_security = off
AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.events e
        WHERE e.id::TEXT = p_event_id_text AND e.status = 'active'
    );
$$;

REVOKE ALL ON FUNCTION public.is_active_submission_event(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_active_submission_event(TEXT) TO anon, authenticated;

DROP POLICY IF EXISTS "Public upload submissions and voices" ON storage.objects;
CREATE POLICY "Public upload submissions and voices" ON storage.objects
    FOR INSERT TO anon, authenticated
    WITH CHECK (
        bucket_id = 'submissions'
        AND cardinality(string_to_array(name, '/')) = 3
        AND split_part(name, '/', 1) ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
        AND split_part(name, '/', 2) ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
        AND split_part(name, '/', 3) ~ '^(photo\.jpg|boomerang\.(mp4|webm)|thumb\.jpg|photo-[1-3]\.jpg|voice\.[a-z0-9]+)$'
        AND public.is_active_submission_event(split_part(name, '/', 1))
    );

DROP POLICY IF EXISTS "Admin manage all storage objects" ON storage.objects;
CREATE POLICY "Admin manage all storage objects" ON storage.objects
    FOR ALL TO authenticated
    USING (
        public.is_admin()
        AND bucket_id IN ('frames', 'events', 'submissions', 'voices')
    )
    WITH CHECK (
        public.is_admin()
        AND bucket_id IN ('frames', 'events', 'submissions', 'voices')
    );

COMMIT;
