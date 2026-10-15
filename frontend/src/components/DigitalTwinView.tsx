import React, { useState, useEffect, useRef } from 'react';
import {
  MapPin,
  Layers,
  Battery,
  Clock,
  Sparkles,
  QrCode,
  Trash2,
  RefreshCw,
  Box,
  Compass,
  Zap,
  SlidersHorizontal,
  X
} from 'lucide-react';
import L from 'leaflet';
import { Bin, WasteCategory, BinStatus } from '../types';
import { ThreeCampusTwin } from './ThreeCampusTwin';
import { apiService } from '../services/api';

interface DigitalTwinViewProps {
  bins: Bin[];
  onRefreshBins: () => void;
  onNavigateToDeposit: (binId?: string) => void;
}

// Map center for our campus
const CAMPUS_CENTER: [number, number] = [37.7749, -122.4194];

// Create custom colored Leaflet markers
const createCustomIcon = (fillPct: number, status: BinStatus) => {
  let bgColor = '#10b981'; // Green
  if (status === 'FULL' || fillPct >= 90) bgColor = '#ef4444'; // Red
  else if (status === 'NEAR_FULL' || fillPct >= 75) bgColor = '#f59e0b'; // Amber
  else if (status === 'MAINTENANCE') bgColor = '#64748b'; // Gray

  return L.divIcon({
    className: 'custom-leaflet-marker',
    html: `
      <div style="
        background-color: ${bgColor};
        width: 36px;
        height: 36px;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        border: 2px solid white;
        box-shadow: 0 4px 12px rgba(0,0,0,0.5);
        color: white;
        font-family: monospace;
        font-weight: bold;
        font-size: 11px;
      ">
        ${fillPct}%
      </div>
    `,
    iconSize: [36, 36],
    iconAnchor: [18, 18],
    popupAnchor: [0, -18],
  });
};

