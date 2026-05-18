# ProSupply — Complete Project Context

> **Purpose:** Paste this document into any AI assistant (Claude, etc.) to give it full context on the ProSupply codebase before asking it to make changes.

---

## 1. What Is ProSupply?

A **B2B digital marketplace** for automotive spare parts in Egypt. Connects **buyers** (auto shops, garages, fleet owners) with **sellers** (spare parts suppliers). Features role-based access (user → seller → admin), a full checkout system, reviews, and an admin panel.

---

## 2. Root Directory

```
D:\prosupply imp\
```

| Path | Purpose |
|---|---|
| `server.js` | Entry point — connects DB, syncs, starts Express on port 5000 |
| `src/app.js` | Express app setup: security, CORS, rate limiting, route mounting, error handler |
| `src/models/` | Sequelize models + association registry (`index.js`) |
| `src/modules/` | Feature modules (ads, orders, cart, seller, reviews, admin, profile) |
| `src/middleware/` | Auth (JWT cookie), isSeller, isAdmin, validate |
| `src/utils/` | Helpers: response formatter, pagination, mailer, payment gateway stub |
| `src/config/` | Multer config for file uploads |
| `Graduation project auth/prosupply-auth/` | **DO NOT MODIFY** — Pre-existing auth module (User model, JWT, Google OAuth, Nodemailer) |
| `homepage imp/` | Frontend — vanilla HTML/JS/CSS pages |
| `uploads/` | File uploads directory (images, documents) |
| `migrations/seed-admin.js` | Seeds an initial admin user |

---

## 3. Tech Stack

| Layer | Technology |
|---|---|
| Runtime | Node.js |
| Framework | Express 4 |
| Database | PostgreSQL + Sequelize 6 (UUIDs for User, integer PKs for others) |
| Auth | JWT (httpOnly cookies), bcryptjs, Google OAuth |
| Validation | express-validator |
| File uploads | Multer (to `uploads/` folder) |
| Email | Nodemailer |
| Security | helmet, cors, express-rate-limit (global + per-route) |
| Frontend | Vanilla HTML/JS/CSS, Inter font (Google Fonts), fetch with `credentials: 'include'` |

### Key Dependencies (`package.json`)
```
bcryptjs, cookie-parser, cors, dotenv, express, express-rate-limit,
express-validator, helmet, jsonwebtoken, multer, nodemailer, pg,
pg-hstore, sequelize
```

---

## 4. Environment

The `.env` file lives at:
```
D:\prosupply imp\Graduation project auth\prosupply-auth\.env
```

Both `server.js` and `app.js` load it with `path.resolve`. Required keys:
```
DB_NAME=prosupply_db
DB_USER=...
DB_PASS=...
DB_HOST=localhost
JWT_SECRET=...
JWT_REFRESH_SECRET=...
SMTP_HOST=...
SMTP_PORT=...
SMTP_USER=...
SMTP_PASS=...
PORT=5000
```

---

## 5. Data Models

### User (from auth module — `prosupply-auth/src/models/user.model.js`)
| Field | Type | Notes |
|---|---|---|
| id | UUID | PK |
| fullName | STRING | |
| email | STRING | Unique |
| password | STRING | bcrypt hash |
| role | ENUM | `'user'`, `'admin'` |
| sellerStatus | ENUM | `'none'`, `'pending_review'`, `'approved'`, `'rejected'` |
| avgSellerRating | DECIMAL | Auto-calculated |
| isBanned | BOOLEAN | Default false |
| googleId, refreshToken, passwordResetToken, passwordResetExpires | | |

### Ad (`src/models/ad.model.js`)
| Field | Type | Notes |
|---|---|---|
| id | INTEGER | Auto-increment PK |
| sellerId | UUID | FK → User |
| title, description | STRING/TEXT | |
| brand, category, countryOfOrigin | STRING | |
| price | DECIMAL(10,2) | |
| quantity | INTEGER | Inventory count |
| warrantyMonths | INTEGER | |
| images | JSONB | Array of file paths |
| status | ENUM | `'active'`, `'deleted'` (soft delete) |
| avgRating | DECIMAL | Auto-calculated |

