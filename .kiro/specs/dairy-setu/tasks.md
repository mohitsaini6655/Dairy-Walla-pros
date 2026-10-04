# Implementation Plan: DairySetu

## Overview

Full-stack implementation of DairySetu using React + Vite + TypeScript (frontend), Node.js + Express + TypeScript + Prisma + PostgreSQL (backend), Socket.io (real-time), Redis (cache/sessions), Puppeteer (PDF), and Baileys/WhatsApp Cloud API (WhatsApp Bridge). Tasks are ordered so each step builds on the previous, ending with full integration.

## Tasks

- [x] 1. Project scaffolding and shared configuration
  - Initialize monorepo structure: `apps/web` (Vite + React + TS), `apps/api` (Express + TS), `packages/shared` (shared types)
  - Configure `tsconfig.json`, `eslint`, `prettier`, and `vitest.config.ts` for both apps
  - Set up Tailwind CSS and shadcn/ui in `apps/web`
  - Add `fast-check` to both apps for property-based testing
  - Create `.env.example` with all required environment variables (DATABASE_URL, REDIS_URL, JWT_SECRET, OTP provider keys, WhatsApp credentials)
  - _Requirements: 11.1_

- [x] 2. Database schema and Prisma setup
  - [x] 2.1 Define Prisma schema with all models: User, DistributorProfile, ShopkeeperProfile, Connection, DeliveryGroup, Product, Order, OrderItem, Invoice, Notification
    - Include partial unique index on `(shopkeeper_id, status)` where `status = 'active'` to enforce single active connection
    - Snapshot `unit_price` on OrderItem (not a FK to Product price)
    - _Requirements: 1.7, 3.3, 8.1_
  - [x] 2.2 Write and run initial Prisma migration; seed script with sample distributor, shopkeeper, products
    - _Requirements: 2.4_
  - [ ]* 2.3 Write property test for Order record completeness (Property 10)
    - **Property 10: Order record completeness**
    - **Validates: Requirements 3.3**
    - `// Feature: dairy-setu, Property 10: Order record completeness`

- [x] 3. Authentication — OTP + JWT
  - [x] 3.1 Implement OTP service: `sendOtp(phone)` and `verifyOtp(phone, code)` using MSG91/Twilio; store OTP in Redis with 10-minute TTL; rate-limit to 3 requests per phone per 10 minutes
    - _Requirements: 11.1_
  - [x] 3.2 Implement JWT issuance and refresh: `issueTokens(userId)`, `verifyAccessToken(token)`, `refreshAccessToken(refreshToken)`; store refresh tokens in Redis
    - _Requirements: 11.1, 11.4_
  - [x] 3.3 Implement auth routes: `POST /api/auth/otp/send`, `POST /api/auth/otp/verify`, `POST /api/auth/register`, `POST /api/auth/refresh`
    - _Requirements: 11.1, 11.2_
  - [x] 3.4 Implement `authMiddleware` (validates JWT, attaches `req.user`) and `roleMiddleware(role)` (enforces distributor/shopkeeper separation)
    - _Requirements: 11.3, 11.4_
  - [ ]* 3.5 Write property test for unauthenticated requests rejected (Property 24)
    - **Property 24: Unauthenticated requests rejected**
    - **Validates: Requirements 11.1, 11.4**
    - `// Feature: dairy-setu, Property 24: Unauthenticated requests rejected`
  - [ ]* 3.6 Write property test for role-based access control (Property 25)
    - **Property 25: Role-based access control**
    - **Validates: Requirements 11.3**
    - `// Feature: dairy-setu, Property 25: Role-based access control`

- [x] 4. Frontend auth flow
  - [x] 4.1 Build `PhoneEntry`, `OTPVerification`, and `RoleSelection` components using shadcn/ui; mobile-first layout (375px)
    - _Requirements: 11.1, 11.2_
  - [x] 4.2 Implement `AuthGuard` component that redirects unauthenticated users to login; wire up Zustand auth store (phone, role, tokens)
    - _Requirements: 11.4_
  - [x] 4.3 Implement token refresh interceptor in the React Query / Axios layer
    - _Requirements: 11.1_

