import { useEffect, useState } from 'react';
import axios from 'axios';
import { useAuthStore } from '../../store/useAuthStore';
import { useProjectStore } from '../../store/useProjectStore';
import { useToast } from '../../hooks/useToast';
import Toast from '../../components/Toast';

const ROLE_BADGE = {
  owner: 'bg-emerald-100 text-emerald-700 border border-emerald-200',
  member: 'bg-blue-100 text-blue-700 border border-blue-200',
  viewer: 'bg-slate-100 text-slate-500 border border-slate-200',
};

export default function Projects() {
  const { toast, showToast, hideToast } = useToast();
  const user = useAuthStore((s) => s.user);
  const { projects, activeProject, setActiveProject, fetchProjects } = useProjectStore();

  const [loading, setLoading] = useState(true);

  // ── Create/Edit project modal ──
  const [showProjectModal, setShowProjectModal] = useState(false);
  const [editingProject, setEditingProject] = useState(null); // null = create mode
  const [projectForm, setProjectForm] = useState({ name: '', description: '' });
  const [submitting, setSubmitting] = useState(false);

  // ── Member management modal ──
  const [showMemberModal, setShowMemberModal] = useState(false);
  const [selectedProject, setSelectedProject] = useState(null);
  const [members, setMembers] = useState([]);
  const [memberForm, setMemberForm] = useState({ email: '', role: 'member' });
  const [memberLoading, setMemberLoading] = useState(false);
  const [memberSubmitting, setMemberSubmitting] = useState(false);

  // ── Delete confirm modal ──
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null); // { type: 'project'|'member', data }

  // ─── Init ────────────────────────────────────────────────────────────────────
  useEffect(() => {
    loadProjects();
  }, []);

  const loadProjects = async () => {
    setLoading(true);
    await fetchProjects();
    setLoading(false);
  };

  // ─── Project CRUD ─────────────────────────────────────────────────────────────
  const openCreateProject = () => {
    setEditingProject(null);
    setProjectForm({ name: '', description: '' });
    setShowProjectModal(true);
  };

  const openEditProject = (project) => {
    setEditingProject(project);
    setProjectForm({ name: project.name, description: project.description || '' });
    setShowProjectModal(true);
  };

  const handleSubmitProject = async (e) => {
    e.preventDefault();
    if (!projectForm.name.trim()) return;
    setSubmitting(true);
    try {
      if (editingProject) {
        await axios.put(`/projects/${editingProject.id}`, projectForm);
        showToast('Project berhasil diupdate!', 'success');
      } else {
        await axios.post('/projects', projectForm);
        showToast('Project berhasil dibuat!', 'success');
      }
      setShowProjectModal(false);
      await loadProjects();
    } catch (err) {
      const msg = err.response?.data?.message || 'Gagal menyimpan project.';
      showToast(msg, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteProject = async () => {
    if (!deleteTarget) return;
    setSubmitting(true);
    try {
      await axios.delete(`/projects/${deleteTarget.data.id}`);
      // Kalau project aktif yang dihapus, reset
      if (activeProject?.id === deleteTarget.data.id) setActiveProject(null);
      showToast('Project berhasil dihapus.', 'success');
      setShowDeleteModal(false);
      await loadProjects();
    } catch (err) {
      showToast(err.response?.data?.message || 'Gagal menghapus project.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  // ─── Member Management ───────────────────────────────────────────────────────
  const openMemberModal = async (project) => {
    setSelectedProject(project);
    setMemberForm({ email: '', role: 'member' });
    setShowMemberModal(true);
    setMemberLoading(true);
    try {
      const res = await axios.get(`/projects/${project.id}/members`);
      setMembers(res.data?.data || []);
    } catch {
      setMembers([]);
    } finally {
      setMemberLoading(false);
    }
  };

  const handleAddMember = async (e) => {
    e.preventDefault();
    if (!memberForm.email.trim()) return;
    setMemberSubmitting(true);
    try {
      await axios.post(`/projects/${selectedProject.id}/members`, memberForm);
      showToast('Member berhasil ditambahkan!', 'success');
      setMemberForm({ email: '', role: 'member' });
      // Refresh members
      const res = await axios.get(`/projects/${selectedProject.id}/members`);
      setMembers(res.data?.data || []);
    } catch (err) {
      showToast(err.response?.data?.message || 'Gagal menambahkan member.', 'error');
    } finally {
      setMemberSubmitting(false);
    }
  };

  const handleRemoveMember = async () => {
    if (!deleteTarget) return;
    setSubmitting(true);
    try {
      await axios.delete(`/projects/${selectedProject.id}/members/${deleteTarget.data.id}`);
      showToast('Member berhasil dikeluarkan.', 'success');
      setShowDeleteModal(false);
      const res = await axios.get(`/projects/${selectedProject.id}/members`);
      setMembers(res.data?.data || []);
    } catch (err) {
      showToast(err.response?.data?.message || 'Gagal mengeluarkan member.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  // ─── Helper ──────────────────────────────────────────────────────────────────
  const myRole = (project) => project.pivot?.role || project.role;
  const isOwner = (project) => myRole(project) === 'owner';

  const handleSetActive = (project) => {
    setActiveProject(project);
    showToast(`Project "${project.name}" sekarang aktif.`, 'success');
    setTimeout(() => window.location.href = '/', 1000);
  };

  // ─── Render ──────────────────────────────────────────────────────────────────
  return (
    <div className="p-8 space-y-8 bg-slate-50 min-h-screen">
      <Toast data={toast} onClose={hideToast} />

      {/* Page Header */}
      <div className="flex justify-between items-end">
        <div>
          <h2 className="text-4xl font-black tracking-tighter text-slate-900 leading-none">Projects</h2>
          <p className="text-emerald-500 font-bold uppercase text-[10px] tracking-widest mt-2">
            Workspace Management
          </p>
        </div>
        <button
          onClick={openCreateProject}
          className="flex items-center gap-2 px-6 py-3 bg-slate-900 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-emerald-500 transition-all shadow-sm active:scale-95"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 4v16m8-8H4" />
          </svg>
          New Project
        </button>
      </div>

      {/* Projects Grid */}
      {loading ? (
        <div className="flex justify-center py-20">
          <p className="text-slate-400 font-black uppercase text-[10px] tracking-widest animate-pulse">Loading projects...</p>
        </div>
      ) : projects.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 space-y-4">
          <div className="w-16 h-16 bg-slate-100 rounded-3xl flex items-center justify-center">
            <svg className="w-8 h-8 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                d="M3 7a2 2 0 012-2h4l2 2h8a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V7z" />
            </svg>
          </div>
          <p className="text-slate-400 font-bold text-sm">Belum ada project. Buat sekarang!</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {projects.map((project) => {
            const isActive = activeProject?.id === project.id;
            const role = myRole(project);
            const owner = isOwner(project);

            return (
              <div
                key={project.id}
                className={`bg-white rounded-[2.5rem] border shadow-sm p-8 flex flex-col gap-5 transition-all
                  ${isActive ? 'border-emerald-400 shadow-emerald-100' : 'border-slate-100 hover:shadow-md'}
                `}
              >
                {/* Top Row */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      {isActive && (
                        <span className="w-2 h-2 rounded-full bg-emerald-500 flex-shrink-0" />
                      )}
                      <h3 className="text-base font-black text-slate-900 truncate">{project.name}</h3>
                    </div>
                    <p className="text-[11px] text-slate-400 line-clamp-2">
                      {project.description || <span className="italic">Tidak ada deskripsi</span>}
                    </p>
                  </div>
                  <span className={`text-[9px] font-black px-2.5 py-1 rounded-xl uppercase tracking-wider flex-shrink-0 ${ROLE_BADGE[role] || ROLE_BADGE.member}`}>
                    {role}
                  </span>
                </div>

                {/* Stats */}
                <div className="flex items-center gap-3 text-[10px] font-black text-slate-400">
                  <span className="flex items-center gap-1">
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                        d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    {project.users_count ?? project.members_count ?? '?'} members
                  </span>
                  {isActive && (
                    <span className="text-emerald-600 uppercase">• Active</span>
                  )}
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 mt-auto pt-4 border-t border-slate-100">
                  {/* Set Active */}
                  {!isActive && (
                    <button
                      onClick={() => handleSetActive(project)}
                      className="flex-1 py-2.5 text-[10px] font-black uppercase tracking-widest bg-emerald-50 text-emerald-700 rounded-xl hover:bg-emerald-500 hover:text-white transition-all border border-emerald-200 active:scale-95"
                    >
                      Set Active
                    </button>
                  )}
                  {isActive && (
                    <div className="flex-1 py-2.5 text-[10px] font-black uppercase tracking-widest bg-emerald-500 text-white rounded-xl text-center">
                      ✓ Active
                    </div>
                  )}

                  {/* Kelola Members */}
                  <button
                    onClick={() => openMemberModal(project)}
                    title="Kelola Members"
                    className="p-2.5 bg-slate-100 text-slate-600 rounded-xl hover:bg-slate-200 transition-all active:scale-95"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                        d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  </button>

                  {/* Edit — hanya owner */}
                  {owner && (
                    <button
                      onClick={() => openEditProject(project)}
                      title="Edit Project"
                      className="p-2.5 bg-slate-100 text-slate-600 rounded-xl hover:bg-slate-200 transition-all active:scale-95"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                          d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                    </button>
                  )}

                  {/* Delete — hanya owner */}
                  {owner && (
                    <button
                      onClick={() => { setDeleteTarget({ type: 'project', data: project }); setShowDeleteModal(true); }}
                      title="Hapus Project"
                      className="p-2.5 bg-rose-50 text-rose-500 rounded-xl hover:bg-rose-500 hover:text-white transition-all border border-rose-100 active:scale-95"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                          d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ══ MODAL: Create / Edit Project ══════════════════════════════════════════ */}
      {showProjectModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-md p-10 space-y-6 animate-in fade-in zoom-in-95 duration-200">
            <div>
              <p className="text-[10px] font-black text-emerald-500 uppercase tracking-[0.2em]">
                {editingProject ? 'Edit Project' : 'New Project'}
              </p>
              <h3 className="text-2xl font-black tracking-tighter text-slate-900 mt-0.5">
                {editingProject ? 'Update informasi project' : 'Buat project baru'}
              </h3>
            </div>

            <form onSubmit={handleSubmitProject} className="space-y-4">
              <div>
                <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1.5">
                  Nama Project *
                </label>
                <input
                  type="text"
                  value={projectForm.name}
                  onChange={(e) => setProjectForm({ ...projectForm, name: e.target.value })}
                  placeholder="Contoh: Keuangan Pribadi 2026"
                  className="w-full px-4 py-3 border border-slate-200 rounded-2xl text-sm font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-400 transition-all"
                  required
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1.5">
                  Deskripsi
                </label>
                <textarea
                  value={projectForm.description}
                  onChange={(e) => setProjectForm({ ...projectForm, description: e.target.value })}
                  placeholder="Deskripsi opsional..."
                  rows={3}
                  className="w-full px-4 py-3 border border-slate-200 rounded-2xl text-sm font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-400 transition-all resize-none"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowProjectModal(false)}
                  className="flex-1 py-3 border border-slate-200 text-slate-600 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-slate-50 transition-all active:scale-95"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={submitting || !projectForm.name.trim()}
                  className="flex-1 py-3 bg-slate-900 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-emerald-500 transition-all disabled:opacity-50 disabled:cursor-not-allowed active:scale-95"
                >
                  {submitting ? 'Menyimpan...' : editingProject ? 'Update' : 'Buat Project'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ══ MODAL: Kelola Members ═════════════════════════════════════════════════ */}
      {showMemberModal && selectedProject && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-lg p-10 space-y-6 animate-in fade-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-[10px] font-black text-emerald-500 uppercase tracking-[0.2em]">Member Management</p>
                <h3 className="text-xl font-black tracking-tighter text-slate-900 mt-0.5 truncate">{selectedProject.name}</h3>
              </div>
              <button
                onClick={() => setShowMemberModal(false)}
                className="w-9 h-9 rounded-2xl bg-slate-100 text-slate-400 hover:text-slate-900 flex items-center justify-center font-black text-lg active:scale-95 transition-all"
              >
                ✕
              </button>
            </div>

            {/* Add Member Form — hanya owner */}
            {isOwner(selectedProject) && (
              <form onSubmit={handleAddMember} className="bg-slate-50 rounded-2xl p-5 space-y-3 border border-slate-200/80">
                <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Tambah Member</p>
                <div className="flex gap-2">
                  <input
                    type="email"
                    value={memberForm.email}
                    onChange={(e) => setMemberForm({ ...memberForm, email: e.target.value })}
                    placeholder="Email member..."
                    className="flex-1 px-4 py-2.5 border border-slate-200 rounded-xl text-sm font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-400 transition-all bg-white"
                    required
                  />
                  <select
                    value={memberForm.role}
                    onChange={(e) => setMemberForm({ ...memberForm, role: e.target.value })}
                    className="px-3 py-2.5 border border-slate-200 rounded-xl text-xs font-black text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-400"
                  >
                    <option value="member">Member</option>
                    <option value="viewer">Viewer</option>
                    <option value="owner">Owner</option>
                  </select>
                </div>
                <button
                  type="submit"
                  disabled={memberSubmitting || !memberForm.email.trim()}
                  className="w-full py-2.5 bg-slate-900 text-white rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-emerald-500 transition-all disabled:opacity-50 active:scale-95"
                >
                  {memberSubmitting ? 'Menambahkan...' : '+ Tambah Member'}
                </button>
              </form>
            )}

            {/* Members List */}
            <div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">
                {members.length} Member{members.length !== 1 ? 's' : ''}
              </p>
              {memberLoading ? (
                <p className="text-xs text-slate-400 animate-pulse py-4 text-center">Memuat members...</p>
              ) : members.length === 0 ? (
                <p className="text-xs text-slate-400 py-4 text-center">Belum ada member</p>
              ) : (
                <ul className="space-y-2">
                  {members.map((member) => {
                    const memberRole = member.pivot?.role || 'member';
                    const isSelf = member.id === user?.id;
                    const canRemove = isOwner(selectedProject) && !isSelf;

                    return (
                      <li key={member.id} className="flex items-center gap-3 bg-slate-50 px-4 py-3 rounded-2xl border border-slate-200/80">
                        <div className="w-9 h-9 rounded-full bg-slate-200 border-2 border-white flex items-center justify-center font-black text-sm text-slate-600 flex-shrink-0">
                          {member.name?.charAt(0)?.toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-black text-slate-800 truncate">{member.name}</p>
                          <p className="text-[10px] text-slate-400 truncate">{member.email}</p>
                        </div>
                        <span className={`text-[9px] font-black px-2.5 py-1 rounded-xl uppercase tracking-wider flex-shrink-0 ${ROLE_BADGE[memberRole] || ROLE_BADGE.member}`}>
                          {memberRole}
                        </span>
                        {isSelf && (
                          <span className="text-[9px] font-black text-slate-400 uppercase">You</span>
                        )}
                        {canRemove && (
                          <button
                            onClick={() => {
                              setDeleteTarget({ type: 'member', data: member });
                              setShowDeleteModal(true);
                            }}
                            className="p-1.5 text-rose-400 hover:bg-rose-50 rounded-lg transition-all active:scale-95"
                          >
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                        )}
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ══ MODAL: Konfirmasi Delete ══════════════════════════════════════════════ */}
      {showDeleteModal && deleteTarget && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-sm p-8 space-y-6 text-center animate-in fade-in zoom-in-95 duration-150">
            <div className="w-16 h-16 bg-rose-100 rounded-[1.5rem] flex items-center justify-center mx-auto">
              <svg className="w-8 h-8 text-rose-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <div>
              <h3 className="text-lg font-black text-slate-900">
                {deleteTarget.type === 'project' ? 'Hapus Project?' : 'Keluarkan Member?'}
              </h3>
              <p className="text-sm text-slate-500 mt-1">
                {deleteTarget.type === 'project'
                  ? `"${deleteTarget.data.name}" akan dihapus permanen beserta semua datanya.`
                  : `${deleteTarget.data.name} akan dikeluarkan dari project ini.`}
              </p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => { setShowDeleteModal(false); setDeleteTarget(null); }}
                className="flex-1 py-3 border border-slate-200 text-slate-600 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-slate-50 transition-all"
              >
                Batal
              </button>
              <button
                onClick={deleteTarget.type === 'project' ? handleDeleteProject : handleRemoveMember}
                disabled={submitting}
                className="flex-1 py-3 bg-rose-500 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-rose-600 transition-all disabled:opacity-50"
              >
                {submitting ? 'Menghapus...' : 'Hapus'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