### Order (`src/models/order.model.js`)
| Field | Type | Notes |
|---|---|---|
| id | INTEGER | |
| buyerId, sellerId | UUID | FK → User |
| adId | INTEGER | FK → Ad |
| adTitle | STRING | Denormalized snapshot |
| unitPrice, totalPrice | DECIMAL(10,2) | |
| quantity | INTEGER | |
| paymentMethod | STRING | `'online'`, `'cod'` |
| paymentStatus | ENUM | `'pending'`, `'paid'`, `'failed'` |
| orderStatus | ENUM | `'placed'` → `'confirmed'` → `'shipped'` → `'delivered'` |

### Other Models
- **AdReview** — buyerId, adId, rating (1-5), reviewText. Unique index on (buyerId, adId).
- **SellerReview** — buyerId, sellerId, rating (1-5), comment. Unique index on (buyerId, sellerId).
- **SellerApplication** — userId, businessName, documents (JSONB), status (`pending_review`/`approved`/`rejected`).
- **CartItem** — userId, adId, quantity. Unique index on (userId, adId).
- **Notification** — userId, type, message, isRead.

### Associations (`src/models/index.js`)
```
Ad.belongsTo(User, as: 'seller')     |  User.hasMany(Ad)
Order.belongsTo(User, as: 'buyer')   |  Order.belongsTo(User, as: 'seller')
Order.belongsTo(Ad)
AdReview.belongsTo(User, as: 'buyer') | AdReview.belongsTo(Ad) | Ad.hasMany(AdReview)
SellerReview.belongsTo(User, as: 'buyer') | SellerReview.belongsTo(User, as: 'seller')
SellerApplication.belongsTo(User)    |  User.hasMany(SellerApplication)
CartItem.belongsTo(User)             |  CartItem.belongsTo(Ad) | User.hasMany(CartItem)
Notification.belongsTo(User)         |  User.hasMany(Notification)
```

---

## 6. API Endpoints

### Auth (`/api/auth` — from auth module)
| Method | Path | Auth | Description |
|---|---|---|---|
| POST | /register | — | Register new user |
| POST | /login | — | Login, sets JWT cookie |
| POST | /logout | ✅ | Clears cookie |
| POST | /forgot-password | — | Sends reset email |
| POST | /reset-password | — | Resets password with token |
| POST | /google | — | Google OAuth login |

### Ads (`/api/ads`)
| Method | Path | Auth | Description |
|---|---|---|---|
| GET | / | — | List ads (paginated: `?page=&limit=&search=&brand=&category=&countryOfOrigin=&minPrice=&maxPrice=`) |
| GET | /compare?ids=1,2,3 | — | Compare multiple ads |
| GET | /:id | — | Get single ad with reviews |
| POST | / | Seller | Create ad (multipart, up to 10 images) |
| GET | /:id/edit | Seller | Get ad for editing (owner only) |
| PUT | /:id | Seller | Update ad |
| DELETE | /:id | Seller | Soft delete ad |

### Orders (`/api/orders`)
| Method | Path | Auth | Description |
|---|---|---|---|
| POST | /checkout | User | Single-item checkout (atomic transaction, inventory deduction) |
| POST | /checkout-cart | User | Checkout entire cart |
| GET | /history | User | Buyer order history (paginated: `?page=&limit=`) |
| GET | /:id | User | Order detail (buyer or seller) |

### Orders — Seller (`/api/seller`)
| Method | Path | Auth | Description |
|---|---|---|---|
| GET | /sales | Seller | All sales for this seller |
| PUT | /:id/status | Seller | Advance order status (`{ "status": "confirmed" }`) |

**Order Status State Machine:** `placed` → `confirmed` → `shipped` → `delivered` (enforced server-side, no skipping)

### Reviews (`/api/ads/:id/rate` and `/api/sellers/:id/rate`)
| Method | Path | Auth | Description |
|---|---|---|---|
| POST | /api/ads/:id/rate | User | Rate an ad (must have delivered order) |
| POST | /api/sellers/:id/rate | User | Rate a seller (must have delivered order from them) |

