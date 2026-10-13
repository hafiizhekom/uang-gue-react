import { create } from 'zustand'
import axios from 'axios'

export const useProjectStore = create((set, get) => ({
  // Daftar semua project user
  projects: [],
  // Project yang sedang aktif dipilih
  activeProject: JSON.parse(localStorage.getItem('activeProject')) || null,
  // Loading state
  loading: false,

  // Set project aktif — simpan ke localStorage & update header Axios
  setActiveProject: (project) => {
    if (project) {
      localStorage.setItem('activeProject', JSON.stringify(project));
    } else {
      localStorage.removeItem('activeProject');
    }
    set({ activeProject: project });
  },

  // Fetch semua project dari API, auto-set project pertama jika belum ada
  fetchProjects: async () => {
    set({ loading: true });
    try {
      const res = await axios.get('/projects');
      const projects = res.data?.data || [];
      set({ projects, loading: false });

      // Kalau belum ada project aktif, otomatis pilih yang pertama
      const current = get().activeProject;
      if (!current && projects.length > 0) {
        get().setActiveProject(projects[0]);
      } else if (current) {
        // Sinkronisasi supaya data selalu fresh dari server
        const refreshed = projects.find((p) => p.id === current.id);
        if (refreshed) get().setActiveProject(refreshed);
      }
    } catch (err) {
      set({ loading: false });
      console.error('Failed to fetch projects:', err);
    }
  },

  // Reset saat logout
  clearProject: () => {
    localStorage.removeItem('activeProject');
    set({ projects: [], activeProject: null });
  },
}));
