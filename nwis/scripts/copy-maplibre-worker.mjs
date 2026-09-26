// Copies MapLibre's ES-module worker into public/ so the map can start its web worker.
import { cpSync, mkdirSync } from 'node:fs';
mkdirSync('public/maplibre', { recursive: true });
for (const f of ['maplibre-gl-worker.mjs', 'maplibre-gl-shared.mjs']) cpSync(`node_modules/maplibre-gl/dist/${f}`, `public/maplibre/${f}`);
console.log('maplibre worker copied to public/maplibre');
