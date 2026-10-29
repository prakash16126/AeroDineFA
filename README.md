# AeroDine

A responsive React restaurant ordering and reservation **local demo** for AeroDine, Hitech City, Hyderabad. The app includes the complete 84-item illustrative menu, search and filters, dish details, a persistent INR cart, demo checkout request, reservation request preview, order lookup, light/dark themes, and a read-only admin preview.

## Run locally

Requirements: Node.js 20.19+ or 22.12+ and npm.

```sh
npm install
npm run dev
```

The development server starts at `http://localhost:3000` and serves client-side routes with a fallback to the app entry page. esbuild bundles the React JSX and CSS; no Vite tooling is used. The menu, cart, theme, demo order request, and reservation request are stored locally in the browser. The demo does not need external credentials.

```sh
npm test
npm run build
```

The production-ready static site is written to `dist/` and can be hosted by any static web server configured to serve `index.html` for client-side routes. The build copies static assets from `public/` and bundles the app into `dist/assets/`.

Optional public API endpoint URLs can be set in `.env.local` or `.env` using the `REACT_APP_*` names below; environment values are embedded in the browser bundle, so never put secrets in them.

## What's implemented

- 84 menu records with stable IDs/slugs, exact listed prices represented as integer paise, and 12 categories. The automated test verifies record count, unique IDs/slugs, seven dishes per category and every listed starting price.
- Menu search, category and vegetarian/non-vegetarian filters, price/name sorting, dish details, and graceful broken-image fallback. Dish cards expose quantity controls and an accessible add-to-bag toast.
- Cart quantity and kitchen-note editing, cross-tab/local persistence, integer-paise subtotals, stale-price review, and checkout form validation.
- A local `AERO10` coupon preview; it is not connected to a server-side promotion service.
- Theme persistence with OS preference on the first visit and an early theme initialization script to reduce theme flash.
- Professional reservation and order confirmation panels with unique references; demo mode is explicitly not a confirmed booking/order.
- Optional API URL configuration for server-confirmed reservations and orders. Confirmation is shown in live mode only after the configured service responds successfully.
- Supabase schema/RLS migration and an explicit, server-key-only seed script.
- Responsive layout, keyboard-operable controls, visible focus, and reduced-motion support.

## Important demo limitations

Without API URLs, checkout saves an **unsubmitted browser-local demo request**; it does not place a live order, check delivery availability, calculate configured fees/taxes, or process payment. The reservation form only saves a **local preview request**; no slot availability is queried and no booking is confirmed. Order lookup is limited to the browser that saved the demo request. Admin is a read-only preview and must not be used for real operations.

The restaurant hours have not been verified. In particular, the supplied “9 PM–11:30 PM” text is unconfirmed; the app does not infer a booking schedule from it. Restaurant address, phone, delivery zones, opening hours, preparation times, fees, reservation capacity and real payment settings still need to be supplied by the business.

## Menu photography and rights

The manifest uses stable dish IDs. Fifty-two of the 84 dishes have visually matched photos: 45 Wikimedia Commons photos stored locally with contributor attribution and source/license links, and seven matching photos preserved from the original bundled assets. The other 32 dishes remain flagged for review rather than being assigned misleading photos. No original project image has been removed or replaced.

```sh
npm run images:report
```

Run `npm run images:report` to see missing dish images, duplicate mappings/URLs, malformed or missing local files, and dishes awaiting review. Wikimedia images include contributor credit and license metadata in the manifest. The prior bundled Unsplash files' original license and attribution details are not recorded in the project; verify their usage rights before commercial use. Content matches were reviewed visually, while availability testing is performed against the bundled local files. The `Image` component provides a graceful fallback if a displayed image fails to load.

The Home, Menu and Reservations backgrounds use the existing bundled Unsplash restaurant-interior photograph (`photo-1517248135467-4c7edcad34c4.jpg`) with theme-specific overlays and responsive, non-fixed scrolling. Its visual content is an interior; commercial usage rights and attribution still need verification. It is the only existing interior image in the project, so it is reused with different crops until additional licensed interiors are supplied.

