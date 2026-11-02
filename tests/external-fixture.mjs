// Optional integration fixture: public pinned metadata only, never repository data.
// Run scripts/fetch-external-test-fixture.mjs first, or set GC_SNAPSHOT_FIXTURE.
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {parseCompact,decodeRow} from '../lib/external-compact.mjs';
export const manifest={compactRawBytes:2025219,compactSha256:'e1bff498c5f0f2341e7d06d9cfbe58ee60b203cdd75af76153c6b08397375da8',sourceSha256:'f21714e7bf30bc670e75384db5907f8c66e2363a8e33dc3bc259a3b88e92aa10',rows:6706};
export const bytes=readFileSync(process.env.GC_SNAPSHOT_FIXTURE||new URL('../.cache/external-snapshot.json',import.meta.url));
if(bytes.length!==manifest.compactRawBytes||createHash('sha256').update(bytes).digest('hex')!==manifest.compactSha256)throw Error('Unexpected public fixture size or digest');
const data=parseCompact(bytes,{maxBytes:manifest.compactRawBytes,sourceSha:manifest.sourceSha256});
export const rows=data.rows.map((_,i)=>decodeRow(data,i));
