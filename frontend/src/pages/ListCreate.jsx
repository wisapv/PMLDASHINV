import React, { useState, useEffect, useRef } from 'react';
import { 
  CheckCircle2, FileSpreadsheet, Database, Loader2, Download, 
  ChevronDown, X, CheckSquare, Square, Merge 
} from 'lucide-react';

const ListCreate = ({ activeTab }) => {
  // รีเซ็ตหน้าจอเมื่อเปลี่ยน Tab (TBOS / Handheld)
  useEffect(() => { 
    if (activeTab === 'TBOS') {
      setStep('idle');
      setUploadStatus({ target: false, proc: false });
    }
  }, [activeTab]);

  // --- States ---
  const [step, setStep] = useState('idle'); // idle, generating, preview
  const [uploadStatus, setUploadStatus] = useState({ target: false, proc: false });
  const [previewData, setPreviewData] = useState([]);
  
  // States สำหรับ Modal Download
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [downloadFiles, setDownloadFiles] = useState([
    { id: 'f1', label: 'Main Part List Format (Excel)', isChecked: true },
    { id: 'f2', label: 'Master Address (Excel)', isChecked: false } // เผื่ออนาคต
  ]);

  // Refs สำหรับซ่อน Input รับไฟล์
  const fileInputRef1 = useRef(null);
  const fileInputRef2 = useRef(null);

  // --- Handlers ---

  // 1. อัพโหลดไฟล์ Target R/O
  const handleFileChangeBox1 = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const formData = new FormData();
    formData.append('file', file);
    
    try {
      setStep('generating');
      const response = await fetch('http://localhost:3000/api/part-list/target-ro', { 
        method: 'POST', 
        body: formData 
      });
      if (response.ok) {
        setUploadStatus(prev => ({ ...prev, target: true }));
        setStep('idle'); 
      } else {
        alert("Upload Target R/O Failed!");
        setStep('idle');
      }
    } catch (err) { 
      alert("Server Error! (ตรวจสอบว่ารัน node server.js หรือยัง)"); 
      setStep('idle'); 
    }
    e.target.value = null; // เคลียร์ค่า
  };

  // 2. อัพโหลดไฟล์ Part Procurement
  const handleFileChangeBox2 = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const formData = new FormData();
    formData.append('file', file);
    
    try {
      setStep('generating');
      const response = await fetch('http://localhost:3000/api/part-list/part-procurement', { 
        method: 'POST', 
        body: formData 
      });
      if (response.ok) {
        setUploadStatus(prev => ({ ...prev, proc: true }));
        setStep('idle'); 
      } else {
        alert("Upload Part Procurement Failed!");
        setStep('idle');
      }
    } catch (err) { 
      alert("Server Error! (ตรวจสอบว่ารัน node server.js หรือยัง)"); 
      setStep('idle'); 
    }
    e.target.value = null; // เคลียร์ค่า
  };

  // 3. กดปุ่ม Merge ดึงข้อมูลที่ Join แล้วมาแสดง Preview
  const handleMergeData = async () => {
    try {
      setStep('generating');
      const response = await fetch('http://localhost:3000/api/part-list/merge');
      const result = await response.json();
      
      if (response.ok) {
        setPreviewData(result.data);
        setStep('preview');
      } else {
        alert("Merge Failed!");
        setStep('idle');
      }
    } catch (error) {
      alert("Server Error during merge!");
      setStep('idle');
    }
  };

  // --- Modal Handlers ---
  const handleToggleFile = (id) => {
    setDownloadFiles(prev => prev.map(f => f.id === id ? { ...f, isChecked: !f.isChecked } : f));
  };
  
  const isAllChecked = downloadFiles.every(f => f.isChecked);
  
  const handleToggleAll = () => {
    const newState = !isAllChecked;
    setDownloadFiles(prev => prev.map(f => ({ ...f, isChecked: newState })));
  };

  // 4. กดปุ่มยืนยันดาวน์โหลด
  const handleConfirmDownload = async () => {
    // เช็คว่าผู้ใช้ติ๊กเลือก Main Part List หรือเปล่า
    const isMainSelected = downloadFiles.some(f => f.id === 'f1' && f.isChecked);
    
    if (isMainSelected) {
      // สั่งให้ Browser ดาวน์โหลดไฟล์จาก Backend
      window.location.href = 'http://localhost:3000/api/part-list/download-main';
    } else {
      alert("Please select 'Main Part List Format' to download.");
    }
    
    setIsModalOpen(false);
  };

  // เตรียม Header ตาราง (ดึงคอลัมน์แรกๆ มาโชว์ 6 คอลัมน์)
  const tableHeaders = previewData.length > 0 ? Object.keys(previewData[0]).slice(0, 6) : [];

  return (
    <div className="flex flex-col gap-6 w-full animate-in fade-in duration-500 pb-10">
      
      {activeTab === 'TBOS' ? (
        <div className="flex flex-col gap-8">
          
          {/* Header Texts */}
          <div className="flex flex-col">
            <h2 className="text-2xl font-bold text-dark tracking-tight">Generate Part List (TBOS)</h2>
            <p className="text-sm text-gray-500">Upload Target R/O and Procurement to Merge Data.</p>
          </div>

          {/* ================= UPLOAD SECTION ================= */}
          {(step === 'idle' || step === 'generating') && (
            <div className="flex flex-col items-center gap-8">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 w-full">
                
                {/* Box 1: Target R/O */}
                <div 
                  onClick={() => fileInputRef1.current.click()} 
                  className={`bg-white border-2 border-dashed rounded-[32px] p-10 flex flex-col items-center justify-center gap-3 cursor-pointer transition-all ${uploadStatus.target ? 'border-success bg-green-50/30' : 'hover:border-primary'}`}
                >
                  <div className={`w-14 h-14 rounded-full flex items-center justify-center ${uploadStatus.target ? 'bg-success text-white shadow-md shadow-success/30' : 'bg-orange-50 text-primary'}`}>
                    {uploadStatus.target ? <CheckCircle2 size={28} /> : <FileSpreadsheet size={28} />}
                  </div>
                  <div className="text-center">
                    <h3 className={`font-bold ${uploadStatus.target ? 'text-success' : 'text-dark'}`}>1. Target R/O</h3>
                    <p className="text-[10px] text-gray-400">{uploadStatus.target ? 'Saved to Database' : 'Click to upload Excel'}</p>
                  </div>
                </div>
                <input type="file" accept=".xls,.xlsx" ref={fileInputRef1} onChange={handleFileChangeBox1} className="hidden" />

                {/* Box 2: Part Procurement */}
                <div 
                  onClick={() => fileInputRef2.current.click()} 
                  className={`bg-white border-2 border-dashed rounded-[32px] p-10 flex flex-col items-center justify-center gap-3 cursor-pointer transition-all ${uploadStatus.proc ? 'border-success bg-green-50/30' : 'hover:border-primary'}`}
                >
                  <div className={`w-14 h-14 rounded-full flex items-center justify-center ${uploadStatus.proc ? 'bg-success text-white shadow-md shadow-success/30' : 'bg-orange-50 text-primary'}`}>
                    {uploadStatus.proc ? <CheckCircle2 size={28} /> : <Database size={28} />}
                  </div>
                  <div className="text-center">
                    <h3 className={`font-bold ${uploadStatus.proc ? 'text-success' : 'text-dark'}`}>2. Part Procurement</h3>
                    <p className="text-[10px] text-gray-400">{uploadStatus.proc ? 'Saved to Database' : 'Click to upload Excel'}</p>
                  </div>
                </div>
                <input type="file" accept=".xls,.xlsx" ref={fileInputRef2} onChange={handleFileChangeBox2} className="hidden" />
              </div>

              {/* ปุ่ม Merge จะโผล่มาเมื่ออัพโหลดครบ 2 ไฟล์ */}
              {uploadStatus.target && uploadStatus.proc && step !== 'generating' && (
                <button 
                  onClick={handleMergeData} 
                  className="bg-dark text-white px-10 py-4 rounded-full font-bold shadow-xl shadow-dark/20 hover:bg-primary transition-all flex items-center gap-2 animate-in zoom-in"
                >
                  <Merge size={20} /> Merge & Generate Preview
                </button>
              )}
              
              {step === 'generating' && (
                <div className="flex flex-col items-center gap-2 text-primary mt-4 animate-in fade-in">
                  <Loader2 size={32} className="animate-spin" />
                  <p className="font-bold text-sm">Processing Data...</p>
                </div>
              )}
            </div>
          )}

          {/* ================= PREVIEW SECTION ================= */}
          {step === 'preview' && (
            <div className="bg-white rounded-[24px] shadow-sm border border-gray-100 overflow-hidden animate-in fade-in slide-in-from-bottom-4">
              
              <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                <h3 className="font-bold text-dark">Merged Data Preview ({previewData.length} matches)</h3>
                <button 
                  onClick={() => { 
                    setStep('idle'); 
                    setUploadStatus({target:false, proc:false}); 
                    setPreviewData([]);
                  }} 
                  className="text-xs bg-gray-200 px-4 py-2 rounded-full font-bold text-dark hover:bg-gray-300 transition-colors"
                >
                  Reset & Upload New
                </button>
              </div>

              <div className="overflow-x-auto max-h-[400px]">
                <table className="w-full text-left text-xs whitespace-nowrap relative">
                  <thead className="bg-white border-b border-gray-100 sticky top-0 z-10 shadow-sm">
                    <tr className="text-gray-400 uppercase tracking-tighter">
                      {tableHeaders.map((header, idx) => (
                        <th key={idx} className="px-6 py-4 font-bold">{header}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {previewData.slice(0, 50).map((row, idx) => (
                      <tr key={idx} className="hover:bg-gray-50/50 transition-colors">
                        {tableHeaders.map((header, hIdx) => (
                          <td key={hIdx} className="px-6 py-4 font-medium text-dark">{String(row[header] || '')}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
                {previewData.length > 50 && (
                  <div className="text-center py-3 text-xs text-gray-400 bg-gray-50/30">
                    Showing first 50 records...
                  </div>
                )}
              </div>

              <div className="p-6 bg-gray-50/80 flex justify-end border-t border-gray-100">
                <button 
                  onClick={() => setIsModalOpen(true)} 
                  className="bg-dark text-white px-8 py-3 rounded-xl font-bold shadow-md hover:bg-black transition-colors flex items-center gap-2"
                >
                  <Download size={18} /> Download Selection
                </button>
              </div>
            </div>
          )}
        </div>
      ) : (

        /* ================= CONTENT: Handheld ================= */
        <div className="bg-white border-2 border-dashed border-gray-200 rounded-[32px] p-20 flex items-center justify-center text-gray-400 animate-in fade-in">
          <p>Handheld Generator (Coming Soon...)</p>
        </div>
      )}

      {/* ================= DOWNLOAD POPUP MODAL ================= */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-[24px] p-8 w-[400px] shadow-2xl animate-in zoom-in-95 relative">
            
            <button 
              onClick={() => setIsModalOpen(false)}
              className="absolute top-6 right-6 text-gray-400 hover:text-dark transition-colors"
            >
              <X size={20} />
            </button>

            <h3 className="text-xl font-bold text-dark mb-2">Download Options</h3>
            <p className="text-sm text-gray-500 mb-6">Select the files you want to download</p>

            {/* Checkbox List Area */}
            <div className="flex flex-col gap-2 mb-8">
              
              <div 
                onClick={handleToggleAll}
                className="flex items-center gap-3 p-3 rounded-xl border-2 border-gray-100 hover:border-primary/50 hover:bg-orange-50/50 cursor-pointer transition-all group"
              >
                {isAllChecked ? <CheckSquare size={20} className="text-primary" /> : <Square size={20} className="text-gray-300 group-hover:text-primary/50" />}
                <span className="font-bold text-dark select-none">Select All Files</span>
              </div>

              <div className="w-full h-px bg-gray-100 my-2"></div>

              <div className="flex flex-col gap-1 max-h-[150px] overflow-y-auto pr-2">
                {downloadFiles.map((file) => (
                  <div 
                    key={file.id} 
                    onClick={() => handleToggleFile(file.id)}
                    className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors group"
                  >
                    {file.isChecked ? <CheckSquare size={18} className="text-primary" /> : <Square size={18} className="text-gray-300 group-hover:text-primary/50" />}
                    <span className={`text-sm font-medium select-none ${file.isChecked ? 'text-dark' : 'text-gray-500'}`}>
                      {file.label}
                    </span>
                  </div>
                ))}
              </div>

            </div>

            {/* Action Buttons */}
            <div className="flex justify-end gap-3">
              <button 
                onClick={() => setIsModalOpen(false)}
                className="px-6 py-2.5 rounded-xl font-bold text-gray-500 hover:bg-gray-100 transition-colors"
              >
                Cancel
              </button>
              <button 
                onClick={handleConfirmDownload}
                className={`px-6 py-2.5 rounded-xl font-bold transition-all shadow-md ${
                  downloadFiles.some(f => f.isChecked) 
                    ? 'bg-primary text-white hover:scale-105 shadow-primary/20' 
                    : 'bg-gray-200 text-gray-400 cursor-not-allowed shadow-none'
                }`}
              >
                Download
              </button>
            </div>

          </div>
        </div>
      )}
    </div>
  );
};

export default ListCreate;