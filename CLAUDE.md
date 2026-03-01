# Gather — Claude Rules

## Project Overview
Gather is a **production-ready** web3 application built on the Kaolin testnet (Arkiv Network).

## Code Quality Standards

### Always use components
- Extract any non-trivial UI into its own component under `web/app/components/`
- Never inline complex UI directly in page files
- Components should be focused, single-responsibility, and reusable

### File & folder structure
```
web/app/
  components/      # Reusable UI components
  hooks/           # Custom React hooks
  lib/             # Utilities, chain configs, constants
  (routes)/        # Next.js App Router pages
```

### Component rules
- Named exports for components (`export function Foo`)
- Co-locate small private helpers (icons, sub-components) at the bottom of the file
- Use TypeScript — always type props explicitly
- `"use client"` only where needed; prefer server components where possible

### Styling
- Use Tailwind CSS utility classes
- Support dark mode via `dark:` variants
- No inline styles

### Hooks
- Extract stateful logic into custom hooks under `web/app/hooks/`
- Never duplicate stateful logic across components

### Chain config
- Chain: **Kaolin** (Network ID: `60138453025`)
- RPC: `https://kaolin.hoodi.arkiv.network/rpc`
- WS: `wss://kaolin.hoodi.arkiv.network/rpc/ws`
- Bridge: `0x6db217C596Cd203256058dBbFcA37d5A62161b78`
- Definition lives in `web/lib/chains.ts` — import from there, never hardcode

### Auth
- Privy (`@privy-io/react-auth`) for auth + embedded wallets
- Login methods: email only
- Embedded wallet auto-created on first login (`users-without-wallets`)
- App ID via `NEXT_PUBLIC_PRIVY_APP_ID`
