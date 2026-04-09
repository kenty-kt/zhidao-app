const BINANCE_TICKER_24H_URLS = [
  "https://api.binance.com/api/v3/ticker/24hr",
  "https://api1.binance.com/api/v3/ticker/24hr",
  "https://api.binance.us/api/v3/ticker/24hr"
];

module.exports = async function handler(_req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (_req.method === "OPTIONS") {
    return res.status(204).end();
  }

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

      res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
      res.setHeader("X-Upstream-Source", upstream);
      return res.status(200).json(payload);
    } catch (error) {
      errors.push(`${upstream}: ${error.message || "unknown error"}`);
    }
  }

  return res.status(502).json({
    ok: false,
    error: "Failed to fetch Binance ticker",
    details: errors.join(" | ") || "unknown error",
    timestamp: new Date().toISOString()
  });
};
