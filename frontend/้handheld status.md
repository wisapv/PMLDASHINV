import React, { useMemo, useState } from "react";
import Sparkle from "../components/Sparkle";

const STATUS_META = {
  AVAILABLE: {
    label: "Available",
    dot: "#6FCF67",
    badgeBg: "rgba(111,207,103,0.14)",
    text: "#3C9A4A",
  },
  ASSIGNED: {
    label: "Assigned",
    dot: "#FFC94D",
    badgeBg: "rgba(255,201,77,0.18)",
    text: "#A77700",
  },
  CHARGING: {
    label: "Charging",
    dot: "#FF8A3D",
    badgeBg: "rgba(255,138,61,0.14)",
    text: "#D96A20",
  },
  OFFLINE: {
    label: "Offline",
    dot: "#D14545",
    badgeBg: "rgba(209,69,69,0.12)",
    text: "#D14545",
  },
};

const initialDevices = [
  {
    id: "HH-001",
    model: "Zebra TC57",
    serial: "ZTC57-22001",
    shop: "",
    employee: "",
    employeeId: "",
    battery: 92,
    status: "AVAILABLE",
    lastSeen: "2 min ago",
  },
  {
    id: "HH-002",
    model: "Zebra TC57",
    serial: "ZTC57-22002",
    shop: "Shop A",
    employee: "Somchai K.",
    employeeId: "EMP001",
    battery: 78,
    status: "ASSIGNED",
    lastSeen: "5 min ago",
  },
  {
    id: "HH-003",
    model: "Honeywell CT40",
    serial: "HCT40-41003",
    shop: "",
    employee: "",
    employeeId: "",
    battery: 88,
    status: "AVAILABLE",
    lastSeen: "1 min ago",
  },
  {
    id: "HH-004",
    model: "Zebra TC21",
    serial: "ZTC21-11004",
    shop: "Shop W",
    employee: "Wanwisa P.",
    employeeId: "EMP014",
    battery: 64,
    status: "ASSIGNED",
    lastSeen: "8 min ago",
  },
  {
    id: "HH-005",
    model: "Zebra TC57",
    serial: "ZTC57-22005",
    shop: "",
    employee: "",
    employeeId: "",
    battery: 100,
    status: "AVAILABLE",
    lastSeen: "Just now",
  },
  {
    id: "HH-006",
    model: "Honeywell CT40",
    serial: "HCT40-41006",
    shop: "",
    employee: "",
    employeeId: "",
    battery: 31,
    status: "CHARGING",
    lastSeen: "12 min ago",
  },
  {
    id: "HH-007",
    model: "Zebra TC21",
    serial: "ZTC21-11007",
    shop: "Shop B",
    employee: "Nattapong S.",
    employeeId: "EMP025",
    battery: 82,
    status: "ASSIGNED",
    lastSeen: "3 min ago",
  },
  {
    id: "HH-008",
    model: "Zebra TC57",
    serial: "ZTC57-22008",
    shop: "",
    employee: "",
    employeeId: "",
    battery: 0,
    status: "OFFLINE",
    lastSeen: "2 hr ago",
  },
  {
    id: "HH-009",
    model: "Zebra TC57",
    serial: "ZTC57-22009",
    shop: "",
    employee: "",
    employeeId: "",
    battery: 76,
    status: "AVAILABLE",
    lastSeen: "4 min ago",
  },
  {
    id: "HH-010",
    model: "Honeywell CT40",
    serial: "HCT40-41010",
    shop: "Shop C",
    employee: "Anan T.",
    employeeId: "EMP031",
    battery: 69,
    status: "ASSIGNED",
    lastSeen: "6 min ago",
  },
  {
    id: "HH-011",
    model: "Zebra TC57",
    serial: "ZTC57-22011",
    shop: "",
    employee: "",
    employeeId: "",
    battery: 94,
    status: "AVAILABLE",
    lastSeen: "Just now",
  },
  {
    id: "HH-012",
    model: "Zebra TC21",
    serial: "ZTC21-11012",
    shop: "",
    employee: "",
    employeeId: "",
    battery: 55,
    status: "AVAILABLE",
    lastSeen: "7 min ago",
  },
];

