# React + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and [`typescript-eslint`](https://typescript-eslint.io) in your project.

## LiveKit integration (Matrix room calls)

This client supports one LiveKit call per Matrix room.

### 1) Frontend env

Copy `.env.example` to `.env` and set values:

- `VITE_LIVEKIT_URL`: public LiveKit WebSocket URL (usually `wss://...`)
- `VITE_LIVEKIT_TOKEN_ENDPOINT`: URL to the token service endpoint

### 2) Token service

A minimal token service is included in `livekit-token-service`.

Setup:

1. `cd livekit-token-service`
2. copy `.env.example` to `.env`
3. fill in:
   - `LIVEKIT_URL`
   - `LIVEKIT_API_KEY`
   - `LIVEKIT_API_SECRET`
4. `npm install`
5. `npm run dev`

Token endpoint:

- `POST /api/livekit/token`
- Requires Matrix access token in `Authorization: Bearer <token>`
- Body: `{ "matrix_room_id": "!room:example.com", "matrix_base_url": "https://matrix.example.com" }`

### 3) Where to find concrete values

- `LIVEKIT_URL` / `VITE_LIVEKIT_URL`:
  - from your LiveKit server domain (for browser clients usually `wss://<domain>`)
  - your health endpoint is reachable at [http://livekit.service.dev-nook.de:7880/](http://livekit.service.dev-nook.de:7880/)
- `LIVEKIT_API_KEY` and `LIVEKIT_API_SECRET`:
  - from your LiveKit server config/environment (the same credentials used by server-side integrations)
- `matrix_base_url`:
  - wird vom Frontend automatisch aus dem Matrix-Login übernommen
- `VITE_LIVEKIT_TOKEN_ENDPOINT`:
  - where your token service is exposed, e.g. `http://localhost:8787/api/livekit/token` (local dev) or your public API URL
