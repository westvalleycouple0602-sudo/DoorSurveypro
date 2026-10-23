import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';

/** Dedicated deployment key; no plaintext compatibility or session-secret fallback. */
export class ArchiveSecrets {
  private key: Buffer;
  constructor(key = process.env.CUSTOMER_STORAGE_KEY ?? '') {
    if (!/^[a-f0-9]{64}$/i.test(key)) throw new Error('CUSTOMER_STORAGE_KEY must be 32 random bytes encoded as hex');
    this.key = Buffer.from(key, 'hex');
  }
  seal(value: string, binding: string): string {
    const iv = randomBytes(12);
    const cipher = createCipheriv('aes-256-gcm', this.key, iv);
    cipher.setAAD(Buffer.from(binding));
    const data = Buffer.concat([cipher.update(value, 'utf8'), cipher.final()]);
    return [iv, cipher.getAuthTag(), data].map(x => x.toString('base64url')).join('.');
  }
  open(value: string, binding: string): string {
    const parts = value.split('.');
    if (parts.length !== 3) throw new Error('Invalid encrypted archive secret');
    const [iv, tag, data] = parts.map(x => Buffer.from(x, 'base64url'));
    const decipher = createDecipheriv('aes-256-gcm', this.key, iv);
    decipher.setAAD(Buffer.from(binding));
    decipher.setAuthTag(tag);
    return Buffer.concat([decipher.update(data), decipher.final()]).toString('utf8');
  }
}
