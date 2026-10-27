BEGIN;

CREATE TABLE public.app_signature_files (
    bucket text NOT NULL,
    object_key text NOT NULL,
    profile_id uuid NOT NULL REFERENCES public.app_users(profile_id) ON DELETE CASCADE,
    content_type text NOT NULL CHECK (content_type = 'image/png'),
    file_data bytea NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    PRIMARY KEY (bucket, object_key)
);

CREATE INDEX app_signature_files_profile_id_idx
    ON public.app_signature_files (profile_id);

COMMIT;
