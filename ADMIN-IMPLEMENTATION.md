# OSK admin implementation

The operational workspace is separate from the storefront at `/admin`. It includes overview, product catalogue, orders, inventory, customers derived from orders, activity history and connection settings. This is an owner workspace. Staff roles do not yet exist.

The admin is split into an operational controller, a data-access hook, independent record editors, shared UI primitives and formatting/export helpers. Request revisions prevent stale refresh results from replacing newer data. Domain rules are shared by the server and demo adapter. Desktop and 390px-wide product editor layouts were inspected in the browser.

## Implemented and verified

- Browser demo has products, orders, stock movements and activity in a versioned store. No demo operation contacts Supabase or Yoco. It is enabled on loopback hostnames and in the explicitly separate static partner presentation build.
- Product management has SKU, price, low-stock threshold, exact model/year/assembly details, visibility and reversible archiving. Stock is adjusted separately with a reason.
- Inventory adjustments validate whole quantities, prevent negative stock, reject stale expected balances and record before/after quantities. The Supabase RPC locks one product row and writes the movement in the same transaction.
- Order updates allow only forward fulfilment stages, require payment before packing and tracking before dispatch, and preserve internal notes. The server ignores attempts to change payment status from the order editor.
- Supabase staging upgrade is applied in project `iqhgifxsnxukpiievggn`: `supabase-admin-upgrade.sql`. Audit triggers record changed field names without copying customer contact data into logs. Activity and movement tables have RLS enabled, no anon/authenticated access and no service-role update/delete grants.
- `tests/verify-admin-database.sql` passed as service_role: stock receipt, one movement, two audit events, stale-count rejection, negative-stock rejection and privilege checks. Test data was rolled back.
- Six domain tests cover stock and fulfilment guards. Product editing, stock receipt, history and unpaid packing rejection were tested through the browser.

## Honest limits

The app's Supabase server key is still not configured. The presentation uses browser storage. The database schema is real, but application-to-database integration has not been verified end to end. The owner approved public GitHub source and an encrypted GitHub Pages partner presentation. A public storefront launch and live payment activation remain unauthorized. See `CURSOR-HANDOFF.md` for the Supabase Auth integration and portable authorization requirements.

Admin lists currently paginate the records already loaded. The server loads at most 100 orders, and customer totals derive from that subset. These are not accounting reports. No stock is reserved by checkout yet. Browser demo history is not a tamper-proof audit system.

## Required before taking real orders

1. Finish the secure server connection, private deployment and end-to-end database verification.
2. Normalise order lines and fitment records; add versioned product records, media storage and explicit use guidance. Preserve ordered name, SKU, price and fitment snapshots even if catalogue records later change.
3. Create orders, stock reservations and expiration/release in one database transaction. Add unique idempotency keys for checkout and webhook events. Never hold row locks while calling Yoco.
4. Verify signed Yoco webhooks, handle replay and retry safely, reconcile provider state, and keep payment events separate from fulfilment. Test cancellation and reservation release.
5. Replace client list pagination with indexed server queries and cursor pagination; use aggregate queries for operational counts. Add role checks and an append-only actor trail before allowing staff access. Keep customer-data access and export permissions explicit.
6. Verify backups through a restore test, establish order reconciliation and error monitoring, and finish PUDO shipping charges before enabling live sales.

These are release gates, not features represented as complete in the interface. Keep the owner-only access boundary until the staff authorisation model is enforced by the server.
