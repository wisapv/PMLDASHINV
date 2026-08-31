import React, { useState, useRef, useMemo, useEffect, useCallback } from 'react';
import {
  Database, Loader2, CheckCircle2, MapPin,
  AlertCircle, AlertTriangle, GripVertical, Settings2, Download, RefreshCw
} from 'lucide-react';
import { SOCKET_EVENTS, API_BASE } from '../hooks/useActiveBatch';

const HandheldManager = ({ currentBatchId, previewData, setUploadTab, subscribeToEvent }) => {
  const [step, setStep] = useState('idle');
  const [handheldPreview, setHandheldPreview] = useState(null);
  const [addrFileUploaded, setAddrFileUploaded] = useState(false);
  const [finalHandheldData, setFinalHandheldData] = useState(null);

  const [holdData, setHoldData] = useState([]);
  const [remindData, setRemindData] = useState([]);

  const [showPicManager, setShowPicManager] = useState(false);
  const [dragOverPic, setDragOverPic] = useState(null);
  const [hasHandheldUpdate, setHasHandheldUpdate] = useState(false);
  const fileInputRef = useRef(null);

  // Parts that failed both direct and name-based Address Master matching
  // (backend Part B) still produce a real row, flagged PIC:'MANUAL' /
  // Addr:'NOT FOUND' instead of vanishing into Hold-only visibility — these
  // need a human to fill in the real PIC/Address before the file goes out.
  const [manualEdits, setManualEdits] = useState({}); // { [rowIndex]: { pic, addr } }

  const handleLoadHandheldPreview = useCallback(async () => {
    try {
      setStep('generating');
      const res = await fetch(`${API_BASE}/api/handheld/preview-handheld?batchId=${currentBatchId}`);
      const result = await res.json();
      if (res.ok) { setHandheldPreview(result.data); setHasHandheldUpdate(false); setStep('idle'); }
      else { alert("Failed to generate Handheld format"); setStep('idle'); }
    } catch(err) { alert("Server Error"); setStep('idle'); }
  }, [currentBatchId]);

  // Same-batch live updates. The base preview (a plain GET) can be safely
  // auto-refreshed, but only while the PIC Manager is closed — reassignments
  // made there are local-only (never sent to the backend, see handleDrop
  // below), so overwriting state while it's open risks silently discarding
  // work in progress. The address/PIC results (finalHandheldData) can't be
  // silently refetched at all — producing them requires re-uploading the
  // address file, there is no GET for "the last result" — so those cases
  // just surface a non-blocking banner instead of an automatic overwrite.
  useEffect(() => {
    const unsubscribe = subscribeToEvent(SOCKET_EVENTS.HANDHELD_UPDATED, (payload) => {
      if (payload.batchId !== currentBatchId) return;
      if (showPicManager) { setHasHandheldUpdate(true); return; }
      if (handheldPreview) { handleLoadHandheldPreview(); return; }
      setHasHandheldUpdate(true);
    });
    return unsubscribe;
  }, [currentBatchId, showPicManager, handheldPreview, subscribeToEvent, handleLoadHandheldPreview]);

  const handleUploadAddr = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const formData = new FormData();
    formData.append('file', file);
    formData.append('batchId', currentBatchId);

    try {
        setStep('generating');
        const res = await fetch(`${API_BASE}/api/handheld-assign/process-assign-addr`, { method: 'POST', body: formData });
        const result = await res.json();
        if (result.success) {
            setFinalHandheldData(result.data);
            setHoldData(result.hold);
            setRemindData(result.remind);
            setAddrFileUploaded(true);
            setHasHandheldUpdate(false);
            setStep('idle');
        } else { alert("Process Failed"); setStep('idle'); }
    } catch (err) { alert("Upload Failed"); setStep('idle'); }
    e.target.value = null;
  };

  const handleDownloadExcel = async () => {
    if (!finalHandheldData || finalHandheldData.length === 0) return;
    // Defense in depth alongside the disabled button below — this is the
    // export/finalize action Part C's popup gates: unresolved MANUAL rows
    // (backend Part B's catch-all for parts that failed all Address Master
    // matching) must be resolved before the file goes out to the field.
    if (finalHandheldData.some((row) => row.PIC === 'MANUAL')) return;

    try {
      const response = await fetch(`${API_BASE}/api/handheld-assign/export-excel`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          data: finalHandheldData,
          fileName: `Handheld_Format_${currentBatchId}`
        })
      });

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `Handheld_Format_${currentBatchId}.xlsx`;
        document.body.appendChild(a);
        a.click();
        a.remove();
      } else {
        alert("Download Failed: Server responded with an error.");
      }
    } catch (err) {
      console.error(err);
      alert("Error connecting to server");
    }
  };

  const picGroups = useMemo(() => {
    if (!finalHandheldData) return {};
    const groups = {};
    finalHandheldData.forEach(row => {
        const pic = row.PIC || 'Unassigned';
        const shortAddr = row.ShortAddr || 'Unk';

        if (!groups[pic]) groups[pic] = {};
        if (!groups[pic][shortAddr]) groups[pic][shortAddr] = 0;
        groups[pic][shortAddr]++;
    });
    return groups;
  }, [finalHandheldData]);

  const handleDragStart = (e, shortAddr, sourcePic) => {
    e.dataTransfer.setData('application/json', JSON.stringify({ shortAddr, sourcePic }));
  };

  const handleDragOver = (e, pic) => {
    e.preventDefault();
    if (dragOverPic !== pic) setDragOverPic(pic);
  };

  const handleDragLeave = () => {
    setDragOverPic(null);
  };

  const handleDrop = (e, targetPic) => {
    e.preventDefault();
    setDragOverPic(null);
    const dataStr = e.dataTransfer.getData('application/json');
    if (!dataStr) return;

    try {
      const { shortAddr, sourcePic } = JSON.parse(dataStr);
      setFinalHandheldData(prev => prev.map(row =>
        (row.ShortAddr === shortAddr && row.PIC === sourcePic) ? { ...row, PIC: targetPic } : row
      ));
    } catch (err) { console.error(err); }
  };

  // Identified by array index into finalHandheldData rather than any row
  // field, since PIC/Addr are exactly what's being edited and can't double
  // as a stable key. Recomputed whenever finalHandheldData changes (a fresh
  // address-file upload, or the popup's own confirm below).
  const manualRowIndices = useMemo(() => {
    if (!finalHandheldData) return [];
    return finalHandheldData.reduce((acc, row, idx) => {
      if (row.PIC === 'MANUAL') acc.push(idx);
      return acc;
    }, []);
  }, [finalHandheldData]);

  // Derived, not stored state: pops open automatically whenever unresolved
  // MANUAL rows exist for the loaded data (a fresh upload, or this batch's
  // data already being in memory from earlier in the session) — no separate
  // button opens it, and there's no close/dismiss control on the modal
  // itself (see below), so it stays up until every row is resolved.
  const showManualResolveModal = manualRowIndices.length > 0;

  const handleManualEditChange = (idx, field, value) => {
    // Always keep both keys present — editing just one field (e.g. PIC
    // first, before Address) must never leave the other as undefined, or
    // the .trim() checks below throw.
    setManualEdits((prev) => ({ ...prev, [idx]: { pic: '', addr: '', ...prev[idx], [field]: value } }));
  };

  const isManualResolutionComplete = manualRowIndices.length > 0 && manualRowIndices.every((idx) => {
    const edit = manualEdits[idx];
    return !!edit && (edit.pic || '').trim() !== '' && (edit.addr || '').trim() !== '';
  });

  // Same persistence pattern as the PIC Manager drag-and-drop reassignment
  // above (handleDrop): local state only, no backend round-trip — there's
  // no server endpoint for "manual corrections" and this app doesn't have
  // one for PIC reassignment either, so this follows the existing
  // convention rather than inventing a new mechanism.
  const handleConfirmManualResolve = () => {
    if (!isManualResolutionComplete) return;
    setFinalHandheldData((prev) => prev.map((row, idx) => {
      const edit = manualEdits[idx];
      if (!edit) return row;
      return { ...row, PIC: edit.pic.trim(), Addr: edit.addr.trim() };
    }));
    // No MANUAL rows left after this, so manualRowIndices recomputes empty
    // and showManualResolveModal closes on its own (it's derived, not
    // separately-tracked state) — just clear the now-stale edit buffers.
    setManualEdits({});
  };

  if (!previewData || previewData.length === 0) {
    return (
      <div className="bg-white border-2 border-dashed border-red-200 rounded-4xl p-20 flex flex-col items-center justify-center text-center animate-in fade-in">
        <AlertCircle size={56} className="text-red-400 mb-4" />
        <h3 className="font-display text-2xl font-bold text-ink mb-2">No Base Data Found</h3>
        <p className="text-muted mb-6 max-w-md">You must generate or select a previous batch from the TBOS section before proceeding.</p>
        <button onClick={() => setUploadTab && setUploadTab('TBOS')} className="bg-ink text-accent px-8 py-3 rounded-xl font-bold hover:opacity-90 transition-colors">Back to TBOS</button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8 w-full animate-in fade-in pb-10">

      {hasHandheldUpdate && (
        <div className="bg-accent/10 border border-accent/30 rounded-2xl px-6 py-3 flex items-center justify-between gap-4 animate-in fade-in">
          <span className="text-sm font-bold text-ink">Handheld data for this batch was updated by another user.</span>
          <button onClick={handleLoadHandheldPreview} className="bg-ink text-accent px-4 py-2 rounded-xl font-bold text-sm hover:opacity-90 transition-colors flex items-center gap-2 whitespace-nowrap">
            <RefreshCw size={14} /> Refresh Base Preview
          </button>
        </div>
      )}

      {/* 1. Base Data Preview */}
      <div className="bg-white border border-ink/5 shadow-[0_2px_12px_rgba(20,20,15,0.04)] rounded-4xl p-10 flex flex-col">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h2 className="font-display text-2xl font-bold text-ink mb-2">1. Handheld Base Preview</h2>
            <p className="text-sm text-muted">Using Raw Data from Batch: <span className="font-mono text-ink font-bold px-2 py-1 bg-accent/20 rounded-md">{currentBatchId}</span></p>
          </div>
          <button onClick={handleLoadHandheldPreview} className="bg-ink text-accent px-6 py-3 rounded-xl font-bold hover:scale-105 transition-all shadow-md flex items-center gap-2">
            {step === 'generating' && !addrFileUploaded ? <Loader2 size={18} className="animate-spin" /> : <Database size={18} />} Generate Base Format
          </button>
        </div>

        {handheldPreview ? (
          <div className="overflow-x-auto border border-ink/10 rounded-2xl max-h-[400px]">
            <table className="w-full text-left text-xs whitespace-nowrap relative border-collapse">
              {/* 🔴 แก้ไข: หัวตาราง 1 พื้นหลังดำ ตัวหนังสือขาว */}
              <thead className="bg-ink sticky top-0 z-10 shadow-md">
                <tr className="text-white/80 uppercase tracking-wider">
                  <th className="px-4 py-3 text-accent">Shop</th>
                  <th className="px-4 py-3">Dock</th>
                  <th className="px-4 py-3">Supplier</th>
                  <th className="px-4 py-3">S.plant</th>
                  <th className="px-4 py-3">S.dock</th>
                  <th className="px-4 py-3">Part no.</th>
                  <th className="px-4 py-3">Part name</th>
                  <th className="px-4 py-3">kbn</th>
                  <th className="px-4 py-3">Q'ty</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ink/5">
                {handheldPreview.slice(0, 50).map((r, i) => (
                  <tr key={i} className="hover:bg-accent/10 transition-colors">
                    <td className="px-4 py-3 font-bold text-ink">{r['Shop']}</td>
                    <td className="px-4 py-3 text-ink">{r['Dock']}</td>
                    <td className="px-4 py-3 text-ink">{r['Supplier']}</td>
                    <td className="px-4 py-3 text-ink">{r['S.plant']}</td>
                    <td className="px-4 py-3 text-ink">{r['S.dock']}</td>
                    <td className="px-4 py-3 text-ink">{r['Part no.']}</td>
                    <td className="px-4 py-3 truncate max-w-[150px] text-ink">{r['Part name']}</td>
                    <td className="px-4 py-3 text-ink">{r['kbn']}</td>
                    <td className="px-4 py-3 text-ink">{r['Q\'ty']}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="w-full bg-[#FAFAF7] rounded-2xl p-20 flex flex-col items-center justify-center border-2 border-dashed border-ink/10 text-muted">
            <p>Click the button above to generate the Base format.</p>
          </div>
        )}
      </div>

      {/* 2. Addr Upload & Final Result */}
      {handheldPreview && (
        <div className="bg-white border border-ink/5 shadow-[0_2px_12px_rgba(20,20,15,0.04)] rounded-4xl p-10 flex flex-col animate-in fade-in slide-in-from-bottom-4">
          <div className="flex flex-col gap-2 mb-8">
            <h2 className="font-display text-2xl font-bold text-ink tracking-tight">2. Address Assignment & PIC Setup</h2>
            <p className="text-sm text-muted">Upload <span className="font-bold text-ink">Part addr.xls</span> to assign Address and PIC.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full mb-8">
            <div onClick={() => fileInputRef.current.click()} className={`bg-white border-2 border-dashed rounded-4xl p-10 flex flex-col items-center justify-center gap-3 cursor-pointer transition-all ${addrFileUploaded ? 'border-success bg-green-50/30' : 'border-ink/10 hover:border-ink/40'}`}>
              <div className={`w-14 h-14 rounded-full flex items-center justify-center ${addrFileUploaded ? 'bg-success text-white shadow-md shadow-success/30' : 'bg-accent/20 text-ink'}`}>
                {addrFileUploaded ? <CheckCircle2 size={28} /> : <MapPin size={28} />}
              </div>
              <div className="text-center">
                <h3 className={`font-bold ${addrFileUploaded ? 'text-success' : 'text-ink'}`}>Part addr.xls</h3>
                <p className="text-[10px] text-muted">{addrFileUploaded ? 'Data Assigned Successfully' : 'Click to upload Excel'}</p>
              </div>
            </div>
            <input type="file" accept=".xls,.xlsx" ref={fileInputRef} onChange={handleUploadAddr} className="hidden" />
          </div>

          {finalHandheldData && (
            <div className="flex flex-col gap-8 mt-4">

              <div className="flex justify-between items-center bg-[#FAFAF7] border border-ink/10 px-6 py-4 rounded-2xl">
                <div>
                  <h3 className="font-bold text-ink">PIC & Data Management</h3>
                  <p className="text-xs text-muted">Manage assignments and export your final handheld configuration.</p>
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={handleDownloadExcel}
                    disabled={manualRowIndices.length > 0}
                    title={manualRowIndices.length > 0 ? 'Resolve all MANUAL rows before downloading' : undefined}
                    className={`border-2 px-5 py-2.5 rounded-xl font-bold text-sm transition-all flex items-center gap-2 ${manualRowIndices.length > 0 ? 'bg-ink/5 border-ink/10 text-ink/30 cursor-not-allowed' : 'bg-white border-ink text-ink hover:bg-accent/10'}`}
                  >
                    <Download size={16} />
                    Download Excel
                  </button>
                  <button
                    onClick={() => setShowPicManager(!showPicManager)}
                    className={`px-5 py-2.5 rounded-xl font-bold text-sm transition-all flex items-center gap-2 ${showPicManager ? 'bg-ink text-accent' : 'bg-white border-2 border-ink/10 text-ink hover:border-ink/40'}`}
                  >
                    <Settings2 size={16} />
                    {showPicManager ? 'Close PIC Manager' : 'Reassign PIC'}
                  </button>
                </div>
              </div>

              {showPicManager && (
                <div className="bg-white p-6 rounded-2xl border border-ink/5 shadow-[0_2px_12px_rgba(20,20,15,0.04)] animate-in zoom-in-95">
                  <h3 className="font-bold text-ink mb-4 flex items-center gap-2"><GripVertical size={20} className="text-accent"/> Drag & Drop Address Groups</h3>
                  <div className="flex gap-4 overflow-x-auto p-2 snap-x">
                    {Object.entries(picGroups).map(([pic, addrMap]) => (
                      <div
                        key={pic}
                        onDragOver={(e) => handleDragOver(e, pic)}
                        onDragLeave={handleDragLeave}
                        onDrop={(e) => handleDrop(e, pic)}
                        className={`min-w-[200px] bg-[#FAFAF7] rounded-xl p-4 shadow-sm border-2 transition-all snap-start
                          ${dragOverPic === pic ? 'border-accent bg-accent/10 scale-105' : 'border-transparent'}`}
                      >
                        <div className="flex justify-center items-center mb-4 py-2 rounded-xl bg-accent shadow-lg">
                          {/* Roughly matches the item boxes' text-sm below it — was text-xl, badly out of proportion with the rest of the card. */}
                          <h4 className="font-bold text-ink text-sm">{pic}</h4>
                        </div>

                        <div className="flex flex-col gap-2 max-h-[250px] overflow-y-auto p-1">
                          {Object.entries(addrMap).map(([shortAddr, count]) => (
                            <div
                              key={shortAddr}
                              draggable
                              onDragStart={(e) => handleDragStart(e, shortAddr, pic)}
                              className="bg-ink rounded-2xl p-2.5 flex justify-between items-center cursor-grab active:cursor-grabbing hover:ring-2 hover:ring-accent transition-all group shadow-sm"
                            >
                              <span className="font-mono text-sm font-bold text-white">{shortAddr}</span>
                              <span className="text-[10px] bg-white/10 px-2 py-0.5 rounded-full text-white/70 font-bold">{count} items</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="overflow-x-auto border border-ink/10 rounded-2xl animate-in fade-in">
                <div className="px-6 py-4 bg-ink border-b border-ink/10 flex justify-between items-center">
                  <h3 className="font-bold text-white">Final Handheld Format Preview</h3>
                  <span className="text-xs font-bold bg-accent text-ink px-3 py-1 rounded-full shadow-sm">Total: {finalHandheldData.length} Rows</span>
                </div>
                <div className="max-h-[400px] overflow-y-auto">
                  <table className="w-full text-left text-xs whitespace-nowrap">
                    {/* 🔴 แก้ไข: หัวตาราง 2 พื้นหลังดำ ตัวหนังสือขาว และปรับสี Address/PIC ให้สว่างขึ้น */}
                    <thead className="bg-[#FAFAF7] sticky top-0 ">
                      <tr className="text-ink font-bold uppercase">
                        <th className="px-4 py-3">Shop</th>
                        <th className="px-4 py-3">Dock</th>
                        <th className="px-4 py-3">Supplier</th>
                        <th className="px-4 py-3">Part no.</th>
                        <th className="px-4 py-3">Part name</th>
                        <th className="px-4 py-3">Address</th>
                        <th className="px-4 py-3">PIC</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-ink/10">
                      {finalHandheldData.slice(0, 100).map((r, i) => (
                        <tr key={i} className={`transition-colors ${r.PIC === 'MANUAL' ? 'bg-orange-50 hover:bg-orange-100/70' : 'hover:bg-[#FAFAF7]'}`}>
                          <td className="px-4 py-3 font-bold bg-[#FAFAF7]/50 text-ink">{r.Shop}</td>
                          <td className="px-4 py-3 text-ink">{r.Dock}</td>
                          <td className="px-4 py-3 text-ink">{r.Supplier}</td>
                          <td className="px-4 py-3 text-ink">{r['Part no.']}</td>
                          <td className="px-4 py-3 truncate max-w-[150px] text-ink">{r['Part name']}</td>
                          <td className={`px-4 py-3 font-medium ${r.PIC === 'MANUAL' ? 'text-orange-600 font-bold' : 'text-blue-700 bg-blue-50/20'}`}>{r.Addr}</td>
                          <td className="px-4 py-3 font-bold text-ink">
                            <span className={`inline-flex items-center justify-center px-2.5 py-1 rounded-full text-xs font-bold shadow-sm ${r.PIC === 'MANUAL' ? 'bg-orange-500 text-white' : 'bg-accent text-ink'}`}>{r.PIC}</span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {(remindData.length > 0 || holdData.length > 0) && (
                <div className="flex gap-6">
                  {remindData.length > 0 && (
                    <div className="flex-1 bg-red-50/50 border border-red-100 rounded-2xl p-6">
                      <div className="flex items-center gap-2 text-red-600 mb-4">
                        <AlertTriangle size={20} />
                        <h3 className="font-bold">Missing in Part Procure (Remind)</h3>
                        <span className="ml-auto text-xs font-bold bg-red-100 px-2 py-1 rounded-md">{remindData.length} items</span>
                      </div>
                      <div className="max-h-[200px] overflow-y-auto border border-red-100 rounded-lg bg-white">
                        <table className="w-full text-left text-[10px] whitespace-nowrap">
                          <thead className="bg-red-50 sticky top-0"><tr className="text-red-500 uppercase"><th className="px-3 py-2">Dock</th><th className="px-3 py-2">Supplier</th><th className="px-3 py-2">Part No</th><th className="px-3 py-2">Source</th></tr></thead>
                          <tbody className="divide-y divide-red-50">
                            {remindData.map((r, i) => (
                              <tr key={i} className="hover:bg-red-50/30">
                                <td className="px-3 py-2 font-medium">{r['Dock IH']}</td><td className="px-3 py-2">{r.Supplier}</td><td className="px-3 py-2">{r['Part No']}</td><td className="px-3 py-2">{r.Source}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {holdData.length > 0 && (
                    <div className="flex-1 bg-orange-50/50 border border-orange-100 rounded-2xl p-6">
                      <div className="flex items-center gap-2 text-orange-600 mb-4">
                        <AlertTriangle size={20} />
                        <h3 className="font-bold">Missing in Address Master (Hold)</h3>
                        <span className="ml-auto text-xs font-bold bg-orange-100 px-2 py-1 rounded-md">{holdData.length} items</span>
                      </div>
                      <div className="max-h-[200px] overflow-y-auto border border-orange-100 rounded-lg bg-white">
                        <table className="w-full text-left text-[10px] whitespace-nowrap">
                          <thead className="bg-orange-50 sticky top-0"><tr className="text-orange-500 uppercase"><th className="px-3 py-2">Dock</th><th className="px-3 py-2">Part No</th><th className="px-3 py-2">Part Name</th></tr></thead>
                          <tbody className="divide-y divide-orange-50">
                            {holdData.map((r, i) => (
                              <tr key={i} className="hover:bg-orange-50/30">
                                <td className="px-3 py-2 font-medium">{r.Dock}</td><td className="px-3 py-2">{r['Part No']}</td><td className="px-3 py-2 truncate max-w-[150px]">{r['Part Name']}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Blocking: no close/X button and no backdrop-dismiss handler, unlike
          every other modal in this app — deliberately cannot be dismissed
          without resolving every MANUAL row (Part C). */}
      {showManualResolveModal && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center bg-black/50 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-4xl p-8 w-[640px] max-w-[92vw] shadow-2xl animate-in zoom-in-95">
            <div className="flex items-center gap-2 text-orange-600 mb-2">
              <AlertTriangle size={24} />
              <h3 className="font-display text-xl font-bold text-ink">Resolve Unmatched Parts</h3>
            </div>
            <p className="text-sm text-muted mb-6">
              {manualRowIndices.length} part{manualRowIndices.length === 1 ? '' : 's'} could not be matched in Address Master (marked <span className="font-mono font-bold text-orange-600">MANUAL</span> / <span className="font-mono font-bold text-orange-600">NOT FOUND</span>). Enter the correct PIC and Address for each below — Download Excel stays disabled until every row is filled in.
            </p>

            <div className="flex flex-col gap-3 max-h-[360px] overflow-y-auto pr-2 mb-6">
              {manualRowIndices.map((idx) => {
                const row = finalHandheldData[idx];
                const edit = manualEdits[idx] || { pic: '', addr: '' };
                return (
                  <div key={idx} className="border border-orange-100 bg-orange-50/40 rounded-2xl p-4 flex flex-col gap-3">
                    <div className="text-xs text-muted">
                      <span className="font-mono font-bold text-ink">{row['Part no.']}</span> — {row['Part name']} <span className="text-muted/70">(Dock: {row.Dock})</span>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="flex flex-col gap-1">
                        <label className="text-[11px] font-bold text-muted uppercase">PIC</label>
                        <input
                          type="text"
                          value={edit.pic}
                          onChange={(e) => handleManualEditChange(idx, 'pic', e.target.value)}
                          placeholder="e.g. A"
                          className="bg-white border border-ink/10 rounded-xl px-3 py-2 text-sm font-mono text-ink focus:outline-none focus:ring-2 focus:ring-accent/40"
                        />
                      </div>
                      <div className="flex flex-col gap-1">
                        <label className="text-[11px] font-bold text-muted uppercase">Address</label>
                        <input
                          type="text"
                          value={edit.addr}
                          onChange={(e) => handleManualEditChange(idx, 'addr', e.target.value)}
                          placeholder="e.g. WH01"
                          className="bg-white border border-ink/10 rounded-xl px-3 py-2 text-sm font-mono text-ink focus:outline-none focus:ring-2 focus:ring-accent/40"
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="flex justify-end">
              <button
                onClick={handleConfirmManualResolve}
                disabled={!isManualResolutionComplete}
                className={`px-6 py-2.5 rounded-xl font-bold transition-all shadow-md ${isManualResolutionComplete ? 'bg-ink text-accent hover:scale-105' : 'bg-ink/10 text-ink/30 cursor-not-allowed shadow-none'}`}
              >
                Confirm & Continue
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default HandheldManager;
