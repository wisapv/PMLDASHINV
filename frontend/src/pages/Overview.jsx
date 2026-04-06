import React, { useState } from 'react';
import { 
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer,
  BarChart, Bar, Cell, PieChart, Pie,
} from 'recharts';
import { Search, TrendingUp, ChevronDown } from 'lucide-react';

// --- ข้อมูลจำลองสำหรับหน้า Overview ---
const trendData = [ { time: '08:00', count: 30 }, { time: '10:00', count: 85 }, { time: '12:00', count: 45 }, { time: '14:00', count: 90 }, { time: '16:00', count: 65 } ];
const shopData = [ { name: 'A', checked: 85, remain: 15 }, { name: 'W', checked: 60, remain: 40 }, { name: 'T', checked: 30, remain: 70 }, { name: 'K', checked: 15, remain: 85 }, { name: 'R', checked: 5, remain: 95 } ];
const overallData = [ { name: 'Checked', value: 280, color: '#FF6A3D' }, { name: 'Remaining', value: 146, color: '#1C1C1E' } ];
const donutData = [ { name: 'Done', value: 68, color: '#FF6A3D' }, { name: 'Remain', value: 32, color: '#F3F4F6' } ];
const tableData = [
  { shop: 'A', address: 'FN2', progress: '12/12', status: 'Done', color: 'text-success', bg: 'bg-green-50' },
  { shop: 'A', address: 'TR2', progress: '10/12', status: 'Checking', color: 'text-primary', bg: 'bg-orange-50' },
  { shop: 'W', address: 'Line Side', progress: '5/12', status: 'Checking', color: 'text-primary', bg: 'bg-orange-50' },
  { shop: 'W', address: 'PC', progress: '12/12', status: 'Done', color: 'text-success', bg: 'bg-green-50' },
  { shop: 'T', address: 'Line Side', progress: '0/20', status: 'Pending', color: 'text-gray-400', bg: 'bg-gray-100' },
  { shop: 'K', address: 'Line Side', progress: '8/10', status: 'Checking', color: 'text-primary', bg: 'bg-orange-50' },
  { shop: 'K', address: 'Line Side', progress: '8/10', status: 'Checking', color: 'text-primary', bg: 'bg-orange-50' },
  { shop: 'K', address: 'Line Side', progress: '8/10', status: 'Checking', color: 'text-primary', bg: 'bg-orange-50' },
  { shop: 'K', address: 'Line Side', progress: '8/10', status: 'Checking', color: 'text-primary', bg: 'bg-orange-50' },
  { shop: 'K', address: 'Line Side', progress: '8/10', status: 'Checking', color: 'text-primary', bg: 'bg-orange-50' },
  { shop: 'K', address: 'Line Side', progress: '8/10', status: 'Checking', color: 'text-primary', bg: 'bg-orange-50' },
  { shop: 'K', address: 'Line Side', progress: '8/10', status: 'Checking', color: 'text-primary', bg: 'bg-orange-50' },
  { shop: 'K', address: 'Line Side', progress: '8/10', status: 'Checking', color: 'text-primary', bg: 'bg-orange-50' },
  { shop: 'K', address: 'Line Side', progress: '8/10', status: 'Checking', color: 'text-primary', bg: 'bg-orange-50' },
];
const damageData = [ { shop: 'A', kbn: '88511-0K010-00', total: 5 }, { shop: 'W', kbn: '82121-0K120-00', total: 2 } ];
const lastOrderData = [ { dock: 'S1', check: 'Completed Lane', route: '-', lastOrder: '2026040110' }, { dock: 'S2', check: 'ASIAA', route: 'SC-B01', lastOrder: '2026040114' } ];

