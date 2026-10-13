import { useEffect, useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/useAuthStore';
import { useProjectStore } from '../../store/useProjectStore';
import { useToast } from '../../hooks/useToast';
import Toast from '../../components/Toast';

const ROLE_BADGE = {
  owner: 'bg-emerald-100 text-emerald-700',
  member: 'bg-blue-100 text-blue-700',
  viewer: 'bg-slate-100 text-slate-500',
};

export default function Projects() {
  const { toast, showToast, hideToast } = useToast();
  const user = useAuthStore((s) => s.user);
  const navigate = useNavigate();
  const { projects, activeProject, setActiveProject, fetchProjects } = useProjectStore();

  const [loading, setLoading] = useState(true);

  // ── Project modal ──
  const [showProjectModal, setShowProjectModal] = useState(false);
  const [editingProject, setEditingProject] = useState(null);
  const [projectForm, setProjectForm] = useState({ name: '', description: '' });
  const [submitting, setSubmitting] = useState(false);

  // ── Member modal ──
  const [showMemberSheet, setShowMemberSheet] = useState(false);
  const [selectedProject, setSelectedProject] = useState(null);
  const [members, setMembers] = useState([]);
  const [memberForm, setMemberForm] = useState({ email: '', role: 'member' });
  const [memberLoading, setMemberLoading] = useState(false);
  const [memberSubmitting, setMemberSubmitting] = useState(false);

  // ── Delete modal ──
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);

  useEffect(() => {
    loadProjects();
  }, []);

  const loadProjects = async () => {
    setLoading(true);
    await fetchProjects();
    setLoading(false);
  };

  const myRole = (p) => p.pivot?.role || p.role;
  const isOwner = (p) => myRole(p) === 'owner';

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
        showToast('Project diupdate!', 'success');
      } else {
        await axios.post('/projects', projectForm);
        showToast('Project dibuat!', 'success');
      }
      setShowProjectModal(false);
      await loadProjects();
    } catch (err) {
      showToast(err.response?.data?.message || 'Gagal menyimpan.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteProject = async () => {
    setSubmitting(true);
    try {
      await axios.delete(`/projects/${deleteTarget.data.id}`);
      if (activeProject?.id === deleteTarget.data.id) setActiveProject(null);
      showToast('Project dihapus.', 'success');
      setShowDeleteModal(false);
      await loadProjects();
    } catch (err) {
      showToast(err.response?.data?.message || 'Gagal menghapus.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  // ─── Member Management ───────────────────────────────────────────────────────
  const openMemberSheet = async (project) => {
    setSelectedProject(project);
    setMemberForm({ email: '', role: 'member' });
    setShowMemberSheet(true);
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
      showToast('Member ditambahkan!', 'success');
      setMemberForm({ email: '', role: 'member' });
      const res = await axios.get(`/projects/${selectedProject.id}/members`);
      setMembers(res.data?.data || []);
    } catch (err) {
      showToast(err.response?.data?.message || 'Gagal menambahkan.', 'error');
    } finally {
      setMemberSubmitting(false);
    }
  };

  const handleRemoveMember = async () => {
    setSubmitting(true);
    try {
      await axios.delete(`/projects/${selectedProject.id}/members/${deleteTarget.data.id}`);
      showToast('Member dikeluarkan.', 'success');
      setShowDeleteModal(false);
      const res = await axios.get(`/projects/${selectedProject.id}/members`);
      setMembers(res.data?.data || []);
    } catch (err) {
      showToast(err.response?.data?.message || 'Gagal.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSetActive = (project) => {
    setActiveProject(project);
    showToast(`Project "${project.name}" aktif.`, 'success');
    setTimeout(() => window.location.href = '/', 1000);
  };

  // ─── Render ──────────────────────────────────────────────────────────────────
  return (
    <div className="p-5 space-y-5 pb-24">
      <Toast data={toast} onClose={hideToast} />

      {/* Header */}
      <div className="flex justify-between items-center pt-2">
        <div>
          <h2 className="text-2xl font-black tracking-tighter text-slate-900">Projects</h2>
          <p className="text-emerald-500 font-bold uppercase text-[9px] tracking-widest mt-0.5">Workspace</p>
        </div>
        <button
          onClick={openCreateProject}
          className="flex items-center gap-1.5 px-4 py-2.5 bg-slate-900 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-emerald-500 transition-all active:scale-95"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 4v16m8-8H4" />
          </svg>
          New
        </button>
      </div>

      {/* List */}
      {loading ? (
        <p className="text-slate-400 font-black uppercase text-[10px] tracking-widest animate-pulse text-center py-12">
          Loading...
        </p>
      ) : projects.length === 0 ? (
        <div className="flex flex-col items-center py-20 space-y-3">
          <div className="w-14 h-14 bg-slate-100 rounded-3xl flex items-center justify-center">
            <svg className="w-7 h-7 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                d="M3 7a2 2 0 012-2h4l2 2h8a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V7z" />
            </svg>
          </div>
          <p className="text-slate-400 font-bold text-sm">Belum ada project</p>
        </div>
      ) : (
        <div className="space-y-3">
          {projects.map((project) => {
            const isActive = activeProject?.id === project.id;
            const role = myRole(project);
            const owner = isOwner(project);

            return (
              <div
                key={project.id}
                className={`bg-white rounded-3xl border p-5 space-y-4 transition-all shadow-sm
                  ${isActive ? 'border-emerald-400 shadow-emerald-100/60' : 'border-slate-200'}
                `}
              >
                {/* Top */}
                <div className="flex items-start gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      {isActive && <span className="w-2 h-2 rounded-full bg-emerald-500 flex-shrink-0" />}
                      <h3 className="text-sm font-black text-slate-900 truncate">{project.name}</h3>
                    </div>
                    {project.description && (
                      <p className="text-[11px] text-slate-400 mt-0.5 line-clamp-1">{project.description}</p>
                    )}
                  </div>
                  <span className={`text-[9px] font-black px-2 py-0.5 rounded-lg uppercase tracking-wider flex-shrink-0 ${ROLE_BADGE[role] || ROLE_BADGE.member}`}>
                    {role}
                  </span>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2">
                  {isActive ? (
                    <div className="flex-1 py-2.5 text-center text-[10px] font-black uppercase tracking-widest bg-emerald-500 text-white rounded-xl">
                      ✓ Active
                    </div>
                  ) : (
                    <button
                      onClick={() => handleSetActive(project)}
                      className="flex-1 py-2.5 text-[10px] font-black uppercase tracking-widest bg-emerald-50 text-emerald-700 rounded-xl border border-emerald-200 active:scale-95 transition-all"
                    >
                      Set Active
                    </button>
                  )}

                  <button
                    onClick={() => openMemberSheet(project)}
                    className="p-2.5 bg-slate-100 text-slate-600 rounded-xl active:scale-95"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                        d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  </button>

                  {owner && (
                    <>
                      <button
                        onClick={() => openEditProject(project)}
                        className="p-2.5 bg-slate-100 text-slate-600 rounded-xl active:scale-95"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                            d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                      </button>
                      <button
                        onClick={() => { setDeleteTarget({ type: 'project', data: project }); setShowDeleteModal(true); }}
                        className="p-2.5 bg-rose-50 text-rose-500 rounded-xl border border-rose-100 active:scale-95"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                            d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ══ BOTTOM SHEET: Create/Edit Project ════════════════════════════════════ */}
      {showProjectModal && (
        <div className="fixed inset-0 z-50 flex flex-col justify-end bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-t-[2.5rem] p-6 space-y-5 animate-in slide-in-from-bottom duration-300 max-h-[90vh] overflow-y-auto">
            <div className="w-10 h-1 bg-slate-200 rounded-full mx-auto mb-2" />
            <div>
              <p className="text-[9px] font-black text-emerald-500 uppercase tracking-widest">
                {editingProject ? 'Edit Project' : 'New Project'}
              </p>
              <h3 className="text-xl font-black tracking-tighter text-slate-900 mt-0.5">
                {editingProject ? 'Update project' : 'Buat project baru'}
              </h3>
            </div>
            <form onSubmit={handleSubmitProject} className="space-y-4">
              <div>
                <label className="block text-[9px] font-black uppercase tracking-widest text-slate-500 mb-1.5">
                  Nama *
                </label>
                <input
                  type="text"
                  value={projectForm.name}
                  onChange={(e) => setProjectForm({ ...projectForm, name: e.target.value })}
                  placeholder="Nama project..."
                  className="w-full px-4 py-3 border border-slate-200 rounded-2xl text-sm font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-400"
                  required
                  autoFocus
                />
              </div>
              <div>
                <label className="block text-[9px] font-black uppercase tracking-widest text-slate-500 mb-1.5">
                  Deskripsi
                </label>
                <textarea
                  value={projectForm.description}
                  onChange={(e) => setProjectForm({ ...projectForm, description: e.target.value })}
                  placeholder="Opsional..."
                  rows={3}
                  className="w-full px-4 py-3 border border-slate-200 rounded-2xl text-sm font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-400 resize-none"
                />
              </div>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowProjectModal(false)}
                  className="flex-1 py-3.5 border border-slate-200 text-slate-600 rounded-2xl font-black text-xs uppercase tracking-widest active:scale-95"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={submitting || !projectForm.name.trim()}
                  className="flex-1 py-3.5 bg-slate-900 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-emerald-500 transition-all disabled:opacity-50 active:scale-95"
                >
                  {submitting ? 'Saving...' : editingProject ? 'Update' : 'Buat'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ══ BOTTOM SHEET: Member Management ══════════════════════════════════════ */}
      {showMemberSheet && selectedProject && (
        <div className="fixed inset-0 z-50 flex flex-col justify-end bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-t-[2.5rem] p-6 space-y-5 animate-in slide-in-from-bottom duration-300 max-h-[90vh] overflow-y-auto">
            <div className="w-10 h-1 bg-slate-200 rounded-full mx-auto mb-2" />
            <div className="flex justify-between items-center">
              <div>
                <p className="text-[9px] font-black text-emerald-500 uppercase tracking-widest">Members</p>
                <h3 className="text-lg font-black tracking-tighter text-slate-900 truncate">{selectedProject.name}</h3>
              </div>
              <button
                onClick={() => setShowMemberSheet(false)}
                className="w-9 h-9 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center font-black"
              >
                ✕
              </button>
            </div>

            {/* Add member — owner only */}
            {isOwner(selectedProject) && (
              <form onSubmit={handleAddMember} className="bg-slate-50 rounded-2xl p-4 space-y-3 border border-slate-200/80">
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Tambah Member</p>
                <input
                  type="email"
                  value={memberForm.email}
                  onChange={(e) => setMemberForm({ ...memberForm, email: e.target.value })}
                  placeholder="Email member..."
                  className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-400 bg-white"
                  required
                />
                <div className="flex gap-2">
                  <select
                    value={memberForm.role}
                    onChange={(e) => setMemberForm({ ...memberForm, role: e.target.value })}
                    className="flex-1 px-3 py-3 border border-slate-200 rounded-xl text-xs font-black text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-400"
                  >
                    <option value="member">Member</option>
                    <option value="viewer">Viewer</option>
                    <option value="owner">Owner</option>
                  </select>
                  <button
                    type="submit"
                    disabled={memberSubmitting || !memberForm.email.trim()}
                    className="flex-1 py-3 bg-slate-900 text-white rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-emerald-500 transition-all disabled:opacity-50 active:scale-95"
                  >
                    {memberSubmitting ? 'Adding...' : '+ Tambah'}
                  </button>
                </div>
              </form>
            )}

            {/* List members */}
            <div>
              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-3">
                {members.length} Member{members.length !== 1 ? 's' : ''}
              </p>
              {memberLoading ? (
                <p className="text-xs text-slate-400 animate-pulse text-center py-4">Memuat...</p>
              ) : (
                <ul className="space-y-2 pb-6">
                  {members.map((member) => {
                    const mRole = member.pivot?.role || 'member';
                    const isSelf = member.id === user?.id;
                    const canRemove = isOwner(selectedProject) && !isSelf;
                    return (
                      <li key={member.id} className="flex items-center gap-3 bg-slate-50 rounded-2xl px-4 py-3 border border-slate-200/80">
                        <div className="w-9 h-9 rounded-full bg-slate-200 flex items-center justify-center font-black text-sm text-slate-600 flex-shrink-0">
                          {member.name?.charAt(0)?.toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-black text-slate-800 truncate">{member.name}</p>
                          <p className="text-[10px] text-slate-400 truncate">{member.email}</p>
                        </div>
                        <span className={`text-[9px] font-black px-2 py-0.5 rounded-lg uppercase tracking-wider flex-shrink-0 ${ROLE_BADGE[mRole] || ROLE_BADGE.member}`}>
                          {mRole}
                        </span>
                        {isSelf && <span className="text-[9px] text-slate-400 font-black">You</span>}
                        {canRemove && (
                          <button
                            onClick={() => { setDeleteTarget({ type: 'member', data: member }); setShowDeleteModal(true); }}
                            className="p-1.5 text-rose-400 active:scale-95"
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
          <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-sm p-7 space-y-5 text-center">
            <div className="w-14 h-14 bg-rose-100 rounded-[1.5rem] flex items-center justify-center mx-auto">
              <svg className="w-7 h-7 text-rose-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <div>
              <h3 className="text-base font-black text-slate-900">
                {deleteTarget.type === 'project' ? 'Hapus Project?' : 'Keluarkan Member?'}
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                {deleteTarget.type === 'project'
                  ? `"${deleteTarget.data.name}" akan dihapus permanen.`
                  : `${deleteTarget.data.name} akan dikeluarkan.`}
              </p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => { setShowDeleteModal(false); setDeleteTarget(null); }}
                className="flex-1 py-3 border border-slate-200 text-slate-600 rounded-2xl font-black text-xs uppercase tracking-widest active:scale-95"
              >
                Batal
              </button>
              <button
                onClick={deleteTarget.type === 'project' ? handleDeleteProject : handleRemoveMember}
                disabled={submitting}
                className="flex-1 py-3 bg-rose-500 text-white rounded-2xl font-black text-xs uppercase tracking-widest disabled:opacity-50 active:scale-95"
              >
                {submitting ? 'Hapus...' : 'Hapus'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
