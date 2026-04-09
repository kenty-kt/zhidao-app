const express = require("express");
const cors = require("cors");
const crypto = require("crypto");
require("dotenv").config();

const app = express();
const port = Number(process.env.PORT || 8787);
const host = process.env.HOST || "127.0.0.1";
const BLOCKCAST_FEED_URL = "https://blockcast.it/feed";
const BINANCE_TICKER_24H_URLS = [
  "https://api.binance.com/api/v3/ticker/24hr",
  "https://api1.binance.com/api/v3/ticker/24hr",
  "https://api.binance.us/api/v3/ticker/24hr"
];

app.use(cors({ origin: true }));
app.use(express.json({ limit: "1mb" }));
app.use(express.static("."));

const wallets = [
  {
    walletId: "wallet_demo_001",
    walletName: "ZhiDao Primary Wallet",
    address: "0x2a8d2fF2d815A4e31A9B2a9B1d35E8Dd71A6dF23",
    chain: "ethereum-sepolia",
    balance: "1.28045"
  }
];

function nowIso() {
  return new Date().toISOString();
}

function hashToHex(input, bytes = 32) {
  return "0x" + crypto.createHash("sha256").update(input).digest("hex").slice(0, bytes * 2);
}

function requireFields(body, fields) {
  const missing = fields.filter((f) => !body || !String(body[f] || "").trim());
  return missing;
}

app.get("/health", (_req, res) => {
  res.json({
    ok: true,
    service: "turnkey-proxy",
    mode: "mock",
    timestamp: nowIso()
  });
});

app.get("/", (_req, res) => {
  res.redirect("/wallet.html");
});

app.post("/turnkey/whoami", (req, res) => {
  const { organizationId = "", userTag = "" } = req.body || {};
  res.json({
    ok: true,
    mode: "mock",
    organizationId: organizationId || "org_demo",
    user: {
      userId: userTag || "user_demo_001",
      userName: userTag || "demo-user",
      authMethods: ["email_otp", "passkey", "wallet"]
    },
    timestamp: nowIso()
  });
});

app.post("/turnkey/wallets/list", (_req, res) => {
  res.json({
    ok: true,
    mode: "mock",
    wallets,
    timestamp: nowIso()
  });
});

app.post("/turnkey/wallets/create", (req, res) => {
  const walletName = String(req.body?.walletName || "New Wallet").trim();
  const chain = String(req.body?.chain || "ethereum-sepolia").trim();
  const walletId = `wallet_${Date.now()}`;
  const address = hashToHex(`${walletId}:${walletName}`, 20);

  const created = {
    walletId,
    walletName,
    address,
    chain,
    balance: "0.00000"
  };
  wallets.unshift(created);

  res.json({
    ok: true,
    mode: "mock",
    wallet: created,
    timestamp: nowIso()
  });
});

app.post("/turnkey/sign-message", (req, res) => {
  const missing = requireFields(req.body, ["walletAddress", "message"]);
  if (missing.length) {
    return res.status(400).json({
      ok: false,
      error: `Missing required fields: ${missing.join(", ")}`
    });
  }

  const walletAddress = String(req.body.walletAddress).trim();
  const message = String(req.body.message).trim();
  const signature = hashToHex(`${walletAddress}:${message}:${Date.now()}`, 65);

  return res.json({
    ok: true,
    mode: "mock",
    walletAddress,
    message,
    signature,
    timestamp: nowIso()
  });
});

app.post("/turnkey/send-transaction", (req, res) => {
  const missing = requireFields(req.body, ["fromAddress", "toAddress", "amount", "chain"]);
  if (missing.length) {
    return res.status(400).json({
      ok: false,
      error: `Missing required fields: ${missing.join(", ")}`
    });
  }

  const fromAddress = String(req.body.fromAddress).trim();
  const toAddress = String(req.body.toAddress).trim();
  const amount = String(req.body.amount).trim();
  const chain = String(req.body.chain).trim();
  const txHash = hashToHex(`${fromAddress}:${toAddress}:${amount}:${chain}:${Date.now()}`, 32);

  return res.json({
    ok: true,
    mode: "mock",
    tx: {
      txHash,
      chain,
      fromAddress,
      toAddress,
      amount,
      status: "submitted"
    },
    timestamp: nowIso()
  });
});

app.get("/api/news/feed", async (_req, res) => {
  try {
    const feedUrl = new URL(BLOCKCAST_FEED_URL);
    feedUrl.searchParams.set("_", String(Date.now()));

    const resp = await fetch(feedUrl.toString(), {
      headers: {
        "cache-control": "no-cache",
        pragma: "no-cache",
        "user-agent": "ZhiDao-NewsProxy/1.0"
      }
    });
    if (!resp.ok) {
      throw new Error(`HTTP ${resp.status}`);
    }

    const xml = await resp.text();
    if (!xml || xml.length < 120) {
      throw new Error("Feed payload is empty");
    }

    res.set("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
    res.type("application/rss+xml; charset=utf-8");
    return res.send(xml);
  } catch (error) {
    return res.status(502).json({
      ok: false,
      error: "Failed to fetch upstream feed",
      details: error.message || "unknown error",
      timestamp: nowIso()
    });
  }
});

app.get("/api/markets/binance-24hr", async (_req, res) => {
  const errors = [];

  for (const upstream of BINANCE_TICKER_24H_URLS) {
    try {
      const resp = await fetch(upstream, {
        headers: {
          "cache-control": "no-cache",
          pragma: "no-cache",
          "user-agent": "ZhiDao-MarketProxy/1.0"
        }
      });
      if (!resp.ok) {
        throw new Error(`HTTP ${resp.status}`);
      }

      const payload = await resp.json();
      if (!Array.isArray(payload) || !payload.length) {
        throw new Error("Binance payload is empty");
      }

      res.set("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
      res.set("X-Upstream-Source", upstream);
      return res.json(payload);
    } catch (error) {
      errors.push(`${upstream}: ${error.message || "unknown error"}`);
    }
  }

  {
    return res.status(502).json({
      ok: false,
      error: "Failed to fetch Binance ticker",
      details: errors.join(" | ") || "unknown error",
      timestamp: nowIso()
    });
  }
});

app.listen(port, host, () => {
  console.log(`turnkey-proxy running on http://${host}:${port}`);
});
