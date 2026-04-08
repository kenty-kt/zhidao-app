# Turnkey Proxy (Local)

This project now includes a local proxy server used by `wallet.html`.

## 1. Install dependencies

```bash
npm install
```

## 2. Start server

```bash
npm start
```

Server URL:

- `http://localhost:8787`

Health check:

- `GET /health`

## 3. Available endpoints

- `POST /turnkey/whoami`
- `POST /turnkey/wallets/list`
- `POST /turnkey/wallets/create`
- `POST /turnkey/sign-message`
- `POST /turnkey/send-transaction`

## Notes

- Current implementation is **mock mode** for fast UI integration.
- You can replace each route handler in `server.js` with real Turnkey SDK/API calls later.
