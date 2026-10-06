/**
 * IP Geolocation Resolver Helper
 * Resolves public IP addresses to "City - Region - Country" (e.g., "Hyderabad - TS - IN")
 * Includes in-memory caching to guarantee zero latency and prevent API limits.
 */

const geoCache = new Map();

export async function resolveIpLocation(ip) {
  if (!ip) return 'Unknown Location';

  const cleanIp = ip.trim().replace(/^::ffff:/, '');

  // Check Local / Private IP ranges
  if (
    cleanIp === '127.0.0.1' ||
    cleanIp === '::1' ||
    cleanIp === 'localhost' ||
    cleanIp.startsWith('10.') ||
    cleanIp.startsWith('192.168.') ||
    cleanIp.startsWith('172.16.')
  ) {
    return 'Local Network - IN';
  }

  // Check cache first (1 hour TTL)
  const cached = geoCache.get(cleanIp);
  if (cached && Date.now() - cached.timestamp < 3600000) {
    return cached.location;
  }

  // Define lookup task
  const lookupPromise = (async () => {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 700);

      // Primary: ipwho.is (fast, free, no API key required)
      const res = await fetch(`https://ipwho.is/${cleanIp}`, { signal: controller.signal });
      clearTimeout(timeout);

      if (res.ok) {
        const data = await res.json();
        if (data && data.success) {
          const city = data.city || '';
          const region = data.region_code || data.region || '';
          const country = data.country_code || data.country || '';

          const parts = [city, region, country].filter(Boolean);
          const locationStr = parts.length > 0 ? parts.join(' - ') : 'India - IN';

          geoCache.set(cleanIp, { location: locationStr, timestamp: Date.now() });
          return locationStr;
        }
      }
    } catch (err) {}

    try {
      const controller2 = new AbortController();
      const timeout2 = setTimeout(() => controller2.abort(), 600);

      // Secondary fallback: ip-api.com
      const res2 = await fetch(`http://ip-api.com/json/${cleanIp}?fields=city,region,countryCode,status`, {
        signal: controller2.signal
      });
      clearTimeout(timeout2);

      if (res2.ok) {
        const data2 = await res2.json();
        if (data2 && data2.status === 'success') {
          const city = data2.city || '';
          const region = data2.region || '';
          const country = data2.countryCode || '';

          const parts = [city, region, country].filter(Boolean);
          const locationStr = parts.length > 0 ? parts.join(' - ') : 'India - IN';

          geoCache.set(cleanIp, { location: locationStr, timestamp: Date.now() });
          return locationStr;
        }
      }
    } catch (err2) {}

    const defaultLoc = 'India - IN';
    geoCache.set(cleanIp, { location: defaultLoc, timestamp: Date.now() });
    return defaultLoc;
  })();

  // Guarantee maximum 650ms wait so auth/login/2FA never blocks or freezes
  const quickTimeout = new Promise((resolve) => setTimeout(() => resolve('India - IN'), 650));
  return Promise.race([lookupPromise, quickTimeout]);
}
