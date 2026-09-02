import React, { useEffect, useState } from 'react';
import { Plus, X, Power, Trash2, Smartphone, Pencil, Loader2 } from 'lucide-react';
import { API_BASE } from '../hooks/useActiveBatch';

// Real device photo, imported from src/assets (the project's existing
// assets folder) so Vite bundles and hashes it like every other imported
// asset — not a hardcoded /public path string. Swap this import for your
// own device photo any time; nothing else in this component needs to change.
import handheldDevicePhoto from '../assets/handheld-device.png';
const DEVICE_PHOTO_SRC = handheldDevicePhoto;

const STATUS_STYLES = {
  active: { label: 'Active', dot: 'bg-success' },
  inactive: { label: 'Inactive', dot: 'bg-gray-300' },
};

function validateDeviceNameLocal(value) {
  const trimmed = value.trim();
  if (!trimmed) return 'Device name cannot be empty.';
  return '';
}

// Reads the server's { error } message when a request fails, falling back
// to a generic message if the response isn't JSON (e.g. a network error).
async function extractErrorMessage(res, fallback) {
  try {
    const body = await res.json();
    return body.error || fallback;
  } catch {
    return fallback;
  }
}

const HandheldDevices = () => {
  const [devices, setDevices] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState('');

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newDeviceName, setNewDeviceName] = useState('');
  const [addModalError, setAddModalError] = useState('');
  const [isSavingAdd, setIsSavingAdd] = useState(false);

  // Editing an existing device — one modal handles rename + activate/
  // deactivate + delete, opened by clicking the device's card.
  const [editTarget, setEditTarget] = useState(null); // device object being edited
  const [editNameValue, setEditNameValue] = useState('');
  const [editError, setEditError] = useState('');
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [isSavingEdit, setIsSavingEdit] = useState(false);

  const loadDevices = () => {
    setIsLoading(true);
    setLoadError('');
    fetch(`${API_BASE}/api/handheld-devices`)
      .then((res) => (res.ok ? res.json() : Promise.reject(new Error('Failed to load'))))
      .then((result) => setDevices(result.data || []))
      .catch(() => setLoadError('Could not load devices from the server.'))
      .finally(() => setIsLoading(false));
  };

  useEffect(() => { loadDevices(); }, []);

  const openAddModal = () => {
    setNewDeviceName('');
    setAddModalError('');
    setIsAddModalOpen(true);
  };

  const handleConfirmAddDevice = async () => {
    const localError = validateDeviceNameLocal(newDeviceName);
    if (localError) { setAddModalError(localError); return; }

    setIsSavingAdd(true);
    try {
      const res = await fetch(`${API_BASE}/api/handheld-devices`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newDeviceName.trim() }),
      });
      if (!res.ok) {
        setAddModalError(await extractErrorMessage(res, 'Failed to add device.'));
        return;
      }
      const result = await res.json();
      setDevices((prev) => [...prev, result.data]);
      setIsAddModalOpen(false);
    } catch {
      setAddModalError('Could not reach the server.');
    } finally {
      setIsSavingAdd(false);
    }
  };

  const openEditModal = (device) => {
    setEditTarget(device);
    setEditNameValue(device.name);
    setEditError('');
    setConfirmingDelete(false);
  };

  const closeEditModal = () => {
    setEditTarget(null);
    setConfirmingDelete(false);
  };

  const handleSaveEdit = async () => {
    const localError = validateDeviceNameLocal(editNameValue);
    if (localError) { setEditError(localError); return; }

    setIsSavingEdit(true);
    try {
      const res = await fetch(`${API_BASE}/api/handheld-devices/${editTarget.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: editNameValue.trim() }),
      });
      if (!res.ok) {
        setEditError(await extractErrorMessage(res, 'Failed to rename device.'));
        return;
      }
      const result = await res.json();
      setDevices((prev) => prev.map((d) => (d.id === editTarget.id ? result.data : d)));
      setEditTarget(result.data);
      setEditError('');
    } catch {
      setEditError('Could not reach the server.');
    } finally {
      setIsSavingEdit(false);
    }
  };

  const handleToggleStatus = async () => {
    const nextStatus = editTarget.status === 'active' ? 'inactive' : 'active';
    try {
      const res = await fetch(`${API_BASE}/api/handheld-devices/${editTarget.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: nextStatus }),
      });
      if (!res.ok) { setEditError(await extractErrorMessage(res, 'Failed to update status.')); return; }
      const result = await res.json();
      setDevices((prev) => prev.map((d) => (d.id === editTarget.id ? result.data : d)));
      setEditTarget(result.data);
    } catch {
      setEditError('Could not reach the server.');
    }
  };

  const handleConfirmDelete = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/handheld-devices/${editTarget.id}`, { method: 'DELETE' });
      if (!res.ok) { setEditError(await extractErrorMessage(res, 'Failed to remove device.')); return; }
      setDevices((prev) => prev.filter((d) => d.id !== editTarget.id));
      closeEditModal();
    } catch {
      setEditError('Could not reach the server.');
    }
  };

  const activeCount = devices.filter((d) => d.status === 'active').length;

  return (
    <div className="flex flex-col gap-6 w-full animate-in fade-in duration-500 pb-10">

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex flex-col">
          <h2 className="text-2xl font-bold text-dark tracking-tight">Handheld Devices</h2>
          <p className="text-sm text-gray-500">
            {devices.length === 0
              ? 'No devices registered yet.'
              : `${activeCount} of ${devices.length} device${devices.length === 1 ? '' : 's'} active`}
          </p>
        </div>
        <button
          onClick={openAddModal}
          className="self-start sm:self-auto flex items-center gap-2 bg-dark text-white px-6 py-3 rounded-xl font-bold hover:bg-primary transition-colors"
        >
          <Plus size={18} /> Assign New Device
        </button>
      </div>

      {isLoading ? (
        <div className="bg-white border border-gray-100 rounded-[32px] p-16 flex flex-col items-center justify-center text-center gap-3 shadow-sm">
          <Loader2 size={28} className="animate-spin text-gray-400" />
          <p className="text-sm text-gray-500">Loading devices…</p>
        </div>
      ) : loadError ? (
        <div className="bg-white border border-red-100 rounded-[32px] p-16 flex flex-col items-center justify-center text-center gap-4 shadow-sm">
          <p className="text-sm text-red-500 font-semibold">{loadError}</p>
          <button onClick={loadDevices} className="bg-dark text-white px-6 py-2.5 rounded-xl font-bold hover:bg-primary transition-colors">
            Try again
          </button>
        </div>
      ) : devices.length === 0 ? (
        <div className="bg-white border border-gray-100 rounded-[32px] p-16 flex flex-col items-center justify-center text-center gap-4 shadow-sm">
          <div className="w-14 h-14 bg-orange-50 text-primary rounded-xl flex items-center justify-center">
            <Smartphone size={26} />
          </div>
          <div>
            <h3 className="text-xl font-bold text-dark mb-1">No handheld devices yet</h3>
            <p className="text-sm text-gray-500 max-w-sm">Add the scanners your team uses so you can assign part lists to them by name.</p>
          </div>
          <button onClick={openAddModal} className="flex items-center gap-2 bg-dark text-white px-6 py-3 rounded-xl font-bold hover:bg-primary transition-colors">
            <Plus size={18} /> Assign New Device
          </button>
        </div>
      ) : (
        <div className="bg-white rounded-[32px] border border-gray-100 p-10 shadow-sm">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-5">
            {devices.map((device) => {
              const statusStyle = STATUS_STYLES[device.status];
              return (
                <button
                  key={device.id}
                  onClick={() => openEditModal(device)}
                  className={`group bg-gray-50 rounded-2xl border border-gray-100 p-4 flex flex-col items-center gap-3 text-left transition-all hover:border-primary/40 hover:shadow-md ${
                    device.status === 'inactive' ? 'opacity-60' : ''
                  }`}
                >
                  <div className="w-full aspect-[3/4] rounded-xl bg-white flex items-center justify-center overflow-hidden border border-gray-100">
                    <img
                      src={DEVICE_PHOTO_SRC}
                      alt={device.name}
                      className="w-full h-full object-contain p-3 transition-transform group-hover:scale-[1.03]"
                    />
                  </div>

                  <div className="flex items-center gap-2 self-start">
                    <span className={`w-2 h-2 rounded-full ${statusStyle.dot}`}></span>
                    <span className="font-bold text-sm text-dark">{device.name}</span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {isAddModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-[24px] p-8 w-[400px] shadow-2xl animate-in zoom-in-95 relative">
            <button onClick={() => setIsAddModalOpen(false)} className="absolute top-6 right-6 text-gray-400 hover:text-dark transition-colors"><X size={22} /></button>

            <div className="w-24 mx-auto aspect-[3/4] rounded-xl bg-gray-50 border border-gray-100 flex items-center justify-center overflow-hidden mb-4">
              <img src={DEVICE_PHOTO_SRC} alt="New device" className="w-full h-full object-contain p-2" />
            </div>

            <h3 className="text-xl font-bold text-dark mb-2 text-center">Assign New Device</h3>
            <p className="text-sm text-gray-500 mb-6 text-center">Give it a short name your team will recognize — this is what gets typed in on the device itself when it's first set up.</p>

            <input
              type="text"
              autoFocus
              value={newDeviceName}
              onChange={(e) => { setNewDeviceName(e.target.value); if (addModalError) setAddModalError(''); }}
              placeholder="HH-05"
              onKeyDown={(e) => { if (e.key === 'Enter') handleConfirmAddDevice(); }}
              className={`w-full bg-gray-50 border rounded-xl px-4 py-2.5 text-sm font-mono text-dark text-center focus:outline-none focus:ring-2 transition-colors ${addModalError ? 'border-red-300 focus:ring-red-200' : 'border-gray-200 focus:ring-primary/30'}`}
            />
            {addModalError && (
              <p className="text-xs font-semibold text-red-500 mt-2 text-center">{addModalError}</p>
            )}

            <div className="flex justify-end gap-3 mt-6">
              <button onClick={() => setIsAddModalOpen(false)} className="px-6 py-2.5 rounded-xl font-bold text-gray-500 hover:bg-gray-100 transition-colors">Cancel</button>
              <button
                onClick={handleConfirmAddDevice}
                disabled={isSavingAdd}
                className="bg-dark text-white px-6 py-2.5 rounded-xl font-bold hover:bg-primary transition-colors shadow-md disabled:opacity-60 flex items-center gap-2"
              >
                {isSavingAdd && <Loader2 size={14} className="animate-spin" />}
                {isSavingAdd ? 'Adding…' : 'Add Device'}
              </button>
            </div>
          </div>
        </div>
      )}

      {editTarget && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-[24px] p-8 w-[420px] shadow-2xl animate-in zoom-in-95 relative">
            <button onClick={closeEditModal} className="absolute top-6 right-6 text-gray-400 hover:text-dark transition-colors"><X size={22} /></button>

            <div className="w-32 mx-auto aspect-[3/4] rounded-xl bg-gray-50 border border-gray-100 flex items-center justify-center overflow-hidden mb-5">
              <img src={DEVICE_PHOTO_SRC} alt={editTarget.name} className="w-full h-full object-contain p-2" />
            </div>

            {!confirmingDelete ? (
              <>
                <label className="text-xs font-bold text-gray-400 mb-1.5 block">Device Name</label>
                <div className="flex items-center gap-2 mb-1">
                  <input
                    type="text"
                    value={editNameValue}
                    onChange={(e) => { setEditNameValue(e.target.value); if (editError) setEditError(''); }}
                    onKeyDown={(e) => { if (e.key === 'Enter') handleSaveEdit(); }}
                    className={`flex-1 bg-gray-50 border rounded-xl px-4 py-2.5 text-sm font-mono text-dark focus:outline-none focus:ring-2 transition-colors ${editError ? 'border-red-300 focus:ring-red-200' : 'border-gray-200 focus:ring-primary/30'}`}
                  />
                  <button
                    onClick={handleSaveEdit}
                    disabled={isSavingEdit}
                    title="Save name"
                    className="flex items-center justify-center bg-gray-100 hover:bg-gray-200 text-dark p-2.5 rounded-xl transition-colors disabled:opacity-60"
                  >
                    {isSavingEdit ? <Loader2 size={16} className="animate-spin" /> : <Pencil size={16} />}
                  </button>
                </div>
                {editError && <p className="text-xs font-semibold text-red-500 mb-3">{editError}</p>}

                <div className="flex items-center justify-between bg-gray-50 rounded-xl px-4 py-3 mt-4 mb-6 border border-gray-100">
                  <div className="flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full ${STATUS_STYLES[editTarget.status].dot}`}></span>
                    <span className="text-sm font-bold text-dark">{STATUS_STYLES[editTarget.status].label}</span>
                  </div>
                  <button
                    onClick={handleToggleStatus}
                    className={`flex items-center gap-1.5 text-xs font-bold px-4 py-2 rounded-lg transition-colors ${
                      editTarget.status === 'active' ? 'bg-gray-200 text-dark hover:bg-gray-300' : 'bg-orange-50 text-primary hover:bg-orange-100'
                    }`}
                  >
                    <Power size={13} /> {editTarget.status === 'active' ? 'Deactivate' : 'Activate'}
                  </button>
                </div>

                <button
                  onClick={() => setConfirmingDelete(true)}
                  className="w-full flex items-center justify-center gap-2 text-sm font-bold text-red-500 hover:bg-red-50 py-2.5 rounded-xl transition-colors"
                >
                  <Trash2 size={15} /> Remove device
                </button>
              </>
            ) : (
              <>
                <h3 className="text-lg font-bold text-dark mb-2 text-center">Remove this device?</h3>
                <p className="text-sm text-gray-500 mb-6 text-center">
                  <span className="font-mono font-bold text-dark">{editTarget.name}</span> will no longer show up when assigning part lists. This can't be undone.
                </p>
                <div className="flex justify-center gap-3">
                  <button onClick={() => setConfirmingDelete(false)} className="px-6 py-2.5 rounded-xl font-bold text-gray-500 hover:bg-gray-100 transition-colors">Cancel</button>
                  <button onClick={handleConfirmDelete} className="bg-red-500 text-white px-6 py-2.5 rounded-xl font-bold hover:bg-red-600 transition-colors shadow-md">
                    Remove
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

    </div>
  );
};

export default HandheldDevices;