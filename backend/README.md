# MTC PostgreSQL application migration

This Node.js application provides PostgreSQL-backed registration, email verification,
login/session handling, one-time password setup, and checklist workflows. The
checklist pages in CHSLR, CLHMI, CPLM, JPDO, Kartu Riwayat, LKMR, PMI, PMW, POHM,
PPW, PRSLB, and Grafik use the restricted PostgreSQL data API.

## Requirements

- Node.js 20.6 or later (`npm start` uses Node's `--env-file` option)
- Network access from this machine to the PostgreSQL test or production database
- The restricted `mtc_api_auth_test` PostgreSQL role described below
- PM2 installed globally on PE-SERVER2 for production process management

Do not use a PostgreSQL superuser. Do not commit database credentials or place them
in this repository.

## Unit-test locally

From this directory:

```powershell
npm.cmd ci
npm.cmd test
```

The tests use a stub database client and do not connect to PostgreSQL.

## Run the test deployment on PE-SERVER2

Deploy the complete `backend` and `public` folders as siblings. The checklist pages
load the shared `public/src/api/chslr-api-client.js` adapter and call the backend;
they no longer connect directly to Supabase.
Open PowerShell on PE-SERVER2 and run the following from the
`backend` folder.
The `start` script loads settings from the local `.env` file in this directory and
defaults to test mode.
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
`mtc_migration_test2` or `PGUSER` is not exactly `mtc_api_auth_test`.
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

## Prepare the production deployment with PM2

The production target is database `mtc` and the separate login role is
`mtc_api_runtime`. Do not reuse the test role, a provisioning role, or a PostgreSQL
superuser. The verified source candidate is `mtc_migration_test2`; `mtc` was
confirmed empty on PostgreSQL `127.0.0.1:5432`. Keep the source database unchanged.

### Stage the production data copy

The staging database name selected for this cutover is `mtc_migration_backup`.
Confirm it does not already exist before creating it; do not overwrite or drop an
existing database. Store both dump files in a private, access-controlled location:
they contain checklist and profile data. The source dump excludes login accounts,
sessions, setup/email-verification tokens, and signatures. It retains profiles and
workflow records.

On PE-SERVER2, use the PostgreSQL 16 command-line tools. The following commands
prompt for the PostgreSQL administrator password; do not put passwords in command
arguments or share them:

```powershell
$pgBin = 'C:\Program Files\PostgreSQL\16\bin'
$sourceDump = Join-Path $env:USERPROFILE 'mtc-migration-test2-cutover.dump'
$validatedDump = Join-Path $env:USERPROFILE 'mtc-migration-backup-validated.dump'

& "$pgBin\pg_dump.exe" -h 127.0.0.1 -p 5432 -U postgres -W `
  -Fc -d mtc_migration_test2 `
  --exclude-table-data=public.app_users `
  --exclude-table-data=public.app_sessions `
  --exclude-table-data=public.app_setup_tokens `
  --exclude-table-data=public.app_email_verification_tokens `
  --exclude-table-data=public.app_signature_files `
  -f $sourceDump
if ($LASTEXITCODE -ne 0) { throw 'Source database dump failed; stop here.' }
```

In `psql`, confirm `mtc_migration_backup` is absent before creating it:

```sql
SELECT datname FROM pg_database WHERE datname = 'mtc_migration_backup';
```

Only if that returns zero rows, create the staging database and restore the dump:

```powershell
& "$pgBin\createdb.exe" -h 127.0.0.1 -p 5432 -U postgres -W mtc_migration_backup
if ($LASTEXITCODE -ne 0) { throw 'Staging database creation failed; stop here.' }

& "$pgBin\pg_restore.exe" -h 127.0.0.1 -p 5432 -U postgres -W `
  --no-owner --no-acl --exit-on-error `
  -d mtc_migration_backup $sourceDump
if ($LASTEXITCODE -ne 0) { throw 'Staging restore failed; stop here.' }
```

Verify staging tables and counts before cleanup. The supplied counts showed Oct 28,
2026 test rows in `Lkmr_result`, `chslr_log`, `chslr_result`, `clhmi`,
`clhmi_results`, `clpm_log`, and `kartu_riwayat_items`. Run the dated cleanup only
against the staging database; it has a database-name guard and deletes child rows
before their parents:

```powershell
& "$pgBin\psql.exe" -h 127.0.0.1 -p 5432 -U postgres -W `
  -d mtc_migration_backup -v ON_ERROR_STOP=1 `
  -f .\sql\staging-clean-2026-10-28.sql
if ($LASTEXITCODE -ne 0) { throw 'Staging cleanup failed; stop and inspect staging.' }
```

Review the `DELETE` counts and rerun the read-only row-count/date checks. Confirm no
Oct 28 test rows remain in the identified tables and verify that table totals,
profiles, reference data, and checklist history are otherwise as expected. Keep
`mtc_migration_test2` unchanged. Once staging is approved, make a final dump:

```powershell
& "$pgBin\pg_dump.exe" -h 127.0.0.1 -p 5432 -U postgres -W `
  -Fc -d mtc_migration_backup -f $validatedDump
if ($LASTEXITCODE -ne 0) { throw 'Validated staging dump failed; stop here.' }
```

### Restore the approved staging copy to production

Stop the API and ngrok PM2 apps during the production restore. Confirm the verified
restorable backup of `mtc` is available, and recheck that `mtc` still has no user
tables. Do not use `--clean` or drop/rename either database. Restore only after
reviewing the staging counts and confirming the target is still the expected empty
production database:

```powershell
& "$pgBin\pg_restore.exe" -h 127.0.0.1 -p 5432 -U postgres -W `
  --no-owner --no-acl --exit-on-error `
  -d mtc $validatedDump
if ($LASTEXITCODE -ne 0) { throw 'Production restore failed; stop and inspect.' }
```

Verify production table names and row counts against the approved staging results
before applying runtime grants or starting the API. The source login account and
signature files were excluded; provision approved production accounts separately.
Sessions and one-time tokens are also excluded. Do not expose the API through ngrok
until the restore, grants, `/readyz`, and approved-account smoke tests succeed.

Have the DBA create the dedicated role and set its password in a private `psql`
session (do not put the password in a SQL file, source control, or chat):

```sql
CREATE ROLE mtc_api_runtime LOGIN NOINHERIT;
\password mtc_api_runtime
```

If that role already exists, inspect it rather than running `CREATE ROLE` again.
Then review and run `sql/production-api-grants.sql` connected to `mtc` as an
authorized grantor. The script refuses to run in any other database and checks
that `mtc_api_runtime` exists, can log in, is not a superuser, uses `NOINHERIT`,
and is not a member of another role:

```powershell
psql -d mtc -v ON_ERROR_STOP=1 -f .\sql\production-api-grants.sql
```

Before starting the production process, create a private `.env` in the deployed
`backend` folder with the actual approved connection and email settings. At minimum:

```dotenv
APP_ENVIRONMENT=production
PGHOST=127.0.0.1
PGPORT=5432
PGDATABASE=mtc
PGUSER=mtc_api_runtime
PGPASSWORD=<set privately; do not use this literal value>
API_HOST=127.0.0.1
API_PORT=3000
PUBLIC_APP_ORIGIN=<approved HTTPS frontend origin>
GMAIL_ADDRESS=<approved sender account>
GMAIL_APP_PASSWORD=<approved secret>
```

Use the approved database host if PostgreSQL is not local. Protect `.env` with
server permissions and confirm it is excluded by `backend/.gitignore`. PM2's
ecosystem file loads it with Node's `--env-file`; production mode additionally
requires the exact database and role above and loopback binding.

Stop any manually started API and ngrok process before launching PM2 to avoid port
or tunnel conflicts. From the deployed `backend` folder, start both managed apps:

```powershell
npm.cmd run pm2:start
npm.cmd run pm2:status
npm.cmd run pm2:logs
```

The `mtc-ngrok` process uses
`C:\Maintenance App\python program\ngrok.exe http --domain=generic-karol-translucently.ngrok-free.dev 3000`;
ngrok credentials and ownership of this reserved domain must already be configured
for the Windows account running PM2. The tunnel forwards only to the API's loopback
listener on port 3000. Because this is a fixed domain, Vercel's `BACKEND_API_ORIGIN`
can remain set to `https://generic-karol-translucently.ngrok-free.dev` across
restarts. Keep the backend's `PUBLIC_APP_ORIGIN` set to the frontend origin.

Verify `http://127.0.0.1:3000/api/version` and `/readyz`, then smoke-test login,
email verification, checklist reads, and submissions against production with
approved accounts before changing the frontend proxy's backend origin. Review
`/readyz` for `status: ready` and `database: connected`; do not share database
credentials or user data in logs or chat. Restart after private `.env` changes with
`npm.cmd run pm2:restart`.

The requested reboot procedure is manual: after PE-SERVER2 reboots, open PowerShell
in the deployed `backend` folder and run `npm.cmd run pm2:start`, then check
`npm.cmd run pm2:status` to confirm both `mtc-api` and `mtc-ngrok` are online. This
configuration does not install a Windows service or Task Scheduler entry and does
not automatically start PM2 after reboot.

## Endpoints

- `GET /healthz` checks that the process is running.
- `GET /api/version` identifies the running API build without querying the database.
  The batch checklist build should return
  `{"service":"mtc-postgres-api","build":"checklist-batch-2026-10-28"}` through Vercel.
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
  checklist data API. It permits only explicitly allowlisted workflow tables,
  parameterized filters, and declared foreign-key selections. Writes are restricted
  by workflow role and field; profile reads are restricted to the signed-in user.
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

## Checklist database privileges

The allowlist and field policies are defined in `backend/api/chslr-api.js`. The
additive grant script at `backend/sql/checklist-api-grants.sql` grants the test API
role only the `SELECT`, column-level `INSERT`/`UPDATE`, `DELETE` (CHSLR results),
`public` schema usage, signature-file `SELECT`/`INSERT`, and generated-sequence
privileges used by those workflows. It refuses to run in any database other than
`mtc_migration_test2`. The script is not run by the application or test suite.

The separate `backend/sql/production-api-grants.sql` is restricted to database
`mtc` and role `mtc_api_runtime`. It includes the corresponding workflow privileges
plus the required authentication, session, verification-token, setup-token, and
signature-file privileges. It also grants schema `extensions` usage because the
PRSLB UUID defaults call `extensions.uuid_generate_v4()`. Review and apply it only
with an authorized production grantor. Do not change the test script's database or
role guard.

Review the script, back up the test database, then run it manually from the
repository root while connected to `mtc_migration_test2` with a database role
authorized to grant these privileges. For example:

```powershell
psql -d mtc_migration_test2 -v ON_ERROR_STOP=1 -f backend/sql/checklist-api-grants.sql
```

The grants do not create or alter tables, sequences, triggers, or row-level security
policies. Some workflow `id` columns were reported without a default in the schema
inventory, while their forms omit `id` on insert. Confirm that each writable table
has a working default or a trigger that generates its ID before testing submissions;
otherwise inserts into that table will fail and require a schema-specific correction.
Do not use `MAX(id) + 1` or broaden the runtime role to work around missing ID
generation.

After applying grants, restart the API from the deployed `backend` folder and check
`/api/version` for `checklist-batch-2026-10-28`. Then smoke-test one read and one
submission per workflow against the test database before considering the migration
complete. The automated test suite uses a stub pool and does not apply or validate
database grants.

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

## Checklist migration

The original CHSLR and CLHMI workflows and the 47 additional checklist and chart
pages now use the same-origin PostgreSQL API instead of the Supabase client.
CHSLR signatures remain stored as PNG bytes in `public.app_signature_files`;
`sql/004_signature_files.sql` describes that table. The frontend adapter preserves
the form query style while routing requests through the backend.

The backend restricts table names and foreign-key selections to explicit mappings,
parameterizes filter values, supports the date and compound filters used by JPDO
and LKMR, and constrains writes by workflow role and permitted columns. It requires
a verified `mtc_session`. The complete test-database grant script and its manual
application instructions are in the Checklist database privileges section above.

## Authentication prototype limitations

- The production database `mtc` was found empty during cutover preparation. The
  approved staging copy includes authentication table definitions but excludes
  source login accounts, sessions, setup/email-verification tokens, and signatures.
  Verify the restored production schema before applying grants; do not separately
  re-run one-time authentication migrations after restoring these definitions.
- Existing Supabase user IDs and emails have not been imported. Keep any account
  export private; do not put it in the repository or send it in chat.
- The department Gmail sender has not been configured. Never paste its App Password
  into chat, source code, a frontend setting, or the repository.
- The setup-token schema in `sql/002_setup_tokens.sql` has been applied to
  `mtc_migration_test2`. The `mtc_api_auth_test` role has been granted the
  required setup-token and account-column permissions. No setup-token data exists.
- Confirm production contains the expected login/session, setup-token,
  email-verification, and signature tables and that intended production accounts
  have been provisioned before sending links or switching live traffic. The grants
  script does not create schema objects or account records.
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
- Public production signup remains enabled by decision. It accepts all current
  non-`ADMIN` roles; anyone who can reach signup may create an operational account.
  Review this exposure before directing public users to the production service.
- Password reset, login/registration rate limiting, and operational-feature
  authorization are not implemented. Registration can create every current
  non-`ADMIN` role; the application must not treat the profile's `jabatan` value as
  authorization for protected operations.
- The sign-in and sign-up pages use the PostgreSQL API, but some application
  features outside the checklist workflows and password-reset pages still use
  Supabase. This is not yet a complete Supabase removal or production-ready
  deployment.
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
was changed. The separate setup-email script needs a different, temporary
provisioning role that can verify profiles, create `app_users` entries, and
create/delete setup tokens. Do not use a PostgreSQL superuser for either role or
put its credentials in source control.

Do not grant the API role table ownership or schema creation. The production grant
script is the only supported source of production API privileges. Do not put
credentials in this repository.
