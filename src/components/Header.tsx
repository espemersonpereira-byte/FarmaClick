import React, { useState } from 'react';
import { Pill, MoreVertical, User, ShieldAlert, Sparkles, Wifi, WifiOff, Camera, X, Check, FileText, LogOut, ClipboardList } from 'lucide-react';
import { PROFESSION_OPTIONS, getProfessionConfig } from '../data/professions';

interface UserProfile {
  id?: string;
  name: string;
  email?: string;
  password?: string;
  profession: string;
  workplace: string;
  registrationNumber: string;
  avatarUrl: string;
}

interface HeaderProps {
  userProfile: UserProfile;
  onUpdateProfile: (profile: UserProfile) => void;
  onLogout: () => void;
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

export const Header: React.FC<HeaderProps> = ({ userProfile, onUpdateProfile, onLogout, activeTab, setActiveTab }) => {
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showMenuDropdown, setShowMenuDropdown] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  
  // Form state for profile editing
  const [editName, setEditName] = useState(userProfile.name);
  const [editProfession, setEditProfession] = useState(userProfile.profession || PROFESSION_OPTIONS[0].label);
  const [editWorkplace, setEditWorkplace] = useState(userProfile.workplace);
  const [editReg, setEditReg] = useState(userProfile.registrationNumber);
  const [editAvatar, setEditAvatar] = useState(userProfile.avatarUrl);

  const currentProfConfig = getProfessionConfig(userProfile.profession);
  const editProfConfig = getProfessionConfig(editProfession);

  React.useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdateProfile({
      ...userProfile,
      name: editName.trim(),
      profession: editProfession,
      workplace: editWorkplace.trim(),
      registrationNumber: editProfConfig.hasCouncil ? editReg.trim() : '',
      avatarUrl: editAvatar
    });
    setShowProfileModal(false);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setEditAvatar(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <header className="sticky top-0 z-40 bg-sky-600 text-white shadow-md">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3">
        {/* Left: Avatar + Professional Info */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              setEditName(userProfile.name);
              setEditProfession(userProfile.profession || PROFESSION_OPTIONS[0].label);
              setEditWorkplace(userProfile.workplace);
              setEditReg(userProfile.registrationNumber);
              setEditAvatar(userProfile.avatarUrl);
              setShowProfileModal(true);
            }}
            className="group relative flex h-10 w-10 flex-shrink-0 items-center justify-center overflow-hidden rounded-full border-2 border-white/80 bg-sky-700 shadow transition hover:scale-105"
            title="Ver e editar perfil"
          >
            {userProfile.avatarUrl ? (
              <img src={userProfile.avatarUrl} alt={userProfile.name} className="h-full w-full object-cover" />
            ) : (
              <span className="text-sm font-bold text-white">
                {userProfile.name ? userProfile.name.charAt(0).toUpperCase() : 'FC'}
              </span>
            )}
            <div className="absolute inset-0 bg-black/20 opacity-0 transition group-hover:opacity-100 flex items-center justify-center">
              <Camera className="w-4 h-4 text-white" />
            </div>
          </button>

          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold tracking-tight text-white sm:text-lg">FarmaClick</span>
              <span className="rounded bg-sky-700 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-sky-100 hidden sm:inline-block">
                {currentProfConfig.workplaceType === 'drogaria' ? 'Drogaria & Farmácia' : 'Hospitalar & Clínico'}
              </span>
              {!isOnline && (
                <span className="flex items-center gap-1 rounded-full bg-amber-500 px-2 py-0.5 text-[10px] font-bold text-white">
                  <WifiOff className="w-3 h-3" /> Offline
                </span>
              )}
            </div>
            <p className="text-xs text-sky-100 truncate max-w-[220px] sm:max-w-xs">
              {userProfile.name || 'Profissional'} •{' '}
              {currentProfConfig.hasCouncil && userProfile.registrationNumber
                ? userProfile.registrationNumber
                : userProfile.profession || userProfile.workplace}
            </p>
          </div>
        </div>

        {/* Right: Quick actions & 3-dot menu */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveTab('interacoes')}
            className="hidden sm:flex items-center gap-1.5 rounded-lg bg-sky-700 px-3 py-1.5 text-xs font-medium text-white shadow-sm hover:bg-sky-800 transition"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-300" />
            <span>Checar Receita</span>
          </button>

          <div className="relative">
            <button
              onClick={() => {
                setShowMenuDropdown(!showMenuDropdown);
              }}
              className="flex h-9 w-9 items-center justify-center rounded-full hover:bg-sky-700 transition"
              title="Menu"
            >
              <MoreVertical className="w-5 h-5 text-white" />
            </button>

