import React from 'react';
import { LayoutGrid, Calendar, Mail, Users, Layers, Settings, HelpCircle, LogOut } from 'lucide-react';

// 👇 รับ props activeModule และ setActiveModule มาจาก App.jsx
const Sidebar = ({ activeModule, setActiveModule }) => {
  return (
    <div className="fixed left-6 top-[96px] bottom-6 w-[55px] bg-white rounded-full shadow-sm flex flex-col items-center py-6 z-40">
      
      {/* Main Menu */}
      <div className="flex flex-col gap-4 flex-1 w-full items-center">
        
        {/* ปุ่มที่ 1: Dashboard */}
        <div 
          onClick={() => setActiveModule('dashboard')}
          className={`p-3 rounded-full cursor-pointer transition-all ${
            activeModule === 'dashboard' ? 'bg-dark text-white shadow-md scale-110' : 'text-gray-400 hover:text-dark'
          }`}
        >
          <LayoutGrid size={20} />
        </div>

        {/* ปุ่มที่ 2: Generate List */}
        <div 
          onClick={() => setActiveModule('generation')}
          className={`p-3 rounded-full cursor-pointer transition-all ${
            activeModule === 'generation' ? 'bg-dark text-white shadow-md scale-110' : 'text-gray-400 hover:text-dark'
          }`}
        >
          <Calendar size={20} />
        </div>

        {/* ปุ่มอื่นๆ (ประดับไว้เหมือนเดิม) */}
        <div className="p-3 text-gray-400 hover:text-dark cursor-pointer transition-colors"><Mail size={20} /></div>
        <div className="p-3 text-gray-400 hover:text-dark cursor-pointer transition-colors"><Users size={20} /></div>
        <div className="p-3 text-gray-400 hover:text-dark cursor-pointer transition-colors"><Layers size={20} /></div>
        <div className="p-3 text-gray-400 hover:text-dark cursor-pointer transition-colors"><Settings size={20} /></div>
      </div>

      {/* Bottom Menu */}
      <div className="flex flex-col gap-6 mt-auto">
        <div className="p-3 text-gray-400 hover:text-dark cursor-pointer transition-colors"><HelpCircle size={20} /></div>
        <div className="p-3 text-gray-400 hover:text-dark cursor-pointer transition-colors"><LogOut size={20} /></div>
      </div>
      
    </div>
  );
};

export default Sidebar;