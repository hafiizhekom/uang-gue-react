import { useState } from 'react';
import axios from 'axios';
import { useAuthStore } from '../store/useAuthStore';
import { useNavigate } from 'react-router-dom';
import { GoogleLogin } from '@react-oauth/google';

export default function Login() {
  const [loading, setLoading] = useState(false);
  const setAuth = useAuthStore((state) => state.setAuth);
  const navigate = useNavigate();

  const handleGoogleSuccess = async (credentialResponse) => {
    setLoading(true);
    try {
      // Mengirim id_token ke Laravel
      const res = await axios.post('/auth/google', { 
        id_token: credentialResponse.credential 
      });
      
      // Simpan data user dan token aplikasi
      setAuth(res.data.user, res.data.access_token);
      navigate('/');
    } catch (err) {
      console.error("Google Auth Error:", err.response?.data);
      alert(err.response?.data?.message || "Login Gagal. Pastikan akun Anda terdaftar.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4 font-sans">
      <div className="max-w-sm w-full bg-white rounded-[3rem] shadow-2xl shadow-slate-200/50 border border-slate-100 p-12 space-y-10 animate-in fade-in zoom-in duration-500">
        
        {/* LOGO AREA */}
        <div className="text-center space-y-2">
          <div className="w-20 h-20 bg-emerald-500 rounded-[2rem] mx-auto flex items-center justify-center shadow-lg shadow-emerald-500/30 mb-6">
            <img src="/logo.webp" alt="UangGue Logo" />
          </div>
          <h1 className="text-4xl font-black text-slate-900 tracking-tighter">
            Uang<span className="text-emerald-500">Gue</span>
          </h1>
          <p className="text-slate-400 text-xs font-black uppercase tracking-[0.2em]">Personal Financial Tracker</p>
        </div>

        {/* INSTRUCTION */}
        <div className="text-center">
          <p className="text-slate-600 font-bold text-sm leading-relaxed">
            Silahkan masuk dengan akun Google Anda.
          </p>
        </div>

        {/* GOOGLE LOGIN BUTTON */}
        <div className="flex flex-col items-center gap-4">
          <div className={`w-full flex justify-center transition-all duration-300 ${loading ? 'opacity-50 pointer-events-none scale-95' : 'hover:scale-105'}`}>
            <GoogleLogin
              onSuccess={handleGoogleSuccess}
              onError={() => alert('Google Login Gagal')}
              useOneTap
              theme="filled_blue"
              shape="pill"
              size="large"
              text="signin_with"
              width="320px"
            />
          </div>
          
          {loading && (
            <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-emerald-500 animate-pulse">
              <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-bounce"></div>
              Authenticating...
            </div>
          )}
        </div>

        {/* FOOTER */}
        <div className="text-center pt-4">
          <p className="text-[10px] text-slate-300 font-bold uppercase tracking-widest">
            &copy; 2026 UangGue
          </p>
        </div>
      </div>
    </div>
  );
}