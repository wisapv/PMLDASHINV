import React from 'react';
import { Home, UploadCloud, LayoutGrid, ClipboardList, DownloadCloud, LogOut } from 'lucide-react';

const Sidebar = ({ activeModule, setActiveModule }) => {
  return (
    <div className="fixed left-6 top-[96px] bottom-6 w-[55px] bg-white rounded-full shadow-sm flex flex-col items-center py-6 z-40">
      
      {/* Main Menu */}
      <div className="flex flex-col gap-4 flex-1 w-full items-center">
        
        {/* 1. Home */}
        <div 
          onClick={() => setActiveModule('home')}
          title="Home"
          className={`p-3 rounded-full cursor-pointer transition-all ${
            activeModule === 'home' ? 'bg-dark text-white shadow-md scale-110' : 'text-gray-400 hover:text-dark'
          }`}
        >
          <Home size={20} />
        </div>

        {/* 2. Part list upload */}
        <div 
          onClick={() => setActiveModule('upload')}
          title="Part List Upload"
          className={`p-3 rounded-full cursor-pointer transition-all ${
            activeModule === 'upload' ? 'bg-dark text-white shadow-md scale-110' : 'text-gray-400 hover:text-dark'
          }`}
        >
          <UploadCloud size={20} />
        </div>

        {/* 3. Dashboard */}
        <div 
          onClick={() => setActiveModule('dashboard')}
          title="Dashboard"
          className={`p-3 rounded-full cursor-pointer transition-all ${
            activeModule === 'dashboard' ? 'bg-dark text-white shadow-md scale-110' : 'text-gray-400 hover:text-dark'
          }`}
        >
          <LayoutGrid size={20} />
        </div>

        {/* 4. Inventory Result */}
        <div 
          onClick={() => setActiveModule('result')}
          title="Inventory Result"
          className={`p-3 rounded-full cursor-pointer transition-all ${
            activeModule === 'result' ? 'bg-dark text-white shadow-md scale-110' : 'text-gray-400 hover:text-dark'
          }`}
        >
          <ClipboardList size={20} />
        </div>
      </div>

      {/* Bottom Menu */}
      <div className="flex flex-col gap-6 mt-auto">
        {/* 5. File download */}
        <div title="File Download" className="p-3 text-gray-400 hover:text-dark cursor-pointer transition-colors">
          <DownloadCloud size={20} />
        </div>
        {/* 6. Log out */}
        <div title="Log Out" className="p-3 text-gray-400 hover:text-danger cursor-pointer transition-colors">
          <LogOut size={20} />
        </div>
      </div>
      
    </div>
  );
};

export default Sidebar;