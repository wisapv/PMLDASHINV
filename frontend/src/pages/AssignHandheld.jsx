import React, { useEffect, useMemo, useState } from "react";
import Sparkle from "../components/Sparkle";
import { API_BASE } from "../hooks/useActiveBatch";

// Devices are now loaded from the real registry (see deviceList state below)
// instead of being hardcoded here.

const AssignHandheld = ({ currentBatchId, setUploadTab, subscribeToEvent }) => {
  // Real, per-part data for this batch — the same "Address + PIC matched"
  // result HandheldManager builds in step 2 (upload Part addr.xls), fetched
  // straight from the backend instead of a hardcoded mock. Each row has
  // Shop / Dock / Supplier / 'Part no.' / 'Part name' / Addr / ShortAddr / PIC.
  const [finalHandheldData, setFinalHandheldData] = useState(null);
  const [dataStatus, setDataStatus] = useState("loading"); // 'loading' | 'ready' | 'empty' | 'error'
  const [selectedPic, setSelectedPic] = useState("All");

  const [search, setSearch] = useState("");
  const [selectedIds, setSelectedIds] = useState([]);
  const [targetDevice, setTargetDevice] = useState("");
  const [draggedGroupId, setDraggedGroupId] = useState(null);
  const [draggedFromDevice, setDraggedFromDevice] = useState(null); // null = dragged from Unassigned
  const [dragOverTarget, setDragOverTarget] = useState(null);
  const [toast, setToast] = useState("");
  const [showSendConfirm, setShowSendConfirm] = useState(false);
  const [showSendSuccess, setShowSendSuccess] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [duplicateFromDevice, setDuplicateFromDevice] = useState(null); // device whose whole board we're duplicating
  const [duplicateTarget, setDuplicateTarget] = useState("");

  // Device assignment is kept separate from the computed groups below
  // (keyed by group id "<PIC>::<ShortAddr>"), so switching the PIC filter
  // or a live-update refetch never wipes out assignments already made.
  // A group can now have MULTIPLE devices (shared zone — see the "+" button
  // on each device's group row) so this maps groupId -> array of device
  // names, not a single device. Persisted on the backend
  // (handheld_assignments table, one row per group+device) — restored here
  // on mount so a page refresh doesn't lose the work.
  const [assignments, setAssignments] = useState({});
  const loadAssignments = () => {
    if (!currentBatchId) return;
    fetch(`${API_BASE}/api/handheld-assign/device-assignments?batchId=${currentBatchId}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((result) => {
        const rows = result && result.data ? result.data : [];
        const next = {};
        rows.forEach((r) => {
          const key = `${r.pic}::${r.shortAddr}`;
          if (!next[key]) next[key] = [];
          next[key].push(r.deviceId);
        });
        setAssignments(next);
      })
      .catch((err) => console.error("Failed to load device assignments", err));
  };

  // Real handheld registry (managed on the "Handheld Devices" page) —
  // only active devices show up here as assignment targets, same as an
  // inactive device disappearing from that page's picker.
  const [deviceList, setDeviceList] = useState([]);
  const loadDevices = () => {
    fetch(`${API_BASE}/api/handheld-devices`)
      .then((res) => (res.ok ? res.json() : null))
      .then((result) => setDeviceList(result ? result.data : []))
      .catch((err) => console.error('Failed to load handheld devices', err));
  };
  // Loads once on mount — but this component is kept mounted (hidden via
  // CSS, not unmounted) when the user switches away from this tab, so a
  // device added/activated on the "Handheld Devices" page afterwards would
  // never show up here without the live-update subscription below.
  useEffect(() => { loadDevices(); }, []);
  useEffect(() => {
    if (!subscribeToEvent) return undefined;
    return subscribeToEvent("handheld:devicesUpdated", loadDevices);
  }, [subscribeToEvent]);
  const devices = useMemo(
    () => deviceList.filter((d) => d.status === 'active').map((d) => d.name),
    [deviceList]
  );

  const loadFinalData = () => {
    if (!currentBatchId) { setDataStatus("empty"); setFinalHandheldData(null); return; }
    setDataStatus((prev) => (prev === "ready" ? prev : "loading"));
    fetch(`${API_BASE}/api/handheld-assign/final-data?batchId=${currentBatchId}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((result) => {
        const rows = result && result.data ? result.data : [];
        setFinalHandheldData(rows);
        setDataStatus(rows.length > 0 ? "ready" : "empty");
      })
      .catch((err) => {
        console.error("Failed to load handheld assign data", err);
        setFinalHandheldData(null);
        setDataStatus("error");
      });
  };

  // Loads once per batch. A 404 / no data simply means step 2 (upload
  // "Part addr.xls" on the Handheld tab, matching Address + PIC) hasn't
  // been run yet for this batch — that's a normal state, not an error.
  useEffect(() => { loadFinalData(); loadAssignments(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [currentBatchId]);

  // Same-batch live updates (e.g. someone (re)uploads Part addr.xls, saves
  // an assignment from another tab, or reassigns a PIC on the Handheld tab
  // while this tab is open) — refetch so nothing here goes stale.
  useEffect(() => {
    if (!subscribeToEvent) return undefined;
    const unsubscribe = subscribeToEvent("handheld:updated", (payload) => {
      if (payload.batchId !== currentBatchId) return;
      loadFinalData();
      loadAssignments();
    });
    return unsubscribe;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [subscribeToEvent, currentBatchId]);

  // Every PIC present in the real data, for the filter dropdown.
  const picOptions = useMemo(() => {
    if (!finalHandheldData) return [];
    return [...new Set(finalHandheldData.map((r) => r.PIC || "Unassigned"))].sort();
  }, [finalHandheldData]);

  // The real groups to distribute to devices: rows grouped by short address
  // (ShortAddr), scoped to the selected PIC — or across every PIC when
  // "All" is selected. In "All" view the group id carries the PIC too, so
  // two different PICs that happen to share a short-address code don't
  // collide into one card.
  const baseGroups = useMemo(() => {
    if (!finalHandheldData) return [];
    const scoped = selectedPic === "All"
      ? finalHandheldData
      : finalHandheldData.filter((r) => (r.PIC || "Unassigned") === selectedPic);

    const byKey = new Map();
    scoped.forEach((row) => {
      const pic = row.PIC || "Unassigned";
      const shortAddr = row.ShortAddr || "Unk";
      const key = `${pic}::${shortAddr}`;
      if (!byKey.has(key)) byKey.set(key, { id: key, code: shortAddr, pic, count: 0 });
      byKey.get(key).count += 1;
    });
    return Array.from(byKey.values()).sort((a, b) => a.code.localeCompare(b.code));
  }, [finalHandheldData, selectedPic]);

  // Merge in device assignments kept in `assignments` (see above). `devices`
  // is an array now — a group can be shared by more than one device.
  const groups = useMemo(
    () => baseGroups.map((g) => ({ ...g, devices: assignments[g.id] || [] })),
    [baseGroups, assignments]
  );

  const totalAddresses = useMemo(() => groups.reduce((sum, g) => sum + g.count, 0), [groups]);

  const assignedAddresses = useMemo(
    () => groups.filter((g) => g.devices.length > 0).reduce((sum, g) => sum + g.count, 0),
    [groups]
  );

  const unassignedGroupsAll = useMemo(() => groups.filter((g) => g.devices.length === 0), [groups]);

  const unassignedGroups = useMemo(() => {
    const q = search.trim().toLowerCase();
    return unassignedGroupsAll.filter((g) => !q || g.code.toLowerCase().includes(q));
  }, [unassignedGroupsAll, search]);

  const selectedGroups = groups.filter((g) => selectedIds.includes(g.id));
  const selectedAddressCount = selectedGroups.reduce((sum, g) => sum + g.count, 0);
  const assignedPercent = totalAddresses > 0 ? Math.round((assignedAddresses / totalAddresses) * 100) : 0;

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

    setAssignments((prev) => {
      const next = { ...prev };
      selectedIds.forEach((id) => {
        const existing = next[id] || [];
        if (!existing.includes(target)) next[id] = [...existing, target];
      });
      return next;
    });
    setSelectedIds([]);
    setTargetDevice("");
    showToast(`${count} group${count > 1 ? "s" : ""} assigned to ${target}`);
  };

  // Removes just ONE device from a shared group — the group stays assigned
  // to whichever other devices still have it. Only returns to Unassigned
  // once the last device is removed.
  const removeFromDevice = (id, device) => {
    const group = groups.find((g) => g.id === id);
    setAssignments((prev) => {
      const next = { ...prev };
      const remaining = (next[id] || []).filter((d) => d !== device);
      if (remaining.length > 0) next[id] = remaining;
      else delete next[id];
      return next;
    });
    setSelectedIds((prev) => prev.filter((x) => x !== id));

    if (group) showToast(`${group.code} removed from ${device}`);
  };

  const handleDragStart = (event, groupId, sourceDevice = null) => {
    setDraggedGroupId(groupId);
    setDraggedFromDevice(sourceDevice); // null = dragged from the Unassigned list
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("text/plain", String(groupId));
  };

  const handleDragEnd = () => {
    setDraggedGroupId(null);
    setDraggedFromDevice(null);
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

    // Group ids are now strings ("<PIC>::<ShortAddr>"), not numbers — no
    // Number() cast here anymore.
    const transferredId = event.dataTransfer.getData("text/plain");
    const groupId = transferredId || draggedGroupId;
    if (!groupId) return;
    const sourceDevice = draggedFromDevice; // which device's card it was dragged out of, if any

    const group = groups.find((g) => g.id === groupId);
    if (!group) {
      setDraggedGroupId(null);
      setDraggedFromDevice(null);
      setDragOverTarget(null);
      return;
    }

    if (targetDeviceName) {
      // Dropped on a device. Dragged from Unassigned → plain assign.
      // Dragged out of another device's card → MOVE (leaves that device),
      // same as picking a group up and setting it down somewhere else.
      setAssignments((prev) => {
        let arr = prev[groupId] || [];
        if (sourceDevice && sourceDevice !== targetDeviceName) arr = arr.filter((d) => d !== sourceDevice);
        if (!arr.includes(targetDeviceName)) arr = [...arr, targetDeviceName];
        return { ...prev, [groupId]: arr };
      });
      showToast(sourceDevice && sourceDevice !== targetDeviceName
        ? `${group.code} moved to ${targetDeviceName}`
        : `${group.code} assigned to ${targetDeviceName}`);
    } else if (sourceDevice) {
      // Dropped on Unassigned from a specific device's card — only leaves
      // that one device (other devices sharing this group, if any, keep it).
      setAssignments((prev) => {
        const next = { ...prev };
        const remaining = (next[groupId] || []).filter((d) => d !== sourceDevice);
        if (remaining.length > 0) next[groupId] = remaining;
        else delete next[groupId];
        return next;
      });
      showToast(`${group.code} removed from ${sourceDevice}`);
    }
    setSelectedIds((prev) => prev.filter((id) => id !== groupId));

    setDraggedGroupId(null);
    setDraggedFromDevice(null);
    setDragOverTarget(null);
  };

  // "Duplicate" on a device card — copies every group currently on
  // `fromDevice` onto `toDevice` too, without removing them from
  // `fromDevice`. The deliberate, explicit way to share a whole device's
  // workload with another device (as opposed to dragging one group at a
  // time — see handleDrop, which always moves rather than duplicates).
  const duplicateDeviceTo = (fromDevice, toDevice) => {
    if (!fromDevice || !toDevice || fromDevice === toDevice) return;
    const sourceGroups = groups.filter((g) => g.devices.includes(fromDevice));
    if (sourceGroups.length === 0) return;

    setAssignments((prev) => {
      const next = { ...prev };
      sourceGroups.forEach((g) => {
        const arr = next[g.id] || [];
        if (!arr.includes(toDevice)) next[g.id] = [...arr, toDevice];
      });
      return next;
    });
    showToast(`${sourceGroups.length} group${sourceGroups.length > 1 ? "s" : ""} duplicated from ${fromDevice} to ${toDevice}`);
  };

  const deviceStats = (device) => {
    const list = groups.filter((g) => g.devices.includes(device));

    return {
      groups: list,
      zones: list.length,
      addresses: list.reduce((sum, g) => sum + g.count, 0),
    };
  };

  const sendToHandheld = () => {
    setShowSendConfirm(false);
    setIsSending(true);

    const payload = {
      batchId: currentBatchId,
      assignments: groups
        .filter((g) => g.devices.length > 0)
        .flatMap((g) => g.devices.map((d) => ({ pic: g.pic, shortAddr: g.code, deviceId: d }))),
    };

    fetch(`${API_BASE}/api/handheld-assign/device-assignments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    })
      .then((res) => (res.ok ? res.json() : Promise.reject(new Error("Save failed"))))
      .then(() => {
        setIsSending(false);
        setShowSendSuccess(true);
      })
      .catch((err) => {
        console.error("Failed to send assignment to handheld devices", err);
        setIsSending(false);
        showToast("ส่งไม่สำเร็จ ลองใหม่อีกครั้ง");
      });
  };

  // For whatever's still Unassigned — download it as an Excel file in the
  // same format as the Handheld page's own export (same columns, since
  // it's the same PIC/Addr-matched data, just filtered to the groups no
  // device picked up). Reuses the backend's existing generic export-excel
  // endpoint (see backend/handheld_part_list/assignAddrRoute.js).
  const exportUnassignedToExcel = async () => {
    if (!finalHandheldData || unassignedGroupsAll.length === 0) return;

    const unassignedKeys = new Set(unassignedGroupsAll.map((g) => g.id));
    const rows = finalHandheldData.filter((row) => {
      const pic = row.PIC || "Unassigned";
      const shortAddr = row.ShortAddr || "Unk";
      return unassignedKeys.has(`${pic}::${shortAddr}`);
    });
    if (rows.length === 0) return;

    setIsExporting(true);
    try {
      const response = await fetch(`${API_BASE}/api/handheld-assign/export-excel`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ data: rows, fileName: `Unassigned_${currentBatchId}` }),
      });
      if (!response.ok) throw new Error("Export failed");

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `Unassigned_${currentBatchId}.xlsx`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Failed to export unassigned parts", err);
      showToast("Export ไม่สำเร็จ ลองใหม่อีกครั้ง");
    } finally {
      setIsExporting(false);
    }
  };

  if (dataStatus === "loading") {
    return (
      <div className="w-full pb-10 flex flex-col items-center justify-center py-24 text-center animate-in fade-in">
        <div className="w-9 h-9 rounded-full border-[3px] border-ink/10 border-t-accent animate-spin mb-4" />
        <p className="text-[12px] font-bold text-muted">Loading address groups for this batch…</p>
      </div>
    );
  }

  if (dataStatus === "empty" || dataStatus === "error") {
    return (
      <div className="w-full pb-10 animate-in fade-in">
        <div className="bg-white border-2 border-dashed border-ink/10 rounded-[28px] p-16 flex flex-col items-center justify-center text-center">
          <div className="w-14 h-14 rounded-2xl bg-accent/20 flex items-center justify-center text-ink text-xl font-black mb-4">▤</div>
          <h3 className="font-display text-xl font-bold text-ink mb-2">No PIC / Address data yet</h3>
          <p className="text-[12px] text-muted font-semibold max-w-sm mb-6">
            {dataStatus === "error"
              ? "Couldn't load data for this batch. Try again, or check the Handheld tab."
              : "Go to the Handheld tab and upload Part addr.xls to match Address + PIC first — Assign Handheld distributes that result to devices."}
          </p>
          <button
            onClick={() => setUploadTab && setUploadTab("Handheld")}
            className="bg-ink text-accent px-6 py-3 rounded-xl font-bold text-[11.5px] hover:opacity-90 transition-colors"
          >
            Go to Handheld tab
          </button>
        </div>
      </div>
    );
  }

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
              <p className="text-[15px] font-bold text-ink leading-none mt-1">{groups.filter((g) => g.devices.length === 0).length} groups</p>
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

            <div className="flex items-start justify-between mb-4 gap-2">
              <h3 className="text-[17px] font-bold text-ink">Unassigned</h3>
              <div className="flex flex-col items-end gap-1">
                <p className="text-[8px] font-extrabold tracking-wide text-muted">PIC</p>
                <select
                  value={selectedPic}
                  onChange={(e) => setSelectedPic(e.target.value)}
                  className="bg-white border border-ink/10 rounded-xl px-2.5 py-1.5 text-[10px] font-bold text-ink outline-none shadow-sm cursor-pointer max-w-[130px]"
                >
                  <option value="All">All PICs</option>
                  {picOptions.map((pic) => <option key={pic} value={pic}>{pic}</option>)}
                </select>
              </div>
            </div>

            {/* SELECT DEVICE */}
            <div className="bg-[#F6F6F0] rounded-[16px] p-3 mb-3">
              <div className="flex items-center justify-between mb-2">
                <p className="text-[9px] font-extrabold text-muted tracking-wide">ASSIGN SELECTED TO</p>

                <div className="flex items-center gap-2">
                  {selectedIds.length > 0 && (
                    <span className="text-[9px] font-extrabold text-ink">{selectedIds.length} selected</span>
                  )}
                  <button
                    onClick={loadDevices}
                    title="Refresh device list"
                    className="w-5 h-5 rounded-full flex items-center justify-center text-[#9A9788] hover:text-ink hover:bg-ink/5 transition-colors"
                  >
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <path d="M21 12a9 9 0 1 1-2.64-6.36" />
                      <path d="M21 3v6h-6" />
                    </svg>
                  </button>
                </div>
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
                  <div className="flex-1 min-w-0">
                    <p className="text-[12px] font-extrabold text-ink">{group.code}</p>
                    {selectedPic === "All" && <p className="text-[9px] text-muted font-semibold truncate">{group.pic}</p>}
                  </div>

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

          {devices.length === 0 && (
            <div className="md:col-span-2 2xl:col-span-3 bg-white rounded-[28px] border-2 border-dashed border-ink/10 p-12 flex flex-col items-center justify-center text-center">
              <p className="text-[13px] font-bold text-ink mb-1">No active handheld devices</p>
              <p className="text-[11px] text-muted font-semibold max-w-xs">
                Go to Template &gt; Handheld Devices to add or activate a device before assigning address groups.
              </p>
            </div>
          )}

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

                    <div className="flex items-center gap-2">
                      {stats.groups.length > 0 && devices.length > 1 && (
                        <button
                          onClick={() => { setDuplicateFromDevice(device); setDuplicateTarget(""); }}
                          title={`Duplicate all of ${device}'s groups to another device`}
                          className="w-9 h-9 rounded-xl bg-[#F5F5EF] border border-ink/[0.07] flex items-center justify-center text-ink hover:bg-ink hover:text-accent transition-colors"
                        >
                          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <rect x="9" y="9" width="12" height="12" rx="2" />
                            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                          </svg>
                        </button>
                      )}
                    </div>
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
                        const otherDevices = group.devices.filter((d) => d !== device);
                        const isDragging = draggedGroupId === group.id && draggedFromDevice === device;

                        return (
                          <div
                            key={group.id}
                            draggable
                            onDragStart={(e) => handleDragStart(e, group.id, device)}
                            onDragEnd={handleDragEnd}
                            className={`group bg-[#FAFAF7] rounded-xl px-3 py-3 cursor-grab active:cursor-grabbing border border-transparent hover:border-ink/[0.07] transition-all ${
                              isDragging ? "opacity-40 scale-[0.98]" : ""
                            }`}
                          >
                            <div className="flex items-center gap-2.5">
                              <span className="text-[#C0BDB4] text-[12px] tracking-[-2px]">⠿</span>

                              <div className="flex-1 min-w-0">
                                <p className="text-[12px] font-extrabold text-ink">{group.code}</p>
                                <p className="text-[9.5px] text-muted font-semibold mt-0.5">
                                  {group.count} addresses{selectedPic === "All" ? ` · ${group.pic}` : ""}
                                </p>
                                {otherDevices.length > 0 && (
                                  <p className="text-[8.5px] text-ink/50 font-semibold mt-0.5 truncate">
                                    Shared with {otherDevices.join(", ")}
                                  </p>
                                )}
                              </div>

                              <span className="bg-ink text-white min-w-[31px] h-[24px] px-2 rounded-full flex items-center justify-center text-[9px] font-extrabold">
                                {group.count}
                              </span>

                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  removeFromDevice(group.id, device);
                                }}
                                title={`Remove from ${device}`}
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

      {/* SEND TO HANDHELD / EXPORT UNASSIGNED */}
      {(assignedAddresses > 0 || unassignedGroupsAll.length > 0) && (
        <div className="flex justify-center items-center gap-3 mt-7">
          {assignedAddresses > 0 && (
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
          )}

          {unassignedGroupsAll.length > 0 && (
            <button
              onClick={exportUnassignedToExcel}
              disabled={isExporting}
              title="Download the still-unassigned parts as an Excel file"
              className="bg-white border border-ink/10 text-ink rounded-[16px] px-6 py-3.5 shadow-[0_2px_12px_rgba(20,20,15,0.04)] flex items-center gap-3 text-[11.5px] font-extrabold hover:-translate-y-0.5 hover:border-ink/20 transition-all"
            >
              <span className="w-7 h-7 rounded-lg bg-ink/5 flex items-center justify-center">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 4v12" />
                  <path d="M7 11l5 5 5-5" />
                  <path d="M5 20h14" />
                </svg>
              </span>
              {isExporting ? "Exporting..." : `Export Unassigned (${unassignedGroupsAll.length})`}
            </button>
          )}
        </div>
      )}

      {/* DRAG HELPER */}
      {draggedGroupId && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[100] bg-ink text-white rounded-full px-4 py-2.5 shadow-xl pointer-events-none">
          <p className="text-[10px] font-bold">Drop on a device or Unassigned</p>
        </div>
      )}

      {/* DUPLICATE DEVICE MODAL */}
      {duplicateFromDevice && (
        <div
          className="fixed inset-0 z-[300] bg-ink/45 backdrop-blur-[3px] flex items-center justify-center p-4"
          onClick={() => setDuplicateFromDevice(null)}
        >
          <div
            className="w-full max-w-[360px] bg-white rounded-[26px] p-6 shadow-[0_30px_80px_rgba(20,20,15,0.25)]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-12 h-12 rounded-[15px] bg-accent/25 flex items-center justify-center mb-4">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#14140F" strokeWidth="2">
                <rect x="9" y="9" width="12" height="12" rx="2" />
                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
              </svg>
            </div>
            <h3 className="font-display text-[19px] font-bold text-ink">Duplicate {duplicateFromDevice}'s groups</h3>

            <select
              value={duplicateTarget}
              onChange={(e) => setDuplicateTarget(e.target.value)}
              className="w-full mt-4 bg-[#FAFAF7] border border-ink/[0.08] rounded-xl px-3 py-2.5 text-[11px] font-bold text-ink outline-none"
            >
              <option value="">Duplicate to...</option>
              {devices.filter((d) => d !== duplicateFromDevice).map((d) => <option key={d} value={d}>{d}</option>)}
            </select>

            <div className="flex gap-2.5 mt-5">
              <button
                onClick={() => setDuplicateFromDevice(null)}
                className="flex-1 py-3 rounded-xl bg-[#F5F5EF] border border-ink/[0.07] text-[11px] font-extrabold text-ink hover:bg-[#ECECE6] transition"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  duplicateDeviceTo(duplicateFromDevice, duplicateTarget);
                  setDuplicateFromDevice(null);
                }}
                disabled={!duplicateTarget}
                className={`flex-1 py-3 rounded-xl text-[11px] font-extrabold transition ${
                  duplicateTarget ? "bg-ink text-accent hover:-translate-y-[1px]" : "bg-[#E7E7E1] text-[#AAA79D] cursor-not-allowed"
                }`}
              >
                OK
              </button>
            </div>
          </div>
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