### Cart (`/api/cart`)
| Method | Path | Auth | Description |
|---|---|---|---|
| GET | / | User | Get full cart with ad details |
| GET | /summary | User | Get item count + total (for navbar badge) |
| POST | / | User | Add item to cart (`{ adId, quantity }`) |
| PUT | /:adId | User | Update quantity |
| DELETE | /:adId | User | Remove item |

### Seller (`/api/seller`)
| Method | Path | Auth | Description |
|---|---|---|---|
| POST | /apply | User | Submit seller application (multipart documents) |
| GET | /dashboard | Seller | Full dashboard: stats, ads, recent sales, unread count |
| GET | /notifications | Seller | List notifications |
| PUT | /notifications/read-all | Seller | Mark all notifications as read |

### Profile (`/api/profile`)
| Method | Path | Auth | Description |
|---|---|---|---|
| GET | / | User | Get profile |
| PUT | / | User | Update profile (fullName, etc.) |
| POST | /change-password/request | User | Send password change verification email |
| POST | /change-password/confirm | User | Confirm password change with code |

### Admin (`/api/admin`) — all require admin role
| Method | Path | Description |
|---|---|---|
| GET | /dashboard | Stats: totalUsers, pendingApplications, activeAds, totalOrders |
| GET | /seller-applications?status= | List seller applications |
| GET | /seller-applications/:id | Get application detail |
| PUT | /seller-applications/:id/approve | Approve application |
| PUT | /seller-applications/:id/reject | Reject application |
| GET | /users?page=&limit=&search= | List users (paginated) |
| GET | /users/:id | Get user detail |
| PUT | /users/:id/ban | Ban user |
| PUT | /users/:id/unban | Unban user |
| DELETE | /users/:id | Delete user (with safety checks) |
| GET | /ads?page=&limit=&search= | List all ads (paginated) |
| DELETE | /ads/:id | Soft delete ad |

---

## 7. Response Format

All endpoints return:
```json
{ "success": true, "data": { ... } }
```
Or on error:
```json
{ "success": false, "message": "Error description" }
```

Paginated endpoints return:
```json
{
  "success": true,
  "data": {
    "items": [...],
    "pagination": { "page": 1, "limit": 12, "totalItems": 50, "totalPages": 5 }
  }
}
```

---

## 8. Rate Limiting

| Scope | Window | Max Requests |
|---|---|---|
| Global (`/api`) | 15 min | 200 |
| Auth (`/api/auth`) | 15 min | 10 |
| Checkout (`/api/orders/checkout`, `/checkout-cart`) | 15 min | 5 |
| Seller Apply (`/api/seller/apply`) | 60 min | 3 |

---

## 9. Module Architecture

Each module follows a consistent 5-file pattern:
```
module/
  ├── module.routes.js        — Express router, middleware chain
  ├── module.controller.js    — Request handling, calls service
  ├── module.service.js       — Business logic, validation
  ├── module.repository.js    — Database queries (Sequelize)
  └── module.validation.js    — express-validator chains
```

---

## 10. Middleware

| File | Purpose |
|---|---|
| `auth.middleware.js` | Reads JWT from `access_token` cookie, attaches `req.user` |
| `isSeller.middleware.js` | Checks `req.user.sellerStatus === 'approved'` |
| `isAdmin.middleware.js` | Checks `req.user.role === 'admin'` |
| `validate.middleware.js` | Runs express-validator and returns 400 on failure |
| `errorHandler.js` (auth module) | Global error handler with Sequelize error mapping |

---

## 11. Frontend Pages

All frontend lives in `D:\prosupply imp\homepage imp\`. Each page is a folder with its own `.html`, `.css`, and `.js`.

| Folder | Page | Theme |
|---|---|---|
| `home/` | Landing page — hero, stats, categories, featured products | Light |
| `spareparts/` | Product listing — API-driven, filters, **pagination** | Light |
| `product-detail/` | Single product — images, specs, reviews, add to cart | Light |
| `cart/` | Shopping cart — quantities, totals, checkout | Light |
| `orders/` | Order history — **paginated**, status badges | Light |
| `profile/` | User profile — edit info, change password | Light |
| `seller-apply/` | Seller application form | Light |
| `seller-dashboard/` | Seller panel — dashboard, listings, **sales tab with status buttons**, notifications, **image preview** | Dark (cyan-frame) |
| `admin/` | Admin panel — dashboard, users, ads, applications (all **paginated**) | Dark (cyan-frame) |
| `autoaccessories/` | Auto accessories category page | Light |
| `heavymachinery/` | Heavy machinery category page | Light |
| `shared/navbar-utils.js` | **Cart badge** — auto-loads on all pages, shows item count on `.cart-link` elements |

### Design System
- **Light theme** (marketplace pages): White backgrounds, navy text, amber accents
- **Dark theme** (dashboards): `--navy-dark: #0B1121`, `--cyan-bright: #00E5FF`, glassmorphic `.cyan-frame` containers
- Font: Inter (Google Fonts)
- All fetch calls use `credentials: 'include'` for cookie-based JWT

