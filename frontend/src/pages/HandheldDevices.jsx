import React, { useState } from 'react';
import { Plus, X, Power, Trash2, Smartphone, Pencil } from 'lucide-react';

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

// Seed data so the page has something to look at while this is still
// frontend-only — no handheld_devices table/API exists yet. Swap this
// useState initializer for a real fetch once the backend registry endpoint
// exists; nothing else in this component should need to change shape-wise,
// since it already treats devices as { id, name, status }.
const SEED_DEVICES = [
  { id: 'HH-01', name: 'HH-01', status: 'active' },
  { id: 'HH-02', name: 'HH-02', status: 'active' },
  { id: 'HH-03', name: 'HH-03', status: 'inactive' },
  { id: 'HH-04', name: 'HH-04', status: 'active' },
];

function validateDeviceName(value, existingNames) {
  const trimmed = value.trim();
  if (!trimmed) return 'Device name cannot be empty.';
  if (existingNames.includes(trimmed.toUpperCase())) return 'A device with this name already exists.';
  return '';
}

const HandheldDevices = () => {
  const [devices, setDevices] = useState(SEED_DEVICES);

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newDeviceName, setNewDeviceName] = useState('');
  const [addModalError, setAddModalError] = useState('');

  // Editing an existing device — one modal handles rename + activate/
  // deactivate + delete, opened by clicking the device's card.
  const [editTarget, setEditTarget] = useState(null); // device object being edited
  const [editNameValue, setEditNameValue] = useState('');
  const [editError, setEditError] = useState('');
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  const openAddModal = () => {
    setNewDeviceName('');
    setAddModalError('');
    setIsAddModalOpen(true);
  };

  const handleConfirmAddDevice = () => {
    const existingNames = devices.map((d) => d.name.toUpperCase());
    const error = validateDeviceName(newDeviceName, existingNames);
    if (error) { setAddModalError(error); return; }

    const name = newDeviceName.trim();
    setDevices((prev) => [...prev, { id: name.toUpperCase(), name, status: 'active' }]);
    setIsAddModalOpen(false);
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

  const handleSaveEdit = () => {
    const existingNames = devices.filter((d) => d.id !== editTarget.id).map((d) => d.name.toUpperCase());
    const error = validateDeviceName(editNameValue, existingNames);
    if (error) { setEditError(error); return; }

    const name = editNameValue.trim();
    setDevices((prev) => prev.map((d) => (d.id === editTarget.id ? { ...d, name } : d)));
    setEditTarget((prev) => ({ ...prev, name }));
    setEditError('');
  };

  const handleToggleStatus = () => {
    setDevices((prev) => prev.map((d) => (
      d.id === editTarget.id ? { ...d, status: d.status === 'active' ? 'inactive' : 'active' } : d
    )));
    setEditTarget((prev) => ({ ...prev, status: prev.status === 'active' ? 'inactive' : 'active' }));
  };

  const handleConfirmDelete = () => {
    setDevices((prev) => prev.filter((d) => d.id !== editTarget.id));
    closeEditModal();
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

      {devices.length === 0 ? (
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
              <button onClick={handleConfirmAddDevice} className="bg-dark text-white px-6 py-2.5 rounded-xl font-bold hover:bg-primary transition-colors shadow-md">
                Add Device
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
                    title="Save name"
                    className="flex items-center justify-center bg-gray-100 hover:bg-gray-200 text-dark p-2.5 rounded-xl transition-colors"
                  >
                    <Pencil size={16} />
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
