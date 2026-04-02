import React, { useState } from 'react';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import Overview from './pages/Overview';
import Detail from './pages/Detail';
import ListCreate from './pages/ListCreate';

function App() {
  const [activeTab, setActiveTab] = useState('Overview');
  const [activeModule, setActiveModule] = useState('dashboard');

  return (
    <div className="min-h-screen bg-[#F5F6F8] font-sans text-dark overflow-x-hidden overflow-y-scroll">
      
      <Sidebar activeModule={activeModule} setActiveModule={setActiveModule} />
      
      {/* 👇 ย้ายออกมาไว้ตรงนี้เพื่อให้โชว์ตลอด และส่ง activeModule เข้าไป */}
      <Header 
        activeTab={activeTab} 
        setActiveTab={setActiveTab} 
        activeModule={activeModule} 
      />

      <div className="flex pt-[96px]">
        <div className="flex-1 ml-[110px] py-6 pr-8 flex flex-col gap-6 min-w-0">
          
          {activeModule === 'dashboard' ? (
            <>
              {activeTab === 'Overview' && <Overview />}
              {activeTab === 'Detail' && <Detail />}
              {activeTab === 'Summary' && <div className="p-20 text-center text-gray-400">Summary Page</div>}
            </>
          ) : (
            <ListCreate />
          )}

        </div>
      </div>
    </div>
  );
}

export default App;