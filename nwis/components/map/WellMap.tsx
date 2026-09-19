'use client';

import { useEffect, useRef, useCallback } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { useRouter } from 'next/navigation';
import { getIncidentsForWell } from '@/lib/mock/incidents';
import { getRiskLabel, getIncidentLabel, formatDepth, formatDistance } from '@/lib/utils';
import type { Well, RiskLevel } from '@/lib/types';

mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN ?? '';

// ─── Marker Color by risk/incident history ────────────────────────────────────
function getMarkerColor(well: Well, isActive = false): string {
  if (isActive) return '#0F4C81';
  const incidents = getIncidentsForWell(well.id);
  if (incidents.some(i => i.severity === 'critical' || i.severity === 'high')) return '#DC2626';
  if (incidents.some(i => i.severity === 'medium')) return '#D97706';
  return '#16A34A';
}

// ─── Create popup HTML ────────────────────────────────────────────────────────
function createPopupHTML(well: Well, distance?: number, onViewDetails?: (id: string) => void): string {
  const incidents = getIncidentsForWell(well.id);
  const highRisk = incidents.filter(i => i.severity === 'high' || i.severity === 'critical');
  const color = getMarkerColor(well);

  return `
    <div style="font-family: Inter, system-ui, sans-serif; padding: 14px; min-width: 220px;">
      <div style="display:flex; align-items:center; gap:8px; margin-bottom:10px;">
        <div style="width:8px; height:8px; border-radius:50%; background:${color}; flex-shrink:0;"></div>
        <div>
          <p style="font-weight:700; font-size:14px; color:#0F172A; margin:0; line-height:1.2;">${well.name}</p>
          <p style="font-size:11px; color:#64748B; margin:0; margin-top:2px;">${well.field} · ${well.block}</p>
        </div>
      </div>
      <div style="display:grid; grid-template-columns:1fr 1fr; gap:8px; margin-bottom:10px;">
        ${distance !== undefined ? `
          <div>
            <p style="font-size:10px; color:#64748B; text-transform:uppercase; letter-spacing:0.05em; margin:0 0 2px;">Distance</p>
            <p style="font-size:13px; font-weight:600; font-family:JetBrains Mono,monospace; color:#0F172A; margin:0;">${formatDistance(distance)}</p>
          </div>
        ` : ''}
        <div>
          <p style="font-size:10px; color:#64748B; text-transform:uppercase; letter-spacing:0.05em; margin:0 0 2px;">Total Depth</p>
          <p style="font-size:13px; font-weight:600; font-family:JetBrains Mono,monospace; color:#0F172A; margin:0;">${formatDepth(well.totalDepthFt)} ft</p>
        </div>
        <div>
          <p style="font-size:10px; color:#64748B; text-transform:uppercase; letter-spacing:0.05em; margin:0 0 2px;">Incidents</p>
          <p style="font-size:13px; font-weight:600; color:${incidents.length > 0 ? (highRisk.length > 0 ? '#DC2626' : '#D97706') : '#16A34A'}; margin:0;">
            ${incidents.length} ${highRisk.length > 0 ? `(${highRisk.length} high)` : ''}
          </p>
        </div>
        <div>
          <p style="font-size:10px; color:#64748B; text-transform:uppercase; letter-spacing:0.05em; margin:0 0 2px;">Status</p>
          <p style="font-size:12px; font-weight:600; color:#0F172A; text-transform:capitalize; margin:0;">${well.status}</p>
        </div>
      </div>
      <button
        onclick="window.__nwisViewDetails && window.__nwisViewDetails('${well.id}')"
        style="width:100%; padding:8px 12px; background:#0F4C81; color:white; border:none; border-radius:8px;
               font-size:12px; font-weight:600; cursor:pointer; font-family:Inter,system-ui,sans-serif;
               transition:background 0.15s;"
        onmouseover="this.style.background='#1a6aad'"
        onmouseout="this.style.background='#0F4C81'"
      >
        View Details →
      </button>
    </div>
  `;
}

// ─── Active well pulse marker ─────────────────────────────────────────────────
function createActivePulseEl(): HTMLElement {
  const el = document.createElement('div');
  el.style.cssText = `
    width: 20px; height: 20px; position: relative;
  `;
  el.innerHTML = `
    <style>
      @keyframes nwis-pulse {
        0% { transform: scale(1); opacity: 0.8; }
        100% { transform: scale(2.8); opacity: 0; }
      }
    </style>
    <div style="
      width:20px; height:20px; border-radius:50%; background:#0F4C81;
      border: 3px solid white; box-shadow: 0 2px 8px rgba(15,76,129,0.4);
      position: relative; z-index:2;
    "></div>
    <div style="
      position:absolute; top:0; left:0; width:20px; height:20px; border-radius:50%;
      background:#0F4C81; opacity:0.6;
      animation: nwis-pulse 2s cubic-bezier(0.4,0,0.6,1) infinite;
    "></div>
  `;
  return el;
}

// ─── WellMap Component ────────────────────────────────────────────────────────
interface WellMapProps {
  activeWell: Well;
  nearbyWells: (Well & { distance: number })[];
  radius: number;
  selectedWellId: string | null;
  onWellClick: (wellId: string) => void;
  onViewDetails: (wellId: string) => void;
  liveDepthFt: number;
}

