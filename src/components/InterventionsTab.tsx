import React, { useState } from 'react';
import { FileText, Plus, CheckCircle2, Clock, XCircle, Search, Calendar, User, Hospital, Trash2 } from 'lucide-react';
import { InterventionLog } from '../data/medications';

interface InterventionsTabProps {
  interventions: InterventionLog[];
  onAddIntervention: (log: InterventionLog) => void;
  onDeleteIntervention: (id: string) => void;
  onUpdateStatus: (id: string, status: 'Aceita' | 'Pendente' | 'Rejeitada') => void;
  userProfile: { name: string; profession: string; workplace: string };
}

export const InterventionsTab: React.FC<InterventionsTabProps> = ({
  interventions,
  onAddIntervention,
  onDeleteIntervention,
  onUpdateStatus,
  userProfile
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [showNewModal, setShowNewModal] = useState(false);
  const [statusMenuOpenId, setStatusMenuOpenId] = useState<string | null>(null);

  // New intervention form
  const [patientName, setPatientName] = useState('');
  const [ward, setWard] = useState(userProfile.workplace || 'UTI Geral');
  const [medNames, setMedNames] = useState('');
  const [interventionText, setInterventionText] = useState('');
  const [status, setStatus] = useState<'Aceita' | 'Pendente' | 'Rejeitada'>('Aceita');
  const [outcome, setOutcome] = useState('');

  const filtered = interventions.filter(item => 
    item.patientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.pharmacistName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.medications.some(m => m.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const handleSubmitNew = (e: React.FormEvent) => {
    e.preventDefault();
    if (!patientName || !interventionText) return;

    const newLog: InterventionLog = {
      id: 'int-' + Date.now(),
      timestamp: new Date().toLocaleString('pt-BR'),
      patientName,
      ward,
      pharmacistName: userProfile.name || 'Farmacêutico(a)',
      medications: medNames.split(',').map(m => m.trim()).filter(Boolean),
      interventions: [interventionText],
      status,
      clinicalOutcome: outcome || 'Registrado pelo farmacêutico.'
    };

    onAddIntervention(newLog);
    setShowNewModal(false);
    setPatientName('');
    setMedNames('');
    setInterventionText('');
    setOutcome('');
  };

  return (
    <div className="space-y-6 pb-20">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Registro de Intervenções Farmacêuticas</h1>
          <p className="text-xs text-slate-500">
            Documente substituições, ajustes terapêuticos e condutas clínicas realizadas na farmácia hospitalar.
          </p>
        </div>
        <button
          onClick={() => setShowNewModal(true)}
          className="flex items-center justify-center gap-2 rounded-2xl bg-sky-600 px-4 py-3 text-xs font-bold text-white shadow-lg hover:bg-sky-700 transition"
        >
          <Plus className="w-4 h-4" /> Nova Intervenção
        </button>
      </div>

      {/* Search Bar */}
      <div className="relative">
        <Search className="absolute left-4 top-3.5 h-4 w-4 text-slate-400" />
        <input
          type="text"
          placeholder="Buscar intervenção por paciente, medicamento ou farmacêutico..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full rounded-2xl bg-white py-3 pl-11 pr-4 text-sm text-slate-900 shadow-sm border border-slate-200 placeholder:text-slate-400 focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
        />
      </div>

      {/* Interventions List */}
      <div className="space-y-4">
        {filtered.length > 0 ? (
          filtered.map((item) => (
            <div key={item.id} className="rounded-3xl bg-white p-5 shadow-sm border border-slate-200 space-y-3">
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-900">{item.patientName}</span>
                    <span className="rounded bg-sky-50 px-2 py-0.5 text-[10px] font-bold text-sky-700">
                      {item.ward}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 flex items-center gap-1 mt-0.5">
                    <Calendar className="w-3 h-3" /> {item.timestamp} • <User className="w-3 h-3 ml-1" /> {item.pharmacistName}
                  </p>
                </div>
                <div className="relative">
                  <button
                    onClick={() => setStatusMenuOpenId(statusMenuOpenId === item.id ? null : item.id)}
                    className={`flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-extrabold uppercase transition hover:opacity-80 shadow-sm cursor-pointer ${
                      item.status === 'Aceita' ? 'bg-emerald-100 text-emerald-800' :
                      item.status === 'Pendente' ? 'bg-amber-100 text-amber-800' :
                      'bg-rose-100 text-rose-800'
                    }`}
                    title="Clique para alterar o status"
                  >
                    {item.status === 'Aceita' && <CheckCircle2 className="w-3.5 h-3.5" />}
                    {item.status === 'Pendente' && <Clock className="w-3.5 h-3.5" />}
                    {item.status === 'Rejeitada' && <XCircle className="w-3.5 h-3.5" />}
                    <span>{item.status}</span>
                    <span className="text-[10px] ml-0.5">▼</span>
                  </button>

                  {statusMenuOpenId === item.id && (
                    <div className="absolute right-0 mt-1 w-40 rounded-2xl bg-white py-1.5 shadow-2xl ring-1 ring-black/5 z-30 text-xs text-slate-800 animate-in fade-in zoom-in duration-150">
                      <div className="px-3 py-1 font-bold text-slate-400 text-[10px] uppercase border-b border-slate-100">Alterar Status</div>
                      <button
                        onClick={() => {
                          onUpdateStatus(item.id, 'Aceita');
                          setStatusMenuOpenId(null);
                        }}
                        className="w-full text-left px-3 py-2 font-semibold text-emerald-700 hover:bg-emerald-50 flex items-center gap-2 transition"
                      >
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" /> Aceita
                      </button>
                      <button
                        onClick={() => {
                          onUpdateStatus(item.id, 'Pendente');
                          setStatusMenuOpenId(null);
                        }}
                        className="w-full text-left px-3 py-2 font-semibold text-amber-700 hover:bg-amber-50 flex items-center gap-2 transition"
                      >
                        <Clock className="w-4 h-4 text-amber-600" /> Pendente
                      </button>
                      <button
                        onClick={() => {
                          onUpdateStatus(item.id, 'Rejeitada');
                          setStatusMenuOpenId(null);
                        }}
                        className="w-full text-left px-3 py-2 font-semibold text-rose-700 hover:bg-rose-50 flex items-center gap-2 transition"
                      >
                        <XCircle className="w-4 h-4 text-rose-600" /> Rejeitada
                      </button>
                      <div className="border-t border-slate-100 my-1"></div>
                      <button
                        onClick={() => {
                          onDeleteIntervention(item.id);
                          setStatusMenuOpenId(null);
                        }}
                        className="w-full text-left px-3 py-2 font-semibold text-rose-600 hover:bg-rose-50 flex items-center gap-2 transition"
                      >
                        <Trash2 className="w-4 h-4 text-rose-500" /> Excluir
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {item.medications.length > 0 && (
                <div className="flex flex-wrap items-center gap-1.5 pt-1">
                  <span className="text-[11px] font-semibold text-slate-500">Medicamentos:</span>
                  {item.medications.map((m, idx) => (
                    <span key={idx} className="rounded-lg bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-700">
                      {m}
                    </span>
                  ))}
                </div>
              )}

              <div className="rounded-2xl bg-sky-50/50 p-3.5 border border-sky-100 text-xs text-slate-700 space-y-1">
                <p className="font-bold text-sky-900">Intervenção Realizada:</p>
                <p>{item.interventions.join(' ')}</p>
              </div>

              <div className="rounded-2xl bg-slate-50 p-3.5 border border-slate-200 text-xs text-slate-600">
                <p className="font-bold text-slate-800">Desfecho Clínico:</p>
                <p>{item.clinicalOutcome}</p>
              </div>

              <div className="flex items-center justify-end pt-2">
                <button
                  onClick={() => onDeleteIntervention(item.id)}
                  className="flex items-center gap-1.5 rounded-xl bg-rose-50 px-3 py-1.5 text-xs font-semibold text-rose-600 hover:bg-rose-100 transition"
                >
                  <Trash2 className="w-3.5 h-3.5" /> Excluir Registro
                </button>
              </div>
            </div>
          ))
        ) : (
          <div className="rounded-3xl bg-white p-10 text-center text-slate-500 shadow-sm border border-slate-200">
            <FileText className="mx-auto h-8 w-8 text-slate-300 mb-2" />
            <p className="text-sm font-bold">Nenhuma intervenção encontrada</p>
            <p className="text-xs text-slate-400 mt-1">Clique em "Nova Intervenção" para registrar sua conduta clínica.</p>
          </div>
        )}
      </div>

      {/* New Intervention Modal */}
      {showNewModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm overflow-y-auto">
          <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl text-slate-900 animate-in fade-in zoom-in duration-200 my-auto max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <h2 className="text-base font-bold text-slate-900">Nova Intervenção Farmacêutica</h2>
              <button
                onClick={() => setShowNewModal(false)}
                className="rounded-xl p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
              >
                ×
              </button>
            </div>

            <form onSubmit={handleSubmitNew} className="mt-4 space-y-4 text-xs sm:text-sm">
              <div>
                <label className="block text-xs font-semibold text-slate-700">Nome do Paciente / Leito *</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Antonia Gomes - Leito 410"
                  value={patientName}
                  onChange={(e) => setPatientName(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700">Setor / Ala *</label>
                  <input
                    type="text"
                    required
                    value={ward}
                    onChange={(e) => setWard(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700">Status</label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value as any)}
                    className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm bg-white focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
                  >
                    <option value="Aceita">Aceita</option>
                    <option value="Pendente">Pendente</option>
                    <option value="Rejeitada">Rejeitada</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700">Medicamentos Envolvidos (separados por vírgula)</label>
                <input
                  type="text"
                  placeholder="Ex: Amoxicilina, Diazepam"
                  value={medNames}
                  onChange={(e) => setMedNames(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700">Descrição da Intervenção *</label>
                <textarea
                  required
                  rows={3}
                  placeholder="Descreva a orientação, ajuste de dose ou substituição sugerida..."
                  value={interventionText}
                  onChange={(e) => setInterventionText(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
                ></textarea>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700">Desfecho Clínico</label>
                <input
                  type="text"
                  placeholder="Ex: Equipe médica aceitou a alteração."
                  value={outcome}
                  onChange={(e) => setOutcome(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowNewModal(false)}
                  className="flex-1 rounded-xl bg-slate-100 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-200 transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 rounded-xl bg-sky-600 py-2.5 text-sm font-semibold text-white shadow hover:bg-sky-700 transition"
                >
                  Salvar Registro
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
