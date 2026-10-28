# MTC PostgreSQL application migration

This Node.js application provides PostgreSQL-backed registration, email verification,
login/session handling, and one-time password setup. The CHSLR and CLHMI checklist
workflows use the PostgreSQL data API; the rest of the application has not yet been
migrated.

## Requirements

- Node.js 20.6 or later (`npm start` uses Node's `--env-file` option)
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

Deploy the complete `backend` and `public` folders as siblings. The current source
includes the application pages, with CHSLR and CLHMI migrated from Supabase so far.
Open PowerShell on PE-SERVER2 and run the following from the
`backend` folder.
The `start` script loads settings from the local `.env` file in this directory.
Keep that file out of source control and restrict access to it:

```powershell
npm.cmd ci
npm.cmd test

npm.cmd start
```

Start the PostgreSQL Windows service separately before starting the API. Find the
installed service name with `Get-Service *postgres*`, then start the matching
service from an elevated PowerShell session if it is stopped. Do not start a
second PostgreSQL instance or change its network exposure as part of this test.

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

The application and API share the same origin. The password-setup page is at
`/auth/setup-password.html`. To check the database from a second
PowerShell window, run `Invoke-RestMethod http://127.0.0.1:3000/readyz`; expect
`status: ready` and `database: connected`. A `503` means the API cannot complete
its database query; check the local API log and confirm the test role, database
name, host, port, and permissions. Do not paste credentials or personal data into chat. Stop the API with Ctrl+C.
The API reads the private `.env` file only when it starts; no environment cleanup
is needed for values loaded from that file.

```powershell
Get-Service *postgres*
```

## Endpoints

- `GET /healthz` checks that the process is running.
- `GET /api/version` identifies the running API build without querying the database.
  During the CLHMI machine-table rollout it should return
  `{"service":"mtc-postgres-api","build":"clhmi-machine-2026-10-28"}` through Vercel.
- `GET /readyz` runs only `SELECT 1 FROM public.profiles LIMIT 1` and returns
  `{"status":"ready","database":"connected"}` on success. It returns a generic
  `503` response on connection/query failure and does not return database details.
- `GET /` and other frontend paths serve files from the sibling `public` folder.
  Directory listings and file-write routes are not provided.
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
- `GET`, `POST`, `PATCH`, and `DELETE /api/data/{table}` provide the authenticated
  checklist data API. The endpoint permits only the CHSLR and CLHMI tables and
  role-authorized fields; profile reads are restricted to the signed-in user.
- `GET` and `POST /api/storage/signatures/{filename}` read and store authenticated
  PNG signatures in PostgreSQL.
- `backend/scripts/send-password-setup.js` supports a one-account pilot with
  `--check-test` (verifies the test setup without creating tokens or sending email),
  `--send-test`, and a separately guarded 22-account send with `--send-all`.
  Neither mode is ready to run until the HTTPS route and a separate,
  least-privilege provisioning role have been configured and tested.
- The `--check-test` preflight does not require an active ngrok address. It only
  verifies the configured SMTP account and checks the private mapping against the
  test database; it creates no users, tokens, sessions, or emails.

Login uses an `HttpOnly`, `Secure`, `SameSite=Lax` cookie. Only a hash of the random
session token is stored in PostgreSQL. For checklist workflows, `jabatan` gates
which workflow fields an authenticated user may write; it is not used to grant
access to other application APIs.

## Vercel frontend and server API

The frontend can be deployed from the `public` directory as the Vercel project root.
The Node.js API remains on PE-SERVER2 beside PostgreSQL. For temporary testing, run
ngrok separately on that server and forward it to `127.0.0.1:3000`; keep the backend
bound to loopback.

Set the Vercel project environment variable `BACKEND_API_ORIGIN` to the ngrok HTTPS
origin only (for example, `https://example.ngrok-free.app`, with no path). The
`public/vercel.json` rewrite sends same-origin `/api/*` requests to the
`public/api/index.js` Vercel function. That function proxies requests to the
configured backend origin, forwards the browser's session cookie and backend
`Set-Cookie` response, and bypasses ngrok's browser warning. The browser therefore
stays on the Vercel origin; the backend does not need CORS enabled. Redeploy after
changing the Vercel environment variable.

Set the backend's `PUBLIC_APP_ORIGIN` to the exact HTTPS Vercel frontend origin so
verification links open the Vercel app. Keep PostgreSQL credentials only in the
backend's private `.env`; do not add them to Vercel. The tunnel URL is not a permanent
company address and must remain active during testing.

The frontend proxy is not a substitute for approving and securing a production
network route. Use test data and the restricted test database while using a
temporary ngrok URL.

After login, the home, main-menu, and download pages validate the PostgreSQL
session through `/api/auth/me`. They must not use Supabase Auth as the session
source, or a valid PostgreSQL login can be redirected back to sign-in. The service
worker cache version is advanced when these session-routing assets change.

## Checklist migration slices

The CHSLR pelaksana, coordinator, superintendent, and report pages, and the
corresponding CLHMI pages, use the same-origin PostgreSQL API instead of the
Supabase client. CHSLR signatures are stored as PNG bytes in
`public.app_signature_files`; `sql/004_signature_files.sql` describes that table.
Check whether the table already exists before applying the SQL to avoid duplicate
table errors. CLHMI has been wired to the API but still needs to be tested against
the restricted test database.

Before enabling these pages on a database:

1. Confirm all CHSLR and CLHMI table columns and the CLHMI foreign keys
   (`clhmi.machine_id` to `clhmi_machine.id` and
   `clhmi_results.item_id` to `clhmi_items.id`) on the test database.
2. Grant the runtime role `SELECT` on `profiles`, all four CHSLR tables, and
   `clhmi`, `clhmi_machine`, `clhmi_items`, and `clhmi_results`.
3. Grant `INSERT` on `chslr_log`, `chslr_result`, `clhmi`, and `clhmi_results`;
   `DELETE` on `chslr_result`; and `INSERT` and `SELECT` on
   `app_signature_files`. Grant `UPDATE` only on workflow columns: CHSLR log
   approval/operator fields and CLHMI `status_form`, signature, and approval-note
   fields. Grant sequence usage if any inserted IDs use PostgreSQL sequences.
4. Keep the existing restricted database name and loopback binding. Do not apply
   the migration or grants to production without approval.

The API validates identifiers against PostgreSQL metadata, parameterizes filter
values, supports only explicit CLHMI table relations, restricts profile reads to the
current session, and constrains writes by workflow role. It requires a verified
`mtc_session`. Other application pages still use Supabase and are not changed by
these migration slices.

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
- Application pages are served by the same Node.js process as the API. External
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
