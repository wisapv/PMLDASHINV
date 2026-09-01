import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { GripVertical, Loader2, AlertCircle, ArrowRight } from 'lucide-react';
import { API_BASE } from '../hooks/useActiveBatch';

// TODO: the handheld device registry (add/rename/activate device) is still
// frontend-only mock state living in HandheldDevices.jsx — there's no
// backend table for it yet (see the Handheld Devices discussion). Until
// that exists, this list is duplicated here by hand. Once a real
// GET /api/handheld/devices-style endpoint exists, replace this constant
// with a fetch and this component shouldn't need any other changes — it
// only ever reads {id, name, status}.
const DEVICES = [
  { id: 'HH-01', name: 'HH-01', status: 'active' },
  { id: 'HH-02', name: 'HH-02', status: 'active' },
  { id: 'HH-03', name: 'HH-03', status: 'inactive' },
  { id: 'HH-04', name: 'HH-04', status: 'active' },
];

const UNASSIGNED = '__unassigned__';

const AssignHandheld = ({ currentBatchId, setUploadTab }) => {
  const [finalData, setFinalData] = useState(null); // null = not loaded yet, [] = loaded but empty
  const [isLoading, setIsLoading] = useState(true);
  const [notProcessed, setNotProcessed] = useState(false);
  const [dragOverDeviceId, setDragOverDeviceId] = useState(null);

  // Mirrors HandheldManager's restore-on-mount pattern: fetch whatever's
  // already persisted for this batch's finalData (Address/PIC assignment
  // must have been done already on the Handheld tab — that's what
  // process-assign-addr writes). A 404 here means Address/PIC assignment
  // hasn't happened yet for this batch, not "no devices assigned yet" —
  // those are different empty states and get different messaging below.
  const loadFinalData = useCallback(async (batchId) => {
    if (!batchId) { setFinalData(null); setIsLoading(false); return; }
    setIsLoading(true);
    setNotProcessed(false);
    try {
      const res = await fetch(`${API_BASE}/api/handheld-assign/final-data?batchId=${batchId}`);
      if (res.status === 404) {
        setFinalData(null);
        setNotProcessed(true);
        return;
      }
      const result = await res.json();
      if (res.ok) {
        setFinalData(result.data || []);
      } else {
        setFinalData(null);
      }
    } catch (err) {
      console.error('Failed to load final data for handheld assignment', err);
      setFinalData(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadFinalData(currentBatchId);
  }, [currentBatchId, loadFinalData]);

  // Groups rows by Address (ShortAddr) — the same grouping key
  // HandheldManager's PIC manager uses — and reads whatever
  // assignedHandheldId is already on those rows (undefined/missing counts
  // as unassigned). Assignment is address-level: every row sharing a
  // ShortAddr moves together. A per-part override can be added later if an
  // address turns out to be too big for one device, but this is the
  // simplest thing that matches how PIC assignment already works.
  const addressGroups = useMemo(() => {
    if (!finalData) return {};
    const groups = {};
    finalData.forEach((row) => {
      const shortAddr = row.ShortAddr || 'Unk';
      const assignedHandheldId = row.assignedHandheldId || UNASSIGNED;
      if (!groups[assignedHandheldId]) groups[assignedHandheldId] = {};
      if (!groups[assignedHandheldId][shortAddr]) groups[assignedHandheldId][shortAddr] = 0;
      groups[assignedHandheldId][shortAddr]++;
    });
    return groups;
  }, [finalData]);

  // Fire-and-forget save, same pattern as HandheldManager's PIC
  // reassignment — the local move already applied optimistically, so a
  // failed save shouldn't block the drag interaction with an alert.
  const saveToServer = async (data) => {
    try {
      await fetch(`${API_BASE}/api/handheld-assign/final-data`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ batchId: currentBatchId, data }),
      });
    } catch (err) {
      console.error('Failed to persist handheld assignment', err);
    }
  };

  const handleDragStart = (e, shortAddr, sourceDeviceId) => {
    e.dataTransfer.setData('application/json', JSON.stringify({ shortAddr, sourceDeviceId }));
  };

  const handleDragOver = (e, deviceId) => {
    e.preventDefault();
    if (dragOverDeviceId !== deviceId) setDragOverDeviceId(deviceId);
  };

  const handleDragLeave = () => setDragOverDeviceId(null);

  const handleDrop = (e, targetDeviceId) => {
    e.preventDefault();
    setDragOverDeviceId(null);
    const dataStr = e.dataTransfer.getData('application/json');
    if (!dataStr) return;

    try {
      const { shortAddr, sourceDeviceId } = JSON.parse(dataStr);
      if (sourceDeviceId === targetDeviceId) return;

      setFinalData((prev) => {
        const next = prev.map((row) => {
          const rowDeviceId = row.assignedHandheldId || UNASSIGNED;
          if (row.ShortAddr !== shortAddr || rowDeviceId !== sourceDeviceId) return row;
          return { ...row, assignedHandheldId: targetDeviceId === UNASSIGNED ? undefined : targetDeviceId };
        });
        saveToServer(next);
        return next;
      });
    } catch (err) {
      console.error(err);
    }
  };

  if (isLoading) {
    return (
      <div className="bg-white border-2 border-dashed border-ink/10 rounded-4xl p-20 flex flex-col items-center justify-center text-center animate-in fade-in">
        <Loader2 size={40} className="animate-spin text-muted mb-4" />
        <p className="text-muted">Loading assignment…</p>
      </div>
    );
  }

  if (notProcessed || !finalData) {
    return (
      <div className="bg-white border-2 border-dashed border-red-200 rounded-4xl p-20 flex flex-col items-center justify-center text-center animate-in fade-in">
        <AlertCircle size={56} className="text-red-400 mb-4" />
        <h3 className="font-display text-2xl font-bold text-ink mb-2">Address/PIC Assignment Needed First</h3>
        <p className="text-muted mb-6 max-w-md">Assign every part an Address and PIC on the Handheld tab before assigning them to physical devices.</p>
        <button onClick={() => setUploadTab && setUploadTab('Handheld')} className="bg-ink text-accent px-8 py-3 rounded-xl font-bold hover:opacity-90 transition-colors flex items-center gap-2">
          Go to Handheld tab <ArrowRight size={18} />
        </button>
      </div>
    );
  }

  const activeDevices = DEVICES.filter((d) => d.status === 'active');
  const columns = [{ id: UNASSIGNED, name: 'Unassigned' }, ...activeDevices];
  const totalAssigned = Object.entries(addressGroups)
    .filter(([deviceId]) => deviceId !== UNASSIGNED)
    .reduce((sum, [, addrMap]) => sum + Object.values(addrMap).reduce((a, b) => a + b, 0), 0);

  return (
    <div className="flex flex-col gap-6 w-full animate-in fade-in pb-10">
      <div className="flex flex-col gap-2">
        <h2 className="font-display text-2xl font-bold text-ink tracking-tight">Assign Handheld</h2>
        <p className="text-sm text-muted">Drag each address group onto the device that will scan it. {totalAssigned} of {finalData.length} items assigned.</p>
      </div>

      <div className="bg-white p-6 rounded-4xl border border-ink/5 shadow-[0_2px_12px_rgba(20,20,15,0.04)]">
        <h3 className="font-bold text-ink mb-4 flex items-center gap-2"><GripVertical size={20} className="text-accent" /> Drag & Drop Address Groups</h3>

        {activeDevices.length === 0 && (
          <p className="text-sm text-red-500 mb-4">No active handheld devices — activate at least one under Template Management → Device.</p>
        )}

        <div className="flex gap-4 overflow-x-auto p-2 snap-x">
          {columns.map((col) => {
            const addrMap = addressGroups[col.id] || {};
            const isUnassignedCol = col.id === UNASSIGNED;
            return (
              <div
                key={col.id}
                onDragOver={(e) => handleDragOver(e, col.id)}
                onDragLeave={handleDragLeave}
                onDrop={(e) => handleDrop(e, col.id)}
                className={`min-w-[200px] bg-[#FAFAF7] rounded-xl p-4 shadow-sm border-2 transition-all snap-start
                  ${dragOverDeviceId === col.id ? 'border-accent bg-accent/10 scale-105' : 'border-transparent'}`}
              >
                <div className={`flex justify-center items-center mb-4 py-2 rounded-xl shadow-lg ${isUnassignedCol ? 'bg-ink/10' : 'bg-accent'}`}>
                  <h4 className={`font-bold text-xl ${isUnassignedCol ? 'text-muted' : 'text-ink'}`}>{col.name}</h4>
                </div>

                <div className="flex flex-col gap-2 max-h-[280px] min-h-[60px] overflow-y-auto p-1">
                  {Object.entries(addrMap).length === 0 && (
                    <p className="text-xs text-muted text-center py-4">Drop here</p>
                  )}
                  {Object.entries(addrMap).map(([shortAddr, count]) => (
                    <div
                      key={shortAddr}
                      draggable
                      onDragStart={(e) => handleDragStart(e, shortAddr, col.id)}
                      className="bg-ink rounded-2xl p-2.5 flex justify-between items-center cursor-grab active:cursor-grabbing hover:ring-2 hover:ring-accent transition-all shadow-sm"
                    >
                      <span className="font-mono text-sm font-bold text-white">{shortAddr}</span>
                      <span className="text-[10px] bg-white/10 px-2 py-0.5 rounded-full text-white/70 font-bold">{count} items</span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default AssignHandheld;
