import React from 'react';
import { Home, Pill, Sparkles, FileText, User } from 'lucide-react';

interface BottomNavProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  pendingInterventionsCount?: number;
}

export const BottomNav: React.FC<BottomNavProps> = ({ activeTab, setActiveTab, pendingInterventionsCount = 0 }) => {
  const tabs = [
    { id: 'inicio', label: 'Início', icon: Home },
    { id: 'medicamentos', label: 'Medicamentos', icon: Pill },
    { id: 'interacoes', label: 'Interações', icon: Sparkles },
    { id: 'intervencoes', label: 'Intervenções', icon: FileText, badge: pendingInterventionsCount },
    { id: 'perfil', label: 'Perfil', icon: User },
  ];

  return (
    <nav aria-label="Navegação Principal" className="fixed bottom-0 left-0 right-0 z-40 border-t border-slate-200 bg-white/95 backdrop-blur-md shadow-lg">
      <div className="mx-auto flex max-w-md items-center justify-around py-2 px-1">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;

          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`relative flex flex-col items-center justify-center py-1 px-3 rounded-xl transition-all duration-200 ${
                isActive
                  ? 'text-sky-600 font-bold scale-105'
                  : 'text-slate-500 hover:text-slate-900 font-medium'
              }`}
            >
              <div className="relative">
                <Icon className={`w-5 h-5 transition-transform ${isActive ? 'stroke-[2.5]' : 'stroke-2'}`} />
                {!!tab.badge && tab.badge > 0 && (
                  <span className="absolute -top-1 -right-2 flex h-4 w-4 items-center justify-center rounded-full bg-rose-600 text-[9px] font-bold text-white shadow">
                    {tab.badge}
                  </span>
                )}
              </div>
              <span className="text-[11px] mt-1 tracking-tight">{tab.label}</span>
              {isActive && (
                <div className="absolute bottom-0 h-1 w-8 rounded-full bg-sky-600 animate-in fade-in"></div>
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
};
