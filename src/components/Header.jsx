import React from 'react';
import { Search, Bell, AlertCircle, ChevronDown } from 'lucide-react';

const Header = ({ activeTab, setActiveTab, activeModule }) => {
  const tabs = ['Overview', 'Detail', 'Summary'];
  const activeIndex = tabs.indexOf(activeTab);

  return (
    // 👇 ปรับ bg กลับมาเป็นสีขาวสว่าง และ text เป็นสีเข้ม
    <div className="fixed top-0 left-0 right-0 z-50 bg-[#F5F6F8]/90 backdrop-blur-md w-full flex justify-between items-center px-8 py-4 border-b border-gray-200">
      
      {/* Left: Logo */}
      <div className="flex items-center gap-2">
        <div className="w-11 h-10 bg-primary rounded-lg flex items-center justify-center text-white font-bold text-lg shadow-sm shadow-primary/30">
          PML
        </div>
        <span className="text-xl font-bold text-dark tracking-tight ml-2">WISA </span>
      </div>

      {/* Center: Tabs (Show only on Dashboard) */}
      <div className="absolute left-1/2 -translate-x-1/2">
        {activeModule === 'dashboard' ? (
          // 👇 พื้นหลังแถบเลือกเป็นสีขาว และก้อนสไลด์เป็นสีดำ bg-dark
          <div className="relative flex items-center bg-white rounded-full p-1.5 shadow-sm border border-gray-100">
            <div 
              className="absolute top-1.5 bottom-1.5 left-1.5 w-[110px] bg-dark rounded-full transition-transform duration-300 ease-in-out shadow-md"
              style={{ transform: `translateX(${activeIndex * 100}%)` }}
            ></div>
            
            {tabs.map((tab) => (
              <button 
                key={tab}
                onClick={() => setActiveTab(tab)}
                // 👇 เมื่อเลือกตัวอักษรจะเป็นสีขาว (เพราะอยู่บนก้อนดำ) ถ้าไม่เลือกจะเป็นสีเทา
                className={`relative z-10 w-[110px] flex-none text-center py-2.5 text-xs font-bold transition-colors duration-300 ${
                  activeTab === tab ? 'text-white' : 'text-gray-400 hover:text-dark'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>
        ) : (
          <div className="text-sm font-bold text-dark uppercase tracking-widest bg-white px-8 py-2.5 rounded-full shadow-sm border border-gray-100">
             Generation System
          </div>
        )}
      </div>

      {/* Right: Profile & Actions */}
      <div className="flex items-center gap-4">
        <div className="flex items-center bg-white rounded-full px-4 py-2 shadow-sm gap-4 text-gray-500 border border-gray-100">
          <Search size={18} className="cursor-pointer hover:text-dark transition-colors" />
          <div className="relative cursor-pointer hover:text-dark transition-colors">
            <Bell size={18} />
            <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-danger rounded-full"></span>
          </div>
          <AlertCircle size={18} className="cursor-pointer hover:text-dark transition-colors" />
        </div>
        
        <div className="flex items-center bg-white rounded-full pl-2 pr-4 py-1.5 shadow-sm gap-3 cursor-pointer border border-gray-100 hover:bg-gray-50 transition-colors">
          <img src="https://static.vecteezy.com/system/resources/previews/027/190/725/original/pixel-art-cute-black-cat-cartoon-character-2-png.png" alt="Profile" className="w-8 h-8 rounded-full" />
          <div className="flex flex-col">
            <span className="text-sm font-bold text-dark leading-tight text-right">Wanwisa</span>
            <span className="text-[10px] text-gray-400">wsakchai@toyota.co.th</span>
          </div>
          <ChevronDown size={14} className="text-gray-400 ml-1" />
        </div>
      </div>
    </div>
  );
};

export default Header;