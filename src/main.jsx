import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import axios from 'axios'
import './index.css'
import App from './App.jsx'

// Ambil URL dari .env
axios.defaults.baseURL = import.meta.env.VITE_API_BASE_URL;

axios.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// 2. Render Aplikasi
createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)