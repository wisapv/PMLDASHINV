import React, { useState } from 'react';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import Overview from './pages/Overview';
import Detail from './pages/Detail';
import ListCreate from './pages/ListCreate';
import Home from './pages/Home'; // 👇 เพิ่มการ import หน้า Home

function App() {
  const [activeTab, setActiveTab] = useState('Overview');
  const [activeModule, setActiveModule] = useState('home'); // 👇 ตั้งค่าเริ่มต้นเป็นหน้า home

  return (
    <div className="min-h-screen bg-[#F5F6F8] font-sans text-dark overflow-x-hidden overflow-y-scroll">
      
      <Sidebar activeModule={activeModule} setActiveModule={setActiveModule} />
      
      <Header 
        activeTab={activeTab} 
        setActiveTab={setActiveTab} 
        activeModule={activeModule} 
      />

      <div className="flex pt-[96px]">
        <div className="flex-1 ml-[110px] py-6 pr-8 flex flex-col gap-6 min-w-0">
          
          {/* 👇 จัดการการเปลี่ยนหน้าตาม Module ที่เลือกจาก Sidebar */}
          {activeModule === 'home' && <Home />}
          
          {activeModule === 'upload' && <ListCreate />}
          
          {activeModule === 'dashboard' && (
            <>
              {activeTab === 'Overview' && <Overview />}
              {activeTab === 'Detail' && <Detail />}
              {activeTab === 'Summary' && <div className="p-20 text-center text-gray-400 bg-white rounded-3xl shadow-sm border border-gray-100">Summary Page</div>}
            </>
          )}

          {activeModule === 'result' && (
            <div className="p-20 text-center text-gray-400 bg-white rounded-3xl shadow-sm border border-gray-100">
              Inventory Result Page (กำลังพัฒนา...)
            </div>
          )}

        </div>
      </div>
    </div>
  );
}

export default App;