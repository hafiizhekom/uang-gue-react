import { useAuthStore } from '../../store/useAuthStore';

export default function Header() {
  const user = useAuthStore((state) => state.user);

  return (
    <header className="h-16 bg-white border-b border-slate-100 flex items-center justify-between px-8 shrink-0 shadow-sm">
      <div className="font-medium text-slate-500">Finance Management</div>
      <div className="flex items-center gap-3">
        <div className="text-right">
          <p className="text-sm font-bold text-slate-700">{user?.name || 'User'}</p>
          <p className="text-[10px] text-emerald-500 font-bold uppercase">{user?.email}</p>
        </div>
        <div className="w-10 h-10 rounded-full bg-slate-200 border-2 border-emerald-500 flex items-center justify-center font-bold">
          {user?.name?.charAt(0)}
        </div>
      </div>
    </header>
  );
}