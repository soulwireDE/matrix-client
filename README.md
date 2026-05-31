# Matrix Client (SoulWire)

Desktop-Matrix-Client mit Discord-ähnlicher Oberfläche: Spaces, Kanäle, Chat, E2EE und Voice/Video-Calls pro Raum über LiveKit.

Gebaut mit **React**, **Vite**, **Tauri v2** und **matrix-js-sdk**.

## Features

- Anmeldung am eigenen Matrix-Homeserver (Session wird lokal gespeichert)
- Spaces und Räume in einer Sidebar
- Chat mit Nachrichten, Antworten, Bearbeiten, Reactions
- Ende-zu-Ende-Verschlüsselung (matrix-sdk-crypto-wasm)
- Geräte-Verifizierung in Direktnachrichten
- **Voice/Video-Calls**: ein LiveKit-Raum pro Matrix-Raum (Discord-ähnlich)
  - Call starten / beitreten (Voice oder Video)
  - Mikrofon- und Kamera-Auswahl in der Call-Leiste
- Desktop-App mit eigener Titelleiste (Tauri)

## Architektur (Kurz)

| Komponente | Rolle |
|------------|--------|
| **Matrix Homeserver** | Räume, Nachrichten, Mitglieder, Call-Status (State Event) |
| **LiveKit Server** | Audio/Video-Transport (WebRTC) |
| **Token-Service** (`livekit-token-service/`) | Prüft Matrix-Login & Raum-Mitgliedschaft, stellt LiveKit-JWT aus |
| **Dieser Client** | UI, Matrix-Sync, LiveKit-Verbindung |

Call-Ablauf:

1. Nutzer startet einen Call → Matrix State Event `com.matrixclient.livekit.call` (`active: true`)
2. Andere sehen „Call aktiv“ und können per **Join** (Voice/Video) beitreten
3. Client holt ein JWT vom Token-Service und verbindet sich mit LiveKit
4. LiveKit-Raumname wird aus der Matrix-Raum-ID abgeleitet: `mx_!abc:server` → `mx_!abc_server`

## Voraussetzungen

