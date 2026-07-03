"use client";

import { useEffect, useRef } from "react";
import L from "leaflet";
import { type Zone, zoneColor } from "./types";

type Props = {
  center: [number, number];
  userPos: [number, number] | null;
  zones: Zone[];
  selectedId: string | null;
  onSelect: (zone: Zone | null) => void;
  onMoved: (lat: number, lng: number) => void;
  flyTo: { lat: number; lng: number; nonce: number } | null;
};

const TILE_URL = "https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png";
const TILE_ATTR =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>';

export default function MapView({ center, userPos, zones, selectedId, onSelect, onMoved, flyTo }: Props) {
  const mapRef = useRef<L.Map | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const zoneLayerRef = useRef<L.LayerGroup | null>(null);
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
    L.tileLayer(TILE_URL, { attribution: TILE_ATTR, maxZoom: 20 }).addTo(map);
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
      zoneLayerRef.current = null;
      userMarkerRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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

  // zone markers
  useEffect(() => {
    const layer = zoneLayerRef.current;
    if (!layer) return;
    layer.clearLayers();
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
  }, [zones, selectedId]);

  // programmatic fly-to (locate button, zone card tap)
  useEffect(() => {
    if (!flyTo || !mapRef.current) return;
    mapRef.current.flyTo([flyTo.lat, flyTo.lng], Math.max(mapRef.current.getZoom(), 16), { duration: 0.6 });
  }, [flyTo]);

  return <div ref={containerRef} className="h-full w-full" />;
}
