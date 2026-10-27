BEGIN;

CREATE TABLE public.app_setup_tokens (
    token_hash char(64) PRIMARY KEY,
    profile_id uuid NOT NULL REFERENCES public.app_users(profile_id) ON DELETE CASCADE,
    created_at timestamptz NOT NULL DEFAULT now(),
    expires_at timestamptz NOT NULL,
    consumed_at timestamptz,
    CONSTRAINT app_setup_tokens_expiry_check CHECK (expires_at > created_at)
);

CREATE INDEX app_setup_tokens_profile_id_idx
    ON public.app_setup_tokens (profile_id);

COMMIT;