export const DigitalTwinView: React.FC<DigitalTwinViewProps> = ({
  bins,
  onRefreshBins,
  onNavigateToDeposit,
}) => {
  const [viewMode, setViewMode] = useState<'2d' | '3d'>('2d');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [zoneFilter, setZoneFilter] = useState<string>('all');
  const [selectedBin, setSelectedBin] = useState<Bin | null>(bins[0] || null);
  const [showQRModal, setShowQRModal] = useState(false);
  const [isSimulating, setIsSimulating] = useState(false);

  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markersLayerRef = useRef<L.LayerGroup | null>(null);

  // Filter bins
  const filteredBins = bins.filter((bin) => {
    if (categoryFilter !== 'all' && bin.category.toLowerCase() !== categoryFilter.toLowerCase()) return false;
    if (statusFilter !== 'all' && bin.status.toUpperCase() !== statusFilter.toUpperCase()) return false;
    if (zoneFilter !== 'all' && bin.campus_zone.toLowerCase() !== zoneFilter.toLowerCase()) return false;
    return true;
  });

  // Extract unique campus zones
  const uniqueZones = Array.from(new Set(bins.map((b) => b.campus_zone)));

  // Initialize and update native Leaflet map
  useEffect(() => {
    if (viewMode !== '2d') return;
    if (!mapContainerRef.current) return;

    if (!mapInstanceRef.current) {
      const map = L.map(mapContainerRef.current).setView(CAMPUS_CENTER, 16);
      L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; CartoDB & OpenStreetMap',
        maxZoom: 19,
      }).addTo(map);

      const markersGroup = L.layerGroup().addTo(map);
      markersLayerRef.current = markersGroup;
      mapInstanceRef.current = map;
    }

    const markersGroup = markersLayerRef.current;
    if (markersGroup) {
      markersGroup.clearLayers();
      filteredBins.forEach((bin) => {
        const marker = L.marker([bin.latitude, bin.longitude], {
          icon: createCustomIcon(bin.fill_level_pct, bin.status),
        });

        marker.bindPopup(`
          <div style="font-family: sans-serif; padding: 4px;">
            <div style="font-weight: bold; font-size: 13px; color: #f8fafc;">${bin.name}</div>
            <div style="font-size: 11px; color: #94a3b8; margin-top: 2px;">${bin.building} (${bin.floor})</div>
            <div style="display: flex; justify-content: space-between; font-size: 11px; margin-top: 6px; border-top: 1px solid #334155; padding-top: 4px;">
              <span style="font-family: monospace; color: #38bdf8; font-weight: bold;">Fill: ${bin.fill_level_pct}%</span>
              <span style="text-transform: uppercase; font-weight: bold; color: #34d399;">${bin.category}</span>
            </div>
          </div>
        `);

        marker.on('click', () => {
          setSelectedBin(bin);
        });

        markersGroup.addLayer(marker);
      });
    }
  }, [viewMode, filteredBins]);

  // Clean up map when switching view
  useEffect(() => {
    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
        markersLayerRef.current = null;
      }
    };
  }, [viewMode]);

  // Simulated IoT Telemetry Actions
  const handleSimulateFillIncrement = async () => {
    if (!selectedBin) return;
    setIsSimulating(true);
    try {
      const newFill = Math.min(100, selectedBin.fill_level_pct + 15);
      const updated = await apiService.updateBinTelemetry(selectedBin.id, {
        fill_level_pct: newFill,
      });
      setSelectedBin(updated);
      onRefreshBins();
    } finally {
      setIsSimulating(false);
    }
  };

  const handleSimulateBinFlush = async () => {
    if (!selectedBin) return;
    setIsSimulating(true);
    try {
      const updated = await apiService.updateBinTelemetry(selectedBin.id, {
        fill_level_pct: 0,
        status: 'NORMAL',
      });
      setSelectedBin(updated);
      onRefreshBins();
    } finally {
      setIsSimulating(false);
    }
  };

  const handleToggleMaintenance = async () => {
    if (!selectedBin) return;
    setIsSimulating(true);
    try {
      const newStatus = selectedBin.status === 'MAINTENANCE' ? 'NORMAL' : 'MAINTENANCE';
      const updated = await apiService.updateBinTelemetry(selectedBin.id, {
        status: newStatus,
      });
      setSelectedBin(updated);
      onRefreshBins();
    } finally {
      setIsSimulating(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header & Mode Toggle */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-white flex items-center gap-2">
              <Compass className="w-6 h-6 text-cyan-400" />
              Campus Waste Digital Twin
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-mono font-semibold bg-cyan-950 text-cyan-300 border border-cyan-500/30">
              Live IoT Telemetry
            </span>
          </div>
          <p className="text-sm text-slate-400 mt-1">
            Real-time geospatial monitoring of smart campus recycling receptacles with automated fill detection and telemetry simulation.
          </p>
        </div>

        {/* 2D GIS vs 3D Isometric View Switcher */}
        <div className="flex items-center bg-slate-900 border border-slate-700 rounded-xl p-1 shadow-lg">
          <button
            onClick={() => setViewMode('2d')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors ${
              viewMode === '2d'
                ? 'bg-cyan-500 text-slate-950 shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <MapPin className="w-3.5 h-3.5" />
            2D GIS Map
          </button>
          <button
            onClick={() => setViewMode('3d')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors ${
              viewMode === '3d'
                ? 'bg-emerald-500 text-slate-950 shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Box className="w-3.5 h-3.5" />
            3D Isometric Twin
          </button>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-1.5 text-xs text-slate-400 font-medium">
            <SlidersHorizontal className="w-4 h-4 text-slate-500" />
            Filters:
          </div>

          {/* Category Filter */}
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="px-3 py-1.5 rounded-xl bg-slate-800 border border-slate-700 text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-cyan-500 font-sans"
          >
            <option value="all">All Waste Streams</option>
            <option value="plastic">Plastic</option>
            <option value="paper">Paper</option>
            <option value="metal">Metal</option>
            <option value="glass">Glass</option>
            <option value="organic">Organic</option>
            <option value="multi-stream">Multi-Stream</option>
            <option value="general">General</option>
          </select>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-1.5 rounded-xl bg-slate-800 border border-slate-700 text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-cyan-500 font-sans"
          >
            <option value="all">All Operational Statuses</option>
            <option value="NORMAL">Normal (&lt;75%)</option>
            <option value="NEAR_FULL">Near Full (75-89%)</option>
            <option value="FULL">Critical / Full (&ge;90%)</option>
            <option value="MAINTENANCE">Maintenance</option>
          </select>

          {/* Campus Zone Filter */}
          <select
            value={zoneFilter}
            onChange={(e) => setZoneFilter(e.target.value)}
            className="px-3 py-1.5 rounded-xl bg-slate-800 border border-slate-700 text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-cyan-500 font-sans"
          >
            <option value="all">All Campus Zones</option>
            {uniqueZones.map((z) => (
              <option key={z} value={z}>{z}</option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-2 text-xs font-mono text-slate-400">
          <span>Active Bins: <strong>{filteredBins.length}</strong> of {bins.length}</span>
          <button
            onClick={onRefreshBins}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
            title="Refresh IoT telemetry readings"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Main Content Area: Map / 3D Canvas + Telemetry Drawer */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Map / 3D Canvas Container */}
        <div className="lg:col-span-8">
          {viewMode === '2d' ? (
            <div className="relative w-full h-[540px] rounded-2xl overflow-hidden border border-slate-800 shadow-2xl">
              <div ref={mapContainerRef} className="w-full h-full" />

              {/* Map Legend Overlay */}
              <div className="absolute bottom-4 left-4 z-[400] bg-slate-900/90 backdrop-blur-md px-3.5 py-2.5 rounded-xl border border-slate-700/80 text-[11px] space-y-1.5 shadow-xl">
                <span className="text-xs font-bold text-slate-300 block mb-1">Fill Legend:</span>
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                  <span className="text-slate-400">Normal (&lt;75%)</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                  <span className="text-slate-400">Near Full (75-89%)</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
                  <span className="text-slate-400">Critical (&ge;90%)</span>
                </div>
              </div>
            </div>
          ) : (
            <ThreeCampusTwin
              bins={filteredBins}
              selectedBinId={selectedBin?.id}
              onSelectBin={(bin) => setSelectedBin(bin)}
            />
          )}
        </div>

        {/* Selected Bin Telemetry & Actions Drawer */}
        <div className="lg:col-span-4 space-y-5">
          {selectedBin ? (
            <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-5 shadow-2xl">
              <div className="flex items-start justify-between">
                <div>
                  <span className="text-[11px] font-mono uppercase text-slate-400 block font-semibold">
                    {selectedBin.bin_code}
                  </span>
                  <h2 className="text-lg font-bold text-white leading-tight mt-0.5">
                    {selectedBin.name}
                  </h2>
                </div>

                <span
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold font-mono uppercase ${
                    selectedBin.status === 'FULL'
                      ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                      : selectedBin.status === 'NEAR_FULL'
                      ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                      : selectedBin.status === 'MAINTENANCE'
                      ? 'bg-slate-700 text-slate-300'
                      : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                  }`}
                >
                  {selectedBin.status}
                </span>
              </div>

              {/* Live Fill Gauge Progress */}
              <div className="p-4 rounded-xl bg-slate-800/60 border border-slate-700/60 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-400 font-medium">Internal Receptacle Fill:</span>
                  <span className="text-lg font-bold font-mono text-white">
                    {selectedBin.fill_level_pct}%
                  </span>
                </div>

                <div className="w-full bg-slate-700 h-3 rounded-full overflow-hidden">
                  <div
                    className={`h-full transition-all duration-500 ${
                      selectedBin.fill_level_pct >= 90
                        ? 'bg-rose-500'
                        : selectedBin.fill_level_pct >= 75
                        ? 'bg-amber-500'
                        : 'bg-emerald-500'
                    }`}
                    style={{ width: `${selectedBin.fill_level_pct}%` }}
                  />
                </div>
                <span className="text-[11px] text-slate-400 block pt-1">
                  Capacity: {selectedBin.capacity_liters} Liters • Ultrasonic level sensor
                </span>
              </div>

              {/* Telemetry Sensor Specs */}
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="p-3 rounded-xl bg-slate-800/40 border border-slate-800 space-y-1">
                  <span className="text-slate-500 flex items-center gap-1">
                    <Battery className="w-3.5 h-3.5 text-emerald-400" />
                    IoT Battery
                  </span>
                  <span className="font-mono font-bold text-slate-200">
                    {selectedBin.battery_level_pct}%
                  </span>
                </div>

                <div className="p-3 rounded-xl bg-slate-800/40 border border-slate-800 space-y-1">
                  <span className="text-slate-500 flex items-center gap-1">
                    <Layers className="w-3.5 h-3.5 text-cyan-400" />
                    Stream Type
                  </span>
                  <span className="font-mono font-bold text-slate-200 uppercase">
                    {selectedBin.category}
                  </span>
                </div>

                <div className="p-3 rounded-xl bg-slate-800/40 border border-slate-800 space-y-1">
                  <span className="text-slate-500 flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5 text-amber-400" />
                    Zone
                  </span>
                  <span className="font-medium text-slate-200 truncate block">
                    {selectedBin.campus_zone}
                  </span>
                </div>

                <div className="p-3 rounded-xl bg-slate-800/40 border border-slate-800 space-y-1">
                  <span className="text-slate-500 flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5 text-slate-400" />
                    Last Emptied
                  </span>
                  <span className="font-medium text-slate-200 truncate block">
                    {selectedBin.last_collected_at}
                  </span>
                </div>
              </div>

              {/* Direct Action: Deposit at this Bin */}
              <button
                onClick={() => onNavigateToDeposit(selectedBin.id)}
                className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs transition-colors flex items-center justify-center gap-2 shadow-lg shadow-emerald-950/40"
              >
                <QrCode className="w-4 h-4" />
                Deposit Waste at this Bin
              </button>

              {/* Simulated IoT Sensor Triggers */}
              <div className="pt-2 border-t border-slate-800 space-y-2">
                <span className="text-[11px] font-semibold uppercase text-slate-400 tracking-wider flex items-center gap-1">
                  <Zap className="w-3.5 h-3.5 text-cyan-400" />
                  Simulate Live IoT Hardware Events
                </span>
                
                <div className="grid grid-cols-2 gap-2">
                  <button
                    disabled={isSimulating}
                    onClick={handleSimulateFillIncrement}
                    className="p-2 rounded-lg bg-slate-800 hover:bg-slate-750 text-xs text-slate-300 border border-slate-700 transition-colors"
                  >
                    +15% Inflow
                  </button>

                  <button
                    disabled={isSimulating}
                    onClick={handleSimulateBinFlush}
                    className="p-2 rounded-lg bg-slate-800 hover:bg-slate-750 text-xs text-emerald-400 border border-slate-700 transition-colors flex items-center justify-center gap-1"
                  >
                    <Trash2 className="w-3 h-3" />
                    Flush / Empty
                  </button>
                </div>

                <div className="flex gap-2">
                  <button
                    disabled={isSimulating}
                    onClick={handleToggleMaintenance}
                    className="flex-1 p-2 rounded-lg bg-slate-800 hover:bg-slate-750 text-xs text-slate-400 border border-slate-700 transition-colors"
                  >
                    Toggle Maintenance
                  </button>
                  <button
                    onClick={() => setShowQRModal(true)}
                    className="p-2 rounded-lg bg-slate-800 hover:bg-slate-750 text-xs text-cyan-400 border border-slate-700 transition-colors flex items-center gap-1"
                  >
                    <QrCode className="w-3.5 h-3.5" />
                    QR
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="p-8 rounded-2xl bg-slate-900 border border-slate-800 text-center text-slate-500 text-sm">
              Click any campus bin on the map to inspect its real-time telemetry.
            </div>
          )}
        </div>
      </div>

      {/* QR Code Inspection Modal */}
      {showQRModal && selectedBin && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-sm w-full p-6 text-center space-y-4 shadow-2xl relative">
            <button
              onClick={() => setShowQRModal(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-lg font-bold text-white">Bin Physical QR Code</h3>
            <p className="text-xs text-slate-400">
              Students scan this physical decal affixed to the bin receptacle to begin waste submission.
            </p>

            <div className="w-48 h-48 mx-auto p-3 bg-white rounded-2xl shadow-inner flex flex-col items-center justify-center">
              <QrCode className="w-36 h-36 text-slate-950" />
              <span className="text-[10px] font-mono font-bold text-slate-900">
                {selectedBin.bin_code}
              </span>
            </div>

            <div className="text-xs text-slate-300 font-mono">
              {selectedBin.name}
            </div>

            <button
              onClick={() => {
                setShowQRModal(false);
                onNavigateToDeposit(selectedBin.id);
              }}
              className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs transition-colors"
            >
              Simulate Mobile Scanning This Code
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
