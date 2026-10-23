# OSK handoff for Cursor

## Start at home

1. Sign into GitHub as `MitchellPel`, clone `https://github.com/MitchellPel/osk-website.git`, and open the cloned folder in Cursor.
2. Install Node.js 22.13 or newer, run `npm ci`, then `npm run dev:partner` for the portable storefront/admin demo. Use the local address printed by Vite.
3. `npm run dev` starts the original full server application on port 5173. Its hosted identity boundary is specific to Sites and must be replaced before hosting that server elsewhere.
4. Run `npm run test:admin` and `npm exec tsc -- --noEmit` after relevant changes.

## Actual current state

- Source repository is public by the owner's explicit approval. Never commit credentials or customer data.
- GitHub Pages serves only the encrypted static presentation in `docs/`. It has no server API and makes no Supabase or Yoco requests. Presentation edits are saved in each visitor's browser, not shared.
- The shared presentation password is kept outside Git. Do not replace encryption with a JavaScript password comparison.
- `npm run build:partner` builds all presentation code and media into a single HTML file, then encrypts it using StatiCrypt. Supply a strong password of at least 20 characters through `STATICRYPT_PASSWORD`. `dist-partner/plain` must never be deployed.
- To update Pages: build, copy `dist-partner/encrypted/index.html` to `docs/index.html`, preserve `docs/.nojekyll`, then commit and push. GitHub Pages publishes `main:/docs`.
- Storefront: `/#/` within the presentation; admin: `/#/admin`. The original server app uses `/` and `/admin`.

## Existing Supabase project — reuse it

- Project: **OSK**, organization **OSk-Database**.
- Reference: `iqhgifxsnxukpiievggn`.
- URL: `https://iqhgifxsnxukpiievggn.supabase.co`.
- Intended admin email: `mitchellpelser@gmail.com`. Do not grant admin based on browser state, a query parameter, or editable user metadata.
- Schema and upgrade are recorded in `supabase-schema.sql` and `supabase-admin-upgrade.sql`. These were applied to the dedicated OSK project. Do not run them against another project or replace the database.
- Current tables deny anonymous and authenticated browser access. Server routes use a privileged server secret; that secret is **not configured** in this checkout or GitHub Pages.
- The connected Supabase connector currently lists a different organization's projects. The OSK dashboard session was accessible separately. Verify the target project before any change.

## Next implementation: Supabase Auth and shared data

1. Use the existing Supabase project and a browser-safe publishable key with the pinned `@supabase/supabase-js` client. Never put `SUPABASE_SECRET_KEY`, a secret key or service-role key in browser code, GitHub, Pages artifacts or client-prefixed environment variables.
2. Implement account sign-up, email verification, sign-in, sign-out and recovery. The owner sets their own password. Configure exact deployed redirect URLs in Supabase.
3. Implement database-enforced roles: owner admin, approved partners, pending accounts. New registration does not grant access. Provision the verified owner's account deliberately; never make the first arbitrary signup an admin.
4. Apply and verify least-privilege RLS policies or authenticated Edge Functions before wiring data actions. Test anonymous access, pending accounts, partner access, admin writes and attempts to change one's own role. Keep financial actions unavailable.
5. The old server owner check trusts the Sites-injected `oai-authenticated-user-id` header. It is **not portable authentication**. Replace it with verified Supabase user identity before exposing server handlers on another platform. Never accept a client-supplied header as proof of admin identity.
6. Replace the static demo adapter through a dedicated mode, without silently switching a production build back to localStorage when a connection fails. Clearly distinguish demo data from shared staging records.
7. Move price calculation, stock reservations, fulfilment guards and role checks into trusted database transactions or Edge Functions. Do not grant unrestricted writes just to make the UI work.

## Product and launch constraints

- Brand: OSK, South Africa; black, orange, white; supplied vector logo in `public/osk-logo.svg`.
- Products: temporary 3D-printed emergency brake/clutch lever kits, initial target KTM 300 EXC. Exact year/control assembly compatibility, material limitations and safety guidance remain unverified. Never invent compatibility or safety/performance claims.
- Sample prices (R150/R150/R275) and stock are demonstrations, not approved sales offers.
- Yoco is deferred. The existing server checkout route rejects live keys; no payment webhook is implemented. A checkout redirect never proves payment.
- PUDO workflow remains manual. Do not invent rates, pickup locations, labels or bookings.
- Keep the partner presentation protected. Taking real orders, activating live payments or launching a public storefront requires explicit owner approval.

See `ADMIN-IMPLEMENTATION.md` for the operational model, checks already completed and remaining production gates.
