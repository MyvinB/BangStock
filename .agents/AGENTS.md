# BangStock Workspace Rules & Context

This file serves as the project memory for agents working on the BangStock Retail Control System.

## Project Overview
* **Application:** BangStock Retail Control System (POS, inventory management, client storefront).
* **Tech Stack:** Next.js 16.1.6 (App Router), React 19, Tailwind CSS v4 (configured via `@import` and `@theme` in `app/globals.css`), Supabase (Auth, Database, Storage), Playwright (E2E testing).
* **PWA Capability:** Configured via `next-pwa` with a custom `manifest.json`.

## Core Codebase Structure
* [app/layout.tsx](file:///Users/myvinbarboza/Documents/Apps/BangStock/bangstock-app/app/layout.tsx): Root layout with global Auth and Error Boundary wrapper.
* [app/admin/](file:///Users/myvinbarboza/Documents/Apps/BangStock/bangstock-app/app/admin/): Protected admin panel containing POS, products, staff, expenses, reconciliation, refunds, and dashboards.
* [app/shop/](file:///Users/myvinbarboza/Documents/Apps/BangStock/bangstock-app/app/shop/): Public storefront showcasing live inventory.
* [app/deadstock/](file:///Users/myvinbarboza/Documents/Apps/BangStock/bangstock-app/app/deadstock/): Deals / clearance shop view.
* [lib/supabase.ts](file:///Users/myvinbarboza/Documents/Apps/BangStock/bangstock-app/lib/supabase.ts): Client initialization.
* [lib/supabase-admin.ts](file:///Users/myvinbarboza/Documents/Apps/BangStock/bangstock-app/lib/supabase-admin.ts): Server-side service-role client.
* [lib/api.ts](file:///Users/myvinbarboza/Documents/Apps/BangStock/bangstock-app/lib/api.ts): Data-fetching and mutations functions.
* [lib/auth.tsx](file:///Users/myvinbarboza/Documents/Apps/BangStock/bangstock-app/lib/auth.tsx): Auth Context & session management.

## Previous Modifications
1. **Next.js Metadata Configuration:** Migrated `themeColor` and `viewport` metadata from standard `export const metadata` to a separate `export const viewport` object in `app/layout.tsx` to resolve warnings in Next.js 15+.
2. **Environment Template:** Added `.env.example` at the root directory of the application for easier credentials setup.

## Development & Styling Guidelines
* **Styling System:** Use Tailwind CSS v4 styling rules. The style variables and global parameters should be added/modified in `app/globals.css` inside the `@theme` block.
* **Mobile First:** Ensure components are optimized for mobile touch inputs (large targets, no horizontal overflows, fast response UI).
* **Database Triggers:** Keep database operations aligned with schema constraints and auto stock deductions configured in `supabase-schema.sql`.
* **Testing:** Playwright tests are skipped unless E2E credentials (`BANGSTOCK_TEST_EMAIL` and `BANGSTOCK_TEST_PASSWORD`) are specified.
