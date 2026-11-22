import React from 'react';
import { Pill, Sparkles, FileText, User, ShieldCheck, ArrowRight, Search, AlertTriangle, CheckCircle2, Download, ClipboardList } from 'lucide-react';
import { Medication, InterventionLog } from '../data/medications';
import { usePWAInstall } from '../skills/pwa/usePWAInstall';

interface HomeTabProps {
  setActiveTab: (tab: string) => void;
  medications: Medication[];
  interventions: InterventionLog[];
  savedPrescriptionsCount?: number;
  userProfile: { name: string; profession: string; workplace: string };
}

export const HomeTab: React.FC<HomeTabProps> = ({
  setActiveTab,
  medications,
  interventions,
  savedPrescriptionsCount = 0,
  userProfile
}) => {
  const [searchTerm, setSearchTerm] = React.useState('');
  const { isInstallable, install, isIOS } = usePWAInstall() as any;

  const filteredMeds = React.useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    if (!q) return [];
    const results: Medication[] = [];
    for (let i = 0; i < medications.length; i++) {
      const m = medications[i];
      if (
        m.name.toLowerCase().includes(q) ||
        (m.activePrinciple && m.activePrinciple.toLowerCase().includes(q)) ||
        m.therapeuticClass.toLowerCase().includes(q)
      ) {
        results.push(m);
        if (results.length >= 15) break;
      }
    }
    return results;
  }, [searchTerm, medications]);

  return (
    <div className="space-y-6 pb-20">
      {/* Welcome Banner */}
      <div className="rounded-3xl bg-gradient-to-r from-sky-600 via-sky-700 to-blue-800 p-6 text-white shadow-xl">
        <div className="flex items-start justify-between">
          <div>
            <span className="inline-block rounded-full bg-sky-500/30 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-sky-100 backdrop-blur-md mb-2">
              {userProfile.profession || 'Farmacêutico Clínico'}
            </span>
            <h1 className="text-2xl font-black tracking-tight sm:text-3xl">
              Olá, {userProfile.name ? userProfile.name.split(' ')[0] : 'Profissional'}!
            </h1>
            <p className="mt-1 text-xs text-sky-100 max-w-md">
              {userProfile.workplace || 'Hospital Geral'} • Sistema de apoio à decisão clínica e farmácia hospitalar.
            </p>
          </div>
          <div className="hidden sm:flex h-12 w-12 items-center justify-center rounded-2xl bg-white/10 backdrop-blur-md">
            <ShieldCheck className="h-7 w-7 text-sky-200" />
          </div>
        </div>

        {/* Quick Search Bar */}
        <div className="mt-6 relative">
          <div className="relative">
            <Search className="absolute left-4 top-3.5 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar rápido medicamentos (ex: Dipirona, Morfina, Amoxicilina)..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full rounded-2xl bg-white py-3 pl-11 pr-4 text-sm text-slate-900 shadow-lg placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-300"
            />
          </div>

          {/* Search Dropdown Results */}
          {searchTerm.trim() && (
            <div className="absolute left-0 right-0 mt-2 max-h-60 overflow-y-auto rounded-2xl bg-white p-2 shadow-2xl z-30 text-slate-900">
              {filteredMeds.length > 0 ? (
                filteredMeds.map(med => (
                  <button
                    key={med.id}
                    onClick={() => {
                      setActiveTab('medicamentos');
                    }}
                    className="w-full flex items-center justify-between p-3 text-left rounded-xl hover:bg-sky-50 transition border-b border-slate-100 last:border-none"
                  >
                    <div>
                      <p className="text-xs font-bold text-slate-900">{med.name}</p>
                      <p className="text-[11px] text-slate-500">
                        {med.activePrinciple ? `${med.activePrinciple} • ` : ''}{med.therapeuticClass}
                      </p>
                      {med.presentations && med.presentations[0] && (
                        <p className="text-[10px] text-sky-700 font-medium mt-0.5">
                          Apresentação: {med.presentations[0]}
                        </p>
                      )}
                    </div>
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold shrink-0 ml-2 ${
                      med.tarja === 'Preta' ? 'bg-black text-white' :
                      med.tarja.includes('Vermelha') ? 'bg-rose-600 text-white' : 'bg-emerald-100 text-emerald-800'
                    }`}>
                      {med.tarja}
                    </span>
                  </button>
                ))
              ) : (
                <div className="p-4 text-center text-xs text-slate-500">Nenhum medicamento encontrado.</div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Quick Action Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <button
          onClick={() => setActiveTab('medicamentos')}
          className="flex flex-col items-center justify-center p-4 rounded-2xl bg-white shadow-sm border border-slate-100 hover:border-sky-300 hover:shadow-md transition text-left group"
        >
          <div className="rounded-xl bg-sky-100 p-3 text-sky-600 group-hover:bg-sky-600 group-hover:text-white transition">
            <Pill className="h-6 w-6" />
          </div>
          <span className="mt-3 text-xs font-bold text-slate-800">Medicamentos</span>
          <span className="text-[10px] text-slate-400">Catálogo Completo</span>
        </button>

        <button
          onClick={() => setActiveTab('interacoes')}
          className="flex flex-col items-center justify-center p-4 rounded-2xl bg-white shadow-sm border border-slate-100 hover:border-amber-300 hover:shadow-md transition text-left group"
        >
          <div className="rounded-xl bg-amber-100 p-3 text-amber-600 group-hover:bg-amber-600 group-hover:text-white transition">
            <Sparkles className="h-6 w-6" />
          </div>
          <span className="mt-3 text-xs font-bold text-slate-800">Checar Receita</span>
          <span className="text-[10px] text-slate-400">Foto OCR & IA</span>
        </button>

        <button
          onClick={() => setActiveTab('receitas')}
          className="flex flex-col items-center justify-center p-4 rounded-2xl bg-white shadow-sm border border-slate-100 hover:border-sky-300 hover:shadow-md transition text-left group"
        >
          <div className="rounded-xl bg-sky-100 p-3 text-sky-700 group-hover:bg-sky-700 group-hover:text-white transition">
            <ClipboardList className="h-6 w-6" />
          </div>
          <span className="mt-3 text-xs font-bold text-slate-800">Receitas</span>
          <span className="text-[10px] text-slate-400">{savedPrescriptionsCount} salvas</span>
        </button>

        <button
          onClick={() => setActiveTab('intervencoes')}
          className="flex flex-col items-center justify-center p-4 rounded-2xl bg-white shadow-sm border border-slate-100 hover:border-emerald-300 hover:shadow-md transition text-left group"
        >
          <div className="rounded-xl bg-emerald-100 p-3 text-emerald-600 group-hover:bg-emerald-600 group-hover:text-white transition">
            <FileText className="h-6 w-6" />
          </div>
          <span className="mt-3 text-xs font-bold text-slate-800">Intervenções</span>
          <span className="text-[10px] text-slate-400">{interventions.length} registradas</span>
        </button>

        <button
          onClick={() => setActiveTab('perfil')}
          className="flex flex-col items-center justify-center p-4 rounded-2xl bg-white shadow-sm border border-slate-100 hover:border-blue-300 hover:shadow-md transition text-left group col-span-2 sm:col-span-1"
        >
          <div className="rounded-xl bg-blue-100 p-3 text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition">
            <User className="h-6 w-6" />
          </div>
          <span className="mt-3 text-xs font-bold text-slate-800">Meu Perfil</span>
          <span className="text-[10px] text-slate-400">Configurações</span>
        </button>
      </div>

      {/* PWA Install Banner (if installable) */}
      {isInstallable && (
        <div className="rounded-2xl bg-gradient-to-r from-slate-900 to-slate-800 p-4 text-white shadow-lg flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-sky-500/20 p-2.5 text-sky-400">
              <Download className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-xs font-bold">Instalar FarmaClick</h2>
              <p className="text-[11px] text-slate-300">Acesse offline como aplicativo nativo no seu celular.</p>
            </div>
          </div>
          <button
            onClick={install}
            className="rounded-xl bg-sky-600 px-4 py-2 text-xs font-bold text-white shadow hover:bg-sky-700 transition"
          >
            Instalar
          </button>
        </div>
      )}

      {/* Recent Clinical Highlights / Summary */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Card 1: Quick Prescription Analysis Prompt */}
        <div className="rounded-2xl bg-white p-5 shadow-sm border border-slate-100 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="flex items-center gap-1.5 rounded-lg bg-amber-50 px-2.5 py-1 text-xs font-bold text-amber-700">
                <Sparkles className="h-3.5 w-3.5" /> Leitura por Foto & IA
              </span>
              <span className="text-[11px] text-slate-400">Portaria 344/98 & RDC 20</span>
            </div>
            <h2 className="text-base font-bold text-slate-900">Análise de Prescrição (Manual ou por Foto)</h2>
            <p className="mt-1 text-xs text-slate-500">
              Tire uma foto da receita/prescrição ou adicione os medicamentos manualmente para identificar nome do paciente, doses, posologia, interações medicamentosas e retenção ANVISA.
            </p>
          </div>
          <button
            onClick={() => setActiveTab('interacoes')}
            className="mt-4 flex items-center justify-between rounded-xl bg-sky-50 px-4 py-2.5 text-xs font-bold text-sky-700 hover:bg-sky-100 transition"
          >
            <span>Escanear ou Analisar Receita</span>
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>

        {/* Card 2: Recent Interventions Summary */}
        <div className="rounded-2xl bg-white p-5 shadow-sm border border-slate-100 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="flex items-center gap-1.5 rounded-lg bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-700">
                <CheckCircle2 className="h-3.5 w-3.5" /> Prática Clínica
              </span>
              <span className="text-[11px] text-slate-400">{interventions.length} registros</span>
            </div>
            <h2 className="text-base font-bold text-slate-900">Últimas Intervenções Farmacêuticas</h2>
            <div className="mt-2 space-y-2">
              {interventions.slice(0, 2).map((item) => (
                <div key={item.id} className="rounded-xl bg-slate-50 p-2.5 text-xs border border-slate-100">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-800">{item.patientName}</span>
                    <span className="rounded bg-emerald-100 px-1.5 py-0.5 text-[10px] font-bold text-emerald-800">
                      {item.status}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 truncate mt-1">{item.interventions[0]}</p>
                </div>
              ))}
            </div>
          </div>
          <button
            onClick={() => setActiveTab('intervencoes')}
            className="mt-4 flex items-center justify-between rounded-xl bg-slate-100 px-4 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-200 transition"
          >
            <span>Ver Todas as Intervenções</span>
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