The data source and image manifest live in [`src/data/menu.js`](./src/data/menu.js) and [`src/data/imageManifest.js`](./src/data/imageManifest.js). Prices and descriptions are illustrative.

## Supabase setup scaffold

1. Create a Supabase project and configure authentication, email/phone settings and production redirect URLs.
2. Apply [`supabase/migrations/202610280001_initial_schema.sql`](./supabase/migrations/202610280001_initial_schema.sql) with Supabase CLI or the SQL editor.
3. Configure `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, and `AERODINE_PUBLIC_URL` in a trusted local shell or deployment secret manager. Never use a service-role key in browser code or a frontend variable.
4. Run `npm run seed:supabase`. It upserts the categories and dishes and requires the deployed public URL for image paths.
5. Grant staff roles to trusted users through a secured operator process. Do not expose writes to `user_roles` to clients.

The migration defines RLS and a server-only write boundary for orders, order items, reservations and payments. The browser demo is not directly wired to Supabase. To connect an API, configure `REACT_APP_API_BASE_URL`, `REACT_APP_ORDER_API_URL`, and/or `REACT_APP_RESERVATION_API_URL` in `.env`, `.env.local`, or the frontend environment. These endpoint URLs are public; do not put credentials in frontend variables.

The order endpoint is `POST /api/orders` (or `REACT_APP_ORDER_API_URL`) and receives customer/address details, dish IDs and quantities, coupon code, payment method and an `Idempotency-Key`. It must independently re-read menu prices, validate serviceability/promotions, create an idempotent order, and return JSON with an `order` object containing an `id`, `orderNumber` or `reference`, a `status`, and integer `totalInPaise`; it may include `items`, subtotal/delivery/discount/tax paise values, delivery address and payment status. The lookup route is `GET {order-endpoint}/{reference}` and returns the same order shape.

The reservation endpoint is `POST /api/reservations` (or `REACT_APP_RESERVATION_API_URL`) and receives customer details, requested date/time, guest count and preferences. It must validate business hours and availability and prevent conflicts transactionally. Return an object with a `reference` and a `status` of `confirmed` or `pending`; a success-shaped response is required before the UI displays either state. Configure reservation-hour/capacity settings only after the business confirms them.

The migration RLS policy/server-only write boundary does not itself implement those API endpoints, payment integration, or staff operations. Add authenticated server/Edge Functions and server-side authorization before production. Razorpay must be created/verified server-side; this UI never handles payment secrets or card details.

## Payments and production checklist

Razorpay credentials are placeholders in `.env.example` for documentation only. Implement order creation and signature verification in a trusted server/Edge Function; never put the Razorpay secret or Supabase service-role key in frontend code. Add webhook verification, idempotency, rate limits, audit logging, server recalculation of all prices/discounts/taxes, and payment/order-state reconciliation before accepting live payments.

Before launch:

- Verify business identity, address, phone, hours and service coverage.
- Review every dish description, price, vegetarian classification and available/allergen data.
- Acquire and verify a distinct appropriate image and usage rights for each dish.
- Add and test the server endpoints and operational admin authorization described above.
- Add end-to-end testing against a dedicated staging backend, including payment failures and reservation conflicts.

## Project structure

```text
src/
  data/menu.js             Menu records, categories, image mappings, INR formatter
  data/imageManifest.js    Image manifest export
  data/menu.test.js        Node test-runner catalog integrity checks
  main.jsx                 Pages and local demo interactions
  styles.css               Theme tokens, responsive styles and accessibility states
public/
  index.html               Browser entry page and theme initialization
  images/                  Static restaurant and menu photography
scripts/
  build.js                 esbuild production build to dist/
  build-config.js          Environment loading and shared bundler options
  dev.js                   Local static server and esbuild watcher
supabase/
  migrations/              Initial schema and row-level security
  seed.js                  Server-key-only REST seed script
```