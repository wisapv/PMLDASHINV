import React, { useState } from 'react';
import { Upload, CheckCircle2, AlertCircle, ArrowRight, FileSpreadsheet, Database } from 'lucide-react';

const ListCreate = () => {
  const [previewData] = useState([
    { partNo: '56101-0K010', kbn: 'SFK6', address: 'FN3-L01', qty: 16, status: 'Valid' },
    { partNo: '82121-0K120', kbn: 'NDH2', address: 'W-10-02', qty: 1, status: 'Valid' },
  ]);

  return (
    <div className="flex flex-col gap-6 w-full animate-in fade-in duration-500 pb-10">
      <div className="flex flex-col">
        <h2 className="text-2xl font-bold text-dark tracking-tight">Generate Part List</h2>
        <p className="text-sm text-gray-500">Please upload both Part List and Master data files.</p>
      </div>

      {/* ================= 2 UPLOAD BOXES ================= */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Box 1: Part List */}
        <div className="bg-white border-2 border-dashed border-gray-200 rounded-[32px] p-10 flex flex-col items-center justify-center gap-3 hover:border-primary transition-all cursor-pointer group">
          <div className="w-14 h-14 bg-orange-50 text-primary rounded-full flex items-center justify-center group-hover:scale-110 transition-transform">
            <FileSpreadsheet size={28} />
          </div>
          <div className="text-center">
            <h3 className="font-bold text-dark">1. Upload Part List</h3>
            <p className="text-[10px] text-gray-400">Drag & drop audit list file here</p>
          </div>
          <button className="mt-2 text-xs font-bold bg-dark text-white px-6 py-2 rounded-full">Browse</button>
        </div>

        {/* Box 2: Master Data */}
        <div className="bg-white border-2 border-dashed border-gray-200 rounded-[32px] p-10 flex flex-col items-center justify-center gap-3 hover:border-primary transition-all cursor-pointer group">
          <div className="w-14 h-14 bg-orange-50 text-primary rounded-full flex items-center justify-center group-hover:scale-110 transition-transform">
            <Database size={28} />
          </div>
          <div className="text-center">
            <h3 className="font-bold text-dark">2. Upload Master Data</h3>
            <p className="text-[10px] text-gray-400">Drag & drop location master here</p>
          </div>
          <button className="mt-2 text-xs font-bold bg-dark text-white px-6 py-2 rounded-full">Browse</button>
        </div>
      </div>

      {/* Preview Section */}
      <div className="bg-white rounded-[24px] shadow-sm border border-gray-50 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-50 flex justify-between items-center">
          <h3 className="font-bold text-sm">Data Validation Preview</h3>
        </div>
        <table className="w-full text-left text-xs whitespace-nowrap">
          <thead className="bg-[#FAF9F6]">
            <tr className="text-gray-400 uppercase tracking-tighter">
              <th className="px-6 py-4 font-bold">Part Number</th>
              <th className="px-6 py-4 font-bold">Address</th>
              <th className="px-6 py-4 text-center">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {previewData.map((row, idx) => (
              <tr key={idx}>
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
        <div className="p-6 bg-gray-50/50 flex justify-end border-t border-gray-50">
           <button className="bg-primary text-white px-10 py-3.5 rounded-2xl font-bold shadow-lg shadow-primary/20 flex items-center gap-2">
             Confirm & Generate <ArrowRight size={18} />
           </button>
        </div>
      </div>
    </div>
  );
};

export default ListCreate;