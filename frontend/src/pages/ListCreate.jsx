import React, { useState, useEffect } from 'react';
import { 
  CheckCircle2, 
  FileSpreadsheet, 
  Database, 
  Loader2, 
  Download, 
  ChevronDown,
  X,
  CheckSquare, // นำกลับมาใช้สำหรับ Modal
  Square       // นำกลับมาใช้สำหรับ Modal
} from 'lucide-react';

const ListCreate = ({ activeTab }) => {
  // --- States ---
  useEffect(() => {
    if (activeTab === 'TBOS') setStep('idle');
  }, [activeTab]);

  const [step, setStep] = useState('idle'); 
  const [selectedFilter, setSelectedFilter] = useState('Line 1');
  
  // State สำหรับ Popup
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  // State จำลองรายชื่อไฟล์ที่จะให้เลือกดาวน์โหลด (อนาคตดึงจาก Backend)
  const [downloadFiles, setDownloadFiles] = useState([
    { id: 'f1', label: 'Part List Data (CSV)', isChecked: true },
    { id: 'f2', label: 'Master Address (Excel)', isChecked: false },
    { id: 'f3', label: 'Summary Report (PDF)', isChecked: false },
  ]);

  const [previewData] = useState([
    { partNo: '56101-0K010', kbn: 'SFK6', address: 'FN3-L01', qty: 16, status: 'Valid' },
    { partNo: '82121-0K120', kbn: 'NDH2', address: 'W-10-02', qty: 1, status: 'Valid' },
  ]);

  // --- Handlers ---
  const handleUploadMock = () => {
    if (step === 'generating' || step === 'preview') return;
    setStep('uploaded');
  };

  const handleGenerate = () => {
    setStep('generating');
    setTimeout(() => {
      setStep('preview');
    }, 2000);
  };

  // Handler สำหรับติ๊กเลือกไฟล์แต่ละอัน
  const handleToggleFile = (id) => {
    setDownloadFiles(prev => prev.map(f => f.id === id ? { ...f, isChecked: !f.isChecked } : f));
  };

  // เช็คว่าตอนนี้เลือกครบทุกไฟล์หรือยัง
  const isAllChecked = downloadFiles.every(f => f.isChecked);

  // Handler สำหรับปุ่ม Select All / Deselect All
  const handleToggleAll = () => {
    const newState = !isAllChecked; // ถ้าเลือกครบแล้วให้เป็น false, ถ้ายังไม่ครบให้เป็น true
    setDownloadFiles(prev => prev.map(f => ({ ...f, isChecked: newState })));
  };

  const handleConfirmDownload = () => {
    const selectedFiles = downloadFiles.filter(f => f.isChecked).map(f => f.label);
    if (selectedFiles.length === 0) {
      alert("Please select at least one file to download.");
      return;
    }
    alert(`Downloading:\n- ${selectedFiles.join('\n- ')}`);
    setIsModalOpen(false); // โหลดเสร็จก็ปิด popup
  };

  return (
    <div className="flex flex-col gap-6 w-full animate-in fade-in duration-500 pb-10">
      
      {activeTab === 'TBOS' ? (
        <div className="flex flex-col gap-8">
          
          <div className="flex flex-col">
            <h2 className="text-2xl font-bold text-dark tracking-tight">Generate Part List (TBOS)</h2>
            <p className="text-sm text-gray-500">Please upload both Part List and Master data files to generate.</p>
          </div>

          {/* ================= UPLOAD SECTION ================= */}
          <div className="flex flex-col items-center gap-8">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 w-full">
              {/* Box 1 */}
              <div 
                onClick={handleUploadMock} 
                className={`bg-white border-2 border-dashed rounded-[32px] p-10 flex flex-col items-center justify-center gap-3 transition-all ${step === 'generating' || step === 'preview' ? 'border-gray-200 opacity-70 cursor-not-allowed' : 'border-gray-200 hover:border-primary cursor-pointer group'}`}
              >
                <div className={`w-14 h-14 rounded-full flex items-center justify-center transition-transform ${step === 'generating' || step === 'preview' ? 'bg-gray-50 text-gray-400' : 'bg-orange-50 text-primary group-hover:scale-110'}`}>
                  <FileSpreadsheet size={28} />
                </div>
                <div className="text-center">
                  <h3 className="font-bold text-dark">1. Upload Part List</h3>
                  <p className="text-[10px] text-gray-400">
                    {step === 'generating' || step === 'preview' ? 'Uploaded successfully' : 'Click to mock upload'}
                  </p>
                </div>
              </div>

              {/* Box 2 */}
              <div 
                onClick={handleUploadMock} 
                className={`bg-white border-2 border-dashed rounded-[32px] p-10 flex flex-col items-center justify-center gap-3 transition-all ${step === 'generating' || step === 'preview' ? 'border-gray-200 opacity-70 cursor-not-allowed' : 'border-gray-200 hover:border-primary cursor-pointer group'}`}
              >
                <div className={`w-14 h-14 rounded-full flex items-center justify-center transition-transform ${step === 'generating' || step === 'preview' ? 'bg-gray-50 text-gray-400' : 'bg-orange-50 text-primary group-hover:scale-110'}`}>
                  <Database size={28} />
                </div>
                <div className="text-center">
                  <h3 className="font-bold text-dark">2. Upload Master Data</h3>
                  <p className="text-[10px] text-gray-400">
                    {step === 'generating' || step === 'preview' ? 'Uploaded successfully' : 'Click to mock upload'}
                  </p>
                </div>
              </div>
            </div>

            {step === 'uploaded' && (
              <button 
                onClick={handleGenerate}
                className="bg-primary text-white px-10 py-4 rounded-full font-bold shadow-lg shadow-primary/20 hover:scale-105 transition-transform flex items-center gap-2 animate-in fade-in zoom-in"
              >
                Generate Part List for TBOS
              </button>
            )}
          </div>

          {/* ================= LOADING SECTION ================= */}
          {step === 'generating' && (
            <div className="bg-white rounded-[32px] border border-gray-100 p-16 flex flex-col items-center justify-center gap-4 shadow-sm animate-in fade-in slide-in-from-top-4">
              <Loader2 size={48} className="text-primary animate-spin" />
              <h3 className="text-xl font-bold text-dark mt-4">Generating Data...</h3>
              <p className="text-gray-500 text-sm">Please wait while we are processing your files.</p>
            </div>
          )}

          {/* ================= PREVIEW SECTION ================= */}
          {step === 'preview' && (
            <div className="bg-white rounded-[24px] shadow-sm border border-gray-100 overflow-hidden animate-in fade-in slide-in-from-top-4">
              
              <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                <h3 className="font-bold text-dark">Data Validation Preview</h3>
                <div className="relative">
                  <select 
                    value={selectedFilter}
                    onChange={(e) => setSelectedFilter(e.target.value)}
                    className="appearance-none bg-white border border-gray-200 text-dark text-sm font-bold rounded-xl px-4 py-2 pr-10 outline-none focus:border-primary shadow-sm cursor-pointer"
                  >
                    <option value="Line 1">Assembly Line 1</option>
                    <option value="Line 2">Assembly Line 2</option>
                    <option value="All">All Lines</option>
                  </select>
                  <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                </div>
              </div>

              <table className="w-full text-left text-xs whitespace-nowrap">
                <thead className="bg-white border-b border-gray-100">
                  <tr className="text-gray-400 uppercase tracking-tighter">
                    <th className="px-6 py-4 font-bold">Part Number</th>
                    <th className="px-6 py-4 font-bold">Address</th>
                    <th className="px-6 py-4 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {previewData.map((row, idx) => (
                    <tr key={idx} className="hover:bg-gray-50/50 transition-colors">
                      <td className="px-6 py-4 font-bold text-dark">{row.partNo}</td>
                      <td className="px-6 py-4 text-gray-500 font-medium">{row.address}</td>
                      <td className="px-6 py-4 text-center">
                        <span className="bg-green-50 text-success px-2 py-1 rounded text-[10px] font-bold inline-flex items-center gap-1">
                          <CheckCircle2 size={10}/> {row.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <div className="p-6 bg-gray-50/80 flex justify-end items-center border-t border-gray-100">
                <button 
                  onClick={() => setIsModalOpen(true)} 
                  className="bg-dark text-white px-8 py-3 rounded-xl font-bold shadow-md hover:bg-black transition-colors flex items-center gap-2"
                >
                  <Download size={18} /> Download
                </button>
              </div>

            </div>
          )}
        </div>
      ) : (

        /* ================= CONTENT: Handheld ================= */
        <div className="bg-white border-2 border-dashed border-gray-200 rounded-[32px] p-20 flex flex-col items-center justify-center text-gray-400 animate-in fade-in">
          <h3 className="text-xl font-bold text-dark mb-2">Handheld Generator</h3>
          <p>This section is under development for Handheld support.</p>
        </div>
      )}

      {/* ================= DOWNLOAD POPUP MODAL (CHECKBOX LIST) ================= */}
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
              
              {/* Select All Option */}
              <div 
                onClick={handleToggleAll}
                className="flex items-center gap-3 p-3 rounded-xl border-2 border-gray-100 hover:border-primary/50 hover:bg-orange-50/50 cursor-pointer transition-all group"
              >
                {isAllChecked ? (
                  <CheckSquare size={20} className="text-primary" />
                ) : (
                  <Square size={20} className="text-gray-300 group-hover:text-primary/50" />
                )}
                <span className="font-bold text-dark select-none">Select All Files</span>
              </div>

              <div className="w-full h-px bg-gray-100 my-2"></div>

              {/* Individual Files Options */}
              <div className="flex flex-col gap-1 max-h-[150px] overflow-y-auto pr-2">
                {downloadFiles.map((file) => (
                  <div 
                    key={file.id} 
                    onClick={() => handleToggleFile(file.id)}
                    className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors group"
                  >
                    {file.isChecked ? (
                      <CheckSquare size={18} className="text-primary" />
                    ) : (
                      <Square size={18} className="text-gray-300 group-hover:text-primary/50" />
                    )}
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