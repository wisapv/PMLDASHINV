import React from 'react';
import { Sun, Moon, LayoutGrid, Calendar, Mail, Users, Layers, Settings, HelpCircle, LogOut } from 'lucide-react';

const Sidebar = () => {
  return (
    // 👇 แก้ top เป็น 96px เพื่อให้หลบ Header ที่อยู่ด้านบน
    <div className="fixed left-6 top-[96px] bottom-6 w-[55px] bg-white rounded-full shadow-sm flex flex-col items-center py-6 z-40">
      
      

      {/* Main Menu */}
      <div className="flex flex-col gap-4 flex-1 w-full items-center">
        <div className="p-3 bg-dark text-white rounded-full cursor-pointer shadow-md">
          <LayoutGrid size={20} />
        </div>
        <div className="p-3 text-gray-400 hover:text-dark cursor-pointer transition-colors">
          <Calendar size={20} />
        </div>
        <div className="p-3 text-gray-400 hover:text-dark cursor-pointer transition-colors">
          <Mail size={20} />
        </div>
        <div className="p-3 text-gray-400 hover:text-dark cursor-pointer transition-colors">
          <Users size={20} />
        </div>
        <div className="p-3 text-gray-400 hover:text-dark cursor-pointer transition-colors">
          <Layers size={20} />
        </div>
        <div className="p-3 text-gray-400 hover:text-dark cursor-pointer transition-colors">
          <Settings size={20} />
        </div>
      </div>

      {/* Bottom Menu */}
      <div className="flex flex-col gap-6 mt-auto">
        <div className="p-3 text-gray-400 hover:text-dark cursor-pointer transition-colors">
          <HelpCircle size={20} />
        </div>
        <div className="p-3 text-gray-400 hover:text-dark cursor-pointer transition-colors">
          <LogOut size={20} />
        </div>
      </div>
      
    </div>
  );
};

export default Sidebar;