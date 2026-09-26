# Sebastian Ladies Golf League — independent app

A standalone Next.js app for Vercel, with Supabase email/password accounts and PostgreSQL storage. Administrators do not need ChatGPT accounts. This package is prepared source code, not an already deployed service. No production credentials or league records are included.

## Included

- Players, seasons, attendance, pairings, scores, history and PDF scorecards.
- Separate administrator logins and password resets.
- One owner who can invite, revoke and restore administrator access.
- Shared league data, server authorization, stale-save protection and save audit records.
- Owner-only import into an empty league and JSON backup export.

All administrators can edit league records. Only the owner manages accounts and imports. This is a single-league app, not a multi-organization service.

## Deploy under your own accounts

1. Create a dedicated project at https://supabase.com and run `supabase/schema.sql` once in its SQL editor. Keep database credentials private.
2. In Supabase Authentication, disable public signups, keep email confirmation enabled, and configure **custom SMTP** for invitations and password resets. The default email sender is restricted and unsuitable for inviting your league administrators in production. Use your email provider's SMTP credentials in Supabase, not in this repository.
3. Put this folder in a private Git repository and import it into your account at https://vercel.com as a Next.js project. Alternatively run `npx vercel` from this folder using your own Vercel login. Select Node 22 or newer. Install command: `pnpm install --frozen-lockfile`; build command: `pnpm build`.
4. Add the five variables from `.env.example` to the Vercel production environment. Copy the Supabase project URL, publishable key and server secret key from your project. Set `APP_URL` to your canonical HTTPS app origin, without a trailing slash. Set `OWNER_EMAIL` to your own email. Never prefix the server secret with `NEXT_PUBLIC_`. Redeploy after setting or changing variables; public variables are embedded during build.
5. In Supabase Auth URL settings, set Site URL to the same `APP_URL` and allow `APP_URL/account` as a redirect URL. If using a custom domain, configure it in Vercel first and use it consistently here and in the environment.
6. Set the Supabase **Invite user** email template link to:
   ```html
   <a href="{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=invite">Accept invitation and set password</a>
   ```
   Set the **Reset password** email template link to:
   ```html
   <a href="{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=recovery">Reset password</a>
   ```
7. From Supabase Authentication's user management, invite the exact `OWNER_EMAIL`. Open that email, set a password of at least 12 characters, then open the league. A verified account matching that address becomes the owner on its first visit. Keep this address and the hosting accounts under the league's control.
8. Open **Administrators** in the app to invite additional administrators. Each accepts their own email invitation and sets their own password. Removing access blocks future league requests even if their login session is still present. Restoring access retains their password.

The Supabase and Vercel ChatGPT connections are optional conveniences for assisted deployment; the running app does not use them. No ChatGPT credentials, APIs, Sites services or Cloudflare D1 database are required at runtime.

## Move the existing league records

Do this at the final cutover, after pausing edits in the original app:

1. Sign in to the original app in your browser. Open:
   https://sebastian-ladies-golf-league.robinsoto.chatgpt.site/api/league
2. Save the complete JSON response as `league-backup.json`. It must contain the full `league` object, not a screenshot or truncated database preview. Keep this file private; it contains player information.
3. Sign in as owner on the new app and open Administrators. Select that file, review the player/round counts, then choose **Import into empty league**. An import will not replace existing players or rounds.
4. Compare players, completed round scores, season settings and PDF scorecards with the original app. Once verified, give administrators the new app URL and resume edits there.

No live data has been moved by this package. The original app remains separate; changes will not synchronize between the two apps. Use the app's JSON export regularly and keep backups somewhere private. The SQL audit records identify who saved each version; they are not complete historical snapshots or a backup restore system.

## Verify before using live records

Use a separate test Supabase project for testing. Confirm an owner and a second administrator can each log in, save a change, print a PDF, reset a password, and sign out. Confirm revocation blocks the second account. Open the same data in two sessions and confirm the second save reports a conflict instead of overwriting the first. Test invitation delivery to an address outside your Supabase project team.

Local checks:

```sh
pnpm install --frozen-lockfile
pnpm typecheck
pnpm test
pnpm build
```

The test suite executes the actual SQL schema in isolated PostgreSQL (PGlite), checking data permissions, revoked access, stale versions, audit events and owner-only import. Production email delivery, hosted authentication and live migration must still be verified after account setup.

For local development, copy `.env.example` to `.env.local`, use a test Supabase project, set `APP_URL=http://localhost:3000`, update that test project's Auth URLs/templates, then run `pnpm dev`. Never commit `.env.local`.

## Account recovery and maintenance

Keep the Supabase and Vercel accounts secured and retain access to the owner mailbox. Do not delete Auth users referenced by league records. If an invitation was sent but membership creation failed, an authorized Supabase project administrator can inspect Authentication and `league_admins` and repair the matching UUID/email row. Do not grant ownership to arbitrary addresses or disable database protections. Owner transfer is a deliberate database/environment maintenance operation, not an in-app administrator action.

Review dependency updates and hosting/database backups periodically. Hosting and email provider fees depend on your plans; none are purchased by this package.

Official references:
- https://supabase.com/docs/guides/auth/server-side/creating-a-client
- https://supabase.com/docs/guides/auth/auth-smtp
- https://supabase.com/docs/guides/auth/auth-email-templates
- https://vercel.com/docs/deployments
