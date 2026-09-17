import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

/**
 * Optional IPFS pinning layer.
 * Supports Kubo, Pinata, web3.storage.
 * When IPFS_ENABLED=false, all methods no-op.
 */
@Injectable()
export class IpfsService {
  private readonly logger = new Logger(IpfsService.name);
  private readonly enabled: boolean;
  private readonly provider: string;
  private readonly apiUrl: string;
  private readonly pinataJwt?: string;
  private readonly web3Token?: string;
  private readonly publicGateway: string;

  constructor(private config: ConfigService) {
    this.enabled = this.config.get('IPFS_ENABLED') === 'true';
    this.provider = this.config.get('IPFS_PROVIDER') || 'kubo';
    this.apiUrl = this.config.get('IPFS_API_URL') || 'http://127.0.0.1:5001';
    this.pinataJwt = this.config.get('PINATA_JWT');
    this.web3Token = this.config.get('WEB3_STORAGE_TOKEN');
    this.publicGateway =
      this.config.get('IPFS_GATEWAY') || 'https://ipfs.io/ipfs';

    if (this.enabled) {
      this.logger.log(`IPFS enabled via provider: ${this.provider}`);
    }
  }

  isEnabled(): boolean {
    return this.enabled;
  }

  async pinBuffer(
    data: Buffer,
    filename = 'file',
  ): Promise<{ cid: string; gatewayUrl: string } | null> {
    if (!this.enabled) return null;

    try {
      if (this.provider === 'pinata') {
        return await this.pinViaPinata(data, filename);
      }
      if (this.provider === 'web3storage') {
        return await this.pinViaWeb3Storage(data, filename);
      }
      return await this.pinViaKubo(data, filename);
    } catch (err: any) {
      this.logger.warn(`IPFS pin failed: ${err.message}`);
      return null;
    }
  }

  async pinFromUrl(
    url: string,
    filename = 'video',
  ): Promise<{ cid: string; gatewayUrl: string } | null> {
    if (!this.enabled) return null;

    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error(`Fetch failed: ${res.status}`);
      const buf = Buffer.from(await res.arrayBuffer());
      return this.pinBuffer(buf, filename);
    } catch (err: any) {
      this.logger.warn(`IPFS pinFromUrl failed: ${err.message}`);
      return null;
    }
  }

  gatewayUrl(cid: string): string {
    return `${this.publicGateway.replace(/\/$/, '')}/${cid}`;
  }

  private async pinViaKubo(
    data: Buffer,
    filename: string,
  ): Promise<{ cid: string; gatewayUrl: string }> {
    const form = new FormData();
    form.append('file', new Blob([data]), filename);

    const res = await fetch(`${this.apiUrl}/api/v0/add?pin=true`, {
      method: 'POST',
      body: form as any,
    });

    if (!res.ok) {
      throw new Error(`Kubo add failed: ${res.status} ${await res.text()}`);
    }

    const json = (await res.json()) as { Hash: string };
    const cid = json.Hash;
    return { cid, gatewayUrl: this.gatewayUrl(cid) };
  }

  private async pinViaPinata(
    data: Buffer,
    filename: string,
  ): Promise<{ cid: string; gatewayUrl: string }> {
    if (!this.pinataJwt) throw new Error('PINATA_JWT not set');

    const form = new FormData();
    form.append('file', new Blob([data]), filename);

    const res = await fetch('https://api.pinata.cloud/pinning/pinFileToIPFS', {
      method: 'POST',
      headers: { Authorization: `Bearer ${this.pinataJwt}` },
      body: form as any,
    });

    if (!res.ok) {
      throw new Error(`Pinata failed: ${res.status} ${await res.text()}`);
    }

    const json = (await res.json()) as { IpfsHash: string };
    const cid = json.IpfsHash;
    return { cid, gatewayUrl: this.gatewayUrl(cid) };
  }

  private async pinViaWeb3Storage(
    data: Buffer,
    filename: string,
  ): Promise<{ cid: string; gatewayUrl: string }> {
    if (!this.web3Token) throw new Error('WEB3_STORAGE_TOKEN not set');

    const res = await fetch('https://api.web3.storage/upload', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.web3Token}`,
        'X-Name': filename,
      },
      body: data as any,
    });

    if (!res.ok) {
      throw new Error(`web3.storage failed: ${res.status} ${await res.text()}`);
    }

    const json = (await res.json()) as { cid: string };
    const cid = json.cid;
    return { cid, gatewayUrl: this.gatewayUrl(cid) };
  }
}