- [ ] 5. Checkpoint — auth end-to-end
  - Ensure all auth unit tests and property tests pass. Verify OTP send → verify → JWT → role selection flow works locally. Ask the user if questions arise.

- [x] 6. Connection management — backend
  - [x] 6.1 Implement connection routes: `POST /api/connections`, `GET /api/connections`, `PATCH /api/connections/:id/approve`, `PATCH /api/connections/:id/reject`, `PATCH /api/connections/:id/delivery-group`
    - Enforce single active connection via DB constraint + application-level 409 response
    - _Requirements: 1.1, 1.2, 1.3, 1.7_
  - [x] 6.2 Implement `requireActiveConnection` middleware that returns 403 if shopkeeper has no active connection
    - _Requirements: 1.4_
  - [ ]* 6.3 Write property test for connection request creates pending state (Property 1)
    - **Property 1: Connection request creates pending state**
    - **Validates: Requirements 1.1**
    - `// Feature: dairy-setu, Property 1: Connection request creates pending state`
  - [ ]* 6.4 Write property test for connection state transitions (Property 2)
    - **Property 2: Connection state transitions are correct**
    - **Validates: Requirements 1.2, 1.3**
    - `// Feature: dairy-setu, Property 2: Connection state transitions are correct`
  - [ ]* 6.5 Write property test for non-active connection blocks catalog access (Property 3)
    - **Property 3: Non-active connection blocks catalog access**
    - **Validates: Requirements 1.4**
    - `// Feature: dairy-setu, Property 3: Non-active connection blocks catalog access`
  - [ ]* 6.6 Write property test for invalid connection code returns error (Property 5)
    - **Property 5: Invalid connection code returns error**
    - **Validates: Requirements 1.6**
    - `// Feature: dairy-setu, Property 5: Invalid connection code returns error`
  - [ ]* 6.7 Write property test for at most one active connection per shopkeeper (Property 6)
    - **Property 6: At most one active connection per shopkeeper**
    - **Validates: Requirements 1.7**
    - `// Feature: dairy-setu, Property 6: At most one active connection per shopkeeper`

- [x] 7. Delivery group management — backend
  - Implement CRUD for DeliveryGroup under distributor scope; expose via `PATCH /api/connections/:id/delivery-group`
  - _Requirements: 7.1_

- [x] 8. Connection management — frontend
  - [x] 8.1 Build `ConnectionPage` for shopkeepers: phone/code input form, pending state banner, rejection notice
    - _Requirements: 1.1, 1.4, 1.6_
  - [x] 8.2 Build `ConnectionsPage` for distributors: pending list with Approve/Reject actions, active list with delivery group assignment dropdown
    - _Requirements: 1.2, 1.3, 7.1_
  - [x] 8.3 Wire Socket.io events `connection:approved` and `connection:rejected` to update shopkeeper UI in real time
    - _Requirements: 1.2, 1.3_

- [x] 9. Product catalog — backend
  - [x] 9.1 Implement catalog routes: `GET /api/catalog` (shopkeeper, active connection required, available products only), `GET /api/distributor/catalog`, `POST /api/distributor/catalog`, `PATCH /api/distributor/catalog/:id`, `DELETE /api/distributor/catalog/:id`
    - _Requirements: 2.1, 2.2, 2.3_
  - [ ]* 9.2 Write property test for catalog CRUD round trip (Property 7)
    - **Property 7: Catalog CRUD round trip**
    - **Validates: Requirements 2.1**
    - `// Feature: dairy-setu, Property 7: Catalog CRUD round trip`
  - [ ]* 9.3 Write property test for unavailable products excluded from shopkeeper catalog (Property 8)
    - **Property 8: Unavailable products excluded from shopkeeper catalog**
    - **Validates: Requirements 2.3**
    - `// Feature: dairy-setu, Property 8: Unavailable products excluded from shopkeeper catalog`
  - [ ]* 9.4 Write property test for active connection filters catalog to connected distributor only (Property 4)
    - **Property 4: Active connection filters catalog to connected distributor only**
    - **Validates: Requirements 1.5**
    - `// Feature: dairy-setu, Property 4: Active connection filters catalog to connected distributor only`

