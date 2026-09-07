import React, { useState } from 'react';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import Overview from './pages/Overview';
import Detail from './pages/Detail';
import ListCreate from './pages/ListCreate';
import Home from './pages/Home';
import TemplateManager from './pages/TemplateManager'
import HandheldDevices from './pages/HandheldDevices'
import NqcMasterManager from './pages/NqcMasterManager'
import GetsudoPage from './pages/GetsudoPage'
import AssignHandheld from './pages/AssignHandheld'
import SendPartList from './pages/SendPartList'

function App() {
  const [activeModule, setActiveModule] = useState('home');
  const [activeTab, setActiveTab] = useState('Overview'); // ใช้สำหรับหน้า Dashboard
  const [uploadTab, setUploadTab] = useState('TBOS');     // ใช้สำหรับหน้า Upload (เพิ่มใหม่)
  const [templateTab, setTemplateTab] = useState('FORMAT'); // ใช้สำหรับหน้า Template Management (FORMAT / DEVICE / NQC MASTER)
  const [getsudoTab, setGetsudoTab] = useState('Target List'); // ใช้สำหรับหน้า Getsudo (Target List / Assign)

  // Every module the user has opened at least once. A module is only
  // mounted into the DOM (and stays mounted, hidden via CSS, from then on —
  // see the "hidden" toggles below) the FIRST time it's actually visited.
  // Without this gate, ALL modules would mount immediately on app load
  // regardless of which page the user opens first — for Upload/TBOS that
  // means ListCreate (and HandheldManager inside it) would fire their
  // data-restore fetches and render a possibly large merged batch's tables
  // before the user ever clicked Upload, causing a lag spike right at
  // startup. This keeps the "don't unmount on navigation" fix from the
  // App.jsx change while avoiding "mount and fetch everything eagerly".
  const [visitedModules, setVisitedModules] = useState(() => new Set([activeModule]));

  // Adjusted during render (React's recommended pattern for syncing state to
  // a changed value) rather than in a useEffect — calling setState here is
  // safe: React discards this render and immediately re-renders with the
  // updated set before anything is painted, so there's no extra visible
  // frame or effect-driven cascade.
  if (!visitedModules.has(activeModule)) {
    setVisitedModules((prev) => new Set(prev).add(activeModule));
  }

  return (
    <div className="min-h-screen bg-canvas font-sans text-ink overflow-x-hidden overflow-y-scroll">

      <Sidebar activeModule={activeModule} setActiveModule={setActiveModule} />

      {/* ส่งค่า State ไปให้ Header จัดการแสดงผล Tabs */}
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        activeModule={activeModule}
        uploadTab={uploadTab}
        setUploadTab={setUploadTab}
        templateTab={templateTab}
        setTemplateTab={setTemplateTab}
        getsudoTab={getsudoTab}
        setGetsudoTab={setGetsudoTab}
      />

      <div className="flex pt-[132px]">
        <div className="flex-1 ml-[116px] pb-12 pr-8 flex flex-col gap-6 min-w-0">

          {/* ทุก module ถูก mount ค้างไว้ตลอด แล้วซ่อน/โชว์ด้วย CSS (className="hidden")
              แทนการ mount/unmount ตาม activeModule แบบเดิม
              ("{activeModule === 'x' && <X />}") — เดิมพอสลับ module ออกไป
              component นั้นจะถูก unmount ทิ้งทั้งก้อน ทำให้ local state
              (useState) ทุกตัวข้างในหายหมด สลับกลับมาต้องเริ่มใหม่/อัพโหลดใหม่
              การใช้ CSS hidden แทนทำให้ component ยังอยู่ใน memory เหมือนเดิม
              ตลอดเวลา จึง state ไม่หายเมื่อสลับหน้าไปมา (เหมือน pattern เดิมที่
              ListCreate.jsx ใช้อยู่แล้วตอนสลับ TBOS/Handheld tab) */}

          {visitedModules.has('home') && (
            <div className={activeModule === 'home' ? '' : 'hidden'}>
              <Home />
            </div>
          )}

          {/* ส่ง uploadTab ไปให้ ListCreate เพื่อเลือกว่าจะโชว์ TBOS หรือ Handheld */}
          {visitedModules.has('upload') && (
            <div className={activeModule === 'upload' ? '' : 'hidden'}>
              <ListCreate activeTab={uploadTab} setUploadTab={setUploadTab} setActiveModule={setActiveModule} />
            </div>
          )}

          {visitedModules.has('template') && (
            <div className={activeModule === 'template' ? '' : 'hidden'}>
              <div className={templateTab === 'FORMAT' ? '' : 'hidden'}>
                <TemplateManager />
              </div>
              <div className={templateTab === 'DEVICE' ? '' : 'hidden'}>
                <HandheldDevices />
              </div>
              <div className={templateTab === 'NQC MASTER' ? '' : 'hidden'}>
                <NqcMasterManager />
              </div>
            </div>
          )}

          {/* Getsudo — its own module, separate from the Part Runout
              (TBOS -> Handheld -> Assign) pipeline above, since it's a
              genuinely different flow (pick any part number on demand vs.
              the fixed Part Runout list). "Assign" here re-renders the
              SAME AssignHandheld component the Part Runout flow uses —
              not a copy — so every improvement (multi-device sharing,
              Duplicate, partial send, export) applies to both automatically.
              No currentBatchId/subscribeToEvent wiring needed here: this
              entry point always starts with nothing selected and the admin
              picks a Getsudo batch from AssignHandheld's own "MANAGING
              BATCH" dropdown. */}
          {visitedModules.has('getsudo') && (
            <div className={activeModule === 'getsudo' ? '' : 'hidden'}>
              <div className={getsudoTab === 'Target List' ? '' : 'hidden'}>
                <GetsudoPage />
              </div>
              <div className={getsudoTab === 'Assign' ? '' : 'hidden'}>
                <AssignHandheld currentBatchId={null} setUploadTab={() => {}} subscribeToEvent={undefined} />
              </div>
            </div>
          )}

          {visitedModules.has('dashboard') && (
            <div className={activeModule === 'dashboard' ? '' : 'hidden'}>
              <div className={activeTab === 'Overview' ? '' : 'hidden'}>
                <Overview />
              </div>
              <div className={activeTab === 'Detail' ? '' : 'hidden'}>
                <Detail />
              </div>
              <div className={activeTab === 'Summary' ? '' : 'hidden'}>
                <div className="p-20 text-center text-muted bg-white rounded-4xl shadow-[0_2px_12px_rgba(20,20,15,0.04)] border border-ink/5">Summary Page</div>
              </div>
            </div>
          )}

          {visitedModules.has('result') && (
            <div className={activeModule === 'result' ? '' : 'hidden'}>
              <div className="p-20 text-center text-muted bg-white rounded-4xl shadow-[0_2px_12px_rgba(20,20,15,0.04)] border border-ink/5">
                Inventory Result Page (กำลังพัฒนา...)
              </div>
            </div>
          )}

          {visitedModules.has('send-part-list') && (
            <div className={activeModule === 'send-part-list' ? '' : 'hidden'}>
              <SendPartList onBack={() => setActiveModule('upload')} />
            </div>
          )}

        </div>
      </div>
    </div>
  );
}

export default App;