import { cp, mkdir, readFile, writeFile } from 'node:fs/promises';

// Publish only browser assets, never Python source, model weights, or local data.
await mkdir('dist', { recursive: true });
const template = await readFile('frontend/templates/index.html', 'utf8');
const html = template.replace('{{ api_base_url | tojson }}', '""');
if (html.includes('{{')) throw new Error('Unrendered template expression in dashboard');
await writeFile('dist/index.html', html);
await cp('frontend/static', 'dist/static', { recursive: true });
