'use client';

import { useEffect, useRef } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { getIncidentsForWell } from '@/lib/mock/incidents';
import { getRiskLabel, getIncidentLabel, formatDepth, formatDistance } from '@/lib/utils';
import type { Well } from '@/lib/types';

mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN ?? '';

// ─── Popup theme — dark graphite, hex mirrors of globals.css tokens ──────────
// (Mapbox popups render outside React; inline styles need concrete values.)
const POPUP_COLORS = {
  text: '#E2E8F0',
  muted: '#7E8B9B',
  bg: '#0D1219',
  high: '#EF4444',
  medium: '#F59E0B',
  ok: '#10B981',
  accent: '#F59E0B',
  accentHover: '#D97706',
  accentText: '#070A0E',
};

// ─── Marker Color by risk/incident history ────────────────────────────────────
function getMarkerColor(well: Well, isActive = false): string {
  if (isActive) return POPUP_COLORS.accent;
  const incidents = getIncidentsForWell(well.id);
  if (incidents.some(i => i.severity === 'critical' || i.severity === 'high')) return POPUP_COLORS.high;
  if (incidents.some(i => i.severity === 'medium')) return POPUP_COLORS.medium;
  return POPUP_COLORS.ok;
}

// ─── Popup HTML — dark theme, real <a> navigation (keyboard + Cmd-click ok) ───
function createPopupHTML(well: Well, distance?: number, reportCount = 0): string {
  const incidents = getIncidentsForWell(well.id);
  const highRisk = incidents.filter(i => i.severity === 'high' || i.severity === 'critical');
  const color = getMarkerColor(well);
  const c = POPUP_COLORS;
  const approximateLocationNote = well.locationPrecision === 'approximate'
    ? 'Approximate location — estimated from field/basin name, not exact coordinates. Search radius widened by 50km to account for this.'
    : '';

  return `
    <div style="font-family: Inter, system-ui, sans-serif; padding: 14px; min-width: 220px; background:${c.bg};">
      <div style="display:flex; align-items:center; gap:8px; margin-bottom:10px;">
        <div style="width:8px; height:8px; border-radius:50%; background:${color}; flex-shrink:0;"></div>
        <div>
          <p style="font-weight:700; font-size:14px; color:${c.text}; margin:0; line-height:1.2;">${well.name}</p>
          <p style="font-size:11px; color:${c.muted}; margin:0; margin-top:2px;">${well.field} · ${well.block}</p>
        </div>
        <div>
          <p style="font-size:10px; color:${c.muted}; text-transform:uppercase; letter-spacing:0.05em; margin:0 0 2px;">Reports</p>
          <p style="font-size:13px; font-weight:600; color:${c.text}; margin:0;">${reportCount}</p>
        </div>
      </div>
      <div style="display:grid; grid-template-columns:1fr 1fr; gap:8px; margin-bottom:10px;">
        ${distance !== undefined ? `
          <div>
            <p style="font-size:10px; color:${c.muted}; text-transform:uppercase; letter-spacing:0.05em; margin:0 0 2px;">Distance</p>
            <p style="font-size:13px; font-weight:600; font-family:JetBrains Mono,monospace; color:${c.text}; margin:0;">${formatDistance(distance)}</p>
          </div>
        ` : ''}
        <div>
          <p style="font-size:10px; color:${c.muted}; text-transform:uppercase; letter-spacing:0.05em; margin:0 0 2px;">Total Depth</p>
          <p style="font-size:13px; font-weight:600; font-family:JetBrains Mono,monospace; color:${c.text}; margin:0;">${formatDepth(well.totalDepthFt)} ft</p>
        </div>
        <div>
          <p style="font-size:10px; color:${c.muted}; text-transform:uppercase; letter-spacing:0.05em; margin:0 0 2px;">Incidents</p>
          <p style="font-size:13px; font-weight:600; color:${incidents.length > 0 ? (highRisk.length > 0 ? c.high : c.medium) : c.ok}; margin:0;">
            ${incidents.length} ${highRisk.length > 0 ? `(${highRisk.length} high)` : ''}
          </p>
        </div>
        <div>
          <p style="font-size:10px; color:${c.muted}; text-transform:uppercase; letter-spacing:0.05em; margin:0 0 2px;">Status</p>
          <p style="font-size:12px; font-weight:600; color:${c.text}; text-transform:capitalize; margin:0;">${well.status}</p>
        </div>
      </div>
      <a
        href="/wells/${well.id}"
        style="display:block; text-align:center; padding:8px 12px; background:${c.accent}; color:${c.accentText}; border:none; border-radius:8px;
               font-size:12px; font-weight:600; cursor:pointer; font-family:Inter,system-ui,sans-serif; text-decoration:none;
               transition:background 0.15s;"
        onmouseover="this.style.background='${c.accentHover}'"
        onmouseout="this.style.background='${c.accent}'"
      >View Well Details →</a>
      <div style="margin-top:6px; font-size:9px; color:${c.muted}; text-align:center;">
        ${incidents.length > 0 ? `${getIncidentLabel(incidents[0].type)} · ${getRiskLabel(incidents[0].severity)} risk` : 'No incidents recorded'}
      </div>
      ${approximateLocationNote ? `<div style="margin-top:8px; padding:6px; border:1px dashed #F59E0B; color:#FCD34D; font-size:10px; line-height:1.35;">${approximateLocationNote}</div>` : ''}
    </div>
  `;
}



