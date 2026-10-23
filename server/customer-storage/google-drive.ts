import { createHash } from 'node:crypto';
import { ArchiveError, type Archive, type StorageDestination } from './contracts';

const API = 'https://www.googleapis.com/drive/v3';
const UPLOAD = 'https://www.googleapis.com/upload/drive/v3/files';
const FOLDER = 'application/vnd.google-apps.folder';
const MAX_FILE = 200 * 1024 * 1024;
export function googleId(id: string): string {
  if (!/^[\w-]{1,200}$/.test(id)) throw new ArchiveError('invalid-provider-id', 400);
  return id;
}
export function uploadUrl(url: string): string {
  const parsed = new URL(url);
  if (parsed.origin !== 'https://www.googleapis.com' || parsed.pathname !== '/upload/drive/v3/files' ||
      parsed.username || parsed.password || parsed.hash || !parsed.searchParams.has('upload_id')) {
    throw new ArchiveError('invalid-upload-url', 502);
  }
  return parsed.href;
}
export class GoogleDriveDestination implements StorageDestination {
  constructor(private token: () => Promise<string>, private http: typeof fetch = fetch) {}
  private async request(url: string, init: RequestInit = {}, accepted: number[] = []) {
    const response = await this.http(url, { ...init, redirect: 'error', signal: AbortSignal.timeout(30_000),
      headers: { ...init.headers, Authorization: `Bearer ${await this.token()}` } });
    if (response.ok || accepted.includes(response.status)) return response;
    // Never propagate provider bodies: they can contain customer data or upload URLs.
    if (response.status === 401) throw new ArchiveError('provider-disconnected', 409);
    if (response.status === 403) {
      const body = await response.json().catch(() => ({}));
      const reasons = body.error?.errors?.map((e: { reason: string }) => e.reason) ?? [];
      if (reasons.some((r: string) => ['rateLimitExceeded', 'userRateLimitExceeded'].includes(r)))
        throw new ArchiveError('provider-retry', 503);
      throw new ArchiveError('provider-permission-or-quota', 409);
    }
    if (response.status === 429 || response.status >= 500) throw new ArchiveError('provider-retry', 503);
    if (response.status === 404) throw new ArchiveError('provider-file-unavailable', 404);
    throw new ArchiveError('provider-request-failed', 502);
  }
  async generateId(): Promise<string> {
    const body = await (await this.request(`${API}/files/generateIds?count=1&space=drive&type=files`)).json();
    return googleId(body.ids[0]);
  }
  async validateRoot(id: string): Promise<void> {
    const file = await (await this.request(`${API}/files/${googleId(id)}?fields=mimeType,trashed,capabilities(canAddChildren)&supportsAllDrives=true`)).json();
    if (file.mimeType !== FOLDER || file.trashed || !file.capabilities?.canAddChildren)
      throw new ArchiveError('destination-folder-not-writable', 409);
  }
  async ensurePath(root: string, segments: string[]): Promise<string> {
    let parent = googleId(root);
    for (const name of segments) {
      const escape = (s: string) => s.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
      const q = `'${parent}' in parents and trashed = false and mimeType = '${FOLDER}' and name = '${escape(name)}'`;
      const params = new URLSearchParams({ q, fields: 'files(id)', pageSize: '2', supportsAllDrives: 'true', includeItemsFromAllDrives: 'true' });
      const list = await (await this.request(`${API}/files?${params}`)).json();
      if (list.files.length > 1) throw new ArchiveError('ambiguous-archive-folder', 409);
      if (list.files.length) parent = googleId(list.files[0].id);
      else {
        const created = await (await this.request(`${API}/files?supportsAllDrives=true&fields=id`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name, mimeType: FOLDER, parents: [parent] }),
        })).json();
        parent = googleId(created.id);
      }
    }
    return parent;
  }
  async start(a: Archive, parent: string): Promise<string> {
    const response = await this.request(`${UPLOAD}?uploadType=resumable&supportsAllDrives=true&fields=id`, {
      method: 'POST', headers: { 'Content-Type': 'application/json',
        'X-Upload-Content-Type': a.contentType, 'X-Upload-Content-Length': String(a.size) },
      body: JSON.stringify({ id: googleId(a.fileId), name: `${a.id}_${a.filename}`, parents: [googleId(parent)],
        mimeType: a.contentType, appProperties: { dspArchiveId: a.id, sha256: a.sha256 } }),
    }, [409]);
    // A pre-generated ID may already exist after an ambiguous completion.
    if (response.status === 409) throw new ArchiveError('provider-id-exists', 409);
    return uploadUrl(response.headers.get('location') ?? '');
  }
  private offset(response: Response): number | 'complete' | 'expired' {
    if (response.status === 404 || response.status === 410) return 'expired';
    if (response.status !== 308) return 'complete';
    const range = response.headers.get('range');
    if (!range) return 0;
    const match = /^bytes=0-(\d+)$/.exec(range);
    if (!match) throw new ArchiveError('invalid-provider-offset', 502);
    return Number(match[1]) + 1;
  }
  async progress(url: string, size: number) {
    return this.offset(await this.request(uploadUrl(url), { method: 'PUT',
      headers: { 'Content-Range': `bytes */${size}`, 'Content-Length': '0' }, body: Buffer.alloc(0) }, [308, 404, 410]));
  }
  async upload(url: string, bytes: Buffer, offset: number, total: number): Promise<number | 'complete'> {
    const value = this.offset(await this.request(uploadUrl(url), { method: 'PUT',
      headers: { 'Content-Range': `bytes ${offset}-${offset + bytes.length - 1}/${total}`,
        'Content-Length': String(bytes.length), 'Content-Type': 'application/octet-stream' }, body: bytes }, [308]));
    if (value === 'expired') throw new ArchiveError('provider-session-expired', 409);
    return value;
  }
  async download(fileId: string): Promise<Response> {
    return this.request(`${API}/files/${googleId(fileId)}?alt=media&supportsAllDrives=true`);
  }
  async inspect(fileId: string) {
    // Hash the actual remote bytes; custom metadata alone is not integrity verification.
    const response = await this.download(fileId);
    if (!response.body) throw new ArchiveError('provider-empty-response', 502);
    const hash = createHash('sha256');
    let size = 0;
    for await (const chunk of response.body as unknown as AsyncIterable<Uint8Array>) {
      size += chunk.length;
      if (size > MAX_FILE) { await response.body.cancel().catch(() => {}); throw new ArchiveError('file-too-large', 413); }
      hash.update(chunk);
    }
    return { size, sha256: hash.digest('hex') };
  }
}
