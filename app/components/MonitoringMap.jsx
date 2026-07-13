'use client';

import 'maplibre-gl/dist/maplibre-gl.css';

import { useEffect, useRef, useState } from 'react';
import {
  AlertTriangle,
  Calendar,
  ExternalLink,
  MapPin,
  MapPinOff,
  Navigation,
  User,
  X,
} from 'lucide-react';
import JobModal from './JobModal';
import { MiniSpinner } from './LoadingState';

const MAP_STYLE_URL =
  process.env.NEXT_PUBLIC_MAP_STYLE_URL || 'https://tiles.openfreemap.org/styles/liberty';

const numberFormatter = new Intl.NumberFormat('gl-ES');

function getTypeColor(tipo) {
  switch (String(tipo || '').trim().toUpperCase()) {
    case 'PM': return '#6792FF';
    case 'VT': return '#64FF95';
    case 'IN': return '#E4A2F6';
    case 'COT': return '#FFD000';
    default: return '#FF7052';
  }
}

function formatDuration(minutes) {
  const value = Number(minutes) || 0;
  const hours = Math.floor(value / 60);
  const rest = value % 60;
  return `${hours}h ${String(rest).padStart(2, '0')}m`;
}

function formatDate(isoDate) {
  if (!isoDate) return 'Sen data';
  const date = new Date(isoDate);
  if (Number.isNaN(date.getTime())) return 'Sen data';
  return date.toLocaleDateString('gl-ES', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

function formatSeconds(seconds) {
  const value = Number(seconds);
  if (!Number.isFinite(value) || value < 0) return '';
  const hours = Math.floor(value / 3600);
  const minutes = Math.floor((value % 3600) / 60);
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
}

function getGpsParts(item, selectedPoint) {
  const parts = String(item?.gps || '').split(',').map(part => part.trim());
  if (parts.length === 2 && parts.every(part => Number.isFinite(Number(part)))) {
    return parts;
  }
  return selectedPoint ? [String(selectedPoint.lat), String(selectedPoint.lon)] : null;
}

export default function MonitoringMap({ points, coverage, unmappedLocations }) {
  const containerRef = useRef(null);
  const mapRef = useRef(null);
  const [mapReady, setMapReady] = useState(false);
  const [mapError, setMapError] = useState(null);
  const [selectedPoint, setSelectedPoint] = useState(null);
  const [detail, setDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState(null);

  useEffect(() => {
    if (!containerRef.current || points.length === 0) return undefined;

    let cancelled = false;

    async function initializeMap() {
      try {
        const maplibregl = await import('maplibre-gl');
        if (cancelled || !containerRef.current) return;

        const pointById = new Map(points.map(point => [point.id, point]));
        const geojson = {
          type: 'FeatureCollection',
          features: points.map(point => ({
            type: 'Feature',
            id: point.id,
            properties: {
              id: point.id,
              tipo: point.tipo,
            },
            geometry: {
              type: 'Point',
              coordinates: [point.lon, point.lat],
            },
          })),
        };

        const map = new maplibregl.Map({
          container: containerRef.current,
          style: MAP_STYLE_URL,
          center: [-8.55, 42.9],
          zoom: 7,
          attributionControl: true,
        });
        mapRef.current = map;
        map.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'bottom-right');
        map.addControl(new maplibregl.FullscreenControl(), 'bottom-right');

        map.on('load', () => {
          if (cancelled) return;

          map.addSource('monitorizacion', {
            type: 'geojson',
            data: geojson,
            cluster: true,
            clusterMaxZoom: 14,
            clusterRadius: 48,
          });

          map.addLayer({
            id: 'clusters',
            type: 'circle',
            source: 'monitorizacion',
            filter: ['has', 'point_count'],
            paint: {
              'circle-color': [
                'step',
                ['get', 'point_count'],
                '#f37021',
                25,
                '#df5c12',
                100,
                '#b83d08',
              ],
              'circle-radius': [
                'step',
                ['get', 'point_count'],
                18,
                25,
                23,
                100,
                29,
              ],
              'circle-stroke-width': 2,
              'circle-stroke-color': 'rgba(255,255,255,0.9)',
              'circle-opacity': 0.94,
            },
          });

          map.addLayer({
            id: 'cluster-count',
            type: 'symbol',
            source: 'monitorizacion',
            filter: ['has', 'point_count'],
            layout: {
              'text-field': ['get', 'point_count_abbreviated'],
              'text-size': 12,
              'text-font': ['Noto Sans Bold'],
            },
            paint: {
              'text-color': '#ffffff',
              'text-halo-color': 'rgba(0,0,0,0.25)',
              'text-halo-width': 1,
            },
          });

          map.addLayer({
            id: 'unclustered-point',
            type: 'circle',
            source: 'monitorizacion',
            filter: ['!', ['has', 'point_count']],
            paint: {
              'circle-color': [
                'match',
                ['get', 'tipo'],
                'PM', '#6792FF',
                'VT', '#64FF95',
                'IN', '#E4A2F6',
                'COT', '#FFD000',
                '#FF7052',
              ],
              'circle-radius': 7,
              'circle-stroke-width': 2,
              'circle-stroke-color': '#ffffff',
              'circle-opacity': 0.95,
            },
          });

          map.addLayer({
            id: 'selected-point',
            type: 'circle',
            source: 'monitorizacion',
            filter: ['==', ['get', 'id'], ''],
            paint: {
              'circle-radius': 13,
              'circle-color': 'rgba(243,112,33,0.12)',
              'circle-stroke-width': 3,
              'circle-stroke-color': '#f37021',
            },
          });

          map.on('click', 'clusters', async event => {
            const feature = event.features?.[0];
            const clusterId = feature?.properties?.cluster_id;
            if (clusterId === undefined) return;

            const source = map.getSource('monitorizacion');
            const zoom = await source.getClusterExpansionZoom(clusterId);
            map.easeTo({ center: feature.geometry.coordinates, zoom });
          });

          map.on('click', 'unclustered-point', event => {
            const feature = event.features?.[0];
            const point = pointById.get(String(feature?.properties?.id || ''));
            if (!point) return;

            setSelectedPoint(point);
            setDetail(null);
            setDetailError(null);
            map.setFilter('selected-point', ['==', ['get', 'id'], point.id]);
          });

          for (const layerId of ['clusters', 'unclustered-point']) {
            map.on('mouseenter', layerId, () => {
              map.getCanvas().style.cursor = 'pointer';
            });
            map.on('mouseleave', layerId, () => {
              map.getCanvas().style.cursor = '';
            });
          }

          const bounds = new maplibregl.LngLatBounds();
          for (const point of points) bounds.extend([point.lon, point.lat]);

          if (points.length === 1) {
            map.jumpTo({ center: [points[0].lon, points[0].lat], zoom: 15 });
          } else if (!bounds.isEmpty()) {
            map.fitBounds(bounds, {
              padding: { top: 90, right: 70, bottom: 70, left: 70 },
              maxZoom: 14,
              duration: 0,
            });
          }

          map.once('idle', () => {
            if (!cancelled) setMapReady(true);
          });
        });

        map.on('error', event => {
          if (!map.loaded() && !cancelled) {
            setMapError(event.error?.message || 'Non foi posible cargar a cartografía.');
          }
        });
      } catch (error) {
        if (!cancelled) setMapError(error.message || 'Non foi posible iniciar o mapa.');
      }
    }

    initializeMap();

    return () => {
      cancelled = true;
      mapRef.current?.remove();
      mapRef.current = null;
    };
  }, [points]);

  function closeSelection() {
    setSelectedPoint(null);
    setDetail(null);
    setDetailError(null);
    if (mapRef.current?.getLayer('selected-point')) {
      mapRef.current.setFilter('selected-point', ['==', ['get', 'id'], '']);
    }
  }

  async function openDetail() {
    if (!selectedPoint || detailLoading) return;

    setDetailLoading(true);
    setDetailError(null);
    try {
      const response = await fetch(
        `/api/ficha?asistencia=${encodeURIComponent(selectedPoint.id)}&detalle=1`
      );
      if (!response.ok) throw new Error('Non foi posible cargar a ficha.');
      setDetail(await response.json());
    } catch (error) {
      setDetailError(error.message || 'Non foi posible cargar a ficha.');
    } finally {
      setDetailLoading(false);
    }
  }

  if (points.length === 0) {
    return (
      <div className="empty-state map-empty-state">
        <MapPinOff size={30} aria-hidden="true" />
        <p className="empty-state-title">Non hai rexistros con coordenadas</p>
        <p className="empty-state-hint">
          {coverage.total > 0
            ? `${numberFormatter.format(coverage.total)} rexistros coinciden cos filtros, pero non teñen GPS válido.`
            : 'Proba a cambiar os filtros ou as datas.'}
        </p>
        {unmappedLocations.length > 0 && (
          <ul className="map-empty-locations" aria-label="Localidades sen coordenadas">
            {unmappedLocations.map(location => (
              <li key={location.name}>
                <span>{location.name}</span>
                <strong>{numberFormatter.format(location.count)}</strong>
              </li>
            ))}
          </ul>
        )}
      </div>
    );
  }

  const unlocatedCount = coverage.withoutGps + coverage.invalidGps;
  const selectedTypeColor = getTypeColor(selectedPoint?.tipo);
  const detailItem = detail?.item;
  const detailGpsParts = detailItem ? getGpsParts(detailItem, selectedPoint) : null;
  const detailTimeColor = detailItem?.tiempo_previsto && detailItem?.tiempo_total
    ? detailItem.tiempo_total > detailItem.tiempo_previsto
      ? 'var(--time-over)'
      : detailItem.tiempo_total < detailItem.tiempo_previsto
        ? 'var(--time-under)'
        : 'var(--text-primary)'
    : 'var(--text-primary)';

  return (
    <>
      <section className="monitoring-map-shell" aria-label="Mapa de monitorización">
        <div ref={containerRef} className="monitoring-map-canvas" aria-label="Mapa interactivo" />

        {!mapReady && !mapError && (
          <div className="map-loading-overlay" role="status" aria-live="polite">
            <MiniSpinner size={20} color="var(--brand-orange)" />
            <span>Preparando puntos…</span>
          </div>
        )}

        {mapError && (
          <div className="map-error-overlay" role="alert">
            <AlertTriangle size={20} aria-hidden="true" />
            <div>
              <strong>Cartografía non dispoñible</strong>
              <span>{mapError}</span>
            </div>
          </div>
        )}

        <div className="map-summary-bar">
          <span className="map-summary-primary">
            <MapPin size={15} aria-hidden="true" />
            <strong>{numberFormatter.format(coverage.mapped)}</strong> no mapa
          </span>
          <span>{numberFormatter.format(coverage.total)} filtrados</span>
          {unlocatedCount > 0 && (
            <span className="map-summary-warning">
              {numberFormatter.format(unlocatedCount)} sen coordenadas
            </span>
          )}
          {coverage.truncated && (
            <span className="map-summary-warning">
              Límite {numberFormatter.format(coverage.limit)} · acouta filtros
            </span>
          )}
        </div>

        <div className="map-legend" aria-label="Lenda de tipos">
          <span><i style={{ '--legend-color': '#6792FF' }} /> Instalación</span>
          <span><i style={{ '--legend-color': '#64FF95' }} /> Visita</span>
          <span><i style={{ '--legend-color': '#E4A2F6' }} /> Recado</span>
          <span><i style={{ '--legend-color': '#FF7052' }} /> Outros</span>
        </div>

        {unlocatedCount > 0 && !selectedPoint && (
          <details className="map-unmapped-summary">
            <summary>
              <MapPinOff size={14} aria-hidden="true" />
              Sen GPS por concello
            </summary>
            <p>Non se colocan puntos aproximados para evitar localizacións falsas.</p>
            <ul>
              {unmappedLocations.map(location => (
                <li key={location.name}>
                  <span>{location.name}</span>
                  <strong>{numberFormatter.format(location.count)}</strong>
                </li>
              ))}
            </ul>
            {coverage.invalidGps > 0 && (
              <small>{numberFormatter.format(coverage.invalidGps)} GPS con formato non válido.</small>
            )}
          </details>
        )}

        {selectedPoint && (
          <aside className="map-selection-card" aria-live="polite">
            <button
              type="button"
              className="map-selection-close"
              onClick={closeSelection}
              aria-label="Pechar detalle do punto"
            >
              <X size={16} />
            </button>

            <div className="map-selection-kicker">
              <span style={{ '--point-color': selectedTypeColor }} />
              {selectedPoint.tipo || 'OUTRO'}
            </div>
            <strong className="map-selection-title">
              {selectedPoint.aviso || selectedPoint.id}
            </strong>
            <p className="map-selection-client">
              {selectedPoint.cliente || selectedPoint.local || 'Cliente descoñecido'}
            </p>
            {selectedPoint.local && selectedPoint.local !== selectedPoint.cliente && (
              <p className="map-selection-local">{selectedPoint.local}</p>
            )}

            <div className="map-selection-meta">
              <span><User size={13} /> {selectedPoint.tecnico || 'Sen técnico'}</span>
              <span>
                <Calendar size={13} /> {formatDate(selectedPoint.fecha)}
                {formatSeconds(selectedPoint.hora) ? ` · ${formatSeconds(selectedPoint.hora)}` : ''}
              </span>
              {selectedPoint.localidad && <span><MapPin size={13} /> {selectedPoint.localidad}</span>}
            </div>

            <div className="map-selection-actions">
              <button type="button" className="map-detail-button" onClick={openDetail} disabled={detailLoading}>
                {detailLoading ? <MiniSpinner size={14} /> : <Navigation size={14} />}
                {detailLoading ? 'Cargando…' : 'Abrir ficha'}
              </button>
              <a
                href={`https://www.google.com/maps/search/?api=1&query=${selectedPoint.lat},${selectedPoint.lon}`}
                target="_blank"
                rel="noopener noreferrer"
                className="map-external-link"
              >
                <ExternalLink size={14} /> Como chegar
              </a>
            </div>
            {detailError && <p className="map-detail-error" role="alert">{detailError}</p>}
          </aside>
        )}
      </section>

      {detailItem && (
        <JobModal
          isOpen
          onClose={() => setDetail(null)}
          item={detailItem}
          photos={detail.photos || []}
          gpsParts={detailGpsParts}
          avisoCompleto={`${String(detailItem.aviso || '').trim()}-${String(detailItem.tipo || '').trim()}`}
          tecnicoVal={detailItem.comercial || detailItem.abreviatura || 'N/A'}
          timeVal={formatDuration(detailItem.tiempo_total)}
          estTimeVal={formatDuration(detailItem.tiempo_previsto)}
          timeColor={detailTimeColor}
          typeColor={getTypeColor(detailItem.tipo)}
          solutionVal={detailItem.solucion || 'Pendente'}
          formattedDate={formatDate(detailItem.fecha)}
          asistencia={detailItem.asistencia}
          direccionCompleta={detailItem.DireccionCliente}
          telefonoPreaviso={detailItem.TelefonoPreavisoCliente}
          zipCode={detailItem.ZipCode}
          provincia={detailItem.Provincia}
          localidadCliente={detailItem.LocalidadCliente}
        />
      )}
    </>
  );
}