- [x] 10. Product catalog — frontend
  - [x] 10.1 Build `CatalogManagementPage` for distributors: `ProductTable` with inline edit/delete, `ProductForm` modal (name, brand, category, unit, price, availability toggle)
    - _Requirements: 2.1, 2.2, 2.3_
  - [x] 10.2 Build `CatalogPage` for shopkeepers: `ProductGrid`/`ProductList` with `ProductCard` (name, brand, unit, price, qty control), `OrderWindowBanner` showing cutoff time
    - _Requirements: 3.1, 3.2, 4.3_

- [x] 11. Order window configuration — backend and frontend
  - [x] 11.1 Implement settings routes: `GET /api/distributor/settings`, `PATCH /api/distributor/settings`; store `order_window_start` and `order_window_cutoff` on DistributorProfile
    - _Requirements: 4.1, 4.2_
  - [x] 11.2 Build `SettingsPage` → `OrderWindowConfig` component with time pickers; display current window to shopkeepers on catalog page
    - _Requirements: 4.1, 4.3_
  - [ ]* 11.3 Write property test for order window settings persist and are retrievable (Property 12)
    - **Property 12: Order window settings persist and are retrievable**
    - **Validates: Requirements 4.1**
    - `// Feature: dairy-setu, Property 12: Order window settings persist and are retrievable`

- [x] 12. Order placement — backend
  - [x] 12.1 Implement `POST /api/orders`: validate non-empty items, snapshot `unit_price` from catalog at placement time, classify as `normal` or `late` based on distributor's cutoff, persist Order + OrderItems, emit `order:new` Socket.io event to distributor room
    - _Requirements: 3.3, 3.4, 3.5, 3.6_
  - [x] 12.2 Implement `GET /api/orders` (shopkeeper order history) and `GET /api/distributor/orders` with filters (date, type, status, delivery group)
    - _Requirements: 5.6_
  - [ ]* 12.3 Write property test for order classification matches cutoff time (Property 9)
    - **Property 9: Order classification matches cutoff time**
    - **Validates: Requirements 3.4, 3.5, 4.2**
    - `// Feature: dairy-setu, Property 9: Order classification matches cutoff time`
  - [ ]* 12.4 Write property test for zero-item order rejected (Property 11)
    - **Property 11: Zero-item order rejected**
    - **Validates: Requirements 3.6**
    - `// Feature: dairy-setu, Property 11: Zero-item order rejected`

- [x] 13. Order placement — frontend
  - [x] 13.1 Build `OrderReviewPage`: summary of selected items with quantities and prices, submit button, late-order warning banner when past cutoff
    - _Requirements: 3.5, 3.6, 3.7_
  - [x] 13.2 Wire catalog qty controls → order review → submit flow; show confirmation toast on success
    - _Requirements: 3.2, 3.3_
  - [x] 13.3 Build `OrderHistoryPage` for shopkeepers: list of past orders with status badges
    - _Requirements: 3.3_

- [x] 14. Distributor order dashboard — backend and frontend
  - [x] 14.1 Implement `PATCH /api/distributor/orders/:id/accept` and `PATCH /api/distributor/orders/:id/reject`; emit `order:late_decision` Socket.io event to shopkeeper room
    - _Requirements: 5.2, 5.3, 5.4_
  - [x] 14.2 Build `DashboardPage`: `OrderCountBadges` (Normal | Late counts), `NormalOrdersList`, `LateOrdersList` with Accept/Reject buttons, `DeliveryGroupTabs`
    - _Requirements: 5.1, 5.2, 5.5, 5.6, 7.2_
  - [x] 14.3 Wire `order:new` Socket.io event to update dashboard counts and lists in real time without page refresh
    - _Requirements: 6.3_
  - [ ]* 14.4 Write property test for late order accept/reject changes status correctly (Property 13)
    - **Property 13: Late order accept/reject changes status correctly**
    - **Validates: Requirements 5.2**
    - `// Feature: dairy-setu, Property 13: Late order accept/reject changes status correctly`

- [ ] 15. Checkpoint — order flow end-to-end
  - Ensure all order placement, classification, and dashboard tests pass. Verify normal and late order flows work with real-time updates. Ask the user if questions arise.

