import React, { useState, useEffect } from 'react';
import { API_BASE } from '../hooks/useActiveBatch';

// Ad-hoc counting ("Getsudo") — pick any part numbers on demand instead of
// going through the TBOS/Address-matching pipeline. Matches against the
// whole-factory master file uploaded in Template Manager > NQC Master
// (this page never uploads it — see NqcMasterManager.jsx), then hands off
// to the shared AssignHandheld page — same as any other batch.
const GetsudoPage = () => {
  const [masterStatus, setMasterStatus] = useState(null); // { count, updatedAt } | null

  const [partNumbersText, setPartNumbersText] = useState('');
  const [creating, setCreating] = useState(false);
  const [createResult, setCreateResult] = useState(null);
  const [createError, setCreateError] = useState('');

  useEffect(() => {
    fetch(`${API_BASE}/api/getsudo/master-status`)
      .then((res) => (res.ok ? res.json() : null))
      .then(setMasterStatus)
      .catch((err) => console.error('Failed to load master status', err));
  }, []);

  const handleCreateBatch = async () => {
    const partNumbers = partNumbersText
      .split(/[\n,]+/)
      .map((s) => s.trim())
      .filter(Boolean);
    if (partNumbers.length === 0) return;

    setCreating(true);
    setCreateError('');
    setCreateResult(null);
    try {
      const res = await fetch(`${API_BASE}/api/getsudo/create-batch`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ partNumbers }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'สร้างรายการไม่สำเร็จ');
      setCreateResult(data);
    } catch (err) {
      setCreateError(err.message);
    } finally {
      setCreating(false);
    }
  };

  const hasMaster = masterStatus && masterStatus.count > 0;

  return (
    <div className="w-full flex flex-col gap-6 pb-16">
      {/* HEADER */}
      <div>
        <p className="text-xs text-muted font-semibold">Getsudo</p>
        <h1 className="font-display text-[26px] font-bold text-ink leading-none mt-1">Target List</h1>
        <p className="text-[11.5px] text-muted font-semibold mt-2">
          นับแบบยืดหยุ่นตามความจำเป็น — เลือก Part Number เองจากฐานข้อมูลทั้งโรงงาน ไม่ต้องผ่าน TBOS
        </p>
      </div>

      {/* MASTER FILE STATUS (read-only — upload happens in Template Manager) */}
      <div className="bg-white rounded-[18px] border border-ink/[0.05] px-5 py-3.5 flex items-center justify-between">
        <p className="text-[11px] text-muted font-semibold">
          {hasMaster
            ? `NQC master: ข้อมูลเดือน ${masterStatus.dataMonth || '-'} · ${masterStatus.count.toLocaleString()} parts พร้อมใช้`
            : 'ยังไม่มีข้อมูล NQC master — ไปอัปโหลดที่ Template Manager ก่อน'}
        </p>
      </div>

      {/* PICK PART NUMBERS */}
      <div className="bg-white rounded-[26px] p-6 border border-ink/[0.05] shadow-[0_2px_12px_rgba(20,20,15,0.04)]">
        <h2 className="font-display text-[16px] font-bold text-ink">เลือก Part ที่จะนับ</h2>
        <p className="text-[11.5px] text-muted font-semibold mt-2">
          พิมพ์หรือวาง Part Number ทีละบรรทัด (หรือคั่นด้วยคอมม่า) กี่ตัวก็ได้ — ไม่ fix จำนวน
        </p>

        <textarea
          value={partNumbersText}
          onChange={(e) => setPartNumbersText(e.target.value)}
          placeholder={'75896-YY120-00\n75896-YY120-01\n...'}
          rows={8}
          disabled={!hasMaster}
          className="w-full mt-4 bg-[#FAFAF7] border border-ink/[0.08] rounded-xl px-4 py-3 text-[12px] font-mono text-ink outline-none resize-y focus:border-ink/20 disabled:opacity-50"
        />

        <button
          onClick={handleCreateBatch}
          disabled={creating || !hasMaster || partNumbersText.trim() === ''}
          className="mt-4 bg-ink text-accent px-7 py-3 rounded-xl font-bold text-[11.5px] hover:opacity-90 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {creating ? 'กำลังสร้าง...' : 'สร้างรายการนับ'}
        </button>

        {createError && (
          <div className="mt-4 bg-red-50 border border-red-100 rounded-xl p-4 text-[11.5px] text-red-700 font-semibold">
            {createError}
          </div>
        )}

        {createResult && (
          <div className="mt-4 bg-accent/10 border border-accent/30 rounded-xl p-5">
            <p className="text-[13px] font-bold text-ink">
              สร้างสำเร็จ — เจอ {createResult.matchedCount} จาก {createResult.requestedCount} part ที่พิมพ์มา
            </p>
            <p className="text-[11px] text-muted font-semibold mt-1">
              Batch ID: <span className="font-mono text-ink">{createResult.batchId}</span>
            </p>
            {createResult.notFound && createResult.notFound.length > 0 && (
              <div className="mt-3">
                <p className="text-[11px] font-bold text-red-600">ไม่พบ {createResult.notFound.length} ตัว:</p>
                <p className="text-[11px] text-muted font-mono mt-1 break-words">{createResult.notFound.join(', ')}</p>
              </div>
            )}
            <p className="text-[11px] text-muted font-semibold mt-3">
              ไปที่แท็บ "Assign" ด้านบน แล้วเลือก batch นี้จาก dropdown เพื่อแบ่งงานเข้าเครื่อง handheld
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default GetsudoPage;