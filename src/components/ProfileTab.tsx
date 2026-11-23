import React, { useState, useEffect } from 'react';
import { User, Camera, Download, Wifi, CheckCircle2, Smartphone, LogOut, Mail, Lock, Trash2, AlertTriangle } from 'lucide-react';
import { usePWAInstall } from '../skills/pwa/usePWAInstall';
import { PROFESSION_OPTIONS, getProfessionConfig } from '../data/professions';
import { compressAvatarImage } from '../utils/accountStorage';

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

interface ProfileTabProps {
  userProfile: UserProfile;
  onUpdateProfile: (profile: UserProfile) => void;
  onLogout: () => void;
  onDeleteAccount: () => void;
}

export const ProfileTab: React.FC<ProfileTabProps> = ({
  userProfile,
  onUpdateProfile,
  onLogout,
  onDeleteAccount
}) => {
  const [name, setName] = useState(userProfile.name);
  const [email, setEmail] = useState(userProfile.email || '');
  const [password, setPassword] = useState(userProfile.password || '');
  const [profession, setProfession] = useState(userProfile.profession || PROFESSION_OPTIONS[0].label);
  const [workplace, setWorkplace] = useState(userProfile.workplace);
  const [registrationNumber, setRegistrationNumber] = useState(userProfile.registrationNumber);
  const [avatarUrl, setAvatarUrl] = useState(userProfile.avatarUrl);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Sync form fields if active userProfile changes
  useEffect(() => {
    setName(userProfile.name);
    setEmail(userProfile.email || '');
    setPassword(userProfile.password || '');
    setProfession(userProfile.profession || PROFESSION_OPTIONS[0].label);
    setWorkplace(userProfile.workplace);
    setRegistrationNumber(userProfile.registrationNumber);
    setAvatarUrl(userProfile.avatarUrl);
    setShowDeleteConfirm(false);
  }, [userProfile]);

  const profConfig = getProfessionConfig(profession);
  const { isInstallable, install, isIOS } = usePWAInstall() as any;

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = async () => {
        const compressed = await compressAvatarImage(reader.result as string);
        setAvatarUrl(compressed);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    const updated: UserProfile = {
      ...userProfile,
      name: name.trim(),
      email: email.trim().toLowerCase(),
      password: password || userProfile.password || '',
      profession,
      workplace: workplace.trim(),
      registrationNumber: profConfig.hasCouncil ? registrationNumber.trim() : '',
      avatarUrl
    };
    onUpdateProfile(updated);
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3000);
  };

  return (
    <div className="space-y-6 pb-20 max-w-2xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Perfil do Profissional & Configurações</h1>
          <p className="text-xs text-slate-500">
            Gerencie suas credenciais de acesso e informações profissionais utilizadas no FarmaClick.
          </p>
        </div>

        <button
          type="button"
          onClick={onLogout}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-100 border border-slate-200 px-4 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-200 transition self-start sm:self-auto"
        >
          <LogOut className="w-4 h-4" />
          <span>Sair da Conta</span>
        </button>
      </div>

      {savedSuccess && (
        <div className="flex items-center gap-2 rounded-2xl bg-emerald-50 p-4 text-xs font-bold text-emerald-800 border border-emerald-200">
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          Perfil e dados da conta atualizados com sucesso!
        </div>
      )}

      {/* Profile Card */}
      <div className="rounded-3xl bg-white p-6 shadow-sm border border-slate-200">
        <form onSubmit={handleSave} className="space-y-4">
          <div className="flex flex-col items-center gap-3 pb-4 border-b border-slate-100">
            <div className="relative h-24 w-24 overflow-hidden rounded-full border-2 border-sky-500 bg-sky-50 shadow-md">
              {avatarUrl ? (
                <img src={avatarUrl} alt="Avatar" className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-2xl font-bold text-sky-600">
                  {name ? name.charAt(0).toUpperCase() : <User className="h-10 w-10 text-sky-400" />}
                </div>
              )}
            </div>
            <div className="flex items-center gap-2">
              <label className="cursor-pointer rounded-xl bg-sky-50 px-3.5 py-2 text-xs font-semibold text-sky-600 hover:bg-sky-100 transition">
                <Camera className="inline w-3.5 h-3.5 mr-1" /> Alterar Foto de Perfil
                <input type="file" accept="image/*" onChange={handleFileUpload} className="hidden" />
              </label>
              {avatarUrl && (
                <button
                  type="button"
                  onClick={() => setAvatarUrl('')}
                  className="rounded-xl bg-rose-50 px-3.5 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-100 transition"
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
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700">E-mail ou Usuário de Login</label>
              <div className="relative mt-1">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Ex: nome@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 pl-9 pr-3 py-2.5 text-sm focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700">Senha de Acesso</label>
              <div className="relative mt-1">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="password"
                  placeholder="Definir ou alterar senha"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 pl-9 pr-3 py-2.5 text-sm focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
                />
              </div>
            </div>
          </div>

          <div className={profConfig.hasCouncil ? 'grid grid-cols-1 sm:grid-cols-2 gap-3' : 'grid grid-cols-1 gap-3'}>
            <div>
              <label className="block text-xs font-semibold text-slate-700">Profissão / Função *</label>
              <select
                value={profession}
                onChange={(e) => {
                  const val = e.target.value;
                  setProfession(val);
                  if (!getProfessionConfig(val).hasCouncil) {
                    setRegistrationNumber('');
                  }
                }}
                className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm bg-white focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
              >
                {PROFESSION_OPTIONS.map((opt) => (
                  <option key={opt.label} value={opt.label}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            {profConfig.hasCouncil && (
              <div>
                <label className="block text-xs font-semibold text-slate-700">
                  {profConfig.councilLabel || 'Registro Profissional (CRF/CRM) *'}
                </label>
                <input
                  type="text"
                  required
                  placeholder={profConfig.councilPlaceholder}
                  value={registrationNumber}
                  onChange={(e) => setRegistrationNumber(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
                />
              </div>
            )}
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700">
              {profConfig.workplaceLabel}
            </label>
            <input
              type="text"
              required
              placeholder={profConfig.workplacePlaceholder}
              value={workplace}
              onChange={(e) => setWorkplace(e.target.value)}
              className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
            />
          </div>

          <button
            type="submit"
            className="w-full mt-2 rounded-2xl bg-sky-600 py-3 text-sm font-bold text-white shadow-lg hover:bg-sky-700 transition"
          >
            Salvar Alterações
          </button>
        </form>
      </div>

      {/* PWA & Offline Support Card */}
      <div className="rounded-3xl bg-white p-6 shadow-sm border border-slate-200 space-y-4">
        <div className="flex items-center gap-3">
          <div className="rounded-2xl bg-sky-100 p-3 text-sky-600">
            <Smartphone className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-900">Aplicativo PWA & Suporte Offline</h2>
            <p className="text-xs text-slate-500">O FarmaClick está otimizado para uso móvel sem zoom e com cache offline.</p>
          </div>
        </div>

        {isInstallable && (
          <button
            onClick={install}
            className="w-full flex items-center justify-center gap-2 rounded-2xl bg-slate-900 py-3 text-xs font-bold text-white shadow hover:bg-slate-800 transition"
          >
            <Download className="w-4 h-4" /> Instalar FarmaClick no Dispositivo
          </button>
        )}

        {isIOS && (
          <div className="rounded-2xl bg-sky-50 p-4 text-xs text-sky-900 border border-sky-200 space-y-1">
            <p className="font-bold">Instalação no iPhone / iPad (Safari):</p>
            <p>1. Toque no botão <strong>Compartilhar</strong> na barra do Safari.</p>
            <p>2. Role para baixo e selecione <strong>Adicionar à Tela de Início</strong>.</p>
          </div>
        )}

        <div className="flex items-center justify-between rounded-2xl bg-slate-50 p-4 border border-slate-200 text-xs text-slate-700">
          <span className="font-medium">Status de Conexão:</span>
          <span className="flex items-center gap-1.5 font-bold text-emerald-600">
            <Wifi className="w-4 h-4" /> Conectado & Sincronizado
          </span>
        </div>
      </div>

      {/* Danger Zone: Delete Account */}
      <div className="rounded-3xl bg-rose-50/70 p-6 shadow-sm border border-rose-200 space-y-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="rounded-2xl bg-rose-100 p-3 text-rose-600 flex-shrink-0">
              <Trash2 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-rose-900">Excluir Conta</h2>
              <p className="text-xs text-rose-700 mt-0.5">
                Remove permanentemente a conta de <strong>{userProfile.name}</strong> ({userProfile.email || 'sem e-mail'}) deste dispositivo e do servidor.
              </p>
            </div>
          </div>
        </div>

        {!showDeleteConfirm ? (
          <button
            type="button"
            onClick={() => setShowDeleteConfirm(true)}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-2xl bg-rose-600 px-5 py-3 text-xs font-bold text-white shadow hover:bg-rose-700 transition"
          >
            <Trash2 className="w-4 h-4" />
            <span>Excluir Minha Conta</span>
          </button>
        ) : (
          <div className="rounded-2xl bg-white p-4 border border-rose-300 space-y-3 animate-in fade-in duration-150">
            <div className="flex items-start gap-2.5 text-rose-800">
              <AlertTriangle className="w-5 h-5 text-rose-600 flex-shrink-0 mt-0.5" />
              <div className="text-xs space-y-1">
                <p className="font-bold">Tem certeza que deseja excluir sua conta permanentemente?</p>
                <p className="text-slate-600">
                  Esta ação removerá o cadastro de <strong>{userProfile.name}</strong> e suas receitas vinculadas. Você poderá criar uma nova conta quando quiser.
                </p>
              </div>
            </div>
            <div className="flex flex-col sm:flex-row gap-2 pt-1">
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(false)}
                className="flex-1 rounded-xl bg-slate-100 py-2.5 px-4 text-xs font-bold text-slate-700 hover:bg-slate-200 transition"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={onDeleteAccount}
                className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-xl bg-rose-600 py-2.5 px-4 text-xs font-bold text-white shadow hover:bg-rose-700 transition"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Sim, Excluir Conta Permanentemente</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

