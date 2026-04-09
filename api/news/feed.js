const BLOCKCAST_FEED_URL = "https://blockcast.it/feed";

module.exports = async function handler(_req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (_req.method === "OPTIONS") {
    return res.status(204).end();
  }

  try {
    const resp = await fetch(BLOCKCAST_FEED_URL, {
      headers: {
        "cache-control": "no-cache",
        pragma: "no-cache",
        "user-agent": "ZhiDao-NewsProxy/1.0"
      }
    });

    if (!resp.ok) {
      throw new Error(`HTTP ${resp.status}`);
    }

    const text = await resp.text();
    if (!text || text.length < 120) {
      throw new Error("Feed payload is empty");
    }

    res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
    res.setHeader("Content-Type", "application/rss+xml; charset=utf-8");
    return res.status(200).send(text);
  } catch (error) {
    return res.status(502).json({
      ok: false,
      error: "Failed to fetch upstream feed",
      details: error.message || "unknown error",
      timestamp: new Date().toISOString()
    });
  }
};
