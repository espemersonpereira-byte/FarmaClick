import React, { useState, useEffect } from 'react';
import {
  Pill,
  ShieldCheck,
  Sparkles,
  User,
  Camera,
  ArrowRight,
  Hospital,
  LogIn,
  UserPlus,
  Lock,
  Mail,
  Eye,
  EyeOff,
  CheckCircle2,
  AlertCircle,
  KeyRound,
  ChevronRight
} from 'lucide-react';
import { PROFESSION_OPTIONS, getProfessionConfig } from '../data/professions';

export interface UserProfile {
  id?: string;
  name: string;
  email?: string;
  password?: string;
  profession: string;
  workplace: string;
  registrationNumber: string;
  avatarUrl: string;
  hasPassword?: boolean;
}

interface SplashScreenProps {
  onComplete: (profile: UserProfile) => void;
}

const ACCOUNTS_STORAGE_KEY = 'farmaclick_accounts';

export function getSavedAccountsLocal(): UserProfile[] {
  try {
    const raw = localStorage.getItem(ACCOUNTS_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function upsertSavedAccountLocal(profile: UserProfile): UserProfile[] {
  const list = getSavedAccountsLocal();
  const cleanEmail = (profile.email || '').trim().toLowerCase();
  const cleanName = (profile.name || '').trim().toLowerCase();

  const existingIdx = list.findIndex(
    (u) =>
      (profile.id && u.id === profile.id) ||
      (cleanEmail && u.email && u.email.trim().toLowerCase() === cleanEmail) ||
      (cleanName && u.name.trim().toLowerCase() === cleanName)
  );

  const existing = existingIdx >= 0 ? list[existingIdx] : null;
  const merged: UserProfile = {
    id: profile.id || existing?.id || `usr_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    name: profile.name.trim(),
    email: cleanEmail || existing?.email || '',
    password:
      profile.password !== undefined && profile.password.length > 0
        ? profile.password
        : existing?.password || '',
    profession: profile.profession || existing?.profession || PROFESSION_OPTIONS[0].label,
    workplace: profile.workplace.trim(),
    registrationNumber: profile.registrationNumber.trim(),
    avatarUrl: profile.avatarUrl !== undefined ? profile.avatarUrl : existing?.avatarUrl || '',
  };

  if (existingIdx >= 0) {
    list[existingIdx] = merged;
  } else {
    list.unshift(merged);
  }

  try {
    localStorage.setItem(ACCOUNTS_STORAGE_KEY, JSON.stringify(list));
  } catch (e) {
    console.warn('Erro ao salvar contas no localStorage:', e);
  }
  return list;
}

export const SplashScreen: React.FC<SplashScreenProps> = ({ onComplete }) => {
  const [step, setStep] = useState<'splash' | 'auth'>('splash');
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');

  // Saved accounts from localStorage + backend
  const [savedAccounts, setSavedAccounts] = useState<UserProfile[]>([]);

  // Login state
  const [loginIdentifier, setLoginIdentifier] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [selectedAccount, setSelectedAccount] = useState<UserProfile | null>(null);

  // Forgot/Reset Password state
  const [isResettingPassword, setIsResettingPassword] = useState(false);
  const [resetNewPassword, setResetNewPassword] = useState('');
  const [resetSuccessMessage, setResetSuccessMessage] = useState('');

  // Register state
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showRegisterPassword, setShowRegisterPassword] = useState(false);
  const [profession, setProfession] = useState(PROFESSION_OPTIONS[0].label);
  const [workplace, setWorkplace] = useState('');
  const [registrationNumber, setRegistrationNumber] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');

  // Status state
  const [errorMessage, setErrorMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const profConfig = getProfessionConfig(profession);

  useEffect(() => {
    const localList = getSavedAccountsLocal();
    setSavedAccounts(localList);

    fetch('/api/auth/accounts')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data && Array.isArray(data.accounts)) {
          const combined = [...localList];
          for (const srvAcc of data.accounts) {
            const exists = combined.some(
              (l) =>
                (srvAcc.id && l.id === srvAcc.id) ||
                (srvAcc.email && l.email && l.email.toLowerCase() === srvAcc.email.toLowerCase()) ||
                l.name.toLowerCase() === String(srvAcc.name || '').toLowerCase()
            );
            if (!exists && srvAcc.name) {
              combined.push(srvAcc);
            }
          }
          setSavedAccounts(combined);
        }
      })
      .catch(() => {
        // Offline fallback uses localList
      });
  }, []);

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

  const handleProfessionChange = (newProf: string) => {
    setProfession(newProf);
    const cfg = getProfessionConfig(newProf);
    if (!cfg.hasCouncil) {
      setRegistrationNumber('');
    }
  };

  const handleSelectSavedAccount = (acc: UserProfile) => {
    setErrorMessage('');
    setResetSuccessMessage('');
    setSelectedAccount(acc);
    setLoginIdentifier(acc.email || acc.name);
    // If the account has no password set (e.g. created before password support), log in immediately
    const hasPwd = Boolean((acc.password && acc.password.length > 0) || acc.hasPassword);
    if (!hasPwd) {
      localStorage.setItem('farmaclick_user', JSON.stringify(acc));
      onComplete(acc);
    }
  };

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setResetSuccessMessage('');

    const cleanId = loginIdentifier.trim().toLowerCase();
    if (!cleanId) {
      setErrorMessage('Informe seu e-mail, usuário ou nome completo para entrar.');
      return;
    }

    setIsLoading(true);
    try {
      // 1. Check local saved accounts first for instant offline/local capability
      const localAccounts = getSavedAccountsLocal();
      const localMatch = localAccounts.find(
        (u) =>
          (u.email && u.email.trim().toLowerCase() === cleanId) ||
          u.name.trim().toLowerCase() === cleanId
      );

      if (localMatch) {
        if (localMatch.password && localMatch.password.length > 0) {
          if (loginPassword !== localMatch.password) {
            // Also try server in case password was reset on server
            const srvRes = await fetch('/api/auth/login', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ identifier: loginIdentifier.trim(), password: loginPassword }),
            }).catch(() => null);

            if (srvRes && srvRes.ok) {
              const srvData = await srvRes.json();
              const loggedUser: UserProfile = { ...localMatch, ...srvData.user, password: loginPassword };
              upsertSavedAccountLocal(loggedUser);
              localStorage.setItem('farmaclick_user', JSON.stringify(loggedUser));
              onComplete(loggedUser);
              return;
            }

            setErrorMessage('Senha incorreta. Verifique sua senha ou clique em "Esqueci minha senha".');
            setIsLoading(false);
            return;
          }
        }
        localStorage.setItem('farmaclick_user', JSON.stringify(localMatch));
        onComplete(localMatch);
        return;
      }

      // 2. Authenticate against backend (/api/auth/login)
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          identifier: loginIdentifier.trim(),
          password: loginPassword,
        }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setErrorMessage(
          data.error || 'Conta não encontrada ou senha incorreta. Verifique os dados ou crie sua conta.'
        );
        setIsLoading(false);
        return;
      }

      const loggedProfile: UserProfile = {
        ...data.user,
        password: loginPassword,
      };
      upsertSavedAccountLocal(loggedProfile);
      localStorage.setItem('farmaclick_user', JSON.stringify(loggedProfile));
      onComplete(loggedProfile);
    } catch {
      setErrorMessage('Não encontramos uma conta com esses dados neste dispositivo. Crie sua conta na aba "Criar Conta".');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setResetSuccessMessage('');

    const cleanId = loginIdentifier.trim().toLowerCase();
    if (!cleanId) {
      setErrorMessage('Digite seu e-mail ou nome completo cadastrado.');
      return;
    }
    if (!resetNewPassword || resetNewPassword.trim().length < 3) {
      setErrorMessage('Digite uma nova senha com pelo menos 3 caracteres.');
      return;
    }

    setIsLoading(true);
    try {
      const localAccounts = getSavedAccountsLocal();
      const idx = localAccounts.findIndex(
        (u) =>
          (u.email && u.email.trim().toLowerCase() === cleanId) ||
          u.name.trim().toLowerCase() === cleanId
      );

      if (idx >= 0) {
        localAccounts[idx].password = resetNewPassword;
        localStorage.setItem(ACCOUNTS_STORAGE_KEY, JSON.stringify(localAccounts));
        setSavedAccounts(localAccounts);
      }

      const srvRes = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          identifier: loginIdentifier.trim(),
          newPassword: resetNewPassword,
        }),
      }).catch(() => null);

      if (idx === -1 && (!srvRes || !srvRes.ok)) {
        setErrorMessage('Conta não encontrada com esse e-mail ou nome. Verifique ou crie uma nova conta.');
        setIsLoading(false);
        return;
      }

      setLoginPassword(resetNewPassword);
      setIsResettingPassword(false);
      setResetNewPassword('');
      setResetSuccessMessage('Senha redefinida com sucesso! Clique em "Entrar na Conta" para acessar.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    if (!name.trim() || !workplace.trim()) {
      setErrorMessage('Preencha seu nome completo e local de trabalho.');
      return;
    }
    if (!email.trim()) {
      setErrorMessage('Informe um e-mail ou nome de usuário para poder entrar na sua conta depois.');
      return;
    }
    if (!password || password.trim().length < 3) {
      setErrorMessage('Crie uma senha de pelo menos 3 caracteres para proteger sua conta.');
      return;
    }
    if (profConfig.hasCouncil && !registrationNumber.trim()) {
      setErrorMessage(`Informe seu ${profConfig.councilLabel || 'Registro Profissional'}.`);
      return;
    }

    setIsLoading(true);
    const newProfile: UserProfile = {
      id: `usr_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      name: name.trim(),
      email: email.trim().toLowerCase(),
      password: password,
      profession,
      workplace: workplace.trim(),
      registrationNumber: profConfig.hasCouncil ? registrationNumber.trim() : '',
      avatarUrl,
    };

    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newProfile),
      }).catch(() => null);

      if (res && res.ok) {
        const data = await res.json().catch(() => null);
        if (data?.user?.id) {
          newProfile.id = data.user.id;
        }
      }
    } finally {
      upsertSavedAccountLocal(newProfile);
      localStorage.setItem('farmaclick_user', JSON.stringify(newProfile));
      setIsLoading(false);
      onComplete(newProfile);
    }
  };

  if (step === 'splash') {
    return (
      <div className="fixed inset-0 z-50 flex flex-col items-center justify-between bg-gradient-to-b from-sky-600 via-sky-700 to-blue-900 p-6 text-white overflow-y-auto">
        <div className="flex-1 flex flex-col items-center justify-center text-center max-w-sm py-4">
          <div className="relative mb-6 flex h-24 w-24 items-center justify-center rounded-3xl bg-white/10 backdrop-blur-xl border border-white/20 shadow-2xl animate-bounce">
            <Pill className="h-12 w-12 text-sky-200" />
            <div className="absolute -bottom-2 -right-2 rounded-full bg-amber-400 p-2 text-slate-900 shadow">
              <Sparkles className="h-4 w-4" />
            </div>
          </div>

          <h1 className="text-3xl font-black tracking-tight sm:text-4xl">FarmaClick</h1>
          <p className="mt-2 text-sm font-medium text-sky-100">
            Farmácia Hospitalar, Drogaria e Apoio Clínico Baseado em Evidências
          </p>

          <div className="mt-8 grid grid-cols-2 gap-3 text-left w-full">
            <div className="rounded-xl bg-white/10 p-3 backdrop-blur-sm border border-white/10">
              <ShieldCheck className="h-5 w-5 text-sky-300 mb-1" />
              <h2 className="text-xs font-bold">Catálogo Completo</h2>
              <p className="text-[11px] text-sky-200">Medicamentos, bulas e tarjas</p>
            </div>
            <div className="rounded-xl bg-white/10 p-3 backdrop-blur-sm border border-white/10">
              <Sparkles className="h-5 w-5 text-amber-300 mb-1" />
              <h2 className="text-xs font-bold">Análise de Receita</h2>
              <p className="text-[11px] text-sky-200">Foto OCR, interações e alergias</p>
            </div>
          </div>
        </div>

        <div className="w-full max-w-sm pb-6 space-y-3">
          <button
            onClick={() => {
              setAuthMode('login');
              setErrorMessage('');
              setStep('auth');
            }}
            className="w-full flex items-center justify-center gap-2 rounded-2xl bg-white py-3.5 px-6 text-base font-bold text-sky-700 shadow-xl hover:bg-sky-50 transition transform active:scale-95"
          >
            <LogIn className="h-5 w-5" />
            <span>Entrar na Minha Conta</span>
          </button>

          <button
            onClick={() => {
              setAuthMode('register');
              setErrorMessage('');
              setStep('auth');
            }}
            className="w-full flex items-center justify-center gap-2 rounded-2xl bg-sky-500/30 border border-white/30 backdrop-blur-sm py-3.5 px-6 text-sm font-bold text-white shadow-lg hover:bg-sky-500/40 transition transform active:scale-95"
          >
            <UserPlus className="h-4 w-4" />
            <span>Criar Nova Conta (Cadastrar)</span>
            <ArrowRight className="h-4 w-4" />
          </button>

          <p className="pt-1 text-center text-[11px] text-sky-200">
            Para farmacêuticos, técnicos, auxiliares, balconistas, médicos e enfermagem
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/80 p-4 backdrop-blur-md overflow-y-auto">
      <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl text-slate-900 animate-in fade-in zoom-in duration-200 my-auto">
        {/* Header */}
        <div className="text-center pb-4 border-b border-slate-100">
          <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-2xl bg-sky-100 text-sky-600">
            <Hospital className="h-6 w-6" />
          </div>
          <h2 className="text-xl font-black text-slate-900">
            {authMode === 'login' ? 'Entrar no FarmaClick' : 'Criar Conta Profissional'}
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            {authMode === 'login'
              ? 'Acesse sua conta cadastrada para continuar suas consultas e análises'
              : 'Cadastre seus dados para acessar o sistema sempre que precisar'}
          </p>
        </div>

        {/* Mode Switcher Tabs: Entrar | Criar Conta */}
        <div className="mt-4 grid grid-cols-2 gap-1.5 rounded-2xl bg-slate-100 p-1.5">
          <button
            type="button"
            onClick={() => {
              setAuthMode('login');
              setErrorMessage('');
              setIsResettingPassword(false);
            }}
            className={`flex items-center justify-center gap-1.5 rounded-xl py-2.5 text-xs font-bold transition ${
              authMode === 'login'
                ? 'bg-white text-sky-700 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <LogIn className="w-3.5 h-3.5" />
            Entrar
          </button>
          <button
            type="button"
            onClick={() => {
              setAuthMode('register');
              setErrorMessage('');
              setIsResettingPassword(false);
            }}
            className={`flex items-center justify-center gap-1.5 rounded-xl py-2.5 text-xs font-bold transition ${
              authMode === 'register'
                ? 'bg-white text-sky-700 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <UserPlus className="w-3.5 h-3.5" />
            Criar Conta
          </button>
        </div>

        {errorMessage && (
          <div className="mt-4 flex items-start gap-2 rounded-xl bg-rose-50 border border-rose-200 p-3 text-xs font-medium text-rose-700">
            <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0 mt-0.5" />
            <span>{errorMessage}</span>
          </div>
        )}

        {resetSuccessMessage && (
          <div className="mt-4 flex items-start gap-2 rounded-xl bg-emerald-50 border border-emerald-200 p-3 text-xs font-medium text-emerald-800">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
            <span>{resetSuccessMessage}</span>
          </div>
        )}

        {/* LOGIN VIEW */}
        {authMode === 'login' && (
          <div className="mt-4 space-y-4">
            {/* Saved accounts quick picker */}
            {savedAccounts.length > 0 && !isResettingPassword && (
              <div className="space-y-2">
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500">
                  Contas salvas ({savedAccounts.length}) — toque para selecionar
                </label>
                <div className="max-h-36 overflow-y-auto space-y-1.5 pr-1">
                  {savedAccounts.map((acc, idx) => {
                    const isSelected =
                      selectedAccount?.id === acc.id ||
                      (loginIdentifier &&
                        (loginIdentifier.toLowerCase() === (acc.email || '').toLowerCase() ||
                          loginIdentifier.toLowerCase() === acc.name.toLowerCase()));
                    return (
                      <button
                        key={acc.id || `${acc.name}-${idx}`}
                        type="button"
                        onClick={() => handleSelectSavedAccount(acc)}
                        className={`w-full flex items-center justify-between gap-2.5 rounded-xl border p-2.5 text-left transition ${
                          isSelected
                            ? 'border-sky-500 bg-sky-50/80 ring-1 ring-sky-500'
                            : 'border-slate-200 bg-slate-50/60 hover:bg-sky-50/40 hover:border-sky-300'
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="h-9 w-9 flex-shrink-0 overflow-hidden rounded-full border border-sky-300 bg-sky-100 flex items-center justify-center text-xs font-bold text-sky-700">
                            {acc.avatarUrl ? (
                              <img src={acc.avatarUrl} alt={acc.name} className="h-full w-full object-cover" />
                            ) : (
                              acc.name.charAt(0).toUpperCase()
                            )}
                          </div>
                          <div className="min-w-0">
                            <p className="text-xs font-bold text-slate-900 truncate">{acc.name}</p>
                            <p className="text-[11px] text-slate-500 truncate">
                              {acc.email ? `${acc.email} • ` : ''}
                              {acc.profession}
                            </p>
                          </div>
                        </div>
                        <ChevronRight className="w-4 h-4 text-sky-600 flex-shrink-0" />
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {!isResettingPassword ? (
              <form onSubmit={handleLoginSubmit} className="space-y-3.5">
                <div>
                  <label className="block text-xs font-semibold text-slate-700">
                    E-mail, Usuário ou Nome Completo *
                  </label>
                  <div className="relative mt-1">
                    <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      required
                      placeholder="Ex: maria@email.com ou Maria Silva"
                      value={loginIdentifier}
                      onChange={(e) => setLoginIdentifier(e.target.value)}
                      className="w-full rounded-xl border border-slate-300 pl-9 pr-3 py-2.5 text-sm focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
                    />
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between">
                    <label className="block text-xs font-semibold text-slate-700">Senha *</label>
                    <button
                      type="button"
                      onClick={() => {
                        setIsResettingPassword(true);
                        setErrorMessage('');
                        setResetSuccessMessage('');
                      }}
                      className="text-[11px] font-semibold text-sky-600 hover:text-sky-700"
                    >
                      Esqueci minha senha
                    </button>
                  </div>
                  <div className="relative mt-1">
                    <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type={showLoginPassword ? 'text' : 'password'}
                      required
                      placeholder="Digite sua senha cadastrada"
                      value={loginPassword}
                      onChange={(e) => setLoginPassword(e.target.value)}
                      className="w-full rounded-xl border border-slate-300 pl-9 pr-10 py-2.5 text-sm focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
                    />
                    <button
                      type="button"
                      onClick={() => setShowLoginPassword(!showLoginPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                      {showLoginPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full mt-2 flex items-center justify-center gap-2 rounded-xl bg-sky-600 py-3 text-sm font-bold text-white shadow-lg hover:bg-sky-700 transition disabled:opacity-50"
                >
                  <LogIn className="h-4 w-4" />
                  <span>{isLoading ? 'Verificando...' : 'Entrar na Conta'}</span>
                </button>

                <div className="pt-2 text-center border-t border-slate-100">
                  <p className="text-xs text-slate-500">
                    Ainda não possui uma conta?{' '}
                    <button
                      type="button"
                      onClick={() => {
                        setAuthMode('register');
                        setErrorMessage('');
                      }}
                      className="font-bold text-sky-600 hover:text-sky-700 underline"
                    >
                      Criar conta agora
                    </button>
                  </p>
                </div>
              </form>
            ) : (
              <form onSubmit={handleResetPassword} className="space-y-3.5 bg-slate-50 p-4 rounded-2xl border border-slate-200">
                <div className="flex items-center gap-2 text-sky-700">
                  <KeyRound className="w-4 h-4" />
                  <h3 className="text-xs font-bold">Redefinir Senha da Conta</h3>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700">
                    E-mail ou Nome Completo Cadastrado *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Digite o e-mail ou nome da sua conta"
                    value={loginIdentifier}
                    onChange={(e) => setLoginIdentifier(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm focus:border-sky-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700">Nova Senha *</label>
                  <input
                    type="password"
                    required
                    placeholder="Crie sua nova senha"
                    value={resetNewPassword}
                    onChange={(e) => setResetNewPassword(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm focus:border-sky-500 focus:outline-none"
                  />
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setIsResettingPassword(false)}
                    className="flex-1 rounded-xl bg-slate-200 py-2 text-xs font-bold text-slate-700 hover:bg-slate-300 transition"
                  >
                    Voltar
                  </button>
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="flex-1 rounded-xl bg-sky-600 py-2 text-xs font-bold text-white hover:bg-sky-700 transition"
                  >
                    Salvar Nova Senha
                  </button>
                </div>
              </form>
            )}
          </div>
        )}

        {/* REGISTER VIEW */}
        {authMode === 'register' && (
          <form onSubmit={handleRegisterSubmit} className="mt-4 space-y-3.5">
            {/* Avatar Upload */}
            <div className="flex flex-col items-center gap-2">
              <div className="relative h-18 w-18 overflow-hidden rounded-full border-2 border-sky-500 bg-sky-50 shadow-inner flex items-center justify-center">
                {avatarUrl ? (
                  <img src={avatarUrl} alt="Foto de perfil" className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-xl font-bold text-sky-600">
                    {name ? name.charAt(0).toUpperCase() : <User className="h-7 w-7 text-sky-400" />}
                  </div>
                )}
              </div>
              <label className="cursor-pointer rounded-lg bg-sky-50 px-3 py-1 text-xs font-semibold text-sky-600 hover:bg-sky-100 transition">
                <Camera className="inline w-3.5 h-3.5 mr-1" /> Adicionar Foto de Perfil
                <input type="file" accept="image/*" onChange={handleFileUpload} className="hidden" />
              </label>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700">Nome Completo *</label>
              <input
                type="text"
                required
                placeholder="Digite seu nome completo"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700">E-mail ou Usuário *</label>
                <div className="relative mt-1">
                  <Mail className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    required
                    placeholder="Ex: nome@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 pl-8 pr-3 py-2 text-sm focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700">Senha de Acesso *</label>
                <div className="relative mt-1">
                  <Lock className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type={showRegisterPassword ? 'text' : 'password'}
                    required
                    placeholder="Crie uma senha"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 pl-8 pr-8 py-2 text-sm focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
                  />
                  <button
                    type="button"
                    onClick={() => setShowRegisterPassword(!showRegisterPassword)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    {showRegisterPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>
            </div>

            <div className={profConfig.hasCouncil ? 'grid grid-cols-1 sm:grid-cols-2 gap-3' : 'grid grid-cols-1 gap-3'}>
              <div>
                <label className="block text-xs font-semibold text-slate-700">Profissão / Função *</label>
                <select
                  value={profession}
                  onChange={(e) => handleProfessionChange(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm bg-white focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
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
                    {profConfig.councilLabel || 'Registro Profissional *'}
                  </label>
                  <input
                    type="text"
                    required
                    placeholder={profConfig.councilPlaceholder || 'Ex: CRF-SP 48291'}
                    value={registrationNumber}
                    onChange={(e) => setRegistrationNumber(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
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
                className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
              />
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full mt-2 flex items-center justify-center gap-2 rounded-xl bg-sky-600 py-3 text-sm font-bold text-white shadow-lg hover:bg-sky-700 transition disabled:opacity-50"
            >
              <span>{isLoading ? 'Criando Conta...' : 'Criar Conta e Acessar'}</span>
              <ArrowRight className="h-4 w-4" />
            </button>

            <div className="pt-2 text-center border-t border-slate-100">
              <p className="text-xs text-slate-500">
                Já criou sua conta antes?{' '}
                <button
                  type="button"
                  onClick={() => {
                    setAuthMode('login');
                    setErrorMessage('');
                  }}
                  className="font-bold text-sky-600 hover:text-sky-700 underline"
                >
                  Entrar na minha conta
                </button>
              </p>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

