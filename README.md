# GPT Organizer — Backend API 🗂️

> **Note:** This repository contains the **server-side logic** (API & database) for the GPT Organizer Chrome Extension. The client-side code lives in a separate private repository.

## 🚀 Overview

GPT Organizer is a SaaS Chrome Extension that enhances the ChatGPT interface by letting users organize conversations into folders, star messages, and manage their account — all synced to the cloud.

This backend acts as the source of truth for user data and payment status. It handles secure subscription management via **Stripe**, JWT-based authentication, and persistent storage of folder structures and starred messages.

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| Runtime | Node.js 18+ |
| Framework | Express.js 5 |
| Database | PostgreSQL (via Prisma ORM) |
| Authentication | JWT + HttpOnly Cookies |
| Payments | Stripe (Checkout & Webhooks) |
| Dev tooling | Nodemon, Prisma CLI |

## 💳 Stripe Integration

This project implements a full subscription lifecycle:

1. **Checkout Sessions** — generates ephemeral sessions so users subscribe securely on Stripe-hosted pages.
2. **Customer Portal** — allows users to manage billing, update payment methods, and cancel subscriptions without any custom UI.
3. **Webhook Handling** — listens for asynchronous Stripe events at `/webhook/stripe`:
   - `checkout.session.completed` → upgrades user to `pro` plan immediately.
   - `customer.subscription.created/updated` → keeps plan status in sync.
   - `customer.subscription.deleted` → revokes access and downgrades to `free`.
4. **Signature Verification** — validates the `stripe-signature` header on every webhook request to prevent replay attacks.

## 🧩 Architecture

```
[Chrome Extension] <-> [Express API] <-> [PostgreSQL]
                             ^
                      [Stripe Webhooks]
```

## 🔌 API Endpoints

### Auth — `/auth`
| Method | Route | Description |
|---|---|---|
| POST | `/register` | Register a new user |
| POST | `/login` | Login and receive JWT cookie |
| POST | `/logout` | Clear session cookie |
| GET | `/validate` | Validate current session |
| PUT | `/change-password` | Change password (auth required) |
| DELETE | `/delete-user` | Delete account and all data (auth required) |

### Chats — `/chats` *(auth + pro plan required)*
| Method | Route | Description |
|---|---|---|
| GET | `/` | Get all saved chats |
| POST | `/` | Save a chat |
| PUT | `/:id` | Update a chat (title, folder) |
| DELETE | `/:id` | Delete a chat |

### Folders — `/folders` *(auth + pro plan required)*
| Method | Route | Description |
|---|---|---|
| GET | `/` | Get folder tree |
| POST | `/` | Create a folder |
| PUT | `/:id` | Update folder (name, color, parent) |
| DELETE | `/:id` | Delete folder and its contents |

### Starred Messages — `/messages` *(auth + pro plan required)*
| Method | Route | Description |
|---|---|---|
| GET | `/` | Get starred messages for a chat |
| POST | `/` | Star a message |
| DELETE | `/:id` | Unstar a message |

### Billing — `/billing` *(auth required)*
| Method | Route | Description |
|---|---|---|
| POST | `/checkout` | Create a Stripe Checkout session |
| POST | `/portal` | Create a Stripe Customer Portal session |
| GET | `/status` | Get current subscription status |

### Webhooks — `/webhook`
| Method | Route | Description |
|---|---|---|
| POST | `/stripe` | Receive and process Stripe events |

## 🔐 Auth & Plan Middleware

- **`authenticateToken`** — verifies the JWT from the HttpOnly cookie and attaches `req.user`.
- **`requireProPlan`** — checks that the user has an active `pro` plan or a valid trial period before granting access to premium routes.

## 🗄️ Data Model

```
User
 ├── Chats (linked to ChatGPT conversation IDs)
 ├── Folders (nested, with color support)
 └── StarredMessages (by chatId + messageIndex)
```

## 🔧 Setup & Installation

**1. Clone the repository**
```bash
git clone https://github.com/OscarFermu13/gpt-organizer-backend.git
cd gpt-organizer-backend
```

**2. Install dependencies**
```bash
npm install
```

**3. Configure environment variables**

Copy `.env.example` and fill in your values:
```bash
cp .env.example .env
```

**4. Run database migrations**
```bash
npm run migrate
```

**5. Start the server**
```bash
# Development
npm run dev

# Production
npm start
```

## 🌍 Environment Variables

See `.env.example` for the full list. Key variables:

```env
DATABASE_URL=postgresql://...
JWT_SECRET=...
STRIPE_SECRET_KEY=sk_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PRICE_ID=price_...
FRONTEND_URL=https://...
PORT=4000
```
