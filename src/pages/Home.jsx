import React from 'react';

const Home = () => {
  return (
    <div className="flex flex-col items-center justify-center min-h-[70vh] bg-white rounded-3xl shadow-sm border border-gray-100 p-10 relative overflow-hidden">
      
      {/* ส่วนข้อความต้อนรับ */}
      <div className="text-center z-10 mb-8">
        <h1 className="text-4xl font-bold text-dark mb-4 tracking-tight">Welcome to <span className="text-primary">PML WISA</span></h1>
        <p className="text-gray-500 text-lg max-w-2xl mx-auto leading-relaxed">
          ระบบจัดการและตรวจนับสต็อกสินค้าแบบ Real-time ทำงานร่วมกับ Handheld Scanner และ Web Dashboard เพื่อให้การนับสต็อกของคุณรวดเร็วและแม่นยำที่สุด
        </p>
      </div>

      {/* ส่วนน้องแมว Pixel */}
      <div className="relative w-full max-w-md h-40 mt-8">
        {/* ใช้ animate-bounce ของ Tailwind เพื่อให้น้องแมวดูขยับตัว */}
        <img 
          src="https://static.vecteezy.com/system/resources/previews/027/190/725/original/pixel-art-cute-black-cat-cartoon-character-2-png.png" 
          alt="Pixel Cat" 
          className="absolute bottom-0 left-1/2 -translate-x-1/2 w-32 h-32 animate-bounce drop-shadow-xl" 
        />
        {/* พื้นหลังตกแต่ง (อุปกรณ์เสริมให้ดูน่ารักขึ้น) */}
        <div className="absolute bottom-[-10px] left-1/2 -translate-x-1/2 w-48 h-6 bg-gray-200 rounded-[100%] blur-sm opacity-50"></div>
      </div>

      {/* กล่องบอกฟีเจอร์หลัก (Overall Program) */}
      <div className="grid grid-cols-3 gap-6 w-full max-w-4xl mt-16 z-10">
        <div className="bg-[#F5F6F8] p-6 rounded-2xl text-center">
          <h3 className="font-bold text-dark mb-2">1. Upload List</h3>
          <p className="text-sm text-gray-500">อัพโหลดไฟล์เพื่อสร้างข้อมูล Master สำหรับการตรวจนับ</p>
        </div>
        <div className="bg-[#F5F6F8] p-6 rounded-2xl text-center">
          <h3 className="font-bold text-dark mb-2">2. Check Stock</h3>
          <p className="text-sm text-gray-500">สแกนและอัพเดทข้อมูลผ่าน Handheld แบบ Real-time</p>
        </div>
        <div className="bg-[#F5F6F8] p-6 rounded-2xl text-center">
          <h3 className="font-bold text-dark mb-2">3. Dashboard</h3>
          <p className="text-sm text-gray-500">ติดตามความคืบหน้าและดูผลลัพธ์ผ่านหน้าเว็บทันที</p>
        </div>
      </div>

    </div>
  );
};

export default Home;