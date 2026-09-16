import { useEffect } from 'react';
import { LocateFixed, Navigation } from 'lucide-react';
import { CircleMarker, MapContainer, TileLayer, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';

function Recenter({ lat, lng }: { lat: number; lng: number }) {
  const map = useMap();
  useEffect(() => { map.setView([lat, lng], map.getZoom(), { animate: true }); }, [lat, lng, map]);
  return null;
}

export function MapPanel({ lat, lng, stale = false, focusName }: { lat: number; lng: number; stale?: boolean; focusName?: string }) {
  return <section className="map-panel" data-testid="map-rider-location">
    <MapContainer center={[lat, lng]} zoom={14} zoomControl={false} scrollWheelZoom={false} className="leaflet-map" aria-label="OpenStreetMap rider position">
      <TileLayer attribution='&copy; OpenStreetMap contributors' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
      <Recenter lat={lat} lng={lng} />
      <CircleMarker center={[lat, lng]} radius={9} pathOptions={{ color: stale ? '#FF8A3D' : '#4FC3F7', fillColor: stale ? '#FF8A3D' : '#4FC3F7', fillOpacity: .85, weight: 3, dashArray: stale ? '6 5' : undefined }} />
    </MapContainer>
    <div className="map-grid" /><div className="map-overlay" />
    <div className="map-topline"><span className="map-label"><span className={`dot ${stale ? 'amber' : 'cyan'}`} style={{ display: 'inline-block', marginRight: 5 }} />{stale ? 'Last known position' : focusName ?? 'Live rider position'}</span><span className="map-label"><Navigation size={10} style={{ verticalAlign: '-2px', marginRight: 4 }} />N 42°</span></div>
    <div className="map-center"><LocateFixed size={15} className="cyan" /></div>
     <div className="map-footer"><span className="map-coords" data-testid="text-map-coordinates">{lat.toFixed(5)}° N&nbsp;&nbsp; {Math.abs(lng).toFixed(5)}° {lng >= 0 ? 'E' : 'W'}</span><span className="map-source">OpenStreetMap / live tiles</span></div>
  </section>;
}