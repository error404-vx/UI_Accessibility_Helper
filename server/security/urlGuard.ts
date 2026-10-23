import dns from 'node:dns/promises';
import net from 'node:net';

export class UrlGuardError extends Error {}

const MAX_URL_LENGTH = 2048;

function ipv4ToInt(ip: string): number {
  return ip.split('.').reduce((acc, part) => (acc << 8) + Number(part), 0) >>> 0;
}

const PRIVATE_V4: [string, number][] = [
  ['0.0.0.0', 8],
  ['10.0.0.0', 8],
  ['100.64.0.0', 10],
  ['127.0.0.0', 8],
  ['169.254.0.0', 16],
  ['172.16.0.0', 12],
  ['192.0.0.0', 24],
  ['192.0.2.0', 24],
  ['192.168.0.0', 16],
  ['198.18.0.0', 15],
  ['198.51.100.0', 24],
  ['203.0.113.0', 24],
  ['224.0.0.0', 4],
  ['240.0.0.0', 4],
];

function isPrivateV4(ip: string): boolean {
  const value = ipv4ToInt(ip);
  return PRIVATE_V4.some(([base, bits]) => {
    const mask = bits === 0 ? 0 : (~0 << (32 - bits)) >>> 0;
    return (value & mask) === (ipv4ToInt(base) & mask);
  });
}

export function isPrivateIp(ip: string): boolean {
  const version = net.isIP(ip);
  if (version === 4) return isPrivateV4(ip);
  if (version === 6) {
    const lower = ip.toLowerCase();
    const mapped = lower.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/);
    if (mapped) return isPrivateV4(mapped[1]);
    if (lower === '::' || lower === '::1') return true;
    const first = parseInt(lower.split(':')[0] || '0', 16);
    if ((first & 0xfe00) === 0xfc00) return true; // fc00::/7 unique local
    if ((first & 0xffc0) === 0xfe80) return true; // fe80::/10 link local
    if ((first & 0xff00) === 0xff00) return true; // ff00::/8 multicast
    return false;
  }
  return true;
}

function privateAllowed(): boolean {
  return process.env.ALLOW_PRIVATE_URLS === 'true';
}

export async function isHostAllowed(hostname: string, cache?: Map<string, boolean>): Promise<boolean> {
  if (privateAllowed()) return true;
  const host = hostname.replace(/^\[|\]$/g, '').toLowerCase();
  const cached = cache?.get(host);
  if (cached !== undefined) return cached;

  let allowed: boolean;
  if (host === 'localhost' || host.endsWith('.localhost')) {
    allowed = false;
  } else if (net.isIP(host)) {
    allowed = !isPrivateIp(host);
  } else {
    try {
      const records = await dns.lookup(host, { all: true, verbatim: true });
      allowed = records.length > 0 && records.every((r) => !isPrivateIp(r.address));
    } catch {
      allowed = false;
    }
  }
  cache?.set(host, allowed);
  return allowed;
}

/** Validates a user-supplied URL to prevent SSRF against internal networks. */
export async function validateScanUrl(raw: string): Promise<URL> {
  if (typeof raw !== 'string' || raw.length === 0) throw new UrlGuardError('Please enter a URL.');
  if (raw.length > MAX_URL_LENGTH) throw new UrlGuardError('The URL is too long.');

  let url: URL;
  try {
    url = new URL(raw.trim());
  } catch {
    throw new UrlGuardError('That does not look like a valid URL. Include http:// or https://.');
  }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    throw new UrlGuardError('Only http and https URLs can be scanned.');
  }
  if (url.username || url.password) {
    throw new UrlGuardError('URLs with embedded credentials are not allowed.');
  }
  if (!(await isHostAllowed(url.hostname))) {
    throw new UrlGuardError(
      'This address points to a private, local, or unresolvable host and cannot be scanned. Set ALLOW_PRIVATE_URLS=true to scan local sites.',
    );
  }
  return url;
}