- **Node.js** 20+ (empfohlen: 22)
- **npm**
- Für die Desktop-App: [Tauri v2 Systemabhängigkeiten](https://v2.tauri.app/start/prerequisites/) (Rust, Plattform-Tools)
- Laufender **Matrix-Server** (z. B. Synapse)
- Laufender **LiveKit-Server**
- Der **Token-Service** aus diesem Repo (lokal oder deployed)

## Installation

```bash
# Repository / Projektordner
cd matrix-client

# Frontend-Abhängigkeiten
npm install

# Token-Service-Abhängigkeiten
cd livekit-token-service
npm install
cd ..
```

## Konfiguration

### 1) Client (Projektroot)

Kopiere `.env.example` nach `.env`:

```bash
cp .env.example .env
```

| Variable | Beschreibung |
|----------|----------------|
| `VITE_LIVEKIT_URL` | Öffentliche LiveKit-WebSocket-URL, z. B. `wss://livekit.example.com` |
| `VITE_LIVEKIT_TOKEN_ENDPOINT` | URL des Token-Services, z. B. `http://localhost:8787/api/livekit/token` |

Beispiel (lokale Entwicklung):

```env
VITE_LIVEKIT_URL=wss://livekit.service.dev-nook.de
VITE_LIVEKIT_TOKEN_ENDPOINT=http://localhost:8787/api/livekit/token
```

> Nach Änderungen an `.env` den Dev-Server bzw. Tauri neu starten.

### 2) Token-Service

```bash
cd livekit-token-service
cp .env.example .env
```

| Variable | Beschreibung |
|----------|----------------|
| `PORT` | HTTP-Port (Standard: `8787`) |
| `LIVEKIT_URL` | Wie `VITE_LIVEKIT_URL` (`wss://...`) |
| `LIVEKIT_API_KEY` | Aus LiveKit `keys:` in der Server-Config |
| `LIVEKIT_API_SECRET` | Gehört zum API-Key |
| `MATRIX_BASE_URL` | Optional – Fallback, falls der Client keine Homeserver-URL mitsendet |
| `CORS_ORIGINS` | Optional – z. B. `http://localhost:5173` |

Die Homeserver-URL wird beim Join normalerweise **automatisch** aus dem eingeloggten Matrix-Client gesendet (`matrix_base_url` im Request-Body).

### Wo finde ich die Werte?

| Wert | Quelle |
|------|--------|
| Matrix Homeserver | URL beim Login, z. B. `https://matrix.service.dev-nook.de` – erreichbar, wenn Synapse „It works!“ anzeigt |
| LiveKit erreichbar? | HTTP-Health oft unter Port `7880`, z. B. `http://livekit.example.com:7880/` |
| LiveKit Client-URL | Meist `wss://<domain>` (nicht `http://...:7880`) |
| API Key / Secret | LiveKit-Config, Abschnitt `keys:` |

**Sicherheit:** API-Secrets nie ins Git committen. `.env` ist in `.gitignore` eingetragen.

## Starten (Entwicklung)

Du brauchst **zwei Prozesse**: Token-Service und Client.

### Terminal 1 – Token-Service

```bash
cd livekit-token-service
npm run dev
```

Health-Check: [http://localhost:8787/healthz](http://localhost:8787/healthz) → `{"ok":true}`

### Terminal 2 – Nur Web (Browser)

```bash
npm run dev
```

Öffne [http://localhost:5173](http://localhost:5173) (Port ist in `vite.config.js` auf `5173` fixiert).

### Terminal 2 – Desktop (Tauri)

Im Projektroot:

```bash
npm run tauri:dev
```

Tauri startet automatisch `npm run dev` und öffnet das Fenster (siehe `src-tauri/tauri.conf.json`).

## Nutzung

### Login

1. App starten
2. **Homeserver** eintragen (Standard im Login: `https://matrix.service.dev-nook.de`)
3. Matrix-Benutzername und Passwort
4. Nach erfolgreichem Login: Spaces/Kanäle in der linken Leiste wählen

### Chat

- Kanal in der Channel-Sidebar auswählen
- Nachrichten senden, mit Rechtsklick antworten / bearbeiten / reagieren
- In DMs: optional Geräte-Verifizierung über das Banner

### Voice/Video-Call

Im **Kanal-Header** (oben im Chat):

| Aktion | Button |
|--------|--------|
| Call für den Raum starten | **Call** |
| Bestehendem Call beitreten | **Join** → Voice oder Video wählen |
| Call für alle beenden | **End** |
| Nur Verbindung trennen | **Leave** (in der Call-Leiste) |

In der Call-Leiste:

- **Mikro** / **Kamera**: Gerätewahl per Dropdown
- **Mic an/aus**, **Cam an/aus**
- Bei **Video**: eigene Kamera sollte sichtbar sein, sobald die Kamera publisht

Tauri/WebView: Beim ersten Join ggf. Kamera-/Mikrofon-Berechtigung erlauben.

## NPM-Skripte

| Befehl | Beschreibung |
|--------|----------------|
| `npm run dev` | Vite-Dev-Server (Browser) |
| `npm run build` | Produktions-Build nach `dist/` |
| `npm run preview` | Build lokal testen |
| `npm run lint` | ESLint |
| `npm run tauri:dev` | Desktop-App im Entwicklungsmodus |
| `npm run tauri:build` | Installierbares Desktop-Paket bauen |

Token-Service (im Ordner `livekit-token-service/`):

| Befehl | Beschreibung |
|--------|----------------|
| `npm run dev` | Token-Service starten |

## Projektstruktur

```
matrix-client/
├── src/
│   ├── App.jsx                 # Session-Wiederherstellung, Login/Main
│   ├── components/
│   │   ├── chat/ChatArea.jsx   # Chat + Call-UI im Header
│   │   ├── call/               # LiveKit-Panel, Join-Dialog
│   │   ├── layout/             # Sidebars, MainLayout
│   │   └── verification/       # E2EE-Verifizierung
│   ├── services/
│   │   ├── livekitCalls.js     # Matrix State Events für Calls
│   │   ├── livekitToken.js     # Token-API-Client
│   │   ├── cryptoInit.js       # E2EE-Setup
│   │   └── verificationService.js
│   └── store/                  # Zustand (Zustand + Session)
├── livekit-token-service/      # Express + LiveKit JWT
├── src-tauri/                  # Tauri v2 Desktop-Shell
├── .env.example                # Client-Umgebungsvariablen
└── vite.config.js
```

## Token-API (Referenz)

`POST /api/livekit/token`

**Header:**

```
Authorization: Bearer <matrix_access_token>
Content-Type: application/json
```

**Body:**

```json
{
  "matrix_room_id": "!abc:matrix.example.com",
  "matrix_base_url": "https://matrix.example.com"
}
```

**Antwort (200):**

```json
{
  "livekit_url": "wss://livekit.example.com",
  "room_name": "mx_!abc_matrix.example.com",
  "token": "<jwt>",
  "user_id": "@user:matrix.example.com"
}
```

## Fehlerbehebung

| Problem | Mögliche Ursache / Lösung |
|---------|---------------------------|
| „Token endpoint failed“ | Token-Service läuft nicht oder `VITE_LIVEKIT_TOKEN_ENDPOINT` falsch |
| „User not joined in room“ | Nicht Mitglied des Matrix-Raums |
| „Verbinde…“ bleibt stehen | `VITE_LIVEKIT_URL` prüfen (`wss://`), LiveKit erreichbar, Firewall/ICE |
| Kein Video, nur Audio im Log | Video-Join gewählt? Kamera-Berechtigung? **Cam an** in der Call-Leiste |
| Leere Geräte-Dropdowns | Einmal Mic/Cam togglen; Browser/Tauri-Berechtigungen prüfen |
| Call-UI nicht klickbar | App neu laden (z-index-Fix ist im Call-Panel) |
| E2EE / WASM-Fehler | Dev-Server braucht COOP/COEP-Header (siehe `vite.config.js` und `tauri.conf.json`) |

## Lizenz

Privates Projekt – Lizenz nach Bedarf des Repository-Inhabers ergänzen.
