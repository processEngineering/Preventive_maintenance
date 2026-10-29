BEGIN;

CREATE TABLE public.app_activation_requests (
    token_hash char(64) PRIMARY KEY,
    profile_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    email text NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    expires_at timestamptz NOT NULL,
    consumed_at timestamptz,
    CONSTRAINT app_activation_requests_email_not_blank CHECK (length(btrim(email)) > 0),
    CONSTRAINT app_activation_requests_expiry_check CHECK (expires_at > created_at)
);

CREATE INDEX app_activation_requests_profile_id_idx
    ON public.app_activation_requests (profile_id);

COMMIT;
