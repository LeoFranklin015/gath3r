# Gath3r

**Events, owned by you.**

Gath3r is a decentralized event management platform built on the [Arkiv Network](https://arkiv.network) (Kaolin testnet). Users create, discover, RSVP to, and check into events — with all data stored as on-chain entities. Attendance is optionally commemorated with soulbound POAP NFTs on Arbitrum Sepolia.

Users never need to know about blockchain or Arkiv — wallets are auto-created on email signup, the entire experience feels like a traditional event platform.

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
| **POAP NFT** | Lifetime | Lifetime archive, persists till end of blockchain |

TTL values are computed dynamically using `secondsUntil()` which calculates the exact seconds remaining and rounds to an even integer (required by Arkiv's block time of 2s).

### Advanced Features

- **Entity lifecycle transitions**: Events move through `draft → published → unlisted` states via entity updates. RSVPs transition from `pending → confirmed` based on approval decisions.
- **Real-time entity polling**: `useEventDetail` polls every 5 seconds, loading the event + all related RSVPs, Approvals, and Check-ins in parallel to reflect live state changes.
- **Backend entity subscriptions**: The Express server subscribes to Arkiv entity events via WebSocket (`created`, `updated`, `deleted`, `expired`, `ttl_extended`) and triggers side effects — email notifications, push notifications, and automatic faucet funding for new users.
- **Cross-chain entity-to-NFT bridge**: When a Check-in entity is created on Kaolin, the backend can mint a soulbound POAP NFT 
 — bridging Arkiv's data layer with EVM smart contracts. POAPs serve as a permanent attendance registry that persists beyond entity TTLs.
- **ENS-based identity**: Profile entities store resolved ENS names as queryable attributes, replacing raw wallet addresses with human-readable identities (e.g., `alice.eth`) across the entire UI.
- **Wallet abstraction via Privy**: Users sign up with email — embedded wallets are auto-created and silently bridged to Arkiv via `useArkivWallet`. No MetaMask, no seed phrases, no chain switching.
- **IPFS for permanent storage**: Event images and avatars are uploaded to IPFS via Pinata, producing content-addressed hashes stored in entity payloads — immutable and permanently retrievable.


## Event Lifecycle

```
1. Host creates event (draft) → publishes (published/unlisted)
2. Attendee creates RSVP → status = 'pending'
3. Host approves/rejects RSVP (if requiresApproval = true)
4. Attendee checks in via QR code scan
5. (Optional) Host mints soulbound POAP NFT to attendee
```

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

## Contributing

Contributions are welcome! To get started:

1. Fork the repository
2. Create a feature branch (`git checkout -b feat/your-feature`)
3. Commit your changes (`git commit -m "feat: add your feature"`)
4. Push to the branch (`git push origin feat/your-feature`)
5. Open a Pull Request

Please make sure your code follows the existing style and passes any linting checks before submitting.

## License

This project is licensed under the [MIT License](LICENSE).
