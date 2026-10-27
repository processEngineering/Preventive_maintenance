# MTC API authentication prototype

This is a Node.js prototype for PostgreSQL-backed registration, email verification,
login/session design, and one-time password setup. For this test package, it serves
a limited test page and password-setup page from the sibling `public` folder.
Supabase-backed application pages are deliberately excluded. This is not a completed
application migration.

## Requirements

- Node.js 20 or later
- Network access from this machine to the PostgreSQL test database
- The restricted `mtc_api_auth_test` PostgreSQL role described below

Do not use a PostgreSQL superuser. Do not commit database credentials or place them
in this repository.

## Unit-test locally

From this directory:

```powershell
npm.cmd ci
npm.cmd test
```

The tests use a stub database client and do not connect to PostgreSQL.

## Run on PE-SERVER2

Extract the complete test package so `backend` and `public` are sibling folders.
It contains only a test notice and the password-setup page; it does not contain the
existing Supabase-backed app pages. Open PowerShell on PE-SERVER2 and run the
following from the `backend` folder:

```powershell
npm.cmd ci
npm.cmd test

$env:PGHOST = '127.0.0.1'
$env:PGPORT = '5432'
$env:PGDATABASE = 'mtc_migration_test2'
$env:PGUSER = 'mtc_api_auth_test'
$securePassword = Read-Host 'Test-only PostgreSQL password' -AsSecureString
$passwordPointer = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($securePassword)
try {
    $env:PGPASSWORD = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($passwordPointer)
} finally {
    [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($passwordPointer)
}

npm.cmd start
```

Use only the limited `mtc_api_auth_test` role; never use a superuser for the API.
If PostgreSQL is not listening on `127.0.0.1:5432`, use the approved host and port
for the test instance. The app refuses to start if `PGDATABASE` is not exactly
`mtc_migration_test2`.
The API listens on `127.0.0.1` by default. Keep it bound to this loopback address:
the ngrok agent running on PE-SERVER2 can forward to
`http://127.0.0.1:3000` without exposing the API on the company network interface.
Do not set `API_HOST` to `0.0.0.0`, create a firewall rule, or forward PostgreSQL.

For registration and verification email, configure `PUBLIC_APP_ORIGIN` as the
externally reachable HTTPS origin that serves both the app pages and API, and set
`GMAIL_ADDRESS` and `GMAIL_APP_PASSWORD` using the approved secret-management
process. Do not put an ngrok address in source code; if it changes, update the
environment value before sending links. Registration returns `503` until all
three values are configured. The origin must be an origin only (no path or query).

While `npm.cmd start` is running, open this address in a browser on PE-SERVER2:

```text
http://127.0.0.1:3000/
```

The page should say that this test site does not include the Supabase-backed app.
The password-setup page is at `/auth/setup-password.html`. The API and test pages
share the same address. To check the database from a second
PowerShell window, run `Invoke-RestMethod http://127.0.0.1:3000/readyz`; expect
`status: ready` and `database: connected`. A `503` means the API cannot complete
its database query; check the local API log and confirm the test role, database
name, host, port, and permissions. Do not paste credentials or personal data into
chat. Stop the API with Ctrl+C, then clear its environment variables:

```powershell
'PGHOST', 'PGPORT', 'PGDATABASE', 'PGUSER', 'PGPASSWORD' | ForEach-Object {
    Remove-Item "Env:$_" -ErrorAction SilentlyContinue
}
Remove-Variable securePassword, passwordPointer -ErrorAction SilentlyContinue
```

## Endpoints

- `GET /healthz` checks that the process is running.
- `GET /readyz` runs only `SELECT 1 FROM public.profiles LIMIT 1` and returns
  `{"status":"ready","database":"connected"}` on success. It returns a generic
  `503` response on connection/query failure and does not return database details.
- `GET /` and other frontend paths serve files from the sibling `public` folder.
  The test package includes only a test notice and password-setup page, not the
  existing Supabase-backed application. Directory listings and file-write routes
  are not provided.
- `POST /api/auth/login` checks a pre-provisioned, email-verified account and creates
  a seven-day server-side session. Passwords are verified using Node.js scrypt.
- `POST /api/auth/register` creates a profile and auth record in one transaction,
  then emails a one-time 24-hour verification link. Public registration permits all
  current roles except `ADMIN`; the backend enforces this independently of the UI.
- `POST /api/auth/resend-verification` sends a new link for an unverified account
  without disclosing whether an email address is registered.
- `POST /api/auth/verify-email` consumes the single-use token and marks the email
  verified. The token is stored as a SHA-256 hash and passed to the verification
  page in the URL fragment, not sent in the initial page request.
- `POST /api/auth/setup-password` redeems a one-time 24-hour token, sets a password,
  marks the account email verified, and creates a session in one database operation.
- `GET /api/auth/me` checks the session cookie and returns the signed-in profile.
- `POST /api/auth/logout` revokes the server-side session and clears the cookie.
- `backend/scripts/send-password-setup.js` supports a one-account pilot with
  `--check-test` (verifies the test setup without creating tokens or sending email),
  `--send-test`, and a separately guarded 22-account send with `--send-all`.
  Neither mode is ready to run until the HTTPS route and a separate,
  least-privilege provisioning role have been configured and tested.
