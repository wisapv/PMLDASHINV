import React, { useRef, useState } from 'react';
import { FileSpreadsheet, CheckCircle2, UploadCloud, Loader2 } from 'lucide-react';

const TemplateManager = () => {
  const fileInputRef = useRef(null);
  const [isUploading, setIsUploading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);

    setIsUploading(true);
    setSuccess(false);

    try {
      const response = await fetch('http://localhost:3000/api/template/upload', {
        method: 'POST',
        body: formData
      });

      if (response.ok) {
        setSuccess(true);
        setTimeout(() => setSuccess(false), 3000); // เอาติ๊กถูกออกหลังผ่านไป 3 วิ
      } else {
        alert('Failed to upload template.');
      }
    } catch (error) {
      alert('Server connection error.');
    } finally {
      setIsUploading(false);
      e.target.value = null; // เคลียร์ไฟล์
    }
  };

  return (
    <div className="flex flex-col gap-6 w-full animate-in fade-in duration-500 pb-10">
      <div className="flex flex-col">
        <h2 className="text-2xl font-bold text-dark tracking-tight">Template Management</h2>
        <p className="text-sm text-gray-500">Upload and manage Excel formats for report generation.</p>
      </div>

      <div className="bg-white rounded-[32px] border border-gray-100 p-10 max-w-3xl flex flex-col gap-8 shadow-sm">
        
        {/* Template List (จำลองว่ามี 1 Template หลักก่อน) */}
        <div className="flex items-center justify-between p-6 bg-gray-50 rounded-2xl border border-gray-100">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-orange-50 text-primary rounded-xl flex items-center justify-center">
              <FileSpreadsheet size={24} />
            </div>
            <div>
              <h3 className="font-bold text-dark text-lg">Main Format (LTBO1010)</h3>
              <p className="text-sm text-gray-500">The template file used for Build out parts Part List report.</p>
            </div>
          </div>

          <button 
            onClick={() => fileInputRef.current.click()}
            disabled={isUploading}
            className="flex items-center gap-2 bg-dark text-white px-6 py-3 rounded-xl font-bold hover:bg-primary transition-colors disabled:opacity-50"
          >
            {isUploading ? <Loader2 size={18} className="animate-spin" /> : success ? <CheckCircle2 size={18} className="text-success" /> : <UploadCloud size={18} />}
            {isUploading ? 'Uploading...' : success ? 'Saved!' : 'Upload / Replace'}
          </button>
          
          {/* ซ่อน Input รับไฟล์ */}
          <input 
            type="file" 
            accept=".xls,.xlsx" 
            ref={fileInputRef} 
            onChange={handleFileUpload} 
            className="hidden" 
          />
        </div>

      </div>
    </div>
  );
};

export default TemplateManager;