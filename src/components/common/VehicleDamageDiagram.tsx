import React from 'react';
import { X } from 'lucide-react';
import vehicleDiagram from '../../assets/diagram.svg';
import type { DamageMarker } from '../../types';

interface VehicleDamageDiagramProps {
  markers: DamageMarker[];
  onChange?: (markers: DamageMarker[]) => void;
  readOnly?: boolean;
}

export default function VehicleDamageDiagram({ markers, onChange, readOnly = false }: VehicleDamageDiagramProps) {
  const handleDiagramClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (readOnly || !onChange) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    const newMarker: DamageMarker = {
      id: `dm-${Date.now()}`,
      x: Math.min(99, Math.max(1, x)),
      y: Math.min(99, Math.max(1, y)),
      note: ''
    };
    onChange([...markers, newMarker]);
  };

  const updateNote = (id: string, note: string) => {
    if (!onChange) return;
    onChange(markers.map(m => (m.id === id ? { ...m, note } : m)));
  };

  const removeMarker = (id: string) => {
    if (!onChange) return;
    onChange(markers.filter(m => m.id !== id));
  };

  return (
    <div className="flex flex-col sm:flex-row gap-5">
      <div
        onClick={handleDiagramClick}
        className={`relative w-full sm:w-56 shrink-0 bg-gray-50 border border-gray-200 rounded-xl ${readOnly ? '' : 'cursor-crosshair'}`}
        style={{ aspectRatio: '448 / 524' }}
        title={readOnly ? undefined : 'Click on the diagram to mark a damage point'}
      >
        <img src={vehicleDiagram} alt="Vehicle top-down diagram" className="w-full h-full object-contain select-none pointer-events-none" draggable={false} />
        {markers.map((m, idx) => (
          <div
            key={m.id}
            className="absolute w-5 h-5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#C1121F] text-white text-[10px] font-bold flex items-center justify-center border-2 border-white shadow"
            style={{ left: `${m.x}%`, top: `${m.y}%` }}
          >
            {idx + 1}
          </div>
        ))}
      </div>

      <div className="flex-1 space-y-2">
        {markers.length === 0 ? (
          <div className="h-full flex items-center justify-center text-xs text-gray-400 border-2 border-dashed border-gray-200 rounded-xl py-6">
            {readOnly ? 'No damage points marked' : 'Click on the diagram to mark existing damage / scratches'}
          </div>
        ) : (
          markers.map((m, idx) => (
            <div key={m.id} className="flex items-center gap-2">
              <span className="shrink-0 w-5 h-5 rounded-full bg-[#C1121F] text-white text-[10px] font-bold flex items-center justify-center">
                {idx + 1}
              </span>
              {readOnly ? (
                <span className="text-xs sm:text-sm text-gray-700">{m.note || 'No description'}</span>
              ) : (
                <>
                  <input
                    type="text"
                    value={m.note}
                    onChange={e => updateNote(m.id, e.target.value)}
                    placeholder="Describe the damage at this point..."
                    className="flex-1 text-xs sm:text-sm px-3 py-1.5 border border-gray-300 rounded-lg focus:ring-1 focus:ring-red-500 focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => removeMarker(m.id)}
                    className="p-1 text-gray-400 hover:text-rose-600 rounded-lg"
                    title="Remove marker"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
