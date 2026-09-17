import { createSign, createHash } from 'crypto';
import { Logger } from '@nestjs/common';

const logger = new Logger('HttpSignature');

/** draft-cavage HTTP Signatures for ActivityPub delivery */
export function signRequest(opts: {
  method: string;
  url: string;
  body: string;
  privateKeyPem: string;
  keyId: string;
}): Record<string, string> {
  const u = new URL(opts.url);
  const date = new Date().toUTCString();
  const digest =
    'SHA-256=' + createHash('sha256').update(opts.body).digest('base64');
  const requestTarget = `${opts.method.toLowerCase()} ${u.pathname}${u.search}`;
  const signingString = [
    `(request-target): ${requestTarget}`,
    `host: ${u.host}`,
    `date: ${date}`,
    `digest: ${digest}`,
  ].join('\n');

  const signer = createSign('RSA-SHA256');
  signer.update(signingString);
  signer.end();
  const signature = signer.sign(opts.privateKeyPem, 'base64');

  return {
    Host: u.host,
    Date: date,
    Digest: digest,
    'Content-Type': 'application/activity+json',
    Accept: 'application/activity+json',
    Signature: `keyId="${opts.keyId}",algorithm="rsa-sha256",headers="(request-target) host date digest",signature="${signature}"`,
  };
}

export async function deliverToInbox(
  inboxUrl: string,
  activity: Record<string, unknown>,
  keyId: string,
  privateKeyPem: string,
): Promise<{ ok: boolean; status?: number; error?: string }> {
  const body = JSON.stringify(activity);
  try {
    const headers = signRequest({
      method: 'POST',
      url: inboxUrl,
      body,
      privateKeyPem,
      keyId,
    });
    const res = await fetch(inboxUrl, { method: 'POST', headers, body });
    if (!res.ok) {
      const text = await res.text().catch(() => '');
      logger.warn(`Delivery failed ${inboxUrl}: ${res.status}`);
      return { ok: false, status: res.status, error: text.slice(0, 200) };
    }
    logger.log(`Delivered to ${inboxUrl} (${res.status})`);
    return { ok: true, status: res.status };
  } catch (e: any) {
    logger.warn(`Delivery error ${inboxUrl}: ${e.message}`);
    return { ok: false, error: e.message };
  }
}
