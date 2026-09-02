import React, { useMemo, useState } from "react";
import Sparkle from "../components/Sparkle";

const initialGroups = [
  { id: 1, code: "FN4", count: 46, device: null },
  { id: 2, code: "SM", count: 11, device: null },
  { id: 3, code: "S4", count: 9, device: null },
  { id: 4, code: "TR2", count: 53, device: null },
  { id: 5, code: "SQ", count: 40, device: null },
  { id: 6, code: "A", count: 10, device: null },
  { id: 7, code: "SAL", count: 9, device: null },
  { id: 8, code: "SN", count: 4, device: null },
  { id: 9, code: "FN5", count: 32, device: null },
  { id: 10, code: "TR3", count: 37, device: null },
  { id: 11, code: "WH1", count: 26, device: null },
  { id: 12, code: "WH2", count: 18, device: null },
];

const devices = ["HH-01", "HH-02", "HH-04"];

const AssignHandheld = () => {
  const [groups, setGroups] = useState(initialGroups);
  const [search, setSearch] = useState("");
  const [selectedIds, setSelectedIds] = useState([]);
  const [targetDevice, setTargetDevice] = useState("");
  const [draggedGroupId, setDraggedGroupId] = useState(null);
  const [dragOverTarget, setDragOverTarget] = useState(null);
  const [toast, setToast] = useState("");
  const [showSendConfirm, setShowSendConfirm] = useState(false);
  const [showSendSuccess, setShowSendSuccess] = useState(false);
  const [isSending, setIsSending] = useState(false);

  const totalAddresses = useMemo(() => groups.reduce((sum, g) => sum + g.count, 0), [groups]);

  const assignedAddresses = useMemo(
    () => groups.filter((g) => g.device).reduce((sum, g) => sum + g.count, 0),
    [groups]
  );

  const unassignedGroups = useMemo(() => {
    const q = search.trim().toLowerCase();
    return groups.filter((g) => !g.device).filter((g) => !q || g.code.toLowerCase().includes(q));
  }, [groups, search]);

  const selectedGroups = groups.filter((g) => selectedIds.includes(g.id));
  const selectedAddressCount = selectedGroups.reduce((sum, g) => sum + g.count, 0);
  const assignedPercent = totalAddresses > 0 ? Math.round((assignedAddresses / totalAddresses) * 100) : 0;
  const allAssigned = groups.length > 0 && groups.every((g) => g.device);

  const toggleGroup = (id) => {
    setSelectedIds((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);
  };

  const selectAllVisible = () => {
    const visibleIds = unassignedGroups.map((g) => g.id);
    const allSelected = visibleIds.length > 0 && visibleIds.every((id) => selectedIds.includes(id));

    if (allSelected) setSelectedIds((prev) => prev.filter((id) => !visibleIds.includes(id)));
    else setSelectedIds((prev) => Array.from(new Set([...prev, ...visibleIds])));
  };

  const showToast = (message) => {
    setToast(message);
    setTimeout(() => setToast(""), 2200);
  };

  const assignSelected = () => {
    if (!targetDevice || selectedIds.length === 0) return;

    const target = targetDevice;
    const count = selectedIds.length;

    setGroups((prev) => prev.map((g) => selectedIds.includes(g.id) ? { ...g, device: target } : g));
    setSelectedIds([]);
    setTargetDevice("");
    showToast(`${count} group${count > 1 ? "s" : ""} assigned to ${target}`);
  };

  const removeFromDevice = (id) => {
    const group = groups.find((g) => g.id === id);
    setGroups((prev) => prev.map((g) => g.id === id ? { ...g, device: null } : g));
    setSelectedIds((prev) => prev.filter((x) => x !== id));

    if (group) showToast(`${group.code} returned to Unassigned`);
  };

  const handleDragStart = (event, groupId) => {
    setDraggedGroupId(groupId);
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("text/plain", String(groupId));
  };

  const handleDragEnd = () => {
    setDraggedGroupId(null);
    setDragOverTarget(null);
  };

  const handleDragOver = (event, target) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
    setDragOverTarget(target);
  };

  const handleDragLeave = (event) => {
    if (!event.currentTarget.contains(event.relatedTarget)) setDragOverTarget(null);
  };

  const handleDrop = (event, targetDeviceName) => {
    event.preventDefault();

    const transferredId = Number(event.dataTransfer.getData("text/plain"));
    const groupId = transferredId || draggedGroupId;
    if (!groupId) return;

    const group = groups.find((g) => g.id === groupId);

    if (!group || group.device === targetDeviceName) {
      setDraggedGroupId(null);
      setDragOverTarget(null);
      return;
    }

    setGroups((prev) => prev.map((g) => g.id === groupId ? { ...g, device: targetDeviceName } : g));
    setSelectedIds((prev) => prev.filter((id) => id !== groupId));

    if (targetDeviceName) showToast(`${group.code} moved to ${targetDeviceName}`);
    else showToast(`${group.code} returned to Unassigned`);

    setDraggedGroupId(null);
    setDragOverTarget(null);
  };

  const deviceStats = (device) => {
    const list = groups.filter((g) => g.device === device);

    return {
      groups: list,
      zones: list.length,
      addresses: list.reduce((sum, g) => sum + g.count, 0),
    };
  };

  const sendToHandheld = () => {
    setShowSendConfirm(false);
    setIsSending(true);

    // TODO: ภายหลังเปลี่ยนตรงนี้เป็นการส่งข้อมูลจริงผ่าน Firebase / API
    setTimeout(() => {
      setIsSending(false);
      setShowSendSuccess(true);
    }, 900);
  };

  return (
    <div className="w-full pb-10 animate-in fade-in duration-500">

      {/* HEADER */}
      <div className="flex items-center gap-3 mb-6">
        <div>
          <p className="text-xs text-muted font-semibold">Handheld Management</p>
          <h1 className="font-display text-[26px] font-bold text-ink leading-none mt-1">Assign Handheld</h1>
          <p className="text-[11.5px] text-muted font-semibold mt-2">
            Distribute address groups to handheld devices for counting
          </p>
        </div>
      </div>

      {/* SUMMARY */}
      <div className="bg-white rounded-[22px] border border-ink/5 shadow-[0_2px_12px_rgba(20,20,15,0.04)] p-5 mb-5">
        <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">

          <div className="bg-[#FAFAF7] rounded-[18px] px-4 py-3 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center text-ink text-[13px] font-black shadow-sm">#</div>
            <div>
              <p className="text-[9px] font-extrabold tracking-wide text-muted">ADDRESSES</p>
              <p className="text-[22px] font-display font-bold text-ink leading-none mt-1">{totalAddresses.toLocaleString()}</p>
            </div>
          </div>

          <div className="bg-[#FAFAF7] rounded-[18px] px-4 py-3 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-accent/25 flex items-center justify-center text-ink text-[13px] font-black">✓</div>
            <div>
              <p className="text-[9px] font-extrabold tracking-wide text-muted">ASSIGNED</p>
              <p className="text-[22px] font-display font-bold text-ink leading-none mt-1">
                {assignedAddresses.toLocaleString()}
                <span className="text-[11px] text-muted font-semibold ml-1">/ {totalAddresses.toLocaleString()}</span>
              </p>
            </div>
          </div>

          <div className="bg-[#FAFAF7] rounded-[18px] px-4 py-3 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-ink flex items-center justify-center text-accent text-[13px] font-black">▤</div>
            <div>
              <p className="text-[9px] font-extrabold tracking-wide text-muted">DEVICES</p>
              <p className="text-[22px] font-display font-bold text-ink leading-none mt-1">{devices.length}</p>
            </div>
          </div>

          <div className="bg-[#FAFAF7] rounded-[18px] px-4 py-3 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center text-ink text-[12px] font-black shadow-sm">{assignedPercent}%</div>
            <div>
              <p className="text-[9px] font-extrabold tracking-wide text-muted">REMAINING</p>
              <p className="text-[15px] font-bold text-ink leading-none mt-1">{groups.filter((g) => !g.device).length} groups</p>
            </div>
          </div>

        </div>

        <div className="mt-4 pt-4 border-t border-ink/[0.06]">
          <div className="flex items-center justify-between mb-2">
            <p className="text-[10px] font-extrabold tracking-wide text-muted">DISTRIBUTION PROGRESS</p>
            <p className="text-[10px] font-extrabold text-ink">{assignedPercent}%</p>
          </div>

          <div className="h-[10px] bg-[#31312f] rounded-full overflow-hidden">
            <div className="h-full bg-accent rounded-full transition-all duration-500" style={{ width: `${assignedPercent}%` }} />
          </div>
        </div>
      </div>

      {/* MAIN BOARD */}
      <div className="grid grid-cols-1 xl:grid-cols-[340px_1fr] gap-4">

        {/* UNASSIGNED */}
        <div
          onDragOver={(e) => handleDragOver(e, "UNASSIGNED")}
          onDragLeave={handleDragLeave}
          onDrop={(e) => handleDrop(e, null)}
          className={`bg-white rounded-[28px] border shadow-[0_2px_12px_rgba(20,20,15,0.04)] overflow-hidden transition-all duration-200 ${
            dragOverTarget === "UNASSIGNED" ? "border-accent ring-4 ring-accent/15" : "border-ink/5"
          }`}
        >
          <div className="p-5 border-b border-ink/[0.06]">

            <div className="flex items-start justify-between mb-4">
              <h3 className="text-[17px] font-bold text-ink">Unassigned</h3>
              <div className="w-9 h-9 rounded-xl bg-accent/20 flex items-center justify-center text-ink">▤</div>
            </div>

            {/* SELECT DEVICE */}
            <div className="bg-[#F6F6F0] rounded-[16px] p-3 mb-3">
              <div className="flex items-center justify-between mb-2">
                <p className="text-[9px] font-extrabold text-muted tracking-wide">ASSIGN SELECTED TO</p>

                {selectedIds.length > 0 && (
                  <span className="text-[9px] font-extrabold text-ink">{selectedIds.length} selected</span>
                )}
              </div>

              <div className="flex gap-2">
                <select
                  value={targetDevice}
                  onChange={(e) => setTargetDevice(e.target.value)}
                  className="flex-1 min-w-0 bg-white border border-ink/[0.08] rounded-xl px-3 py-2.5 text-[10.5px] font-bold text-ink outline-none"
                >
                  <option value="">Select device...</option>
                  {devices.map((device) => <option key={device} value={device}>{device}</option>)}
                </select>

                <button
                  onClick={assignSelected}
                  disabled={!targetDevice || selectedIds.length === 0}
                  className={`px-4 rounded-xl text-[10px] font-extrabold whitespace-nowrap transition ${
                    targetDevice && selectedIds.length > 0
                      ? "bg-ink text-accent hover:-translate-y-[1px]"
                      : "bg-[#E7E7E1] text-[#AAA79D] cursor-not-allowed"
                  }`}
                >
                  Assign
                </button>
              </div>

              {selectedIds.length > 0 && (
                <p className="text-[9.5px] text-muted font-semibold mt-2">
                  {selectedAddressCount.toLocaleString()} addresses selected
                </p>
              )}
            </div>

            {/* SEARCH */}
            <div className="relative">
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 text-[#AAA79D]" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="11" cy="11" r="7" />
                <path d="M20 20L16.5 16.5" />
              </svg>

              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search address group..."
                className="w-full bg-[#FAFAF7] border border-ink/[0.07] rounded-xl pl-9 pr-3 py-2.5 text-[10.5px] font-semibold outline-none"
              />
            </div>

            <div className="flex items-center justify-between mt-3">
              <button onClick={selectAllVisible} className="text-[9.5px] font-extrabold text-muted hover:text-ink">Select all visible</button>

              {selectedIds.length > 0 && (
                <button onClick={() => setSelectedIds([])} className="text-[9.5px] font-bold text-[#B0ADA3] hover:text-ink">Clear</button>
              )}
            </div>
          </div>

          {/* UNASSIGNED LIST */}
          <div className="p-3 max-h-[590px] overflow-y-auto space-y-2">

            {unassignedGroups.map((group) => {
              const selected = selectedIds.includes(group.id);
              const isDragging = draggedGroupId === group.id;

              return (
                <div
                  key={group.id}
                  draggable
                  onDragStart={(e) => handleDragStart(e, group.id)}
                  onDragEnd={handleDragEnd}
                  onClick={() => toggleGroup(group.id)}
                  className={`rounded-xl px-3 py-3 flex items-center gap-3 cursor-grab active:cursor-grabbing transition-all border ${
                    selected ? "bg-[#F4FFD0] border-ink/10" : "bg-[#FAFAF7] border-transparent hover:bg-[#F5F5EF]"
                  } ${isDragging ? "opacity-40 scale-[0.98]" : ""}`}
                >
                  <input
                    type="checkbox"
                    checked={selected}
                    onChange={() => toggleGroup(group.id)}
                    onClick={(e) => e.stopPropagation()}
                    className="w-4 h-4 accent-[#14140F]"
                  />

                  <span className="text-[#C0BDB4] text-[12px] tracking-[-2px]">⠿</span>
                  <div className="flex-1 min-w-0"><p className="text-[12px] font-extrabold text-ink">{group.code}</p></div>

                  <span className="bg-ink text-white min-w-[32px] h-[24px] px-2 rounded-full flex items-center justify-center text-[9.5px] font-extrabold">
                    {group.count}
                  </span>
                </div>
              );
            })}

            {unassignedGroups.length === 0 && (
              <div className="py-10 text-center">
                <div className="w-10 h-10 rounded-full bg-[#F4FFD0] mx-auto flex items-center justify-center text-ink font-bold">✓</div>
                <p className="text-[11px] font-bold text-ink mt-3">All groups assigned</p>
                <p className="text-[9.5px] text-muted font-semibold mt-1">Drag a group back here to return it.</p>
              </div>
            )}
          </div>
        </div>

        {/* DEVICES */}
        <div className="grid grid-cols-1 md:grid-cols-2 2xl:grid-cols-3 gap-4">

          {devices.map((device) => {
            const stats = deviceStats(device);
            const isDropTarget = dragOverTarget === device;

            return (
              <div
                key={device}
                onDragOver={(e) => handleDragOver(e, device)}
                onDragLeave={handleDragLeave}
                onDrop={(e) => handleDrop(e, device)}
                className={`bg-white rounded-[28px] border shadow-[0_2px_12px_rgba(20,20,15,0.04)] overflow-hidden flex flex-col min-h-[500px] transition-all duration-200 ${
                  isDropTarget ? "border-accent ring-4 ring-accent/15 -translate-y-1" : "border-ink/5"
                }`}
              >
                {/* DEVICE HEADER */}
                <div className="p-5 border-b border-ink/[0.06]">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-display font-bold text-[18px] text-ink">{device}</h3>
                      <p className="text-[10px] text-muted font-semibold mt-0.5">
                        {stats.zones} groups • {stats.addresses.toLocaleString()} addresses
                      </p>
                    </div>

                    <div className="w-9 h-9 rounded-xl bg-accent/20 flex items-center justify-center">▤</div>
                  </div>
                </div>

                {/* DEVICE GROUPS */}
                <div className="p-3 flex-1 overflow-y-auto max-h-[520px]">

                  {stats.groups.length === 0 ? (
                    <div
                      className={`h-[72px] border-2 border-dashed rounded-xl flex items-center justify-center text-center transition-all ${
                        isDropTarget ? "border-accent bg-accent/5" : "border-ink/[0.08]"
                      }`}
                    >
                      <div>
                        <p className="text-[10px] text-muted font-bold">Drop groups here</p>
                        <p className="text-[8.5px] text-[#B5B2A8] font-semibold mt-0.5">or assign from Unassigned</p>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {stats.groups.map((group) => {
                        const isDragging = draggedGroupId === group.id;

                        return (
                          <div
                            key={group.id}
                            draggable
                            onDragStart={(e) => handleDragStart(e, group.id)}
                            onDragEnd={handleDragEnd}
                            className={`group bg-[#FAFAF7] rounded-xl px-3 py-3 cursor-grab active:cursor-grabbing border border-transparent hover:border-ink/[0.07] transition-all ${
                              isDragging ? "opacity-40 scale-[0.98]" : ""
                            }`}
                          >
                            <div className="flex items-center gap-2.5">
                              <span className="text-[#C0BDB4] text-[12px] tracking-[-2px]">⠿</span>

                              <div className="flex-1 min-w-0">
                                <p className="text-[12px] font-extrabold text-ink">{group.code}</p>
                                <p className="text-[9.5px] text-muted font-semibold mt-0.5">{group.count} addresses</p>
                              </div>

                              <span className="bg-ink text-white min-w-[31px] h-[24px] px-2 rounded-full flex items-center justify-center text-[9px] font-extrabold">
                                {group.count}
                              </span>

                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  removeFromDevice(group.id);
                                }}
                                title="Return to Unassigned"
                                className="w-[21px] h-[21px] rounded-full flex items-center justify-center text-[#B8B5AC] hover:bg-ink hover:text-white text-[11px] font-bold transition opacity-50 group-hover:opacity-100"
                              >
                                ×
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {stats.groups.length > 0 && (
                    <div
                      className={`mt-2 h-[34px] rounded-lg border-2 border-dashed flex items-center justify-center text-[8.5px] font-bold transition ${
                        isDropTarget ? "border-accent bg-accent/10 text-ink" : "border-ink/[0.06] text-[#B8B5AC]"
                      }`}
                    >
                      Drop more groups here
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* SEND TO HANDHELD */}
      {allAssigned && (
        <div className="flex justify-center mt-7">
          <button
            onClick={() => setShowSendConfirm(true)}
            disabled={isSending}
            className="group bg-ink text-accent rounded-[16px] px-7 py-3.5 shadow-[0_12px_30px_rgba(20,20,15,0.18)] flex items-center gap-3 text-[11.5px] font-extrabold hover:-translate-y-0.5 hover:shadow-[0_16px_38px_rgba(20,20,15,0.24)] transition-all"
          >
            <span className="w-7 h-7 rounded-lg bg-accent/15 flex items-center justify-center">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 16V4" />
                <path d="M7 9l5-5 5 5" />
                <path d="M5 14v5h14v-5" />
              </svg>
            </span>

            {isSending ? "Sending..." : "Send to Handheld"}
          </button>
        </div>
      )}

      {/* DRAG HELPER */}
      {draggedGroupId && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[100] bg-ink text-white rounded-full px-4 py-2.5 shadow-xl pointer-events-none">
          <p className="text-[10px] font-bold">Drop on a device or Unassigned</p>
        </div>
      )}

      {/* TOAST */}
      {toast && (
        <div className="fixed top-5 right-5 z-[200] bg-ink text-white rounded-[16px] shadow-xl px-4 py-3 flex items-center gap-3">
          <div className="w-7 h-7 bg-accent rounded-full text-ink flex items-center justify-center font-black">✓</div>

          <div>
            <p className="text-[10.5px] font-extrabold">Assignment updated</p>
            <p className="text-[9px] text-[#AAA89E] font-semibold">{toast}</p>
          </div>
        </div>
      )}

      {/* SEND CONFIRM MODAL */}
      {showSendConfirm && (
        <div
          className="fixed inset-0 z-[300] bg-ink/45 backdrop-blur-[3px] flex items-center justify-center p-4"
          onClick={() => setShowSendConfirm(false)}
        >
          <div
            className="w-full max-w-[360px] bg-white rounded-[26px] p-6 shadow-[0_30px_80px_rgba(20,20,15,0.25)]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-12 h-12 rounded-[15px] bg-accent/25 flex items-center justify-center mb-4">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#14140F" strokeWidth="2">
                <path d="M12 16V4" />
                <path d="M7 9l5-5 5 5" />
                <path d="M5 14v5h14v-5" />
              </svg>
            </div>

            <h3 className="font-display text-[20px] font-bold text-ink">Are you sure?</h3>

            <p className="text-[11px] text-muted font-semibold leading-relaxed mt-2">
              All assigned address groups will be sent to the handheld devices.
            </p>

            <div className="bg-[#FAFAF7] rounded-[16px] px-4 py-3 mt-4">
              <div className="flex justify-between items-center">
                <span className="text-[10px] text-muted font-bold">Addresses</span>
                <span className="text-[11px] text-ink font-extrabold">{totalAddresses.toLocaleString()}</span>
              </div>

              <div className="flex justify-between items-center mt-2">
                <span className="text-[10px] text-muted font-bold">Groups</span>
                <span className="text-[11px] text-ink font-extrabold">{groups.length}</span>
              </div>

              <div className="flex justify-between items-center mt-2">
                <span className="text-[10px] text-muted font-bold">Devices</span>
                <span className="text-[11px] text-ink font-extrabold">{devices.length}</span>
              </div>
            </div>

            <div className="flex gap-2.5 mt-5">
              <button
                onClick={() => setShowSendConfirm(false)}
                className="flex-1 py-3 rounded-xl bg-[#F5F5EF] border border-ink/[0.07] text-[11px] font-extrabold text-ink hover:bg-[#ECECE6] transition"
              >
                No
              </button>

              <button
                onClick={sendToHandheld}
                className="flex-1 py-3 rounded-xl bg-ink text-accent text-[11px] font-extrabold hover:-translate-y-[1px] transition"
              >
                Yes, Send
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SEND SUCCESS MODAL */}
      {showSendSuccess && (
        <div className="fixed inset-0 z-[310] bg-ink/45 backdrop-blur-[3px] flex items-center justify-center p-4">
          <div className="w-full max-w-[340px] bg-white rounded-[26px] p-7 text-center shadow-[0_30px_80px_rgba(20,20,15,0.25)]">

            <div className="w-16 h-16 rounded-full bg-accent mx-auto flex items-center justify-center">
              <svg width="27" height="27" viewBox="0 0 24 24" fill="none" stroke="#14140F" strokeWidth="2.5">
                <path d="M5 12.5l4 4L19 7" />
              </svg>
            </div>

            <h3 className="font-display text-[21px] font-bold text-ink mt-4">Successfully Sent!</h3>

            <p className="text-[11px] text-muted font-semibold leading-relaxed mt-2">
              Address groups have been sent to all assigned handheld devices.
            </p>

            <div className="grid grid-cols-3 gap-2 mt-5">
              <div className="bg-[#FAFAF7] rounded-xl py-3">
                <p className="text-[17px] font-display font-bold text-ink">{totalAddresses.toLocaleString()}</p>
                <p className="text-[8.5px] font-extrabold text-muted mt-1">ADDRESSES</p>
              </div>

              <div className="bg-[#FAFAF7] rounded-xl py-3">
                <p className="text-[17px] font-display font-bold text-ink">{groups.length}</p>
                <p className="text-[8.5px] font-extrabold text-muted mt-1">GROUPS</p>
              </div>

              <div className="bg-[#FAFAF7] rounded-xl py-3">
                <p className="text-[17px] font-display font-bold text-ink">{devices.length}</p>
                <p className="text-[8.5px] font-extrabold text-muted mt-1">DEVICES</p>
              </div>
            </div>

            <button
              onClick={() => setShowSendSuccess(false)}
              className="w-full mt-5 bg-ink text-accent rounded-xl py-3 text-[11px] font-extrabold hover:-translate-y-[1px] transition"
            >
              Done
            </button>
          </div>
        </div>
      )}

      {/* SENDING OVERLAY */}
      {isSending && (
        <div className="fixed inset-0 z-[305] bg-ink/35 backdrop-blur-[2px] flex items-center justify-center">
          <div className="bg-white rounded-[22px] px-6 py-5 shadow-2xl flex items-center gap-4">
            <div className="w-8 h-8 rounded-full border-[3px] border-ink/10 border-t-accent animate-spin" />
            <div>
              <p className="text-[11px] font-extrabold text-ink">Sending to handhelds...</p>
              <p className="text-[9.5px] text-muted font-semibold mt-0.5">Preparing assigned address groups</p>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default AssignHandheld;