export default function WellMap({
  activeWell, nearbyWells, radius, selectedWellId, onWellClick, onViewDetails, liveDepthFt
}: WellMapProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const markersRef = useRef<Map<string, mapboxgl.Marker>>(new Map());
  const circleLayerRef = useRef(false);

  // Expose viewDetails to popup buttons
  useEffect(() => {
    (window as any).__nwisViewDetails = onViewDetails;
    return () => { delete (window as any).__nwisViewDetails; };
  }, [onViewDetails]);

  // Initialize map
  useEffect(() => {
    if (!mapContainer.current || map.current) return;

    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/dark-v11',
      center: [activeWell.coordinates.lng, activeWell.coordinates.lat],
      zoom: 10,
      attributionControl: false,
    });

    map.current.addControl(new mapboxgl.NavigationControl({ showCompass: false }), 'bottom-right');
    map.current.addControl(new mapboxgl.ScaleControl({ unit: 'metric' }), 'bottom-left');

    map.current.on('load', () => {
      if (!map.current) return;

      // ── Radius circle ─────────────────────────────────────────────────
      const radiusKm = radius;
      // GeoJSON circle (approximated with a polygon)
      const circleGeoJSON = createCircleGeoJSON(
        activeWell.coordinates.lng, activeWell.coordinates.lat, radiusKm
      );

      map.current.addSource('radius-circle', {
        type: 'geojson',
        data: circleGeoJSON,
      });

      map.current.addLayer({
        id: 'radius-fill',
        type: 'fill',
        source: 'radius-circle',
        paint: {
          'fill-color': '#2E86AB',
          'fill-opacity': 0.08,
        },
      });

      map.current.addLayer({
        id: 'radius-border',
        type: 'line',
        source: 'radius-circle',
        paint: {
          'line-color': '#2E86AB',
          'line-width': 1.5,
          'line-dasharray': [4, 3],
          'line-opacity': 0.6,
        },
      });

      circleLayerRef.current = true;

      // ── Active well marker ────────────────────────────────────────────
      const activeEl = createActivePulseEl();
      const activePopup = new mapboxgl.Popup({ offset: 20, closeButton: false })
        .setHTML(createPopupHTML(activeWell, undefined, onViewDetails));

      new mapboxgl.Marker({ element: activeEl })
        .setLngLat([activeWell.coordinates.lng, activeWell.coordinates.lat])
        .setPopup(activePopup)
        .addTo(map.current);
    });

    return () => {
      map.current?.remove();
      map.current = null;
      circleLayerRef.current = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Update radius circle when radius changes
  useEffect(() => {
    if (!map.current || !circleLayerRef.current) return;
    const src = map.current.getSource('radius-circle') as mapboxgl.GeoJSONSource | undefined;
    if (src) {
      src.setData(createCircleGeoJSON(
        activeWell.coordinates.lng, activeWell.coordinates.lat, radius
      ));
    }
  }, [radius, activeWell.coordinates]);

  // Render/update nearby well markers
  useEffect(() => {
    if (!map.current) return;
    const existingIds = new Set(markersRef.current.keys());

    nearbyWells.forEach(well => {
      existingIds.delete(well.id);
      if (markersRef.current.has(well.id)) return; // already rendered

      const color = getMarkerColor(well);
      const el = document.createElement('div');
      el.style.cssText = `
        width:16px; height:16px; border-radius:50%;
        background:${color}; border:2.5px solid white;
        box-shadow: 0 2px 6px ${color}66;
        cursor:pointer; transition: transform 0.15s;
      `;
      el.addEventListener('mouseenter', () => { el.style.transform = 'scale(1.3)'; });
      el.addEventListener('mouseleave', () => { el.style.transform = 'scale(1)'; });

      const popup = new mapboxgl.Popup({ offset: 16, closeButton: false, maxWidth: '260px' })
        .setHTML(createPopupHTML(well, well.distance, onViewDetails));

      const marker = new mapboxgl.Marker({ element: el })
        .setLngLat([well.coordinates.lng, well.coordinates.lat])
        .setPopup(popup)
        .addTo(map.current!);

      marker.getElement().addEventListener('click', () => onWellClick(well.id));
      markersRef.current.set(well.id, marker);
    });

    // Remove markers no longer in list
    existingIds.forEach(id => {
      markersRef.current.get(id)?.remove();
      markersRef.current.delete(id);
    });
  }, [nearbyWells, onWellClick, onViewDetails]);

  // Fly to selected well
  useEffect(() => {
    if (!selectedWellId || !map.current) return;
    const well = nearbyWells.find(w => w.id === selectedWellId);
    if (!well) return;
    map.current.flyTo({
      center: [well.coordinates.lng, well.coordinates.lat],
      zoom: 12,
      duration: 1200,
      essential: true,
    });
    markersRef.current.get(selectedWellId)?.togglePopup();
  }, [selectedWellId, nearbyWells]);

  return (
    <div ref={mapContainer} className="w-full h-full" />
  );
}

// ─── GeoJSON Circle Helper ────────────────────────────────────────────────────
function createCircleGeoJSON(
  centerLng: number, centerLat: number, radiusKm: number, points = 64
): any {
  const coords: [number, number][] = [];
  const distanceX = radiusKm / (111.32 * Math.cos((centerLat * Math.PI) / 180));
  const distanceY = radiusKm / 110.574;

  for (let i = 0; i < points; i++) {
    const theta = (i / points) * (2 * Math.PI);
    coords.push([
      centerLng + distanceX * Math.cos(theta),
      centerLat + distanceY * Math.sin(theta),
    ]);
  }
  coords.push(coords[0]); // close ring

  return {
    type: 'Feature',
    geometry: { type: 'Polygon', coordinates: [coords] },
    properties: {},
  };
}