- [x] 16. Order summary and demand aggregation — backend and frontend
  - [x] 16.1 Implement `GET /api/distributor/summary` and `GET /api/distributor/summary/group/:id`: aggregate accepted order items by product, brand, category, and delivery group; emit `summary:updated` Socket.io event when a new order is accepted
    - _Requirements: 6.1, 6.2, 6.3, 7.3_
  - [x] 16.2 Build `OrderSummaryPage`: `SummaryTable` (product × brand × total qty), `DeliveryGroupBreakdown` tabs; subscribe to `summary:updated` for live updates
    - _Requirements: 6.4, 7.3_
  - [ ]* 16.3 Write property test for order summary aggregation is correct (Property 14)
    - **Property 14: Order summary aggregation is correct**
    - **Validates: Requirements 6.1, 5.3, 6.3**
    - `// Feature: dairy-setu, Property 14: Order summary aggregation is correct`
  - [ ]* 16.4 Write property test for order summary grouped by brand and category (Property 15)
    - **Property 15: Order summary grouped by brand and category**
    - **Validates: Requirements 6.2**
    - `// Feature: dairy-setu, Property 15: Order summary grouped by brand and category`
  - [ ]* 16.5 Write property test for per-delivery-group summary is correct (Property 16)
    - **Property 16: Per-delivery-group summary is correct**
    - **Validates: Requirements 7.3**
    - `// Feature: dairy-setu, Property 16: Per-delivery-group summary is correct`

- [x] 17. Invoice generation — backend and frontend
  - [x] 17.1 Implement invoice service: `generateInvoice(orderId)` computes total from snapshotted OrderItem prices, persists Invoice record; `markOutdated(orderId)` sets `outdated = true`
    - _Requirements: 8.1, 8.4_
  - [x] 17.2 Implement invoice routes: `GET /api/distributor/invoices/:orderId`, `POST /api/distributor/invoices/:orderId/regenerate`, `GET /api/distributor/invoices/:orderId/pdf` (Puppeteer renders HTML template to PDF)
    - _Requirements: 8.1, 8.2_
  - [x] 17.3 Build `InvoicePage`: `InvoicePreview` component, PDF download button, WhatsApp share button (Web Share API / deep link)
    - _Requirements: 8.2, 8.3_
  - [ ]* 17.4 Write property test for invoice contains all required fields (Property 17)
    - **Property 17: Invoice contains all required fields**
    - **Validates: Requirements 8.1**
    - `// Feature: dairy-setu, Property 17: Invoice contains all required fields`
  - [ ]* 17.5 Write property test for order modification marks invoice outdated (Property 18)
    - **Property 18: Order modification marks invoice outdated**
    - **Validates: Requirements 8.4**
    - `// Feature: dairy-setu, Property 18: Order modification marks invoice outdated`

- [x] 18. Notification service — backend
  - [x] 18.1 Implement notification service: `createNotification(userId, type, payload)` persists to DB; `batchNotify(distributorId, event)` groups events within a 5-minute Redis window before flushing
    - _Requirements: 10.1, 10.2, 10.3, 10.4_
  - [x] 18.2 Wire notification triggers into order and connection handlers: normal order placed → shopkeeper confirmation; late order received → distributor notify; late order decision → shopkeeper notify; connection approved/rejected → shopkeeper notify
    - _Requirements: 10.1, 10.2, 10.4, 10.5_
  - [ ]* 18.3 Write property test for notification count invariant (Property 22)
    - **Property 22: Notification count invariant**
    - **Validates: Requirements 10.1, 10.2, 10.4**
    - `// Feature: dairy-setu, Property 22: Notification count invariant`
  - [ ]* 18.4 Write property test for notification batching within 5-minute window (Property 23)
    - **Property 23: Notification batching within 5-minute window**
    - **Validates: Requirements 10.3**
    - `// Feature: dairy-setu, Property 23: Notification batching within 5-minute window`

