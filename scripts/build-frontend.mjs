import { cp, mkdir, readFile, rm, writeFile, access } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

// FastAPI normally renders this template. Netlify needs a static entry point
// and its assets at the same URL paths, without publishing the Python source.
const root = fileURLToPath(new URL('../', import.meta.url));
const output = path.join(root, 'dist');
const template = await readFile(path.join(root, 'frontend/templates/index.html'), 'utf8');
const placeholder = '"{{ api_base_url | default(\'\', true) }}"';
if (!template.includes(placeholder)) {
  throw new Error('The frontend API configuration placeholder was not found.');
}

// API_URL is a public backend origin, never an API key or credential.
const apiUrl = (process.env.API_URL || '').trim();
if (apiUrl) {
  const parsed = new URL(apiUrl);
  if (!['http:', 'https:'].includes(parsed.protocol) || parsed.username || parsed.password) {
    throw new Error('API_URL must be an HTTP(S) backend URL without credentials.');
  }
}
const apiConfig = JSON.stringify(apiUrl).replaceAll('<', '\\u003c');
const html = template.replace(placeholder, apiConfig);
if (/\{\{|\{%/.test(html)) {
  throw new Error('Unrendered server template syntax remains in the frontend.');
}

await rm(output, { recursive: true, force: true });
await mkdir(output, { recursive: true });
await cp(path.join(root, 'frontend/static'), path.join(output, 'static'), { recursive: true });
await writeFile(path.join(output, 'index.html'), html);

// Fail the deployment if the entry point or its local assets are missing.
await access(path.join(output, 'index.html'));
for (const match of html.matchAll(/(?:src|href)="(\/static\/[^"?#]+)"/g)) {
  await access(path.join(output, match[1]));
}
console.log('Frontend prepared: dist/index.html and static assets verified.');
if (!apiUrl) {
  console.warn('API_URL is unset. The frontend uses same-origin /api routes; Netlify does not run the FastAPI server.');
}
