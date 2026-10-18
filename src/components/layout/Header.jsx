import { useAuthStore } from '../../store/useAuthStore';
import { useProjectStore } from '../../store/useProjectStore';
import ProjectSwitcher from '../ProjectSwitcher';

const ROLE_COLOR = {
  owner:  'bg-emerald-100 text-emerald-700',
  member: 'bg-blue-100 text-blue-700',
  viewer: 'bg-slate-100 text-slate-500',
};

export default function Header() {
  const user = useAuthStore((state) => state.user);
  const activeProject = useProjectStore((state) => state.activeProject);

  // Role diambil dari pivot project aktif, fallback ke user.role
  const role = activeProject?.pivot?.role || activeProject?.role || user?.role;

  return (
    <header className="h-16 bg-white border-b border-slate-100 flex items-center justify-between px-8 shrink-0 shadow-sm">
      <div className="font-medium text-slate-500">Personal Finance Tracker</div>
      <div className="flex items-center gap-4">
        {/* Project Switcher */}
        <ProjectSwitcher />

        {/* User Info */}
        <div className="flex items-center gap-3">
          <div className="text-right">
            <p className="text-sm font-bold text-slate-700">{user?.name || 'User'}</p>
            <div className="flex items-center justify-end gap-1.5 mt-0.5">
              <p className="text-[10px] text-slate-400 font-bold">{user?.email}</p>
              {role && (
                <span className={`text-[9px] font-black px-1.5 py-0.5 rounded-md uppercase tracking-wider ${ROLE_COLOR[role] || ROLE_COLOR.member}`}>
                  {role}
                </span>
              )}
            </div>
          </div>
          <div className="w-10 h-10 rounded-full bg-slate-200 border-2 border-emerald-500 flex items-center justify-center font-bold text-slate-700">
            {user?.name?.charAt(0)}
          </div>
        </div>
      </div>
    </header>
  );
}