- [ ] 19. WhatsApp Bridge
  - [ ] 19.1 Implement WhatsApp message parser: `parseOrderMessage(text, catalog)` extracts product names and quantities using fuzzy matching; handles Hindi/English mix and common abbreviations; returns structured items or `null` if unparseable
    - _Requirements: 9.1_
  - [ ] 19.2 Implement webhook handler `POST /api/webhook/whatsapp`: look up sender phone → registered shopkeeper; if unknown send registration reply; if known but unparseable send format-hint reply; if parseable create order via order service and send confirmation reply
    - _Requirements: 9.2, 9.3, 9.4, 9.5, 9.6_
  - [ ] 19.3 Integrate Baileys (or WhatsApp Cloud API) client: connect to WhatsApp, forward incoming messages to webhook handler, send outbound replies
    - _Requirements: 9.1, 9.4_
  - [ ]* 19.4 Write property test for WhatsApp message parsing round trip (Property 19)
    - **Property 19: WhatsApp message parsing round trip**
    - **Validates: Requirements 9.1**
    - `// Feature: dairy-setu, Property 19: WhatsApp message parsing round trip`
  - [ ]* 19.5 Write property test for unknown WhatsApp sender triggers registration reply (Property 20)
    - **Property 20: Unknown WhatsApp sender triggers registration reply**
    - **Validates: Requirements 9.6**
    - `// Feature: dairy-setu, Property 20: Unknown WhatsApp sender triggers registration reply`
  - [ ]* 19.6 Write property test for unparseable WhatsApp message triggers format-hint reply (Property 21)
    - **Property 21: Unparseable WhatsApp message triggers format-hint reply**
    - **Validates: Requirements 9.3**
    - `// Feature: dairy-setu, Property 21: Unparseable WhatsApp message triggers format-hint reply`

- [ ] 20. Checkpoint — WhatsApp Bridge and notifications
  - Ensure all WhatsApp parser tests and notification batching tests pass. Verify webhook handler correctly routes all three message scenarios. Ask the user if questions arise.

- [ ] 21. Socket.io wiring and real-time integration
  - [ ] 21.1 Set up Socket.io server with JWT-authenticated handshake; implement room management: distributors join `distributor:{id}` room, shopkeepers join `shopkeeper:{id}` room
    - _Requirements: 6.3_
  - [ ] 21.2 Wire all server-side Socket.io emits: `order:new`, `order:late_decision`, `connection:approved`, `connection:rejected`, `summary:updated`
    - _Requirements: 1.2, 1.3, 5.3, 6.3_
  - [ ] 21.3 Implement client-side Socket.io hooks in React: `useOrderEvents`, `useConnectionEvents`, `useSummaryEvents`; update React Query cache on incoming events
    - _Requirements: 6.3_

- [x] 22. Error handling and validation middleware
  - Implement global Express error handler returning `{ "error": { "code": "...", "message": "..." } }` for all error types
  - Add `zod` request validation middleware for all routes; return field-level 400/422 errors
  - Add rate limiting middleware for `POST /api/auth/otp/send` (3 per phone per 10 min)
  - _Requirements: 3.6, 1.6, 11.1_

- [ ] 23. Playwright end-to-end tests
  - [ ]* 23.1 Write Playwright E2E test: shopkeeper order placement flow (login → catalog → add items → review → submit → confirmation)
    - Mobile viewport (375px); axe-core accessibility check
    - _Requirements: 3.1, 3.2, 3.3, 3.7_
  - [ ]* 23.2 Write Playwright E2E test: distributor late order approval flow (receive late order → accept → verify in summary)
    - _Requirements: 5.2, 5.3, 6.1_
  - [ ]* 23.3 Write Playwright E2E test: invoice PDF download flow (distributor views order → generates invoice → downloads PDF)
    - _Requirements: 8.1, 8.2_

- [ ] 24. Final checkpoint — full integration
  - Ensure all unit tests, property tests, and E2E tests pass. Verify all Socket.io events fire correctly. Ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for a faster MVP
- Each task references specific requirements for traceability
- Property tests use `fast-check` with minimum 100 iterations; each must include the tag comment `// Feature: dairy-setu, Property N: ...`
- Checkpoints ensure incremental validation at logical milestones
- The WhatsApp Bridge (task 19) can be developed in parallel with the main web flows once the order service (task 12) is complete
