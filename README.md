# OSK private staging shop

## GitHub and partner presentation

The owner approved a **public source repository** so GitHub Pages can run on the free plan. Pages serves the password-encrypted demonstration from `docs/`; it uses dummy products and browser storage, not the real database. Supabase sign-in and shared data are not connected yet. **Start with [CURSOR-HANDOFF.md](CURSOR-HANDOFF.md)** for setup at home and the exact integration work remaining.

Presentation: https://mitchellpel.github.io/osk-website/

The password is supplied separately, never committed. Use the Admin button after unlocking to demonstrate products, inventory, orders and activity. Use dummy contact information. The **Lock preview** button reloads the encrypted page and asks for the password again.

`npm run dev:partner` runs the portable presentation locally. `npm run build:partner` requires `STATICRYPT_PASSWORD` (20+ characters) and produces `dist-partner/encrypted/index.html`. Deploy only the encrypted file, never its plaintext counterpart. Keep the password out of Git.

Owner-only staging prototype for OSK temporary 3D-printed KTM 300 EXC emergency lever kits. The logo is derived from the supplied OSK vector PDF. The hero photo is a generated generic rider image, not a product or fitment claim.

## Current state

The dedicated admin is at `/admin`, with overview, products, orders, inventory, customer lookup, activity and settings. See `ADMIN-IMPLEMENTATION.md` for verified backend behaviour and remaining production gates. `supabase-admin-upgrade.sql` has been applied and transactionally tested in the separate OSK project. The website still uses its browser demo until the secure server connection is configured.

- Catalogue and admin allow draft products, stock, ZAR price, exact model, year range, control assembly and descriptive fitment. Publishing is blocked until exact fitment is confirmed.
- Basket creates staging orders with a manually entered PUDO pickup point. Shipping is quoted and tracked manually.
- Yoco Checkout API route accepts only a server-side `sk_test_` key. A return from Yoco does not mark the order paid; confirm test status in Yoco before changing fulfilment. There is no webhook or live payment handling yet.
- Supabase OSK project reference: `iqhgifxsnxukpiievggn` in `OSk-Database`. The `osk_products` and `osk_orders` tables have RLS enabled and no anon/authenticated table grants. The application accesses them only from server routes.
- The Sites project ID is in `.openai/hosting.json`. It was created owner-only and has not been published.

## Server settings

Add these to the **private Sites runtime environment**, never to source or client code:

| Key | Value | Secret |
| --- | --- | --- |
| `SUPABASE_URL` | `https://iqhgifxsnxukpiievggn.supabase.co` | No |
| `SUPABASE_SECRET_KEY` | The OSK project's `sb_secret_...` key from Supabase > Project Settings > API Keys | Yes |
| `YOCO_TEST_SECRET_KEY` | Optional Yoco Checkout API `sk_test_...` key | Yes |

The Supabase key transfer was blocked by automatic security review, so these settings are not configured. A private deployment can show the design, but data actions need the two Supabase settings.

## Local demo

Loopback previews and the explicit static partner presentation use a separate browser-only demo store with three dummy products and a sample order. Prices and stock are examples; fitment is unverified. Admin edits, checkout drafts, tracking and simulated payments persist in that browser. No Supabase or Yoco request is sent in this mode. Other hosted server builds use server routes.

## Local work

Install with `npm ci`, run `npm run dev`, and build with `npm run build`. On loopback, visit `/signin-with-chatgpt?return_to=/` to simulate the owner identity. Local Supabase connection needs `.dev.vars` with the two Supabase values; do not commit it.

The SQL schema is in `supabase-schema.sql`. It reflects the currently created OSK tables and their exact fitment fields. Do not run it against another project.

## Before any public launch

Verify each product's model, years, assembly, material limitations, usage guidance, price and stock; agree PUDO shipping rates; complete Yoco online checkout eligibility, webhook verification and live payment review. Public access and live payment keys require the owner's explicit approval.