            {showMenuDropdown && (
              <div className="absolute right-0 mt-2 w-56 rounded-xl bg-white py-2 shadow-xl ring-1 ring-black/5 z-50 text-slate-800">
                <div className="px-4 py-2 border-b border-slate-100">
                  <p className="text-xs font-semibold text-slate-900">{userProfile.name || 'Profissional'}</p>
                  <p className="text-[11px] text-slate-500">{userProfile.workplace || userProfile.profession}</p>
                </div>
                <button
                  onClick={() => {
                    setShowMenuDropdown(false);
                    setActiveTab('perfil');
                  }}
                  className="w-full flex items-center gap-2 px-4 py-2 text-xs font-medium text-slate-700 hover:bg-sky-50 hover:text-sky-600 transition"
                >
                  <User className="w-4 h-4 text-sky-600" /> Meu Perfil / Configurações
                </button>
                <button
                  onClick={() => {
                    setShowMenuDropdown(false);
                    setActiveTab('receitas');
                  }}
                  className="w-full flex items-center gap-2 px-4 py-2 text-xs font-medium text-slate-700 hover:bg-sky-50 hover:text-sky-600 transition"
                >
                  <ClipboardList className="w-4 h-4 text-sky-600" /> Receitas Salvas
                </button>
                <button
                  onClick={() => {
                    setShowMenuDropdown(false);
                    setActiveTab('intervencoes');
                  }}
                  className="w-full flex items-center gap-2 px-4 py-2 text-xs font-medium text-slate-700 hover:bg-sky-50 hover:text-sky-600 transition"
                >
                  <FileText className="w-4 h-4 text-sky-600" /> Registro de Intervenções
                </button>
                <div className="my-1 border-t border-slate-100"></div>
                <button
                  onClick={() => {
                    setShowMenuDropdown(false);
                    onLogout();
                  }}
                  className="w-full flex items-center gap-2 px-4 py-2 text-xs font-bold text-rose-600 hover:bg-rose-50 transition"
                >
                  <LogOut className="w-4 h-4 text-rose-600" /> Sair da Conta
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Expanded Profile Modal (triggered by clicking profile avatar) */}
      {showProfileModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl text-slate-900 animate-in fade-in zoom-in duration-200">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <User className="w-5 h-5 text-sky-600" />
                <h3 className="text-base font-bold text-slate-900">Perfil Profissional</h3>
              </div>
              <button
                onClick={() => setShowProfileModal(false)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveProfile} className="mt-4 space-y-4">
              {/* Avatar section */}
              <div className="flex flex-col items-center gap-2">
                <div className="relative h-20 w-20 overflow-hidden rounded-full border-2 border-sky-500 bg-sky-100 shadow-inner">
                  {editAvatar ? (
                    <img src={editAvatar} alt="Avatar" className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-xl font-bold text-sky-700">
                      {editName ? editName.charAt(0).toUpperCase() : 'FC'}
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <label className="cursor-pointer rounded-lg bg-sky-50 px-3 py-1.5 text-xs font-semibold text-sky-600 hover:bg-sky-100 transition">
                    <Camera className="inline w-3.5 h-3.5 mr-1" /> Alterar Foto
                    <input type="file" accept="image/*" onChange={handleFileUpload} className="hidden" />
                  </label>
                  {editAvatar && (
                    <button
                      type="button"
                      onClick={() => setEditAvatar('')}
                      className="rounded-lg bg-rose-50 px-3 py-1.5 text-xs font-semibold text-rose-600 hover:bg-rose-100 transition"
                    >
                      Remover
                    </button>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700">Nome Completo *</label>
                <input
                  type="text"
                  required
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
                />
              </div>

              <div className={editProfConfig.hasCouncil ? 'grid grid-cols-1 sm:grid-cols-2 gap-3' : 'grid grid-cols-1 gap-3'}>
                <div>
                  <label className="block text-xs font-semibold text-slate-700">Profissão / Função *</label>
                  <select
                    value={editProfession}
                    onChange={(e) => {
                      const val = e.target.value;
                      setEditProfession(val);
                      if (!getProfessionConfig(val).hasCouncil) {
                        setEditReg('');
                      }
                    }}
                    className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm bg-white focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
                  >
                    {PROFESSION_OPTIONS.map((opt) => (
                      <option key={opt.label} value={opt.label}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>

                {editProfConfig.hasCouncil && (
                  <div>
                    <label className="block text-xs font-semibold text-slate-700">
                      {editProfConfig.councilLabel || 'Registro (CRF/CRM) *'}
                    </label>
                    <input
                      type="text"
                      required
                      placeholder={editProfConfig.councilPlaceholder}
                      value={editReg}
                      onChange={(e) => setEditReg(e.target.value)}
                      className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
                    />
                  </div>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700">
                  {editProfConfig.workplaceLabel}
                </label>
                <input
                  type="text"
                  required
                  placeholder={editProfConfig.workplacePlaceholder}
                  value={editWorkplace}
                  onChange={(e) => setEditWorkplace(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowProfileModal(false)}
                  className="flex-1 rounded-xl bg-slate-100 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-200 transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 rounded-xl bg-sky-600 py-2.5 text-sm font-semibold text-white shadow hover:bg-sky-700 transition"
                >
                  Salvar Alterações
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </header>
  );
};
