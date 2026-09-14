/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        positivo: { light: '#ecfdf5', DEFAULT: '#10b981', dark: '#047857' },
        atencao: { light: '#fffbeb', DEFAULT: '#f59e0b', dark: '#b45309' },
        critico: { light: '#fef2f2', DEFAULT: '#ef4444', dark: '#b91c1c' },
        info: { light: '#eff6ff', DEFAULT: '#3b82f6', dark: '#1d4ed8' },
        marca: { 50:'#f0f5ff',100:'#dce8ff',500:'#3d5afe',600:'#2f46d1',700:'#25379f',900:'#131b3d' },
      },
    },
  },
  plugins: [],
};
