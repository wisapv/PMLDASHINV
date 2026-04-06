import React, { useState } from 'react';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import Overview from './pages/Overview';
import Detail from './pages/Detail';
import ListCreate from './pages/ListCreate';
import Home from './pages/Home';

function App() {
  const [activeModule, setActiveModule] = useState('home');
  const [activeTab, setActiveTab] = useState('Overview'); // ใช้สำหรับหน้า Dashboard
  const [uploadTab, setUploadTab] = useState('TBOS');     // ใช้สำหรับหน้า Upload (เพิ่มใหม่)

  return (
    <div className="min-h-screen bg-[#F5F6F8] font-sans text-dark overflow-x-hidden overflow-y-scroll">
      
      <Sidebar activeModule={activeModule} setActiveModule={setActiveModule} />
      
      {/* ส่งค่า State ไปให้ Header จัดการแสดงผล Tabs */}
      <Header 
        activeTab={activeTab} 
        setActiveTab={setActiveTab} 
        activeModule={activeModule}
        uploadTab={uploadTab}
        setUploadTab={setUploadTab}
      />

      <div className="flex pt-[96px]">
        <div className="flex-1 ml-[110px] py-6 pr-8 flex flex-col gap-6 min-w-0">
          
          {activeModule === 'home' && <Home />}
          
          {/* ส่ง uploadTab ไปให้ ListCreate เพื่อเลือกว่าจะโชว์ TBOS หรือ Handheld */}
          {activeModule === 'upload' && <ListCreate activeTab={uploadTab} />}
          
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