### Frontend ↔ API Communication
- Base URL: `http://localhost:5000`
- Auth: JWT in httpOnly cookie (set on login, sent automatically)
- Unauthorized (401) responses redirect to `../auth/login.html`

---

## 12. Key Design Decisions

1. **Atomic Checkout** — Sequelize transactions with row-level locking (`FOR UPDATE`) for inventory deduction. Prevents overselling.
2. **Soft Deletes** — Ads use `status: 'deleted'` instead of physical deletion. Admin and seller both use this.
3. **Denormalized Order Data** — `adTitle` and `unitPrice` are stored on the order to preserve history even if the ad changes.
4. **Dual Review System** — Separate models for ad reviews and seller ratings. Both require a delivered order as proof of purchase.
5. **Order Status Machine** — Enforced transitions: `placed → confirmed → shipped → delivered`. Server rejects invalid transitions.
6. **Modular Monolith** — All modules share one Express app and one DB, but are cleanly separated into self-contained folders.
7. **Auth Module Isolation** — The auth module in `Graduation project auth/prosupply-auth/` is pre-existing and must NOT be modified. The main app imports its User model, Sequelize instance, routes, and error handler via `path.resolve`.

---

## 13. How to Run

```bash
cd "D:\prosupply imp"
npm install
npm run seed          # Seeds admin user (first time only)
npm start             # or: npm run dev (with nodemon)
```

Server starts on `http://localhost:5000`. Frontend pages are opened directly in the browser (e.g., via Live Server on `homepage imp/home/home.html`).

---

## 14. Current State (as of April 2026)

- ✅ Server fully functional, database synced, all endpoints live
- ✅ All 10+ frontend pages integrated with API
- ✅ Pagination on: `/api/ads`, `/api/orders/history`, `/api/admin/users`, `/api/admin/ads`
- ✅ Cart badge on all marketplace pages (auto-fetches count)
- ✅ Image upload preview in seller ad creation modal
- ✅ Order status transitions (seller can advance `placed → confirmed → shipped → delivered`)
- ✅ Per-route rate limiting on checkout and seller application endpoints
- ✅ Login/register frontend exists separately (auth module) — not rebuilt

---

## 15. File Index (Backend)

```
server.js
src/
  app.js
  config/
    multer.js
  middleware/
    auth.middleware.js
    isAdmin.middleware.js
    isSeller.middleware.js
    validate.middleware.js
  models/
    index.js                    ← Association registry
    ad.model.js
    order.model.js
    adReview.model.js
    sellerReview.model.js
    sellerApplication.model.js
    cartItem.model.js
    notification.model.js
  modules/
    ads/
      ad.routes.js
      ad.controller.js
      ad.service.js
      ad.repository.js
      ad.validation.js
    orders/
      order.routes.js
      order.controller.js
      order.service.js
      order.repository.js
      order.validation.js
    cart/
      cart.routes.js
      cart.controller.js
      cart.service.js
      cart.repository.js
      cart.validation.js
    seller/
      seller.routes.js
      seller.controller.js
      seller.service.js
      seller.repository.js
      seller.validation.js
    reviews/
      review.routes.js
      review.controller.js
      review.service.js
      review.validation.js
    admin/
      admin.routes.js
      admin.controller.js
      admin.service.js
    profile/
      profile.routes.js
      profile.controller.js
      profile.service.js
      profile.validation.js
  utils/
    pagination.js
    response.js
    mailer.js
    paymentGateway.js
```