const employees = [
  { id: "EMP001", name: "Somchai K.", shop: "Shop A" },
  { id: "EMP014", name: "Wanwisa P.", shop: "Shop W" },
  { id: "EMP025", name: "Nattapong S.", shop: "Shop B" },
  { id: "EMP031", name: "Anan T.", shop: "Shop C" },
  { id: "EMP041", name: "Kittipong R.", shop: "Shop A" },
  { id: "EMP052", name: "Ploy N.", shop: "Shop B" },
];

const shops = [
  "Shop A",
  "Shop B",
  "Shop C",
  "Shop W",
  "Packing",
  "Warehouse",
];

const AssignHandheld = () => {
  const [devices, setDevices] = useState(initialDevices);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [selectedIds, setSelectedIds] = useState([]);

  const [selectedEmployee, setSelectedEmployee] = useState("");
  const [selectedShop, setSelectedShop] = useState("");

  const [showAssignPanel, setShowAssignPanel] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [toast, setToast] = useState("");

  const stats = useMemo(() => {
    return {
      total: devices.length,
      available: devices.filter((d) => d.status === "AVAILABLE").length,
      assigned: devices.filter((d) => d.status === "ASSIGNED").length,
      unavailable: devices.filter(
        (d) => d.status === "OFFLINE" || d.status === "CHARGING"
      ).length,
    };
  }, [devices]);

  const filteredDevices = useMemo(() => {
    const q = search.trim().toLowerCase();

    return devices.filter((device) => {
      const matchesSearch =
        !q ||
        device.id.toLowerCase().includes(q) ||
        device.model.toLowerCase().includes(q) ||
        device.serial.toLowerCase().includes(q) ||
        device.shop.toLowerCase().includes(q) ||
        device.employee.toLowerCase().includes(q) ||
        device.employeeId.toLowerCase().includes(q);

      const matchesStatus =
        statusFilter === "ALL" || device.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [devices, search, statusFilter]);

  const selectableVisibleIds = filteredDevices
    .filter((d) => d.status === "AVAILABLE")
    .map((d) => d.id);

  const allVisibleSelected =
    selectableVisibleIds.length > 0 &&
    selectableVisibleIds.every((id) => selectedIds.includes(id));

  const selectedDevices = devices.filter((d) =>
    selectedIds.includes(d.id)
  );

  const toggleDevice = (device) => {
    if (device.status !== "AVAILABLE") return;

    setSelectedIds((prev) =>
      prev.includes(device.id)
        ? prev.filter((id) => id !== device.id)
        : [...prev, device.id]
    );
  };

  const toggleSelectAllVisible = () => {
    if (allVisibleSelected) {
      setSelectedIds((prev) =>
        prev.filter((id) => !selectableVisibleIds.includes(id))
      );
    } else {
      setSelectedIds((prev) =>
        Array.from(new Set([...prev, ...selectableVisibleIds]))
      );
    }
  };

  const clearSelection = () => {
    setSelectedIds([]);
    setSelectedEmployee("");
    setSelectedShop("");
    setShowAssignPanel(false);
  };

  const handleEmployeeChange = (employeeId) => {
    setSelectedEmployee(employeeId);

    const employee = employees.find((e) => e.id === employeeId);

    if (employee && employee.shop) {
      setSelectedShop(employee.shop);
    }
  };

  const handleAssignClick = () => {
    if (
      selectedIds.length === 0 ||
      !selectedEmployee ||
      !selectedShop
    ) {
      return;
    }

    setShowConfirm(true);
  };

  const confirmAssign = () => {
    const employee = employees.find(
      (e) => e.id === selectedEmployee
    );

    if (!employee) return;

    setDevices((prev) =>
      prev.map((device) =>
        selectedIds.includes(device.id)
          ? {
              ...device,
              employee: employee.name,
              employeeId: employee.id,
              shop: selectedShop,
              status: "ASSIGNED",
            }
          : device
      )
    );

    const count = selectedIds.length;

    setShowConfirm(false);
    setSelectedIds([]);
    setSelectedEmployee("");
    setSelectedShop("");
    setShowAssignPanel(false);

    setToast(
      `${count} handheld${count > 1 ? "s" : ""} assigned successfully`
    );

    setTimeout(() => {
      setToast("");
    }, 3000);
  };

  const getBatteryColor = (battery) => {
    if (battery <= 20) return "#D14545";
    if (battery <= 50) return "#FF8A3D";
    return "#6FCF67";
  };

  return (
    <div className="w-full pb-10 animate-in fade-in duration-500">

      {/* ================= HEADER ================= */}

      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4 mb-6">
        <div className="flex items-center gap-3.5">
          <div>
            <span className="text-xs text-muted font-semibold tracking-wide">
              Handheld Management
            </span>

            <h1 className="font-display text-[34px] md:text-[38px] font-bold tracking-tight leading-none mt-1 text-ink">
              Assign Handheld
            </h1>

            <p className="text-[12px] text-muted font-semibold mt-2">
              Search, select and assign multiple handheld devices quickly.
            </p>
          </div>

          <div className="w-[38px] h-[38px] bg-accent rounded-full flex items-center justify-center flex-shrink-0">
            <Sparkle
              size={17}
              className="!bg-ink"
              delay=".2s"
            />
          </div>
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => {
              setStatusFilter("AVAILABLE");
              setSearch("");
            }}
            className="px-4 py-2.5 rounded-xl bg-white border border-ink/[0.08] text-[11px] font-extrabold text-ink hover:bg-[#FAFAF7] transition"
          >
            Show Available
          </button>

          <button
            onClick={() => {
              if (selectedIds.length > 0) {
                setShowAssignPanel(true);
              }
            }}
            className={`
              px-4 py-2.5 rounded-xl text-[11px] font-extrabold transition
              ${
                selectedIds.length > 0
                  ? "bg-ink text-accent hover:-translate-y-[1px]"
                  : "bg-[#EAEAE4] text-[#A7A59C] cursor-not-allowed"
              }
            `}
          >
            Assign Selected
          </button>
        </div>
      </div>

      {/* ================= KPI ================= */}

      <div className="grid grid-cols-2 xl:grid-cols-4 gap-3.5 mb-5">

        <div className="bg-ink rounded-[24px] p-5 relative overflow-hidden min-h-[126px]">
          <Sparkle
            size={11}
            className="absolute top-4 right-4 pointer-events-none"
          />

          <p className="text-accent text-[9.5px] font-extrabold tracking-wide">
            TOTAL DEVICES
          </p>

          <h3 className="font-display text-[31px] font-bold text-white mt-2">
            {stats.total}
          </h3>

          <p className="text-[10.5px] text-[#8A8880] font-semibold mt-1">
            Registered handhelds
          </p>
        </div>

        <div className="bg-white rounded-[24px] p-5 border border-ink/5 shadow-[0_2px_12px_rgba(20,20,15,0.04)] min-h-[126px]">
          <p className="text-muted text-[9.5px] font-extrabold tracking-wide">
            AVAILABLE
          </p>

          <div className="flex items-end gap-2 mt-2">
            <h3 className="font-display text-[31px] font-bold text-ink">
              {stats.available}
            </h3>

            <span className="w-2 h-2 bg-[#6FCF67] rounded-full mb-2"></span>
          </div>

          <p className="text-[10.5px] text-[#6D9F67] font-semibold">
            Ready to assign
          </p>
        </div>

        <div className="bg-white rounded-[24px] p-5 border border-ink/5 shadow-[0_2px_12px_rgba(20,20,15,0.04)] min-h-[126px]">
          <p className="text-muted text-[9.5px] font-extrabold tracking-wide">
            ASSIGNED
          </p>

          <div className="flex items-end gap-2 mt-2">
            <h3 className="font-display text-[31px] font-bold text-ink">
              {stats.assigned}
            </h3>

            <span className="w-2 h-2 bg-[#FFC94D] rounded-full mb-2"></span>
          </div>

          <p className="text-[10.5px] text-[#A98732] font-semibold">
            Currently in use
          </p>
        </div>

        <div className="bg-white rounded-[24px] p-5 border border-ink/5 shadow-[0_2px_12px_rgba(20,20,15,0.04)] min-h-[126px]">
          <p className="text-muted text-[9.5px] font-extrabold tracking-wide">
            UNAVAILABLE
          </p>

          <div className="flex items-end gap-2 mt-2">
            <h3 className="font-display text-[31px] font-bold text-ink">
              {stats.unavailable}
            </h3>

            <span className="w-2 h-2 bg-[#FF8A3D] rounded-full mb-2"></span>
          </div>

          <p className="text-[10.5px] text-[#C27743] font-semibold">
            Charging or offline
          </p>
        </div>
      </div>

      {/* ================= TOOLBAR ================= */}

      <div className="bg-white rounded-[24px] p-4 md:p-5 border border-ink/5 shadow-[0_2px_12px_rgba(20,20,15,0.04)] mb-4">

        <div className="flex flex-col xl:flex-row gap-3 xl:items-center">

          {/* SEARCH */}

          <div className="relative flex-1">
            <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#AAA79D]">
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <circle cx="11" cy="11" r="7" />
                <path d="M20 20L16.65 16.65" />
              </svg>
            </div>

            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search handheld ID, serial, employee or shop..."
              className="w-full bg-[#FAFAF7] border border-ink/[0.08] rounded-xl pl-10 pr-4 py-3 text-[12px] font-semibold text-ink outline-none focus:border-ink/25 transition"
            />

            {search && (
              <button
                onClick={() => setSearch("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full text-[#AAA79D] hover:text-ink"
              >
                ×
              </button>
            )}
          </div>

          {/* FILTERS */}

          <div className="flex gap-1.5 overflow-x-auto">
            {[
              ["ALL", "All"],
              ["AVAILABLE", "Available"],
              ["ASSIGNED", "Assigned"],
              ["CHARGING", "Charging"],
              ["OFFLINE", "Offline"],
            ].map(([value, label]) => (
              <button
                key={value}
                onClick={() => setStatusFilter(value)}
                className={`
                  whitespace-nowrap px-3.5 py-2.5 rounded-xl
                  text-[10.5px] font-extrabold transition
                  ${
                    statusFilter === value
                      ? "bg-ink text-accent"
                      : "bg-[#FAFAF7] text-muted hover:text-ink"
                  }
                `}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center justify-between mt-4 pt-4 border-t border-ink/[0.06]">
          <p className="text-[10.5px] text-muted font-semibold">
            Showing{" "}
            <span className="text-ink font-extrabold">
              {filteredDevices.length}
            </span>{" "}
            of {devices.length} devices
          </p>

          {selectedIds.length > 0 && (
            <button
              onClick={clearSelection}
              className="text-[10.5px] font-bold text-muted hover:text-ink"
            >
              Clear selection
            </button>
          )}
        </div>
      </div>

      {/* ================= DEVICE TABLE ================= */}

      <div className="bg-white rounded-[28px] border border-ink/5 shadow-[0_2px_12px_rgba(20,20,15,0.04)] overflow-hidden">

        {/* TITLE */}

        <div className="px-5 md:px-6 py-5 flex items-center justify-between border-b border-ink/[0.06]">
          <div>
            <h3 className="text-[14px] font-bold text-ink">
              Handheld Devices
            </h3>

            <p className="text-[10.5px] text-muted font-semibold mt-0.5">
              Only available devices can be selected for assignment.
            </p>
          </div>

          {selectedIds.length > 0 && (
            <div className="bg-ink text-accent px-3 py-2 rounded-xl text-[10.5px] font-extrabold">
              {selectedIds.length} selected
            </div>
          )}
        </div>

        {/* DESKTOP TABLE */}

        <div className="hidden md:block overflow-x-auto">
          <table className="w-full min-w-[850px]">
            <thead>
              <tr className="bg-[#FAFAF7]">

                <th className="w-[56px] px-5 py-3 text-left">
                  <input
                    type="checkbox"
                    checked={allVisibleSelected}
                    onChange={toggleSelectAllVisible}
                    className="w-4 h-4 accent-[#14140F] cursor-pointer"
                  />
                </th>

                <th className="px-3 py-3 text-left text-[9px] font-extrabold tracking-wider text-muted">
                  HANDHELD
                </th>

                <th className="px-3 py-3 text-left text-[9px] font-extrabold tracking-wider text-muted">
                  STATUS
                </th>

                <th className="px-3 py-3 text-left text-[9px] font-extrabold tracking-wider text-muted">
                  CURRENT USER
                </th>

                <th className="px-3 py-3 text-left text-[9px] font-extrabold tracking-wider text-muted">
                  SHOP
                </th>

                <th className="px-3 py-3 text-left text-[9px] font-extrabold tracking-wider text-muted">
                  BATTERY
                </th>

                <th className="px-5 py-3 text-right text-[9px] font-extrabold tracking-wider text-muted">
                  LAST SEEN
                </th>

              </tr>
            </thead>

            <tbody>
              {filteredDevices.map((device) => {
                const selected = selectedIds.includes(device.id);
                const canSelect = device.status === "AVAILABLE";
                const status = STATUS_META[device.status];

                return (
                  <tr
                    key={device.id}
                    onClick={() => toggleDevice(device)}
                    className={`
                      border-t border-ink/[0.05] transition
                      ${
                        canSelect
                          ? "cursor-pointer hover:bg-[#FBFBF7]"
                          : "cursor-default"
                      }
                      ${selected ? "bg-[#F7FFD9]" : ""}
                    `}
                  >
                    <td className="px-5 py-4">
                      <input
                        type="checkbox"
                        disabled={!canSelect}
                        checked={selected}
                        onClick={(e) => e.stopPropagation()}
                        onChange={() => toggleDevice(device)}
                        className="w-4 h-4 accent-[#14140F] cursor-pointer disabled:opacity-25 disabled:cursor-not-allowed"
                      />
                    </td>

                    <td className="px-3 py-4">
                      <div>
                        <p className="text-[12px] font-extrabold text-ink">
                          {device.id}
                        </p>

                        <p className="text-[10px] text-muted font-semibold mt-0.5">
                          {device.model}
                        </p>

                        <p className="text-[9px] text-[#B5B2A8] font-semibold mt-0.5">
                          {device.serial}
                        </p>
                      </div>
                    </td>

                    <td className="px-3 py-4">
                      <span
                        className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-[9.5px] font-extrabold"
                        style={{
                          background: status.badgeBg,
                          color: status.text,
                        }}
                      >
                        <span
                          className="w-1.5 h-1.5 rounded-full"
                          style={{
                            background: status.dot,
                          }}
                        ></span>

                        {status.label}
                      </span>
                    </td>

                    <td className="px-3 py-4">
                      {device.employee ? (
                        <div>
                          <p className="text-[11px] font-bold text-ink">
                            {device.employee}
                          </p>

                          <p className="text-[9.5px] text-muted font-semibold">
                            {device.employeeId}
                          </p>
                        </div>
                      ) : (
                        <span className="text-[10.5px] text-[#B8B5AC] font-semibold">
                          —
                        </span>
                      )}
                    </td>

                    <td className="px-3 py-4">
                      <span className="text-[10.5px] font-bold text-ink">
                        {device.shop || "—"}
                      </span>
                    </td>

                    <td className="px-3 py-4">
                      <div className="w-[92px]">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-[9.5px] font-extrabold text-ink">
                            {device.battery}%
                          </span>
                        </div>

                        <div className="h-[5px] bg-ink/[0.08] rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full"
                            style={{
                              width: `${device.battery}%`,
                              background: getBatteryColor(
                                device.battery
                              ),
                            }}
                          />
                        </div>
                      </div>
                    </td>

                    <td className="px-5 py-4 text-right">
                      <span className="text-[9.5px] text-muted font-semibold">
                        {device.lastSeen}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* MOBILE */}

        <div className="md:hidden p-3 flex flex-col gap-2">
          {filteredDevices.map((device) => {
            const selected = selectedIds.includes(device.id);
            const canSelect = device.status === "AVAILABLE";
            const status = STATUS_META[device.status];

            return (
              <div
                key={device.id}
                onClick={() => toggleDevice(device)}
                className={`
                  rounded-2xl border p-4 transition
                  ${
                    selected
                      ? "bg-[#F7FFD9] border-ink/15"
                      : "bg-[#FAFAF7] border-transparent"
                  }
                  ${canSelect ? "cursor-pointer" : ""}
                `}
              >
                <div className="flex items-start gap-3">
                  <input
                    type="checkbox"
                    disabled={!canSelect}
                    checked={selected}
                    onClick={(e) => e.stopPropagation()}
                    onChange={() => toggleDevice(device)}
                    className="mt-1 w-4 h-4 accent-[#14140F]"
                  />

                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="text-[12px] font-extrabold text-ink">
                          {device.id}
                        </p>

                        <p className="text-[10px] text-muted font-semibold">
                          {device.model}
                        </p>
                      </div>

                      <span
                        className="px-2 py-1 rounded-full text-[9px] font-extrabold"
                        style={{
                          background: status.badgeBg,
                          color: status.text,
                        }}
                      >
                        {status.label}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 mt-3">
                      <div>
                        <p className="text-[8.5px] font-extrabold text-[#AAA79D]">
                          USER
                        </p>
                        <p className="text-[10px] font-bold text-ink mt-0.5">
                          {device.employee || "—"}
                        </p>
                      </div>

                      <div>
                        <p className="text-[8.5px] font-extrabold text-[#AAA79D]">
                          SHOP
                        </p>
                        <p className="text-[10px] font-bold text-ink mt-0.5">
                          {device.shop || "—"}
                        </p>
                      </div>
                    </div>

                    <div className="mt-3">
                      <div className="flex justify-between mb-1">
                        <span className="text-[9px] text-muted font-bold">
                          Battery
                        </span>

                        <span className="text-[9px] text-ink font-extrabold">
                          {device.battery}%
                        </span>
                      </div>

                      <div className="h-[5px] rounded-full bg-black/[0.08] overflow-hidden">
                        <div
                          className="h-full rounded-full"
                          style={{
                            width: `${device.battery}%`,
                            background: getBatteryColor(
                              device.battery
                            ),
                          }}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {filteredDevices.length === 0 && (
          <div className="py-16 text-center">
            <div className="w-12 h-12 rounded-full bg-[#FAFAF7] flex items-center justify-center mx-auto mb-3">
              <span className="text-lg">⌕</span>
            </div>

            <p className="text-[12px] font-bold text-ink">
              No handheld found
            </p>

            <p className="text-[10.5px] text-muted font-semibold mt-1">
              Try changing your search or filter.
            </p>
          </div>
        )}
      </div>

      {/* ================= FLOATING BULK BAR ================= */}

      {selectedIds.length > 0 && !showAssignPanel && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 w-[calc(100%-32px)] max-w-[620px]">
          <div className="bg-ink rounded-[20px] px-4 py-3 shadow-[0_22px_60px_rgba(20,20,15,0.25)] flex items-center gap-3">

            <div className="w-9 h-9 bg-accent rounded-xl flex items-center justify-center text-ink font-black text-sm flex-shrink-0">
              {selectedIds.length}
            </div>

            <div className="flex-1 min-w-0">
              <p className="text-white text-[11px] font-extrabold">
                Handheld selected
              </p>

              <p className="text-[#8A8880] text-[9.5px] font-semibold">
                Ready for bulk assignment
              </p>
            </div>

            <button
              onClick={clearSelection}
              className="px-3 py-2 rounded-xl text-[10px] font-bold text-[#AAA89E] hover:text-white"
            >
              Clear
            </button>

            <button
              onClick={() => setShowAssignPanel(true)}
              className="px-4 py-2.5 rounded-xl bg-accent text-ink text-[10.5px] font-extrabold"
            >
              Assign {selectedIds.length}
            </button>
          </div>
        </div>
      )}

      {/* ================= ASSIGN PANEL ================= */}

      {showAssignPanel && (
        <div
          className="fixed inset-0 z-[100] bg-ink/40 backdrop-blur-[3px] flex justify-end"
          onClick={() => setShowAssignPanel(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-[430px] h-full bg-[#F7F7F2] shadow-2xl flex flex-col animate-in slide-in-from-right duration-300"
          >
            {/* PANEL HEADER */}

            <div className="bg-ink p-6">
              <div className="flex items-start justify-between">

                <div>
                  <p className="text-accent text-[9.5px] font-extrabold tracking-wider">
                    BULK ASSIGNMENT
                  </p>

                  <h2 className="text-white text-[22px] font-display font-bold mt-1">
                    Assign Handheld
                  </h2>

                  <p className="text-[#8A8880] text-[10.5px] font-semibold mt-1">
                    {selectedIds.length} devices selected
                  </p>
                </div>

                <button
                  onClick={() => setShowAssignPanel(false)}
                  className="w-9 h-9 rounded-full bg-white/10 text-white flex items-center justify-center hover:bg-white/15"
                >
                  ×
                </button>

              </div>
            </div>

            {/* CONTENT */}

            <div className="flex-1 overflow-y-auto p-5">

              {/* DEVICES */}

              <div className="bg-white rounded-[20px] border border-ink/5 p-4 mb-4">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-[11px] font-extrabold text-ink">
                    Selected Devices
                  </p>

                  <span className="text-[9.5px] font-extrabold bg-ink text-accent px-2.5 py-1 rounded-full">
                    {selectedIds.length}
                  </span>
                </div>

                <div className="flex flex-wrap gap-1.5">
                  {selectedDevices.map((device) => (
                    <span
                      key={device.id}
                      className="bg-[#F2F2EC] px-2.5 py-1.5 rounded-lg text-[9.5px] font-extrabold text-ink"
                    >
                      {device.id}
                    </span>
                  ))}
                </div>
              </div>

              {/* EMPLOYEE */}

              <div className="bg-white rounded-[20px] border border-ink/5 p-4 mb-4">
                <p className="text-[10px] font-extrabold text-muted mb-2">
                  ASSIGN TO EMPLOYEE
                </p>

                <select
                  value={selectedEmployee}
                  onChange={(e) =>
                    handleEmployeeChange(e.target.value)
                  }
                  className="w-full bg-[#FAFAF7] border border-ink/[0.08] rounded-xl px-3.5 py-3 text-[11px] font-bold text-ink outline-none"
                >
                  <option value="">
                    Select employee...
                  </option>

                  {employees.map((employee) => (
                    <option
                      key={employee.id}
                      value={employee.id}
                    >
                      {employee.id} — {employee.name}
                    </option>
                  ))}
                </select>

                {selectedEmployee && (
                  <div className="mt-3 bg-[#F7FFD9] rounded-xl p-3">
                    <p className="text-[10.5px] font-extrabold text-ink">
                      {
                        employees.find(
                          (e) =>
                            e.id === selectedEmployee
                        )?.name
                      }
                    </p>

                    <p className="text-[9.5px] text-muted font-semibold mt-0.5">
                      {selectedEmployee}
                    </p>
                  </div>
                )}
              </div>

              {/* SHOP */}

              <div className="bg-white rounded-[20px] border border-ink/5 p-4 mb-4">
                <p className="text-[10px] font-extrabold text-muted mb-2">
                  SHOP / AREA
                </p>

                <select
                  value={selectedShop}
                  onChange={(e) =>
                    setSelectedShop(e.target.value)
                  }
                  className="w-full bg-[#FAFAF7] border border-ink/[0.08] rounded-xl px-3.5 py-3 text-[11px] font-bold text-ink outline-none"
                >
                  <option value="">
                    Select shop...
                  </option>

                  {shops.map((shop) => (
                    <option
                      key={shop}
                      value={shop}
                    >
                      {shop}
                    </option>
                  ))}
                </select>
              </div>

              {/* INFO */}

              <div className="bg-[#FFF8E8] border border-[#FFC94D]/25 rounded-[18px] p-4">
                <p className="text-[10.5px] font-extrabold text-[#8C6613]">
                  Assignment note
                </p>

                <p className="text-[9.5px] text-[#9B8048] font-semibold leading-relaxed mt-1">
                  Selected devices will be assigned to the same
                  employee and shop in one action.
                </p>
              </div>
            </div>

            {/* FOOTER */}

            <div className="p-5 bg-white border-t border-ink/[0.06]">
              <div className="flex gap-2.5">
                <button
                  onClick={() => setShowAssignPanel(false)}
                  className="flex-1 py-3 rounded-xl bg-[#F5F5EF] border border-ink/[0.07] text-[11px] font-extrabold text-ink"
                >
                  Cancel
                </button>

                <button
                  onClick={handleAssignClick}
                  disabled={
                    !selectedEmployee ||
                    !selectedShop ||
                    selectedIds.length === 0
                  }
                  className={`
                    flex-[1.5] py-3 rounded-xl text-[11px] font-extrabold transition
                    ${
                      selectedEmployee &&
                      selectedShop &&
                      selectedIds.length > 0
                        ? "bg-ink text-accent hover:-translate-y-[1px]"
                        : "bg-[#EAEAE4] text-[#AAA79D] cursor-not-allowed"
                    }
                  `}
                >
                  Assign {selectedIds.length} Devices
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ================= CONFIRM MODAL ================= */}

      {showConfirm && (
        <div className="fixed inset-0 z-[200] bg-ink/45 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-[26px] p-6 w-full max-w-[390px] shadow-2xl">

            <div className="w-12 h-12 rounded-full bg-accent flex items-center justify-center mb-4">
              <span className="text-xl font-black">
                ✓
              </span>
            </div>

            <h3 className="font-display text-[20px] font-bold text-ink">
              Confirm Assignment
            </h3>

            <p className="text-[11px] text-muted font-semibold leading-relaxed mt-2">
              Assign{" "}
              <strong className="text-ink">
                {selectedIds.length}
              </strong>{" "}
              handheld device
              {selectedIds.length > 1 ? "s" : ""} to{" "}
              <strong className="text-ink">
                {
                  employees.find(
                    (e) =>
                      e.id === selectedEmployee
                  )?.name
                }
              </strong>{" "}
              at{" "}
              <strong className="text-ink">
                {selectedShop}
              </strong>
              ?
            </p>

            <div className="bg-[#FAFAF7] rounded-xl p-3 mt-4 max-h-[120px] overflow-y-auto">
              <div className="flex flex-wrap gap-1.5">
                {selectedIds.map((id) => (
                  <span
                    key={id}
                    className="text-[9.5px] font-extrabold text-ink bg-white px-2 py-1 rounded-lg border border-ink/[0.06]"
                  >
                    {id}
                  </span>
                ))}
              </div>
            </div>

            <div className="flex gap-2.5 mt-5">
              <button
                onClick={() => setShowConfirm(false)}
                className="flex-1 py-2.5 rounded-xl bg-[#F5F5EF] text-[11px] font-bold text-ink"
              >
                Cancel
              </button>

              <button
                onClick={confirmAssign}
                className="flex-1 py-2.5 rounded-xl bg-ink text-accent text-[11px] font-extrabold"
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= SUCCESS TOAST ================= */}

      {toast && (
        <div className="fixed top-5 right-5 z-[300] bg-ink text-white rounded-[16px] shadow-xl px-4 py-3 flex items-center gap-3 animate-in slide-in-from-top-2">
          <div className="w-7 h-7 rounded-full bg-accent text-ink flex items-center justify-center text-[12px] font-black">
            ✓
          </div>

          <div>
            <p className="text-[10.5px] font-extrabold">
              Assignment completed
            </p>

            <p className="text-[9px] text-[#AAA89E] font-semibold mt-0.5">
              {toast}
            </p>
          </div>
        </div>
      )}

    </div>
  );
};

export default AssignHandheld;