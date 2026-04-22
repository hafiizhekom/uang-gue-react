import React from 'react';

export default function Toast({ data, onClose }) {
    if (!data.show) return null;

    // Mapping warna berdasarkan type
    const styles = {
        success: {
            bg: 'bg-emerald-50 border-emerald-100',
            iconBg: 'bg-emerald-500',
            text: 'text-emerald-600',
            icon: '✓'
        },
        error: {
            bg: 'bg-rose-50 border-rose-100',
            iconBg: 'bg-rose-500',
            text: 'text-rose-600',
            icon: '!'
        },
        warning: {
            bg: 'bg-amber-50 border-amber-100',
            iconBg: 'bg-amber-500',
            text: 'text-amber-600',
            icon: '⚠'
        },
        info: {
            bg: 'bg-blue-50 border-blue-100',
            iconBg: 'bg-blue-500',
            text: 'text-blue-600',
            icon: 'ℹ'
        }
    };

    const currentStyle = styles[data.type] || styles.success;

    return (
        <div className={`fixed top-10 right-10 z-[100] p-5 rounded-[2rem] shadow-2xl border flex flex-col min-w-[320px] animate-in fade-in slide-in-from-top-5 duration-300 ${currentStyle.bg}`}>
            <div className="flex items-center gap-4">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center font-black text-white ${currentStyle.iconBg}`}>
                    {currentStyle.icon}
                </div>
                <div className="flex-1">
                    <p className={`text-[10px] font-black uppercase tracking-[0.2em] ${currentStyle.text}`}>
                        {data.type}
                    </p>
                    <p className="text-xs font-bold text-slate-700 leading-tight">{data.message}</p>
                </div>
                <button onClick={onClose} className="text-slate-400 hover:text-slate-600 font-black text-xl transition-colors">×</button>
            </div>

            {/* Render detail error dari Laravel (Validation Errors) */}
            {data.errors && (
                <div className="mt-3 pl-12 space-y-1 border-t border-rose-200/50 pt-2">
                    {Object.keys(data.errors).map((key) => (
                        data.errors[key].map((msg, i) => (
                            <p key={`${key}-${i}`} className="text-[10px] font-bold text-rose-500 italic leading-none">
                                • {msg}
                            </p>
                        ))
                    ))}
                </div>
            )}
        </div>
    );
}