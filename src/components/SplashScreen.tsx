import React, { useState } from 'react';
import { Pill, ShieldCheck, Sparkles, User, Camera, ArrowRight, Hospital } from 'lucide-react';

interface UserProfile {
  name: string;
  profession: string;
  workplace: string;
  registrationNumber: string;
  avatarUrl: string;
}

interface SplashScreenProps {
  onComplete: (profile: UserProfile) => void;
}

export const SplashScreen: React.FC<SplashScreenProps> = ({ onComplete }) => {
  const [step, setStep] = useState<'splash' | 'form'>('splash');
  const [name, setName] = useState('');
  const [profession, setProfession] = useState('Farmacêutico(a) Clínico(a)');
  const [workplace, setWorkplace] = useState('');
  const [registrationNumber, setRegistrationNumber] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');

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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !registrationNumber || !workplace) return;
    const profile: UserProfile = {
      name,
      profession,
      workplace,
      registrationNumber,
      avatarUrl
    };
    localStorage.setItem('farmaclick_user', JSON.stringify(profile));
    onComplete(profile);
  };

  if (step === 'splash') {
    return (
      <div className="fixed inset-0 z-50 flex flex-col items-center justify-between bg-gradient-to-b from-sky-600 via-sky-700 to-blue-900 p-6 text-white">
        <div className="flex-1 flex flex-col items-center justify-center text-center max-w-sm">
          <div className="relative mb-6 flex h-24 w-24 items-center justify-center rounded-3xl bg-white/10 backdrop-blur-xl border border-white/20 shadow-2xl animate-bounce">
            <Pill className="h-12 w-12 text-sky-200" />
            <div className="absolute -bottom-2 -right-2 rounded-full bg-amber-400 p-2 text-slate-900 shadow">
              <Sparkles className="h-4 w-4" />
            </div>
          </div>

          <h1 className="text-3xl font-black tracking-tight sm:text-4xl">FarmaClick</h1>
          <p className="mt-2 text-sm font-medium text-sky-100">
            Farmácia Hospitalar e Apoio Clínico Baseado em Evidências
          </p>

          <div className="mt-8 grid grid-cols-2 gap-3 text-left w-full">
            <div className="rounded-xl bg-white/10 p-3 backdrop-blur-sm border border-white/10">
              <ShieldCheck className="h-5 w-5 text-sky-300 mb-1" />
              <h2 className="text-xs font-bold">Base ANVISA</h2>
              <p className="text-[11px] text-sky-200">Medicamentos, bulas e tarjas</p>
            </div>
            <div className="rounded-xl bg-white/10 p-3 backdrop-blur-sm border border-white/10">
              <Sparkles className="h-5 w-5 text-amber-300 mb-1" />
              <h2 className="text-xs font-bold">IA Clínica</h2>
              <p className="text-[11px] text-sky-200">Interações e alergias</p>
            </div>
          </div>
        </div>

        <div className="w-full max-w-sm pb-8">
          <button
            onClick={() => setStep('form')}
            className="w-full flex items-center justify-center gap-2 rounded-2xl bg-white py-4 px-6 text-base font-bold text-sky-700 shadow-xl hover:bg-sky-50 transition transform active:scale-95"
          >
            <span>Iniciar Acesso Profissional</span>
            <ArrowRight className="h-5 w-5" />
          </button>
          <p className="mt-3 text-center text-[11px] text-sky-200">
            Uso restrito a profissionais de saúde e farmácia hospitalar
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/80 p-4 backdrop-blur-md overflow-y-auto">
      <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl text-slate-900 animate-in fade-in zoom-in duration-200 my-auto">
        <div className="text-center pb-4 border-b border-slate-100">
          <div className="mx-auto mb-2 flex h-14 w-14 items-center justify-center rounded-2xl bg-sky-100 text-sky-600">
            <Hospital className="h-7 w-7" />
          </div>
          <h2 className="text-xl font-black text-slate-900">Cadastro do Profissional</h2>
          <p className="text-xs text-slate-500 mt-1">Identifique-se para assinar intervenções e relatórios clínicos</p>
        </div>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          {/* Avatar Upload */}
          <div className="flex flex-col items-center gap-2">
            <div className="relative h-20 w-20 overflow-hidden rounded-full border-2 border-sky-500 bg-sky-50 shadow-inner">
              {avatarUrl ? (
                <img src={avatarUrl} alt="Foto de perfil" className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-xl font-bold text-sky-600">
                  {name ? name.charAt(0).toUpperCase() : <User className="h-8 w-8 text-sky-400" />}
                </div>
              )}
            </div>
            <label className="cursor-pointer rounded-lg bg-sky-50 px-3 py-1.5 text-xs font-semibold text-sky-600 hover:bg-sky-100 transition">
              <Camera className="inline w-3.5 h-3.5 mr-1" /> Adicionar Foto de Perfil
              <input type="file" accept="image/*" onChange={handleFileUpload} className="hidden" />
            </label>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700">Nome Completo *</label>
            <input
              type="text"
              required
              placeholder="Ex: Dr. Carlos Eduardo"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700">Profissão *</label>
              <select
                value={profession}
                onChange={(e) => setProfession(e.target.value)}
                className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm bg-white focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
              >
                <option value="Farmacêutico(a) Clínico(a)">Farmacêutico(a) Clínico(a)</option>
                <option value="Farmacêutico(a) Hospitalar">Farmacêutico(a) Hospitalar</option>
                <option value="Médico(a)">Médico(a)</option>
                <option value="Enfermeiro(a) Clínico(a)">Enfermeiro(a) Clínico(a)</option>
                <option value="Residente em Farmácia">Residente em Farmácia</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700">Registro Profissional *</label>
              <input
                type="text"
                required
                placeholder="Ex: CRF-SP 48291"
                value={registrationNumber}
                onChange={(e) => setRegistrationNumber(e.target.value)}
                className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700">Local de Trabalho / Hospital / Setor *</label>
            <input
              type="text"
              required
              placeholder="Ex: Hospital das Clínicas - UTI Adulto"
              value={workplace}
              onChange={(e) => setWorkplace(e.target.value)}
              className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
            />
          </div>

          <button
            type="submit"
            className="w-full mt-4 flex items-center justify-center gap-2 rounded-xl bg-sky-600 py-3 text-sm font-bold text-white shadow-lg hover:bg-sky-700 transition"
          >
            <span>Acessar FarmaClick</span>
            <ArrowRight className="h-4 w-4" />
          </button>
        </form>
      </div>
    </div>
  );
};
