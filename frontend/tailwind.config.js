/** @type {import('tailwindcss').Config} */
export default {
  content: [
  "./index.html",
  "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        background: '#F5F6F8', // สีพื้นหลังเทาอ่อน
        primary: '#FF6A3D',    // สีส้ม
        dark: '#1C1C1E',       // สีดำเข้ม
        success: '#22C55E',    // สีเขียว
        danger: '#EF4444',     // สีแดง
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
      }
    },
  },
  plugins: [],
}