- The `--check-test` preflight does not require an active ngrok address. It only
  verifies the configured SMTP account and checks the private mapping against the
  test database; it creates no users, tokens, sessions, or emails.

Login uses an `HttpOnly`, `Secure`, `SameSite=Lax` cookie. Only a hash of the random
session token is stored in PostgreSQL. The `jabatan` value is returned as profile
information; it does not grant different API permissions.

## Authentication prototype limitations

- The schema in `sql/001_auth.sql` has been applied once to `mtc_migration_test2` on
  PE-SERVER2. Do not run it again there; it is not an idempotent migration.
- Existing Supabase user IDs and emails have not been imported. Keep any account
  export private; do not put it in the repository or send it in chat.
- The department Gmail sender has not been configured. Never paste its App Password
  into chat, source code, a frontend setting, or the repository.
- The setup-token schema in `sql/002_setup_tokens.sql` has been applied to
  `mtc_migration_test2`. The `mtc_api_auth_test` role has been granted the
  required setup-token and account-column permissions. No setup-token data exists.
- The email-verification schema in `sql/003_email_verification.sql` has not been
  applied. Apply it only to the test database with an administrator-controlled
  session, then grant the runtime role `INSERT` on `profiles`, `INSERT` on
  `app_users`, `UPDATE (email_verified_at)` on `app_users`, and `SELECT`, `INSERT`,
  `UPDATE`, and `DELETE` on `app_email_verification_tokens`. Do not apply it to
  production. The runtime role also needs its existing login/session privileges.
- The limited test pages are served by the same Node.js process as the API; the
  existing Supabase-backed application pages are deliberately excluded. External
  HTTPS access has not yet been tested. The user selected the company-approved
  ngrok tunnel on PE-SERVER2 for a brief test. If used, point it only at port 3000
  and keep it open only during the approved test.
- The setup page calls `/api/auth/setup-password` using a relative URL. If the page
  is opened through the ngrok HTTPS address, the API request automatically goes to
  that same address; no separate frontend API URL or cross-origin cookie setting is
  needed. Any setup email must link to that HTTPS address, not the HTTP LAN address.
  The 24-hour setup link will only work while the same ngrok address is active.
- No actual setup email has been sent, and no real account has been provisioned.
- The temporary provisioning role for creating `app_users` records and setup tokens
  has been created on `mtc_migration_test2`. A pilot provisioning attempt failed
  with `permission denied for table app_users` before email delivery. The script
  now serializes provisioning with a transaction-scoped advisory lock instead of
  `SELECT ... FOR UPDATE`, avoiding the additional `UPDATE` privilege that row
  locking requires. Do not retry until this updated package has been copied to
  PE-SERVER2, tested there, and the pilot state has been checked. The mass-send
  mode additionally requires `CONFIRM_SEND_ALL=22`; the pilot mode accepts exactly
  one recipient and requires a matching `SETUP_TEST_EMAIL`.
- The one-account pilot must use an authorized test profile and an email account
  controlled by the tester. Keep its `{profile_id,email}` input file private on
  PE-SERVER2. The script refuses to run unless the selected profile has no existing
  `app_users` row and the database is `mtc_migration_test2`.
- Password reset, login/registration rate limiting, and operational-feature
  authorization are not implemented. Registration can create every current
  non-`ADMIN` role; the application must not treat the profile's `jabatan` value as
  authorization for protected operations.
- The sign-in and sign-up pages use the PostgreSQL API, but the rest of the
  application data layer and password-reset pages still use Supabase. The pages in
  this test package intentionally exclude the full app, so this is not yet a
  complete Supabase removal or production-ready deployment.
- Do not open an ngrok tunnel or expose this prototype externally except for the
  brief approved test. Keep the API bound to loopback and forward only to port 3000.

## Test-database schema and runtime account

The one-time schema migration was applied to `mtc_migration_test2` using an
administrator-controlled session. It created empty `app_users` and `app_sessions`
tables; no profile or checklist rows were changed. It must not be applied to
production.

The existing `mtc_api_connectivity` role remains read-only. The separate
`mtc_api_auth_test` runtime role has been created for the prototype and granted only:

- `CONNECT` on `mtc_migration_test2`
- `USAGE` on schema `public`
- `SELECT` on `profiles` and `app_users`
- `SELECT`, `INSERT`, and `DELETE` on `app_sessions`

The setup-token migration has been applied to `mtc_migration_test2`, and the
runtime role has been granted only the additional permissions needed to read setup
tokens, update `consumed_at`, update `password_hash` and `email_verified_at`, and
insert sessions. These permissions were checked with zero-row updates; no user data
was changed. The separate setup-email script needs a different, temporary provisioning role
that can verify profiles, create `app_users` entries, and create/delete setup tokens.
Do not use a PostgreSQL superuser for either role or put its credentials in source
control. Do not apply either migration to production.

Do not grant the API role table ownership, schema creation, or access to production.
Do not put credentials in this repository.
