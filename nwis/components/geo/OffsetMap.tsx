'use client';

import { useEffect, useRef } from 'react';
import { Map as MLMap, NavigationControl, ScaleControl, setWorkerUrl, type GeoJSONSource, type MapLayerMouseEvent } from 'maplibre-gl';

// The worker is served from public/ (copied there by scripts/copy-maplibre-worker.mjs)
if (typeof window !== 'undefined') setWorkerUrl('/maplibre/maplibre-gl-worker.mjs');
import 'maplibre-gl/dist/maplibre-gl.css';
import type { Offset, Well } from '@/lib/types';

// OpenStreetMap raster tiles; dark mode inverts and desaturates them on the GPU
const TILES = ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'];
const basePaint = (theme: 'dark' | 'light') => theme === 'dark'
  ? { 'raster-brightness-min': 0.92, 'raster-brightness-max': 0.07, 'raster-saturation': -0.85, 'raster-contrast': 0.15, 'raster-hue-rotate': 180 }
  : { 'raster-brightness-min': 0, 'raster-brightness-max': 1, 'raster-saturation': -0.45, 'raster-contrast': 0, 'raster-hue-rotate': 0 };

function circle(lat: number, lon: number, km: number) {
  const coords: [number, number][] = [];
  for (let i = 0; i <= 96; i++) {
    const a = (i / 96) * 2 * Math.PI;
    coords.push([lon + (km / (111.32 * Math.cos((lat * Math.PI) / 180))) * Math.cos(a), lat + (km / 110.57) * Math.sin(a)]);
  }
  return { type: 'Feature' as const, properties: {}, geometry: { type: 'Polygon' as const, coordinates: [coords] } };
}

const nptColor = (npt: number) => (npt >= 150 ? '#ff5a61' : npt >= 75 ? '#f58a4b' : npt > 0 ? '#e9b73d' : '#3cc58e');

