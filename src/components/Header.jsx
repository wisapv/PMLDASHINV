import React from 'react';
import { Search, Bell, AlertCircle, ChevronDown } from 'lucide-react';

const Header = ({ activeTab, setActiveTab }) => {
  const tabs = ['Overview', 'Detail', 'Summary'];
  const activeIndex = tabs.indexOf(activeTab);

  return (
    <div className="fixed top-0 left-0 right-0 z-50 bg-[#F5F6F8]/90 backdrop-blur-md w-full flex justify-between items-center px-8 py-4 border-b border-gray-200">
      
      {/* Logo Area */}
      <div className="flex items-center gap-2">
        <div className="w-11 h-10 bg-primary rounded-lg flex items-center justify-center text-white font-bold text-lg shadow-sm shadow-primary/30">
          PML
        </div>
        <span className="text-xl font-bold text-dark tracking-tight ml-2">WISA </span>
      </div>

      {/* ================= Center Navigation (Sliding Tabs) ================= */}
      {/* 👇 ล็อคความกว้างตายตัว w-[372px] ห้ามขยับหดขยายเด็ดขาด */}
      <div className="relative flex items-center bg-white rounded-full p-1.5 shadow-sm w-[372px] h-[48px] box-border">
        
        {/* 👇 เปลี่ยนจาก 100% เป็น 120px เพื่อตัดปัญหาทศนิยม (120px คือความกว้างปุ่ม) */}
        <div 
          className="absolute top-1.5 bottom-1.5 left-1.5 w-[120px] bg-dark rounded-full transition-transform duration-300 ease-in-out shadow-md"
          style={{ transform: `translateX(${activeIndex * 120}px)` }}
        ></div>
        
        {/* ปุ่มข้อความทั้ง 3 ปุ่ม */}
        {tabs.map((tab) => (
          <button 
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`relative z-10 w-[120px] h-full flex items-center justify-center flex-none text-sm font-bold transition-colors duration-300 ${
              activeTab === tab ? 'text-white' : 'text-gray-500 hover:text-dark'
            }`}
          >
            {tab}
          </button>
        ))}
        
      </div>

      {/* Right Actions & Profile */}
      <div className="flex items-center gap-4">
        <div className="flex items-center bg-white rounded-full px-4 py-2 shadow-sm gap-4 text-gray-500">
          <Search size={18} className="cursor-pointer hover:text-dark transition-colors" />
          <div className="relative cursor-pointer hover:text-dark transition-colors">
            <Bell size={18} />
            <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-danger rounded-full"></span>
          </div>
          <AlertCircle size={18} className="cursor-pointer hover:text-dark transition-colors" />
        </div>
        
        <div className="flex items-center bg-white rounded-full pl-2 pr-4 py-1.5 shadow-sm gap-3 cursor-pointer hover:bg-gray-50 transition-colors">
          <img src="https://static.vecteezy.com/system/resources/previews/027/190/725/original/pixel-art-cute-black-cat-cartoon-character-2-png.png" alt="Profile" className="w-8 h-8 rounded-full" />
          <div className="flex flex-col">
            <span className="text-sm font-bold text-dark leading-tight">Wanwisa Sakchaiyan</span>
            <span className="text-[11px] text-gray-400">wsakchai@toyota.co.th</span>
          </div>
          <ChevronDown size={16} className="text-gray-400 ml-1" />
        </div>
      </div>
    </div>
  );
};

export default Header;