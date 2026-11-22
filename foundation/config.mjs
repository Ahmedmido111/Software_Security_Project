// Shared configuration: paths, port, origin and session lifetime.
import { fileURLToPath } from 'node:url';
import { join, resolve } from 'node:path';
export const root=fileURLToPath(new URL('.',import.meta.url));
export const data=resolve(process.env.SHOP_DATA || join(root,'data'));
export const port=Number(process.env.SHOP_PORT || 4310);
export const origin=`http://127.0.0.1:${port}`;
export const ttl=30*60000;
