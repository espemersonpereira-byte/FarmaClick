import React, { useState } from 'react';
import { User, Shield, Hospital, Camera, Download, Wifi, CheckCircle2, RefreshCw, Smartphone } from 'lucide-react';
import { usePWAInstall } from '../skills/pwa/usePWAInstall';

interface UserProfile {
  name: string;
  profession: string;
  workplace: string;
  registrationNumber: string;
  avatarUrl: string;
}

interface ProfileTabProps {
  userProfile: UserProfile;
  onUpdateProfile: (profile: UserProfile) => void;
}

export const ProfileTab: React.FC<ProfileTabProps> = ({ userProfile, onUpdateProfile }) => {
  const [name, setName] = useState(userProfile.name);
  const [profession, setProfession] = useState(userProfile.profession);
  const [workplace, setWorkplace] = useState(userProfile.workplace);
  const [registrationNumber, setRegistrationNumber] = useState(userProfile.registrationNumber);
  const [avatarUrl, setAvatarUrl] = useState(userProfile.avatarUrl);
  const [savedSuccess, setSavedSuccess] = useState(false);

  const { isInstallable, install, isIOS } = usePWAInstall() as any;

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setAvatarUrl(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    const updated = { name, profession, workplace, registrationNumber, avatarUrl };
    onUpdateProfile(updated);
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3000);
  };

  return (
    <div className="space-y-6 pb-20 max-w-2xl mx-auto">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-black text-slate-900 tracking-tight">Perfil do Profissional & Sistema</h1>
        <p className="text-xs text-slate-500">
          Gerencie suas credenciais profissionais utilizadas em laudos, relatórios e intervenções.
        </p>
      </div>

      {savedSuccess && (
        <div className="flex items-center gap-2 rounded-2xl bg-emerald-50 p-4 text-xs font-bold text-emerald-800 border border-emerald-200">
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          Perfil atualizado com sucesso!
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
            <label className="block text-xs font-semibold text-slate-700">Nome Completo</label>
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
              <label className="block text-xs font-semibold text-slate-700">Profissão</label>
              <input
                type="text"
                required
                value={profession}
                onChange={(e) => setProfession(e.target.value)}
                className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700">Registro Profissional (CRF/CRM)</label>
              <input
                type="text"
                required
                value={registrationNumber}
                onChange={(e) => setRegistrationNumber(e.target.value)}
                className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700">Local de Trabalho / Hospital</label>
            <input
              type="text"
              required
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
    </div>
  );
};