export function OffsetMap({ active, offsets, others, radiusKm, theme, selectedId, onSelect, showPaths }: {
  active: Well; offsets: Offset[]; others: Well[]; radiusKm: number; theme: 'dark' | 'light';
  selectedId: string | null; onSelect: (id: string | null) => void; showPaths: boolean;
}) {
  const el = useRef<HTMLDivElement>(null);
  const map = useRef<MLMap | null>(null);
  const ready = useRef(false);
  const onSelectRef = useRef(onSelect);
  const drawRef = useRef<() => void>(() => {});
  onSelectRef.current = onSelect;

  useEffect(() => {
    if (!el.current) return;
    const m = new MLMap({
      container: el.current,
      style: {
        version: 8,
        glyphs: 'https://demotiles.maplibre.org/font/{fontstack}/{range}.pbf',
        sources: { base: { type: 'raster', tiles: TILES, tileSize: 256, maxzoom: 19, attribution: '© OpenStreetMap contributors' } },
        layers: [{ id: 'base', type: 'raster', source: 'base', paint: basePaint(theme) }],
      },
      center: [active.lon, active.lat], zoom: 11.3, attributionControl: { compact: true },
    });
    m.addControl(new NavigationControl({ showCompass: false }), 'top-right');
    m.addControl(new ScaleControl({ unit: 'metric' }), 'bottom-left');
    m.on('load', () => {
      m.addSource('radius', { type: 'geojson', data: { type: 'FeatureCollection', features: [] } });
      m.addSource('paths', { type: 'geojson', data: { type: 'FeatureCollection', features: [] } });
      m.addSource('others', { type: 'geojson', data: { type: 'FeatureCollection', features: [] } });
      m.addSource('wells', { type: 'geojson', data: { type: 'FeatureCollection', features: [] } });
      m.addSource('bh', { type: 'geojson', data: { type: 'FeatureCollection', features: [] } });
      m.addLayer({ id: 'radius-fill', type: 'fill', source: 'radius', paint: { 'fill-color': '#5b9dff', 'fill-opacity': 0.06 } });
      m.addLayer({ id: 'radius-line', type: 'line', source: 'radius', paint: { 'line-color': '#5b9dff', 'line-width': 1.5, 'line-dasharray': [3, 2] } });
      m.addLayer({ id: 'others', type: 'circle', source: 'others', paint: { 'circle-radius': 3.5, 'circle-color': '#7d8b98', 'circle-opacity': 0.6 } });
      m.addLayer({ id: 'paths', type: 'line', source: 'paths', paint: { 'line-color': ['get', 'color'], 'line-width': ['case', ['get', 'selected'], 3.5, 2], 'line-opacity': 0.9 } });
      m.addLayer({ id: 'bh', type: 'circle', source: 'bh', paint: { 'circle-radius': 3, 'circle-color': ['get', 'color'], 'circle-stroke-color': '#0f151b', 'circle-stroke-width': 1 } });
      m.addLayer({
        id: 'wells', type: 'circle', source: 'wells',
        paint: {
          'circle-radius': ['case', ['get', 'active'], 9, ['get', 'selected'], 8, 6],
          'circle-color': ['get', 'color'],
          'circle-stroke-width': ['case', ['get', 'active'], 3, ['get', 'selected'], 2.5, 1.5],
          'circle-stroke-color': ['case', ['get', 'active'], '#ffffff', ['get', 'selected'], '#ffffff', '#0b1117'],
        },
      });
      m.addLayer({
        id: 'labels', type: 'symbol', source: 'wells',
        layout: { 'text-field': ['get', 'name'], 'text-font': ['Open Sans Semibold'], 'text-size': 11.5, 'text-offset': [0, 1.3], 'text-anchor': 'top' },
        paint: { 'text-color': theme === 'dark' ? '#e4ebf1' : '#0f1720', 'text-halo-color': theme === 'dark' ? '#080c10' : '#ffffff', 'text-halo-width': 1.4 },
      });
      m.on('click', 'wells', (e: MapLayerMouseEvent) => { const f = e.features?.[0]; if (f && !f.properties.active) onSelectRef.current(String(f.properties.id)); });
      m.on('mouseenter', 'wells', () => (m.getCanvas().style.cursor = 'pointer'));
      m.on('mouseleave', 'wells', () => (m.getCanvas().style.cursor = ''));
      ready.current = true;
      drawRef.current();
    });
    map.current = m;
    return () => { ready.current = false; m.remove(); map.current = null; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active.id]);

  // Theme swap without rebuilding the map
  useEffect(() => {
    const m = map.current;
    if (!m) return;
    const apply = () => {
      for (const [k, v] of Object.entries(basePaint(theme))) m.setPaintProperty('base', k as any, v);
      if (m.getLayer('labels')) {
        m.setPaintProperty('labels', 'text-color', theme === 'dark' ? '#e4ebf1' : '#0f1720');
        m.setPaintProperty('labels', 'text-halo-color', theme === 'dark' ? '#080c10' : '#ffffff');
      }
    };
    if (ready.current) apply(); else m.once('load', apply);
  }, [theme]);

  // Data
  useEffect(() => {
    const m = map.current;
    if (!m) return;
    const draw = () => {
      if (!ready.current) return;
      (m.getSource('radius') as GeoJSONSource).setData({ type: 'FeatureCollection', features: [circle(active.lat, active.lon, radiusKm)] });
      const offsetIds = new Set(offsets.map((o) => o.id));
      (m.getSource('others') as GeoJSONSource).setData({
        type: 'FeatureCollection',
        features: others.filter((w) => !offsetIds.has(w.id) && w.id !== active.id).map((w) => ({ type: 'Feature', properties: { id: w.id }, geometry: { type: 'Point', coordinates: [w.lon, w.lat] } })),
      });
      (m.getSource('paths') as GeoJSONSource).setData({
        type: 'FeatureCollection',
        features: showPaths ? offsets.filter((o) => o.profile === 'deviated').map((o) => ({
          type: 'Feature', properties: { color: nptColor(o.totalNptHours), selected: o.id === selectedId },
          geometry: { type: 'LineString', coordinates: o.path.map(([la, lo]) => [lo, la]) },
        })) : [],
      });
      (m.getSource('bh') as GeoJSONSource).setData({
        type: 'FeatureCollection',
        features: showPaths ? offsets.filter((o) => o.profile === 'deviated').map((o) => ({ type: 'Feature', properties: { color: nptColor(o.totalNptHours) }, geometry: { type: 'Point', coordinates: [o.bottomHole[1], o.bottomHole[0]] } })) : [],
      });
      (m.getSource('wells') as GeoJSONSource).setData({
        type: 'FeatureCollection',
        features: [
          { type: 'Feature', properties: { id: active.id, name: active.name, color: '#5b9dff', active: true, selected: false }, geometry: { type: 'Point', coordinates: [active.lon, active.lat] } },
          ...offsets.map((o) => ({ type: 'Feature' as const, properties: { id: o.id, name: o.name, color: nptColor(o.totalNptHours), active: false, selected: o.id === selectedId }, geometry: { type: 'Point' as const, coordinates: [o.lon, o.lat] } })),
        ],
      });
    };
    drawRef.current = draw;
    draw();
  }, [active, offsets, others, radiusKm, selectedId, showPaths]);

  // Fit to radius when it changes
  useEffect(() => {
    const m = map.current;
    if (!m) return;
    const dLat = radiusKm / 110.57, dLon = radiusKm / (111.32 * Math.cos((active.lat * Math.PI) / 180));
    m.fitBounds([[active.lon - dLon, active.lat - dLat], [active.lon + dLon, active.lat + dLat]], { padding: 30, duration: 600 });
  }, [radiusKm, active.lat, active.lon]);

  return <div ref={el} className="h-full w-full" role="application" aria-label="Map of offset wells around the active well" />;
}
