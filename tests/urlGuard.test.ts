import { afterEach, describe, expect, it } from 'vitest';
import { isHostAllowed, isPrivateIp, validateScanUrl } from '../server/security/urlGuard';

describe('isPrivateIp', () => {
  it.each(['127.0.0.1', '10.1.2.3', '172.16.5.4', '192.168.1.1', '169.254.169.254', '100.64.0.1', '0.0.0.0', '::1', '::', 'fd00::1', 'fe80::1', '::ffff:127.0.0.1'])(
    'blocks %s',
    (ip) => expect(isPrivateIp(ip)).toBe(true),
  );

  it.each(['8.8.8.8', '1.1.1.1', '93.184.215.14', '2606:4700:4700::1111'])('allows %s', (ip) => expect(isPrivateIp(ip)).toBe(false));
});

describe('validateScanUrl', () => {
  afterEach(() => {
    delete process.env.ALLOW_PRIVATE_URLS;
  });

  it.each([
    ['ftp://example.com', /http and https/],
    ['javascript:alert(1)', /http and https/],
    ['not a url', /valid URL/],
    ['http://user:pass@8.8.8.8/', /credentials/],
    ['http://localhost:3000', /private/],
    ['http://127.0.0.1/', /private/],
    ['http://[::1]/', /private/],
    ['http://169.254.169.254/latest/meta-data', /private/],
    ['http://10.0.0.5/', /private/],
  ])('rejects %s', async (url, message) => {
    await expect(validateScanUrl(url)).rejects.toThrow(message);
  });

  it('accepts a public IP literal', async () => {
    const url = await validateScanUrl('https://8.8.8.8/path');
    expect(url.hostname).toBe('8.8.8.8');
  });

  it('allows private hosts when explicitly enabled', async () => {
    process.env.ALLOW_PRIVATE_URLS = 'true';
    expect(await isHostAllowed('localhost')).toBe(true);
  });
});
