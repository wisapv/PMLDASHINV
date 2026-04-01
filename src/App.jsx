import React, { useState } from 'react';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import Overview from './pages/Overview';
import Detail from './pages/Detail';

function App() {
  // สร้าง State ควบคุมหน้าจอ
  const [activeTab, setActiveTab] = useState('Overview');

  return (
    <div className="min-h-screen bg-[#F5F6F8] font-sans text-dark overflow-x-hidden overflow-y-scroll">
      {/* ส่ง State ไปให้ Header สลับหน้าได้ */}
      <Header activeTab={activeTab} setActiveTab={setActiveTab} />

      <div className="flex pt-[96px]">
        <Sidebar />
        <div className="flex-1 ml-[110px] py-6 pr-8 flex flex-col gap-6 min-w-0">
          
          {/* สลับการแสดงผลตรงนี้ตามที่กดจาก Header */}
          {activeTab === 'Overview' && <Overview />}
          {activeTab === 'Detail' && <Detail />}
          {activeTab === 'Summary' && (
             <div className="bg-white p-10 rounded-[24px] text-center text-gray-400">
               Summary Page Coming Soon...
             </div>
          )}

        </div>
      </div>
    </div>
  );
}

export default App;