// ─── WellMap Component ────────────────────────────────────────────────────────
interface WellMapProps {
  mapCenter: { lat: number; lng: number };
  nearbyWells: (Well & { distance: number; reportCount?: number })[];
  radius: number;
  selectedWellId: string | null;
  onWellClick: (wellId: string) => void;
  onViewDetails: (wellId: string) => void;
  onMapClick?: (coordinates: { lat: number; lng: number }) => void;
}

export default function WellMap({
  mapCenter, nearbyWells, radius, selectedWellId, onWellClick, onViewDetails, onMapClick
}: WellMapProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const markersRef = useRef<Map<string, mapboxgl.Marker>>(new Map());
  const locationMarkerRef = useRef<mapboxgl.Marker | null>(null);
  const circleLayerRef = useRef(false);

  // Initialize map
  useEffect(() => {
    if (!mapContainer.current || map.current) return;

    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/dark-v11',
      center: [mapCenter.lng, mapCenter.lat],
      zoom: 10,
      attributionControl: false,
    });

    map.current.addControl(new mapboxgl.NavigationControl({ showCompass: false }), 'bottom-right');
    map.current.addControl(new mapboxgl.ScaleControl({ unit: 'metric' }), 'bottom-left');

    const resizeObserver = new ResizeObserver(() => {
      map.current?.resize();
    });
    resizeObserver.observe(mapContainer.current);

    map.current.on('load', () => {
      if (!map.current) return;

      // ── Radius circle ───────────────────────────────────────────────
      const circleGeoJSON = createCircleGeoJSON(
        mapCenter.lng, mapCenter.lat, radius
      );

      map.current.addSource('radius-circle', {
        type: 'geojson',
        data: circleGeoJSON,
      });
      if (onMapClick) {
        map.current.on('click', (event) => onMapClick({ lat: event.lngLat.lat, lng: event.lngLat.lng }));
      }

      map.current.addLayer({
        id: 'radius-fill',
        type: 'fill',
        source: 'radius-circle',
        paint: {
          'fill-color': POPUP_COLORS.accent,
          'fill-opacity': 0.06,
        },
      });

      map.current.addLayer({
        id: 'radius-border',
        type: 'line',
        source: 'radius-circle',
        paint: {
          'line-color': POPUP_COLORS.accent,
          'line-width': 1.5,
          'line-dasharray': [4, 3],
          'line-opacity': 0.5,
        },
      });

      circleLayerRef.current = true;

      const locationEl = document.createElement('div');
      locationEl.style.cssText = 'width:16px;height:16px;border-radius:50%;background:#38bdf8;border:3px solid white;box-shadow:0 0 0 6px #38bdf855;';
      locationMarkerRef.current = new mapboxgl.Marker({ element: locationEl })
        .setLngLat([mapCenter.lng, mapCenter.lat])
        .setPopup(new mapboxgl.Popup({ offset: 14, closeButton: false }).setHTML('<strong>Your selected location</strong>'))
        .addTo(map.current);
    });

    return () => {
      resizeObserver.disconnect();
      locationMarkerRef.current?.remove();
      locationMarkerRef.current = null;
      map.current?.remove();
      map.current = null;
      circleLayerRef.current = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onMapClick]);

  useEffect(() => {
    if (!map.current) return;
    map.current.flyTo({
      center: [mapCenter.lng, mapCenter.lat],
      essential: true,
      duration: 900,
    });
    const source = map.current.getSource('radius-circle') as mapboxgl.GeoJSONSource | undefined;
    source?.setData(createCircleGeoJSON(mapCenter.lng, mapCenter.lat, radius));
    locationMarkerRef.current?.setLngLat([mapCenter.lng, mapCenter.lat]);
  }, [mapCenter, radius]);

  // Render/update nearby well markers
  useEffect(() => {
    if (!map.current) return;
    const existingIds = new Set(markersRef.current.keys());

    nearbyWells.forEach(well => {
      existingIds.delete(well.id);

      const isApproximate = well.locationPrecision === 'approximate';
      const inRadius = well.distance <= radius + (isApproximate ? 50 : 0);
      const targetOpacity = !inRadius ? '0.7' : '1';
      const targetFilter = 'none';

      if (markersRef.current.has(well.id)) {
        // already rendered, update its styles
        const marker = markersRef.current.get(well.id)!;
        const el = marker.getElement();
        el.style.opacity = targetOpacity;
        el.style.filter = targetFilter;
        return;
      }

      const color = getMarkerColor(well);
      const el = document.createElement('div');
      el.style.cssText = `
        width:16px; height:16px; border-radius:50%;
        background:${color}; border:2.5px solid white;
        box-shadow: 0 2px 6px ${color}66;
        opacity:${targetOpacity};
        filter:${targetFilter};
        ${isApproximate ? 'outline:2px dashed #F59E0B; outline-offset:2px;' : ''}
        cursor:pointer; transition: transform 0.15s, opacity 0.3s, filter 0.3s;
      `;
      el.addEventListener('mouseenter', () => { el.style.transform = 'scale(1.3)'; });
      el.addEventListener('mouseleave', () => { el.style.transform = 'scale(1)'; });

      const popup = new mapboxgl.Popup({ offset: 16, closeButton: false, maxWidth: '260px' })
        .setHTML(createPopupHTML(well, well.distance, well.reportCount));

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
  }, [nearbyWells, radius, onWellClick, onViewDetails]);

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
    const marker = markersRef.current.get(selectedWellId);
    if (marker) {
      const popup = marker.getPopup();
      if (popup && !popup.isOpen()) {
        marker.togglePopup();
      }
    }
  }, [selectedWellId, nearbyWells]);

  return (
    <div
      ref={mapContainer}
      className="w-full h-full"
      role="application"
      aria-label="Map of nearby wells with incident risk markers"
    />
  );
}

// ─── GeoJSON Circle Helper ────────────────────────────────────────────────────
function createCircleGeoJSON(
  centerLng: number, centerLat: number, radiusKm: number, points = 64
): { type: 'Feature'; geometry: { type: 'Polygon'; coordinates: [number, number][][] }; properties: Record<string, never> } {
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
