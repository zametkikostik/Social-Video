import { createVerify, createHash } from 'crypto';
import { Logger } from '@nestjs/common';

const logger = new Logger('VerifyHttpSignature');

export async function verifyIncomingSignature(opts: {
  method: string;
  path: string;
  headers: Record<string, string | string[] | undefined>;
  body?: string;
  requireSignature?: boolean;
}): Promise<{ ok: boolean; keyId?: string; error?: string }> {
  const h = lowerHeaders(opts.headers);
  const sigHeader = h['signature'];
  if (!sigHeader) {
    if (opts.requireSignature) return { ok: false, error: 'Missing Signature header' };
    return { ok: true };
  }

  const parts = parseSignatureHeader(Array.isArray(sigHeader) ? sigHeader[0] : sigHeader);
  if (!parts.keyId || !parts.signature) return { ok: false, error: 'Malformed Signature header' };

  const headerList = (parts.headers || '(request-target) host date').split(/\s+/);

  if (headerList.includes('digest') && opts.body != null) {
    const expected = 'SHA-256=' + createHash('sha256').update(opts.body).digest('base64');
    if (h['digest'] && h['digest'] !== expected) return { ok: false, error: 'Digest mismatch' };
  }

  const lines: string[] = [];
  for (const name of headerList) {
    if (name === '(request-target)') {
      lines.push(`(request-target): ${opts.method.toLowerCase()} ${opts.path}`);
    } else {
      const val = h[name];
      if (val == null) return { ok: false, error: `Missing header ${name}` };
      lines.push(`${name}: ${val}`);
    }
  }

  let publicKeyPem: string | undefined;
  try {
    publicKeyPem = await fetchPublicKey(parts.keyId);
  } catch (e: any) {
    logger.warn(`Key fetch failed ${parts.keyId}: ${e.message}`);
    return { ok: false, error: 'Could not fetch public key' };
  }
  if (!publicKeyPem) return { ok: false, error: 'No public key' };

  try {
    const verifier = createVerify('RSA-SHA256');
    verifier.update(lines.join('\n'));
    verifier.end();
    const ok = verifier.verify(publicKeyPem, parts.signature, 'base64');
    return ok ? { ok: true, keyId: parts.keyId } : { ok: false, error: 'Signature invalid', keyId: parts.keyId };
  } catch (e: any) {
    return { ok: false, error: e.message };
  }
}

function lowerHeaders(headers: Record<string, string | string[] | undefined>) {
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(headers)) {
    if (v == null) continue;
    out[k.toLowerCase()] = Array.isArray(v) ? v.join(', ') : String(v);
  }
  return out;
}

function parseSignatureHeader(header: string) {
  const result: Record<string, string> = {};
  const re = /([a-zA-Z]+)=(?:"([^"]*)"|([^\s,]+))/g;
  let m;
  while ((m = re.exec(header))) result[m[1]] = m[2] ?? m[3];
  return result as { keyId?: string; headers?: string; signature?: string };
}

async function fetchPublicKey(keyId: string) {
  const actorUrl = keyId.split('#')[0];
  const res = await fetch(actorUrl, {
    headers: { Accept: 'application/activity+json, application/ld+json' },
  });
  if (!res.ok) return undefined;
  const actor = await res.json();
  return actor.publicKey?.publicKeyPem || actor.publicKeyPem;
}
