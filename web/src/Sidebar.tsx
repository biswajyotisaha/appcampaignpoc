interface Props {
  currentPage: 'home' | 'campaigns';
  onNavigate: (page: 'home' | 'campaigns') => void;
}

export default function Sidebar({ currentPage, onNavigate }: Props) {
  const navItems = [
    { id: 'home' as const, label: 'Home', icon: '📊' },
    { id: 'campaigns' as const, label: 'Campaigns', icon: '📱' },
  ];

  return (
    <aside className="w-56 bg-gray-900 min-h-screen flex flex-col">
      <div className="p-4 border-b border-gray-700">
        <h1 className="text-lg font-bold text-white">Campaign Attribution</h1>
        <p className="text-xs text-gray-400 mt-0.5">POC Dashboard</p>
      </div>

      <nav className="flex-1 p-3 space-y-1">
        {navItems.map((item) => (
          <button
            key={item.id}
            onClick={() => onNavigate(item.id)}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
              currentPage === item.id
                ? 'bg-indigo-600 text-white'
                : 'text-gray-300 hover:bg-gray-800 hover:text-white'
            }`}
          >
            <span>{item.icon}</span>
            <span>{item.label}</span>
          </button>
        ))}
      </nav>

      <div className="p-4 border-t border-gray-700">
        <p className="text-xs text-gray-500">v1.0 POC</p>
      </div>
    </aside>
  );
}
