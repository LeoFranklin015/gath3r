# Gath3r

**Events, owned by you.**

Gath3r is a decentralized event management platform built on the [Arkiv Network](https://arkiv.network) (Kaolin testnet). Users create, discover, RSVP to, and check into events — with all data stored as on-chain entities. Attendance is optionally commemorated with soulbound POAP NFTs on Arbitrum Sepolia.

Users never need to know about blockchain or Arkiv — wallets are auto-created on email signup, gas is abstracted away, and the entire experience feels like a traditional event platform.

## Entity Relationship Diagram

<img width="2838" height="2718" alt="Gath3r ER Diagram — Arkiv entity relationships" src="https://github.com/user-attachments/assets/adb27c1b-6f02-457e-9ae7-a4cfd29a110c" />

## Arkiv Integration

All application data lives on-chain as **Arkiv entities** on the Kaolin testnet. There is no traditional database — Arkiv is the sole source of truth.

### Entity Schema Design

Six distinct entity types, each with typed JSON payloads and **queryable attributes** for efficient filtering:

| Entity | Queryable Attributes | Purpose |
|---|---|---|
| **Profile** | `type`, `wallet`, `ensName` | User identity (name, bio, avatar, socials) |
| **Event** | `type`, `hostWallet`, `status`, `city`, `startTime` | Event listing (title, description, location, capacity, tags) |
| **RSVP** | `type`, `eventId`, `attendeeWallet`, `status` | Registration intent from attendee |
| **Approval** | `type`, `eventId`, `attendeeWallet`, `hostWallet`, `decision` | Host's accept/reject decision on an RSVP |
| **Check-in** | `type`, `eventId`, `attendeeWallet`, `method` | Proof of attendance (QR scan) |
| **EventRecord** | `type`, `eventTxHash` | Historical record linking to original event transaction |

Attributes are set on entity creation and used for multi-attribute queries — e.g., fetching all RSVPs for a specific event, or all events in a given city with status `published`.

### Query Usage

Arkiv's query model is used extensively with `buildQuery()`, `.withAttributes(true)`, and `.withMetadata(true)`:

- **Multi-attribute filtering**: Events are queried by `status` + `city` + `startTime` simultaneously
- **Relationship traversal**: RSVPs, Approvals, and Check-ins are queried by `eventId` to load all related entities for an event
- **User-scoped queries**: Entities filtered by `attendeeWallet` or `hostWallet` to show "My Events" and "My RSVPs"
- **Status-based queries**: RSVPs filtered by `status` (pending/confirmed), Events filtered by `status` (draft/published/unlisted)

### Ownership Model

Every entity is **wallet-bound** — the creating wallet is the owner:

- **Profiles**: Owned by the user's embedded wallet. Only the owner can update their name, bio, or avatar.
- **Events**: Owned by the host's wallet. Only the host can publish, edit, or manage their event.
- **RSVPs**: Owned by the attendee's wallet. Only the attendee can create or cancel their RSVP.
- **Approvals**: Owned by the host's wallet. Only the event host can approve or reject RSVPs.
- **Check-ins**: Owned by the attendee's wallet. Created on QR scan as proof of attendance.

The `useArkivWallet` hook bridges Privy's embedded wallet to an Arkiv `WalletClient`, so all entity writes are signed by the end-user's wallet — not a project wallet.

### Entity Relationships

Entities reference each other through attribute-based keys, forming a clear relational graph:

```
Profile (wallet)
  └── Event (hostWallet → Profile.wallet)
        ├── RSVP (eventId → Event.key, attendeeWallet → Profile.wallet)
        │     └── Approval (eventId + attendeeWallet → RSVP, hostWallet → Event.hostWallet)
        └── Check-in (eventId → Event.key, attendeeWallet → Profile.wallet)
              └── EventRecord (eventTxHash → Event.txHash)
```

- Creating an RSVP references both the event (`eventId`) and the attendee (`attendeeWallet`)
- Approvals back-reference the RSVP via `eventId` + `attendeeWallet`, and the host via `hostWallet`
- Check-ins are gated by approval status — the app checks for an approved Approval entity before allowing check-in
- EventRecords provide a historical link back to the original event transaction

### Differentiated Expiration (TTL)

Each entity type has a **purpose-driven TTL** reflecting real-world product logic:

| Entity | TTL Strategy | Reasoning |
|---|---|---|
| **Profile** | 365 days (renewable) | Long-lived user identity, renewed on activity |
| **Event** | Event end time + 90 days | Stays discoverable for post-event reference |
| **RSVP** | Matches event TTL | Lives as long as the event it belongs to |
| **Approval** | Event end + 14 days | Short-lived decision record, only needed around event time |
| **Check-in** | Event end + 14 days | Proof of attendance, relevant briefly after event |
| **EventRecord** | 365 days | Historical archive, persists longer than the event itself |

TTL values are computed dynamically using `secondsUntil()` which calculates the exact seconds remaining and rounds to an even integer (required by Arkiv's block time of 2s).

### Advanced Features

- **Entity lifecycle transitions**: Events move through `draft → published → unlisted` states via entity updates. RSVPs transition from `pending → confirmed` based on approval decisions.
- **Real-time entity polling**: `useEventDetail` polls every 5 seconds, loading the event + all related RSVPs, Approvals, and Check-ins in parallel to reflect live state changes.
- **Backend entity subscriptions**: The Express server subscribes to Arkiv entity events via WebSocket (`created`, `updated`, `deleted`, `expired`, `ttl_extended`) and triggers side effects — email notifications, push notifications, and automatic faucet funding for new users.
- **Cross-chain entity-to-NFT bridge**: When a Check-in entity is created on Kaolin, the backend can mint a soulbound POAP NFT on Arbitrum Sepolia — bridging Arkiv's data layer with EVM smart contracts.

## Architecture

Monorepo with three packages:

```
.
├── web/          # Next.js frontend (PWA)
├── backend/      # Express.js event listener & notification service
└── contracts/    # Solidity smart contracts (POAP NFTs)
```

### Web (`web/`)

A **Next.js 16** App Router application serving as the primary user interface.

- **Auth**: [Privy](https://privy.io) with email + Google login. Embedded wallets are auto-created on first login.
- **Styling**: Tailwind CSS v4 with dark mode support, Shadcn UI components.
- **Chain interaction**: [Arkiv SDK](https://www.npmjs.com/package/@arkiv-network/sdk) for reading/writing on-chain entities, [viem](https://viem.sh) for low-level chain calls.
- **File storage**: Pinata (IPFS) for avatar and event image uploads.
- **PWA**: Installable with service worker, web push notifications, and standalone display mode.

#### Key Pages

| Route | Description |
|---|---|
| `/` | Splash screen with Privy login |
| `/onboarding` | 5-step profile setup (fund wallet, name, username/ENS, bio, socials) |
| `/home` | Discover events + Attending tabs with city/time/price/access filters |
| `/events/create` | Create event form (image, date/time, location, tags, options) |
| `/events/[id]` | Event detail with RSVP, approval status, QR check-in |
| `/events/hosted/[id]` | Host dashboard (registrations, check-ins, email, POAP tabs) |
| `/profile` | View/edit profile, wallet balances, event history |

#### Custom Hooks

| Hook | Purpose |
|---|---|
| `useArkivWallet` | Bridges Privy embedded wallet to an Arkiv WalletClient |
| `useEvents` | Fetches published events with optional city/time filters |
| `useMyEvents` | Fetches user's RSVPs (going/pending/draft) with status map |
| `useEventDetail` | Loads full event state: RSVPs, approvals, check-ins (5s polling) |
| `useCreateEvent` | Handles event creation + publish flow |
| `useRsvp` | RSVP and cancel operations |
| `useProfile` | CRUD for on-chain user profiles |
| `useHostedEvents` | Fetches events hosted by the current user |
| `useWalletBalances` | Reads ETH balances on Kaolin + Arbitrum Sepolia |
| `usePushNotifications` | Registers service worker for web push |

### Backend (`backend/`)

An **Express 5** server that listens to Arkiv entity events via WebSocket subscription and triggers side effects.

- **Entity subscription**: Watches for `created`, `updated`, `deleted`, `expired`, and `ttl_extended` entity events on the Kaolin chain.
- **Email notifications**: Sends transactional emails (RSVP confirmation, approval, check-in) via a Cloudflare Worker relay.
- **Push notifications**: Web push notifications for approval and check-in events.
- **Faucet**: Automatically sends 0.01 ETH (Arbitrum Sepolia) to new users when their profile entity is created.
- **POAP management**: Deploys POAP collections and mints soulbound NFTs via the smart contracts.
- **Calendar**: ICS calendar export endpoint for events.
- **Logging**: In-memory structured event log with query API.

#### API Routes

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/health` | Health check |
| `GET` | `/logs` | Query entity event log (filterable by type, action) |
| `POST` | `/poap/create` | Deploy a new EventPOAP clone for an event |
| `POST` | `/poap/mint` | Mint a soulbound POAP to an attendee |
| `GET` | `/poap/event/:eventId` | Get POAP contract address for an event |
| `GET` | `/poap/check/:eventId/:attendee` | Check if attendee has minted |
| `POST` | `/push/subscribe` | Register push notification subscription |
| `DELETE` | `/push/subscribe` | Unregister push subscription |
| `POST` | `/email/send` | Send email notification |
| `GET` | `/calendar/:eventId` | Download ICS calendar file |

### Contracts (`contracts/`)

Two Solidity contracts deployed on **Arbitrum Sepolia** (chain ID 421614):

#### `EventPOAP.sol`
A **soulbound ERC-721** with gasless voucher minting. Each clone represents one event's POAP collection.

- ERC-721 with URI storage (OpenZeppelin upgradeable)
- **Soulbound**: Transfers are blocked after minting (only mint + burn allowed)
- **EIP-712 voucher minting**: Host signs typed vouchers so attendees can claim without paying gas
- **Host mint**: Direct minting by the event host (for batch operations)
- One POAP per attendee enforced via `hasMinted` mapping

#### `POAPFactory.sol`
Deploys lightweight **ERC-1167 minimal proxy** clones of `EventPOAP` per event.

- Maps Arkiv event entity keys to deployed POAP contract addresses
- Gas-efficient deployment via OpenZeppelin Clones
- Prevents duplicate POAP collections per event

## Event Lifecycle

```
1. Host creates event (draft) → publishes (published/unlisted)
2. Attendee creates RSVP → status = 'pending'
3. Host approves/rejects RSVP (if requiresApproval = true)
4. Attendee checks in via QR code scan
5. (Optional) Host mints soulbound POAP NFT to attendee
```

## Chain Configuration

| Property | Value |
|---|---|
| **Network** | Kaolin (Arkiv testnet) |
| **Chain ID** | `60138453025` |
| **RPC** | `https://kaolin.hoodi.arkiv.network/rpc` |
| **WebSocket** | `wss://kaolin.hoodi.arkiv.network/rpc/ws` |
| **Bridge** | `0x6db217C596Cd203256058dBbFcA37d5A62161b78` |

POAP contracts are deployed on **Arbitrum Sepolia** (chain ID `421614`).

## Getting Started

### Prerequisites

- Node.js 20+
- [Bun](https://bun.sh) (used as package manager)

### Environment Variables

#### `web/.env.local`

```env
NEXT_PUBLIC_PRIVY_APP_ID=         # Privy application ID
NEXT_PUBLIC_BACKEND_URL=          # Backend API URL (default: /api/backend)
PINATA_JWT=                       # Pinata JWT for IPFS uploads
```

#### `backend/.env`

```env
PORT=3001                         # Server port
PRIVY_APP_ID=                     # Privy app ID for server-side auth
PRIVY_APP_SECRET=                 # Privy app secret
POAP_DEPLOYER_PRIVATE_KEY=        # Private key for POAP deployment + faucet
POAP_FACTORY_ADDRESS=             # Deployed POAPFactory contract address
VAPID_PUBLIC_KEY=                 # Web push VAPID public key
VAPID_PRIVATE_KEY=                # Web push VAPID private key
```

#### `contracts/.env`

```env
ARB_SEPOLIA_RPC_URL=              # Arbitrum Sepolia RPC URL
DEPLOYER_PRIVATE_KEY=             # Deployer private key
```

### Installation

```bash
# Install dependencies for all packages
cd web && bun install
cd ../backend && bun install
cd ../contracts && bun install
```

### Development

```bash
# Terminal 1: Frontend (port 3000)
cd web && bun dev

# Terminal 2: Backend (port 3001)
cd backend && bun dev
```

### Smart Contracts

```bash
cd contracts

# Compile
bun run compile

# Deploy to Arbitrum Sepolia
bun run deploy:arb-sepolia
```

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 16, React 19, TypeScript |
| Styling | Tailwind CSS v4, Shadcn UI, Lucide icons |
| Auth | Privy (email + Google, embedded wallets) |
| Data layer | Arkiv Network SDK (on-chain entities) |
| File storage | Pinata / IPFS |
| Backend | Express 5, tsx |
| Smart contracts | Solidity 0.8.24, Hardhat, OpenZeppelin v5 |
| Chains | Kaolin (Arkiv testnet), Arbitrum Sepolia |
| Notifications | Web Push (VAPID), Cloudflare Workers (email) |
| QR | html5-qrcode (scanning), qrcode.react (generation) |