const Overview = () => {
  const [selectedShop, setSelectedShop] = useState('All');
  const filteredTableData = selectedShop === 'All' ? tableData : tableData.filter(item => item.shop === selectedShop);

  return (
    <div className="flex flex-col gap-6 w-full animate-in fade-in duration-500">
      <div className="flex flex-col">
        <h2 className="text-xl font-bold mb-4 text-dark tracking-tight">Stock Monitoring</h2>
        <div className="w-full overflow-x-auto pb-2">
          <div className="grid grid-cols-6 gap-4 min-w-[900px]">
            {['A', 'W', 'T', 'K', 'R', 'TTAT'].map((shop, i) => (
              <div key={shop} className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 flex flex-col relative overflow-hidden">
                <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-primary"></div>
                <div className="pl-3">
                  <p className="text-gray-400 text-[9px] font-bold uppercase mb-1">SHOP {shop}</p>
                  <h3 className="text-xl font-bold">{i === 0 ? '120/140' : i === 1 ? '90/150' : '45/140'}</h3>
                  <p className="text-[9px] text-gray-400 mt-1">Part Checked</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        {/* Left Column */}
        <div className="flex-[2.5] min-w-0 flex flex-col gap-6">
          <div className="bg-white rounded-[24px] p-6 shadow-sm border border-gray-50 h-[300px] flex flex-col">
            <h3 className="font-bold text-sm flex items-center gap-2 mb-4"><TrendingUp size={16} className="text-primary"/> Scanning Trend</h3>
            <div className="flex-1 w-full -ml-4">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={trendData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs><linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#FF6A3D" stopOpacity={0.2}/><stop offset="95%" stopColor="#FF6A3D" stopOpacity={0}/></linearGradient></defs>
                  <XAxis dataKey="time" axisLine={false} tickLine={false} tick={{fontSize: 10, fill: '#9CA3AF'}} dy={10} />
                  <YAxis axisLine={false} tickLine={false} tick={{fontSize: 10, fill: '#9CA3AF'}} />
                  <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                  <Area type="monotone" dataKey="count" stroke="#FF6A3D" strokeWidth={2} fillOpacity={1} fill="url(#colorCount)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="bg-white rounded-[24px] p-6 shadow-sm border border-gray-50 h-[300px] flex flex-col">
            <h3 className="font-bold text-sm mb-6">Shop Progress by address</h3>
            <div className="flex-1 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={shopData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 10, fontWeight: 'bold'}} dy={10} />
                  <YAxis axisLine={false} tickLine={false} tick={{fontSize: 10, fill: '#9CA3AF'}} />
                  <Tooltip cursor={{fill: '#F9FAFB'}} />
                  <Bar dataKey="checked" stackId="a" fill="#FF6A3D" radius={[0, 0, 6, 6]} barSize={14} />
                  <Bar dataKey="remain" stackId="a" fill="#1C1C1E" radius={[6, 6, 0, 0]} barSize={12} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="bg-white rounded-[24px] p-6 shadow-sm border border-gray-50 mb-6 h-[420px] flex flex-col">
            <div className="flex justify-between items-center mb-4 flex-shrink-0">
              <h3 className="font-bold text-sm">Detail by address</h3>
              <div className="relative">
                <select className="pl-4 pr-10 py-1.5 bg-gray-50 border border-gray-200 rounded-full text-xs w-36 focus:ring-1 focus:ring-primary outline-none appearance-none cursor-pointer font-medium text-dark" value={selectedShop} onChange={(e) => setSelectedShop(e.target.value)}>
                  <option value="All">All Shops</option> <option value="A">Shop A</option> <option value="W">Shop W</option> <option value="T">Shop T</option> <option value="K">Shop K</option> <option value="R">Shop R</option> <option value="TTAT">Shop TTAT</option>
                </select>
                <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"/>
              </div>
            </div>
            <div className="overflow-y-auto flex-1 pr-2">
              <table className="w-full text-left text-xs">
                <thead className="sticky top-0 bg-white z-10 shadow-[0_1px_0_0_#f3f4f6]">
                  <tr className="text-gray-400 uppercase tracking-wider text-[9px]"><th className="pb-4 pt-2 font-bold bg-white">Shop</th><th className="pb-4 pt-2 font-bold bg-white">Address</th><th className="pb-4 pt-2 font-bold bg-white">Progress</th><th className="pb-4 pt-2 font-bold bg-white">Status</th></tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {filteredTableData.map((row, index) => (
                    <tr key={index}><td className="py-4 font-bold">Shop {row.shop}</td><td className="py-4 text-gray-500 font-medium">{row.address}</td><td className="py-4 font-bold text-dark">{row.progress}</td><td className="py-4"><span className={`${row.color} font-bold text-[10px] ${row.bg} px-2 py-1 rounded`}>{row.status}</span></td></tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Right Column */}
        <div className="flex-1 min-w-[260px] lg:max-w-[320px] flex flex-col gap-6">
          <div className="bg-white rounded-[24px] p-8 shadow-sm border border-gray-50 h-[300px] flex flex-col items-center relative flex-shrink-0">
            <h3 className="font-bold text-sm mb-4 w-full text-left">Overall Progress</h3>
            <div className="flex-1 w-full relative">
              <ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={donutData} cx="50%" cy="50%" innerRadius="75%" outerRadius="100%" dataKey="value" stroke="none">{donutData.map((entry, index) => <Cell key={index} fill={entry.color} />)}</Pie></PieChart></ResponsiveContainer>
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none"><span className="text-3xl font-bold text-dark">68%</span><span className="text-[9px] text-gray-400 font-bold uppercase mt-1">Completed</span></div>
            </div>
          </div>

          <div className="bg-white rounded-[24px] p-6 shadow-sm border border-gray-50 h-[300px] flex flex-col items-center flex-shrink-0">
            <h3 className="font-bold text-sm mb-4 w-full text-left">Local part vs Import part</h3>
            <div className="flex-1 w-full relative">
              <ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={overallData} innerRadius={0} outerRadius="90%" dataKey="value" stroke="#ffffff" strokeWidth={3}>{overallData.map((entry, index) => <Cell key={index} fill={entry.color} />)}</Pie></PieChart></ResponsiveContainer>
            </div>
            <div className="w-full flex justify-center gap-6 mt-4">
              <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-primary"></div><span className="text-[10px] font-bold text-gray-600">Local (280)</span></div>
              <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-dark"></div><span className="text-[10px] font-bold text-gray-600">Import (146)</span></div>
            </div>
          </div>

          <div className="bg-white rounded-[24px] p-6 shadow-sm border border-gray-50 h-[200px] flex flex-col flex-shrink-0">
            <h3 className="font-bold text-sm mb-4 flex-shrink-0">Part Damage Status</h3>
            <div className="overflow-y-auto flex-1 pr-2">
              <table className="w-full text-left text-xs">
                <thead className="sticky top-0 bg-white z-10 shadow-[0_1px_0_0_#f3f4f6]">
                  <tr className="text-gray-400 uppercase tracking-wider text-[9px]"><th className="pb-3 pt-1 font-bold text-center bg-white">Shop</th><th className="pb-3 pt-1 font-bold text-center bg-white">Part No</th><th className="pb-3 pt-1 font-bold text-center bg-white">Total</th></tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {damageData.map((item, index) => (
                    <tr key={index}><td className="py-3 font-bold text-[11px] text-danger text-center">Shop {item.shop}</td><td className="py-3 text-gray-500 text-center font-medium text-[11px]">{item.kbn}</td><td className="py-3 font-bold text-dark text-center text-[11px]">{item.total}</td></tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="bg-white rounded-[24px] p-6 shadow-sm border border-gray-50 h-[200px] flex flex-col flex-shrink-0">
            <h3 className="font-bold text-sm mb-4 flex-shrink-0">Check Last Order (Lane)</h3>
            <div className="overflow-y-auto flex-1 pr-2">
              <table className="w-full text-left text-xs">
                <thead className="sticky top-0 bg-white z-10 shadow-[0_1px_0_0_#f3f4f6]">
                  <tr className="text-gray-400 uppercase tracking-wider text-[9px]"><th className="pb-3 pt-1 font-bold text-center bg-white">Dock</th><th className="pb-3 pt-1 font-bold text-center bg-white">Check</th><th className="pb-3 pt-1 font-bold text-center bg-white">Route</th><th className="pb-3 pt-1 font-bold text-center bg-white">Last Order</th></tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {lastOrderData.map((item, index) => (
                    <tr key={index}><td className="py-3 font-bold text-[11px] text-dark text-center">{item.dock}</td><td className="py-3 font-bold text-primary text-center text-[11px]">{item.check}</td><td className="py-3 text-gray-500 text-center font-medium text-[11px]">{item.route}</td><td className="py-3 text-gray-500 text-center text-[10px] bg-gray-50 rounded-md">{item.lastOrder}</td></tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};

export default Overview;