const requests = new Map();

export function publicRateLimit(req, res, next) {
  const now = Date.now();
  const key = req.ip;
  const recent = (requests.get(key) ?? []).filter((timestamp) => now - timestamp < 60_000);
  if (recent.length >= 60) {
    return res.status(429).json({
      error: { code: 'RATE_LIMITED', message: 'Too many requests.' },
    });
  }
  recent.push(now);
  requests.set(key, recent);
  return next();
}
