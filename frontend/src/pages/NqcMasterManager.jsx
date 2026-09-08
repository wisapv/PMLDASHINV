import React, { useRef, useState, useEffect } from 'react';
import { FileSpreadsheet, CheckCircle2, UploadCloud, Loader2, Eye, X, AlertTriangle, Download, FileDown } from 'lucide-react';
import { API_BASE } from '../hooks/useActiveBatch';

// Refreshed monthly, not per counting session — this is reference/catalog
// data (which physical part lives where), not a "batch" like TBOS uploads
// are, so it lives here in Template Manager rather than in the Getsudo
// counting flow itself. Getsudo's Target List page just reads the status
// this page sets — it never uploads anything itself. Styled to match
// Template Manager's own FORMAT upload card (see TemplateManager.jsx).
const STALE_AFTER_DAYS = 40;

function currentMonthValue() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function formatMonth(value) {
  if (!value) return '';
  const [y, m] = value.split('-');
  return new Date(Number(y), Number(m) - 1, 1).toLocaleDateString('th-TH', { month: 'long', year: 'numeric' });
}

const NqcMasterManager = () => {
  const fileInputRef = useRef(null);
  const [status, setStatus] = useState({ count: 0, updatedAt: null, dataMonth: null });
  const [dataMonth, setDataMonth] = useState(currentMonthValue());
  const [isUploading, setIsUploading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [previewRows, setPreviewRows] = useState([]);
  const [previewLoading, setPreviewLoading] = useState(false);

  const fetchStatus = () => {
    fetch(`${API_BASE}/api/getsudo/master-status`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => data && setStatus(data))
      .catch((err) => console.error('Failed to load NQC master status', err));
  };

  useEffect(() => { fetchStatus(); }, []);

  const daysSinceUpdate = status.updatedAt
    ? Math.floor((Date.now() - new Date(status.updatedAt).getTime()) / (1000 * 60 * 60 * 24))
    : null;
  const isStale = daysSinceUpdate !== null && daysSinceUpdate > STALE_AFTER_DAYS;

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (!dataMonth) {
      setError('เลือกเดือนของข้อมูลก่อนอัปโหลด');
      e.target.value = null;
      return;
    }

    const formData = new FormData();
    formData.append('file', file);
    formData.append('dataMonth', dataMonth);

    setIsUploading(true);
    setSuccess(false);
    setError('');
    try {
      const res = await fetch(`${API_BASE}/api/getsudo/upload-master`, { method: 'POST', body: formData });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Upload failed');
      setSuccess(true);
      fetchStatus();
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      setError(err.message || 'อัปโหลดไม่สำเร็จ');
    } finally {
      setIsUploading(false);
      e.target.value = null;
    }
  };

  const handleOpenPreview = async () => {
    setPreviewLoading(true);
    setIsPreviewOpen(true);
    try {
      const res = await fetch(`${API_BASE}/api/getsudo/master-preview`);
      const result = await res.json();
      setPreviewRows(result.data || []);
    } catch (err) {
      console.error('Failed to load NQC master preview', err);
    } finally {
      setPreviewLoading(false);
    }
  };

  const previewColumns = previewRows.length > 0 ? Object.keys(previewRows[0]) : [];

  const handleDownloadTargetListTemplate = () => {
    window.location.href = `${API_BASE}/api/getsudo/target-list-template`;
  };

  return (
    <div className="flex flex-col gap-6 w-full animate-in fade-in duration-500 pb-10">
      <div className="flex flex-col">
        <h2 className="text-2xl font-bold text-dark tracking-tight">NQC Master Database</h2>
        <p className="text-sm text-gray-500">ฐานข้อมูล part ทั้งโรงงาน สำหรับ Getsudo — refresh เป็นรอบ (ปกติเดือนละครั้ง)</p>
      </div>

      <div className="bg-white rounded-[32px] border border-gray-100 p-10 max-w-3xl flex flex-col gap-6 shadow-sm">

        <div className="flex items-center justify-between p-6 bg-gray-50 rounded-2xl border border-gray-100">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-orange-50 text-primary rounded-xl flex items-center justify-center">
              <FileSpreadsheet size={24} />
            </div>
            <div className="flex flex-col">
              <h3 className="font-bold text-dark text-lg leading-tight">NQC Master (ทั้งโรงงาน)</h3>
              <p className="text-sm text-gray-500 mt-1">
                {status.count > 0
                  ? `ข้อมูลเดือน ${formatMonth(status.dataMonth)} · ${status.count.toLocaleString()} parts · อัปโหลดเมื่อ ${new Date(status.updatedAt).toLocaleString('th-TH')}`
                  : 'ยังไม่มีข้อมูล — อัปโหลดไฟล์ NQC ครั้งแรก'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleOpenPreview}
              disabled={status.count === 0}
              className="flex items-center gap-2 bg-white border border-gray-200 text-dark px-4 py-3 rounded-xl font-bold hover:border-primary hover:text-primary transition-colors disabled:opacity-50"
            >
              <Eye size={18} />
              Preview
            </button>

            <button
              onClick={() => fileInputRef.current.click()}
              disabled={isUploading}
              className="flex items-center gap-2 bg-dark text-white px-6 py-3 rounded-xl font-bold hover:bg-primary transition-colors disabled:opacity-50"
            >
              {isUploading ? <Loader2 size={18} className="animate-spin" /> : success ? <CheckCircle2 size={18} className="text-success" /> : <UploadCloud size={18} />}
              {isUploading ? 'Uploading...' : success ? 'Saved!' : 'Upload / Replace'}
            </button>
          </div>

          <input type="file" accept=".xls,.xlsx" ref={fileInputRef} onChange={handleFileUpload} className="hidden" />
        </div>

        {/* Month picker — required before an upload is accepted, since the
            file itself doesn't reliably say which month it's for. */}
        <div className="flex items-center justify-between px-1">
          <div>
            <p className="text-sm font-bold text-dark">เดือนของข้อมูลที่จะอัปโหลด</p>
            <p className="text-xs text-gray-500 mt-0.5">ระบุก่อนกด Upload — ใช้จำแนกว่าข้อมูลปัจจุบันเป็นของเดือนไหน ไม่ใช่แค่วันที่อัปโหลด</p>
          </div>
          <input
            type="month"
            value={dataMonth}
            onChange={(e) => setDataMonth(e.target.value)}
            className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-sm font-bold text-dark outline-none"
          />
        </div>

        {error && (
          <div className="bg-red-50 border border-red-100 rounded-xl px-4 py-3 text-sm text-red-700 font-semibold">
            {error}
          </div>
        )}

        {isStale && (
          <div className="flex items-start gap-2.5 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
            <AlertTriangle size={16} className="text-amber-600 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-amber-800 font-semibold">
              ข้อมูลนี้ไม่ได้อัปเดตมา {daysSinceUpdate} วันแล้ว (เกิน {STALE_AFTER_DAYS} วัน) — ควรอัปโหลดไฟล์ NQC รอบใหม่
            </p>
          </div>
        )}
      </div>

      {/* TARGET LIST TEMPLATE — the blank file admins fill in and re-upload
          on the Getsudo > Target List page. Kept here (not on the Getsudo
          page) so every downloadable template in the system lives in one
          place, same as "Main Format" above. */}
      <div className="bg-white rounded-[32px] border border-gray-100 p-10 max-w-3xl flex flex-col gap-6 shadow-sm">
        <div className="flex items-center justify-between p-6 bg-gray-50 rounded-2xl border border-gray-100">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-orange-50 text-primary rounded-xl flex items-center justify-center">
              <FileDown size={24} />
            </div>
            <div className="flex flex-col">
              <h3 className="font-bold text-dark text-lg leading-tight">Target List Template</h3>
              <p className="text-sm text-gray-500 mt-1">ไฟล์เปล่าสำหรับกรอก Part Number แล้วอัปโหลดที่หน้า Getsudo &gt; Target List</p>
            </div>
          </div>

          <button
            onClick={handleDownloadTargetListTemplate}
            className="flex items-center gap-2 bg-white border border-gray-200 text-dark px-6 py-3 rounded-xl font-bold hover:border-primary hover:text-primary transition-colors"
          >
            <Download size={18} />
            Download Template
          </button>
        </div>
      </div>

      {/* PREVIEW MODAL — same layout as Template Manager's format preview */}
      {isPreviewOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm animate-in fade-in p-6">
          <div className="bg-white rounded-[24px] p-8 w-[95%] max-w-7xl shadow-2xl animate-in zoom-in-95 relative flex flex-col max-h-[90vh]">
            <button
              onClick={() => setIsPreviewOpen(false)}
              className="absolute top-6 right-6 text-gray-400 hover:text-dark transition-colors"
            >
              <X size={24} />
            </button>

            <div className="mb-6">
              <h3 className="text-2xl font-bold text-dark mb-2">NQC Master Preview</h3>
              <p className="text-sm text-gray-500">แสดง 20 แถวแรกของข้อมูล NQC master ที่ใช้งานอยู่ตอนนี้</p>
            </div>

            <div className="overflow-auto border border-gray-200 rounded-xl flex-1 bg-white">
              {previewLoading ? (
                <div className="p-10 flex items-center justify-center text-gray-400">
                  <Loader2 size={24} className="animate-spin" />
                </div>
              ) : (
                <table className="w-full text-left text-xs whitespace-nowrap">
                  <thead>
                    <tr className="bg-gray-50">
                      {previewColumns.map((col) => (
                        <th key={col} className="px-5 py-3 border-r border-b border-gray-200 last:border-r-0 font-bold text-dark uppercase">
                          {col}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {previewRows.map((row, rowIndex) => (
                      <tr key={rowIndex} className="hover:bg-gray-50 transition-colors text-dark">
                        {previewColumns.map((col) => (
                          <td key={col} className="px-5 py-3 border-r border-gray-100 last:border-0">
                            {row[col] !== undefined && row[col] !== null ? String(row[col]) : ''}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            <div className="flex justify-end items-center gap-4 mt-8 pt-6 border-t border-gray-100">
              <button
                onClick={() => setIsPreviewOpen(false)}
                className="px-6 py-3 rounded-xl font-bold text-gray-500 hover:bg-gray-100 transition-colors"
              >
                Close Preview
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default NqcMasterManager;