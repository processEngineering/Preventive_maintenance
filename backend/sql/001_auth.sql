BEGIN;

CREATE TABLE public.app_users (
    profile_id uuid PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
    email text NOT NULL,
    email_normalized text GENERATED ALWAYS AS (lower(btrim(email))) STORED,
    password_hash text,
    email_verified_at timestamptz,
    created_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT app_users_email_not_blank CHECK (length(btrim(email)) > 0)
);

CREATE UNIQUE INDEX app_users_email_normalized_unique
    ON public.app_users (email_normalized);

CREATE TABLE public.app_sessions (
    token_hash char(64) PRIMARY KEY,
    profile_id uuid NOT NULL REFERENCES public.app_users(profile_id) ON DELETE CASCADE,
    created_at timestamptz NOT NULL DEFAULT now(),
    expires_at timestamptz NOT NULL
);

CREATE INDEX app_sessions_expires_at_idx ON public.app_sessions (expires_at);

COMMIT;
