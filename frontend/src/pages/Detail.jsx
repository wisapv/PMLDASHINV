import React, { useState } from 'react';
import { 
  Search, ChevronDown, Edit2, Trash2
} from 'lucide-react';

// --- ข้อมูลจำลองสำหรับหน้า Detail ---
const detailTableData = [
  { id: '010347', shop: 'A', dock: 'S1', address: 'FN3-L01', partNo: '5610106B0000', kbn: 'SFK6', partname: 'GLASS S/A W/SHIELD', qty: '16', box: '1', pcs: '16', seq: '516', order: '2026031016', status: 'Done', color: 'border-l-gray-300' },
  { id: '010348', shop: 'W', dock: 'N2', address: 'W-10-02', partNo: '821610XV5000', kbn: 'NDH2', partname: 'WIRE FLR', qty: '1', box: '2', pcs: '0', seq: '519', order: '2026031013', status: 'Checking', color: 'border-l-primary' },
  { id: '010349', shop: 'W', dock: 'N1', address: 'W-15-08', partNo: '8214506K8000', kbn: 'ND55', partname: 'WIRE INST PNL', qty: '2', box: '0', pcs: '6', seq: '816', order: '-', status: 'Pending', color: 'border-l-yellow-400' },
  { id: '010350', shop: 'T', dock: 'N1', address: 'T-05-01', partNo: '8614006A0000', kbn: 'NNC6', partname: 'RCVR RADIO & DISP', qty: '2', box: '10', pcs: '1', seq: '566', order: '2026031816', status: 'Done', color: 'border-l-green-400' },
  { id: '010351', shop: 'K', dock: 'N1', address: 'K-01-01', partNo: '8217106T7000', kbn: 'NDN8', partname: 'WIRE ROOF', qty: '20', box: '1', pcs: '111', seq: '716', order: '2026031916', status: 'Checking', color: 'border-l-purple-400' },
];

