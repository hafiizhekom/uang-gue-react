import { useEffect, useRef, useState } from 'react';
import axios from 'axios';
import { useProjectStore } from '../store/useProjectStore';

/**
 * ProjectSwitcher — Dropdown untuk memilih project aktif.
 * Bisa dipasang di Header (desktop) maupun menu mobile.
 * Props:
 *   compact: boolean — mode ringkas (hanya ikon + nama singkat), default false
 */
export default function ProjectSwitcher({ compact = false }) {
  const { projects, activeProject, setActiveProject, fetchProjects, loading } = useProjectStore();
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  // Fetch projects saat komponen mount
  useEffect(() => {
    fetchProjects();
  }, []);

  // Tutup dropdown kalau klik di luar
  useEffect(() => {
    const handleClick = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const handleSelect = (project) => {
    setActiveProject(project);
    setOpen(false);
    // Refresh halaman supaya semua data di-load ulang dengan project baru
    window.location.reload();
  };

  const roleColor = {
    owner: 'bg-emerald-100 text-emerald-700',
    member: 'bg-blue-100 text-blue-700',
    viewer: 'bg-slate-100 text-slate-500',
  };

  if (loading && projects.length === 0) {
    return (
      <div className="flex items-center gap-2 px-3 py-2 bg-slate-100 rounded-xl animate-pulse">
        <div className="w-3 h-3 bg-slate-300 rounded-full" />
        <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Loading...</span>
      </div>
    );
  }

  return (
    <div className="relative" ref={ref}>
      {/* Trigger */}
      <button
        onClick={() => setOpen(!open)}
        className={`flex items-center gap-2 rounded-2xl border transition-all font-bold text-sm
          ${open
            ? 'bg-slate-900 border-slate-900 text-white shadow-lg'
            : 'bg-white border-slate-200 text-slate-700 hover:border-slate-400 hover:bg-slate-50'
          }
          ${compact ? 'px-3 py-1.5' : 'px-4 py-2.5'}
        `}
      >
        {/* Ikon folder/project */}
        <span className={`w-5 h-5 rounded-lg flex items-center justify-center flex-shrink-0 ${open ? 'bg-emerald-500' : 'bg-slate-100'}`}>
          <svg className={`w-3 h-3 ${open ? 'text-white' : 'text-slate-500'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5"
              d="M3 7a2 2 0 012-2h4l2 2h8a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V7z" />
          </svg>
        </span>

        <span className={`max-w-[120px] truncate text-[11px] font-black uppercase tracking-wider ${compact ? 'hidden sm:inline' : ''}`}>
          {activeProject?.name || 'Pilih Project'}
        </span>

        <svg className={`w-3.5 h-3.5 flex-shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Dropdown */}
      {open && (
        <div className="absolute right-0 mt-2 w-72 bg-white border border-slate-200 rounded-2xl shadow-2xl shadow-slate-200/60 z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
          {/* Header */}
          <div className="px-4 pt-4 pb-3 border-b border-slate-100">
            <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em]">Project Workspace</p>
            <p className="text-sm font-black text-slate-900 tracking-tight mt-0.5">Pilih project aktif</p>
          </div>

          {/* List */}
          <ul className="py-2 max-h-60 overflow-y-auto">
            {projects.length === 0 ? (
              <li className="px-4 py-3 text-xs text-slate-400 font-medium">Belum ada project</li>
            ) : (
              projects.map((project) => {
                const isSelected = activeProject?.id === project.id;
                const role = project.pivot?.role || project.role || 'member';
                return (
                  <li key={project.id}>
                    <button
                      onClick={() => handleSelect(project)}
                      className={`w-full text-left px-4 py-3 flex items-center gap-3 transition-all hover:bg-slate-50
                        ${isSelected ? 'bg-emerald-50/60' : ''}
                      `}
                    >
                      {/* Active indicator */}
                      <span className={`w-2 h-2 rounded-full flex-shrink-0 ${isSelected ? 'bg-emerald-500' : 'bg-slate-200'}`} />
                      <div className="flex-1 min-w-0">
                        <p className={`text-xs font-black truncate ${isSelected ? 'text-emerald-700' : 'text-slate-800'}`}>
                          {project.name}
                        </p>
                        {project.description && (
                          <p className="text-[10px] text-slate-400 truncate mt-0.5">{project.description}</p>
                        )}
                      </div>
                      <span className={`text-[9px] font-black px-2 py-0.5 rounded-lg uppercase tracking-wider flex-shrink-0 ${roleColor[role] || roleColor.member}`}>
                        {role}
                      </span>
                    </button>
                  </li>
                );
              })
            )}
          </ul>

          {/* Footer — Link ke halaman Projects */}
          <div className="px-3 pb-3 border-t border-slate-100 pt-2">
            <a
              href="/projects"
              onClick={() => setOpen(false)}
              className="w-full flex items-center justify-center gap-2 py-2.5 text-[10px] font-black uppercase tracking-widest text-emerald-600 hover:bg-emerald-50 rounded-xl transition-all"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 4v16m8-8H4" />
              </svg>
              Kelola Project
            </a>
          </div>
        </div>
      )}
    </div>
  );
}
