"use client";

import { useEffect, useRef } from "react";
import L from "leaflet";
import { type PaidStreet, type Zone, zoneColor } from "./types";

type Props = {
  center: [number, number];
  userPos: [number, number] | null;
  zones: Zone[];
  paidStreets: PaidStreet[];
  selectedId: string | null;
  dark: boolean;
  onSelect: (zone: Zone | null) => void;
  onMoved: (lat: number, lng: number) => void;
  flyTo: { lat: number; lng: number; nonce: number } | null;
};

const TILE_LIGHT = "https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png";
const TILE_DARK = "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png";
const TILE_ATTR =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>';

export default function MapView({
  center, userPos, zones, paidStreets, selectedId, dark, onSelect, onMoved, flyTo,
}: Props) {
  const mapRef = useRef<L.Map | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const tileRef = useRef<L.TileLayer | null>(null);
  const zoneLayerRef = useRef<L.LayerGroup | null>(null);
  const streetLayerRef = useRef<L.LayerGroup | null>(null);
  const userMarkerRef = useRef<L.Marker | null>(null);
  const callbacksRef = useRef({ onSelect, onMoved });
  callbacksRef.current = { onSelect, onMoved };

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    const map = L.map(containerRef.current, {
      center,
      zoom: 16,
      zoomControl: false,
      attributionControl: true,
    });
    map.attributionControl.setPrefix(false);
    tileRef.current = L.tileLayer(dark ? TILE_DARK : TILE_LIGHT, { attribution: TILE_ATTR, maxZoom: 20 }).addTo(map);
    streetLayerRef.current = L.layerGroup().addTo(map);
    zoneLayerRef.current = L.layerGroup().addTo(map);
    map.on("moveend", () => {
      const c = map.getCenter();
      callbacksRef.current.onMoved(c.lat, c.lng);
    });
    map.on("click", () => callbacksRef.current.onSelect(null));
    mapRef.current = map;
    return () => {
      map.remove();
      mapRef.current = null;
      tileRef.current = null;
      zoneLayerRef.current = null;
      streetLayerRef.current = null;
      userMarkerRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // theme switch: swap the base map tiles
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !tileRef.current) return;
    tileRef.current.setUrl(dark ? TILE_DARK : TILE_LIGHT);
  }, [dark]);

  // user position marker
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    if (!userPos) {
      userMarkerRef.current?.remove();
      userMarkerRef.current = null;
      return;
    }
    const icon = L.divIcon({ className: "", html: '<div class="pp-user-dot"></div>', iconSize: [18, 18], iconAnchor: [9, 9] });
    if (!userMarkerRef.current) {
      userMarkerRef.current = L.marker(userPos, { icon, zIndexOffset: 1000, interactive: false }).addTo(map);
    } else {
      userMarkerRef.current.setLatLng(userPos);
    }
  }, [userPos]);

  // streets with paid parking – the real shape of the zone
  useEffect(() => {
    const layer = streetLayerRef.current;
    if (!layer) return;
    layer.clearLayers();
    for (const line of paidStreets) {
      layer.addLayer(
        L.polyline(line, {
          color: "#2563eb",
          weight: 6,
          opacity: dark ? 0.55 : 0.4,
          lineCap: "round",
          interactive: false,
        })
      );
    }
  }, [paidStreets, dark]);

  // zone areas + markers
  useEffect(() => {
    const layer = zoneLayerRef.current;
    if (!layer) return;
    layer.clearLayers();

    // when real street data exists, streets carry the zone shape and the
    // tariff-zone circles would wrongly suggest a radius – draw them only as
    // a subtle dashed boundary in that case
    const haveStreets = paidStreets.length >= 5;

    for (const zone of zones) {
      const selected = zone.id === selectedId;
      const color = zoneColor(zone);
      let area: L.Path | null = null;
      if (zone.polygon && zone.polygon.length >= 3) {
        area = L.polygon(zone.polygon, {
          color,
          weight: selected ? 2.5 : 1.5,
          opacity: selected ? 0.9 : 0.55,
          fillColor: color,
          fillOpacity: selected ? 0.3 : 0.2,
        });
      } else if (zone.areaRadiusM && !haveStreets) {
        area = L.circle([zone.lat, zone.lng], {
          radius: zone.areaRadiusM,
          color,
          weight: selected ? 2.5 : 1.5,
          opacity: selected ? 0.8 : 0.5,
          fillColor: color,
          fillOpacity: selected ? 0.15 : 0.08,
          dashArray: "6 6",
        });
      }
      if (area) {
        area.on("click", (e) => {
          L.DomEvent.stopPropagation(e);
          callbacksRef.current.onSelect(zone);
        });
        layer.addLayer(area);
      }
    }

    for (const zone of zones) {
      const selected = zone.id === selectedId;
      const color = zoneColor(zone);
      const letter = zone.kind === "garage" || zone.kind === "underground" ? "G" : "P";
      const icon = L.divIcon({
        className: "",
        html: `<div class="pp-marker ${selected ? "pp-marker--selected" : ""}" style="background:${color}">${letter}</div>`,
        iconSize: [30, 30],
        iconAnchor: [15, 15],
      });
      const marker = L.marker([zone.lat, zone.lng], { icon, zIndexOffset: selected ? 500 : 0 });
      marker.on("click", () => callbacksRef.current.onSelect(zone));
      layer.addLayer(marker);
    }
  }, [zones, selectedId, paidStreets]);

  // programmatic fly-to (locate button, zone card tap)
  useEffect(() => {
    if (!flyTo || !mapRef.current) return;
    mapRef.current.flyTo([flyTo.lat, flyTo.lng], Math.max(mapRef.current.getZoom(), 16), { duration: 0.6 });
  }, [flyTo]);

  return <div ref={containerRef} className="h-full w-full" />;
}