const Detail = () => {
  const [filterShop, setFilterShop] = useState('All');
  const [filterDock, setFilterDock] = useState('All');
  const [filterAddress, setFilterAddress] = useState('All');
  const [filterStatus, setFilterStatus] = useState('All');

  return (
    <div className="flex flex-col gap-5 w-full animate-in fade-in duration-500 pb-10">
      
      {/* Header Text */}
      <div className="flex flex-col mb-2">
        <h2 className="text-2xl font-bold mb-1 text-dark tracking-tight">Stock Tracking Detail</h2>
        <p className="text-sm text-gray-500">Manage and view all piece count data details.</p>
      </div>

      {/* ======================= TOP CARDS (Filters & Search) ======================= */}
      <div className="flex flex-col lg:flex-row gap-5">
        
        {/* Left Card: Multiple Filters */}
        <div className="flex-[2.5] bg-white rounded-2xl p-6 shadow-sm border border-gray-100 flex flex-col justify-center">
          <p className="text-sm font-bold text-dark mb-4">Filters</p>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            
            {/* Filter: Shop */}
            <div className="relative w-full">
              <select 
                className={`w-full pl-4 pr-8 py-2.5 border rounded-xl text-xs outline-none appearance-none cursor-pointer focus:ring-1 focus:ring-primary font-medium transition-colors ${
                  filterShop !== 'All' ? 'bg-primary text-white border-primary' : 'bg-gray-50 text-dark border-gray-100'
                }`}
                value={filterShop}
                onChange={(e) => setFilterShop(e.target.value)}
              >
                <option value="All" className="text-dark bg-white">All Shops</option>
                <option value="A" className="text-dark bg-white">Shop A</option>
                <option value="W" className="text-dark bg-white">Shop W</option>
                <option value="T" className="text-dark bg-white">Shop T</option>
                <option value="K" className="text-dark bg-white">Shop K</option>
              </select>
              <ChevronDown size={14} className={`absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none transition-colors ${filterShop !== 'All' ? 'text-white' : 'text-gray-400'}`}/>
            </div>

            {/* Filter: Dock */}
            <div className="relative w-full">
              <select 
                className={`w-full pl-4 pr-8 py-2.5 border rounded-xl text-xs outline-none appearance-none cursor-pointer focus:ring-1 focus:ring-primary font-medium transition-colors ${
                  filterDock !== 'All' ? 'bg-primary text-white border-primary' : 'bg-gray-50 text-dark border-gray-100'
                }`}
                value={filterDock}
                onChange={(e) => setFilterDock(e.target.value)}
              >
                <option value="All" className="text-dark bg-white">All Docks</option>
                <option value="S1" className="text-dark bg-white">Dock S1</option>
                <option value="N1" className="text-dark bg-white">Dock N1</option>
                <option value="N2" className="text-dark bg-white">Dock N2</option>
              </select>
              <ChevronDown size={14} className={`absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none transition-colors ${filterDock !== 'All' ? 'text-white' : 'text-gray-400'}`}/>
            </div>

            {/* Filter: Address */}
            <div className="relative w-full">
              <select 
                className={`w-full pl-4 pr-8 py-2.5 border rounded-xl text-xs outline-none appearance-none cursor-pointer focus:ring-1 focus:ring-primary font-medium transition-colors ${
                  filterAddress !== 'All' ? 'bg-primary text-white border-primary' : 'bg-gray-50 text-dark border-gray-100'
                }`}
                value={filterAddress}
                onChange={(e) => setFilterAddress(e.target.value)}
              >
                <option value="All" className="text-dark bg-white">All Addresses</option>
                <option value="A-01-05" className="text-dark bg-white">A-01-05</option>
                <option value="W-10-02" className="text-dark bg-white">W-10-02</option>
                <option value="T-05-01" className="text-dark bg-white">T-05-01</option>
              </select>
              <ChevronDown size={14} className={`absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none transition-colors ${filterAddress !== 'All' ? 'text-white' : 'text-gray-400'}`}/>
            </div>

            {/* Filter: Status */}
            <div className="relative w-full">
              <select 
                className={`w-full pl-4 pr-8 py-2.5 border rounded-xl text-xs outline-none appearance-none cursor-pointer focus:ring-1 focus:ring-primary font-medium transition-colors ${
                  filterStatus !== 'All' ? 'bg-primary text-white border-primary' : 'bg-gray-50 text-dark border-gray-100'
                }`}
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
              >
                <option value="All" className="text-dark bg-white">All Status</option>
                <option value="Done" className="text-dark bg-white">Done</option>
                <option value="Checking" className="text-dark bg-white">Checking</option>
                <option value="Pending" className="text-dark bg-white">Pending</option>
              </select>
              <ChevronDown size={14} className={`absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none transition-colors ${filterStatus !== 'All' ? 'text-white' : 'text-gray-400'}`}/>
            </div>

          </div>
        </div>

        {/* Right Card: Search Bar */}
        <div className="flex-[1.5] bg-white rounded-2xl p-6 shadow-sm border border-gray-100 flex flex-col justify-center">
          <p className="text-sm font-bold text-dark mb-4">Search Data</p>
          <div className="flex gap-3">
            <div className="relative flex-1">
              <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"/>
              <input 
                type="text" 
                placeholder="Type KBN, Part No..." 
                className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-100 rounded-xl text-xs outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all"
              />
            </div>
            <button className="bg-primary hover:bg-[#E85B2D] text-white px-6 py-2.5 rounded-xl text-xs font-bold transition-colors">
              Search
            </button>
          </div>
        </div>
      </div>

      {/* ======================= DATA TABLE ======================= */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden mt-2">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs whitespace-nowrap">
            {/* Table Header */}
            <thead className="bg-[#000000] border-b border-gray-100">
              <tr className="text-[#ffffff] uppercase tracking-wider text-[9px]">
                <th className="px-4 py-4 font-bold text-center">Shop</th>
                <th className="px-4 py-4 font-bold text-center">Dock</th>
                <th className="px-4 py-4 font-bold text-center">Part No</th>
                <th className="px-4 py-4 font-bold text-center">Part Number</th>
                <th className="px-4 py-4 font-bold text-center">KBN</th>
                <th className="px-4 py-4 font-bold text-center">Address</th>
                <th className="px-4 py-4 font-bold text-center">Qty</th>
                <th className="px-4 py-4 font-bold text-center">Box</th>
                <th className="px-4 py-4 font-bold text-center">Pcs</th>
                <th className="px-4 py-4 font-bold text-center">SEQ</th>
                <th className="px-4 py-4 font-bold text-center">Order</th>
                <th className="px-4 py-4 font-bold text-center">Actions</th>
              </tr>
            </thead>
            
            {/* Table Body */}
            <tbody className="divide-y divide-gray-50">
              {detailTableData.map((row, idx) => (
                <tr key={idx} className={`hover:bg-gray-50 transition-colors border-l-4 ${row.color}`}>
                  <td className="px-4 py-4 text-center font-bold text-dark">Shop {row.shop}</td>
                  <td className="px-4 py-4 text-center font-bold text-dark">{row.dock}</td>
                  <td className="px-4 py-4 text-center font-bold text-dark">{row.partNo}</td>
                  <td className="px-4 py-4 text-center font-bold text-dark">{row.partname}</td>
                  <td className="px-4 py-4 text-center font-bold text-primary bg-orange-50/50 rounded-sm">{row.kbn}</td>
                  <td className="px-4 py-4 text-center font-bold text-dark">{row.address}</td>
                  <td className="px-4 py-4 text-center font-bold text-dark">{row.qty}</td>
                  <td className="px-4 py-4 text-center font-bold text-dark">{row.box}</td>
                  <td className="px-4 py-4 text-center font-bold text-dark">{row.pcs}</td>
                  <td className="px-4 py-4 text-center font-bold text-dark">{row.seq}</td>
                  <td className="px-4 py-4 text-center font-bold text-dark">{row.order}</td>
                  <td className="px-4 py-4 text-center">
                    <div className="flex items-center justify-center gap-3 text-gray-400">
                      <button className="hover:text-dark transition-colors"><Edit2 size={14}/></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
};

export default Detail;