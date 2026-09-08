import React, { useState, useEffect, useRef } from 'react';
import { Download, UploadCloud, Loader2 } from 'lucide-react';
import { API_BASE } from '../hooks/useActiveBatch';

// Ad-hoc counting ("Getsudo") — pick any part numbers on demand instead of
// going through the TBOS/Address-matching pipeline. No typing into this
// page: download the blank Target List template, fill in one part number
// per row, upload it back — matched against the whole-factory master file
// uploaded in Template Manager > NQC Master (this page never uploads that
// — see NqcMasterManager.jsx). Hands off to the shared AssignHandheld page
// — same as any other batch.
const GetsudoPage = () => {
  const fileInputRef = useRef(null);
  const [masterStatus, setMasterStatus] = useState(null); // { count, updatedAt, dataMonth } | null

  const [uploading, setUploading] = useState(false);
  const [createResult, setCreateResult] = useState(null);
  const [createError, setCreateError] = useState('');

  useEffect(() => {
    fetch(`${API_BASE}/api/getsudo/master-status`)
      .then((res) => (res.ok ? res.json() : null))
      .then(setMasterStatus)
      .catch((err) => console.error('Failed to load master status', err));
  }, []);

  const hasMaster = masterStatus && masterStatus.count > 0;

  const handleDownloadTemplate = () => {
    window.location.href = `${API_BASE}/api/getsudo/target-list-template`;
  };

  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploading(true);
    setCreateError('');
    setCreateResult(null);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await fetch(`${API_BASE}/api/getsudo/create-batch-from-file`, { method: 'POST', body: formData });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'สร้างรายการไม่สำเร็จ');
      setCreateResult(data);
    } catch (err) {
      setCreateError(err.message);
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

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

      {/* TARGET LIST: DOWNLOAD TEMPLATE -> FILL IN -> UPLOAD */}
      <div className="bg-white rounded-[26px] p-6 border border-ink/[0.05] shadow-[0_2px_12px_rgba(20,20,15,0.04)] max-w-3xl">
        <h2 className="font-display text-[16px] font-bold text-ink">เลือก Part ที่จะนับ</h2>
        <p className="text-[11.5px] text-muted font-semibold mt-2">
          ดาวน์โหลด template ด้านล่าง กรอก Part Number ทีละบรรทัดในคอลัมน์ "Target part list" แล้วอัปโหลดกลับมา — กี่ตัวก็ได้ ไม่ fix จำนวน
        </p>

        <div className="flex flex-wrap items-center gap-3 mt-5">
          <button
            onClick={handleDownloadTemplate}
            className="flex items-center gap-2 bg-white border border-ink/10 text-ink px-6 py-3 rounded-xl font-bold text-[11.5px] hover:border-ink/20 transition-colors"
          >
            <Download size={16} />
            ดาวน์โหลด Template
          </button>

          <button
            onClick={() => fileInputRef.current.click()}
            disabled={uploading || !hasMaster}
            className="flex items-center gap-2 bg-ink text-accent px-6 py-3 rounded-xl font-bold text-[11.5px] hover:opacity-90 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {uploading ? <Loader2 size={16} className="animate-spin" /> : <UploadCloud size={16} />}
            {uploading ? 'กำลังสร้าง...' : 'อัปโหลด Target List'}
          </button>
          <input type="file" accept=".xlsx,.xls" ref={fileInputRef} onChange={handleFileChange} className="hidden" />
        </div>
        {!hasMaster && (
          <p className="text-[10.5px] text-muted font-semibold mt-2">ต้องมีข้อมูล NQC master ก่อนถึงจะอัปโหลด Target List ได้</p>
        )}

        {createError && (
          <div className="mt-4 bg-red-50 border border-red-100 rounded-xl p-4 text-[11.5px] text-red-700 font-semibold">
            {createError}
          </div>
        )}

        {createResult && (
          <div className="mt-4 bg-accent/10 border border-accent/30 rounded-xl p-5">
            <p className="text-[13px] font-bold text-ink">
              สร้างสำเร็จ — เจอ {createResult.matchedCount} จาก {createResult.requestedCount} part ในไฟล์
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