import React, { useState, useMemo } from 'react';
import {
  ClipboardList,
  Search,
  Trash2,
  Eye,
  Pill,
  Stethoscope,
  Calendar,
  MapPin,
  BedDouble,
  UserCheck,
  AlertTriangle,
  CheckCircle2,
  Image as ImageIcon,
  ArrowUpRight,
  X,
  ShieldAlert,
  Sparkles,
  FileText,
  Download
} from 'lucide-react';
import { exportPrescriptionToPDF, exportAllPrescriptionsToPDF } from '../utils/pdfExport';

export interface SavedPrescriptionItem {
  id: string;
  drugName: string;
  dose: string;
  posology: string;
  frequency: string;
  schedule: string;
  route: string;
}

export interface SavedPrescription {
  id: string;
  createdAt: string;
  patientName: string;
  patientBed: string;
  patientWard: string;
  patientAge: string;
  patientClCr: string;
  prescriberName: string;
  allergies: string[];
  items: SavedPrescriptionItem[];
  photoUrl?: string | null;
  analysisResult?: any | null;
  savedBy?: string;
}

interface PrescriptionsTabProps {
  prescriptions: SavedPrescription[];
  onDeletePrescription: (id: string) => void;
  onOpenInInteractions: (prescription: SavedPrescription) => void;
  onGoToNewPrescription: () => void;
}

export const PrescriptionsTab: React.FC<PrescriptionsTabProps> = ({
  prescriptions,
  onDeletePrescription,
  onOpenInInteractions,
  onGoToNewPrescription
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<'todas' | 'seguras' | 'alertas' | 'com_foto'>('todas');
  const [selectedPrescription, setSelectedPrescription] = useState<SavedPrescription | null>(null);
  const [zoomedPhotoUrl, setZoomedPhotoUrl] = useState<string | null>(null);

  const safeText = (val: any): string => {
    if (typeof val === 'string') return val;
    if (typeof val === 'number') return String(val);
    if (Array.isArray(val)) return val.map(safeText).join(', ');
    if (val && typeof val === 'object') {
      return (
        val.name ||
        val.text ||
        val.description ||
        val.suggestion ||
        val.adjustment ||
        val.issue ||
        val.summary ||
        val.type ||
        val.details ||
        JSON.stringify(val)
      );
    }
    return String(val || '');
  };

  const filteredPrescriptions = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return prescriptions.filter((p) => {
      const hasAlert = Boolean(
        p.analysisResult?.requiredIntervention ||
          (p.analysisResult?.interactions && p.analysisResult.interactions.length > 0) ||
          (p.analysisResult?.allergyRisks && p.analysisResult.allergyRisks.length > 0)
      );

      if (filterType === 'seguras' && hasAlert) return false;
      if (filterType === 'alertas' && !hasAlert) return false;
      if (filterType === 'com_foto' && !p.photoUrl) return false;

      if (!q) return true;
      const matchPatient = (p.patientName || '').toLowerCase().includes(q);
      const matchBed = (p.patientBed || '').toLowerCase().includes(q);
      const matchWard = (p.patientWard || '').toLowerCase().includes(q);
      const matchPrescriber = (p.prescriberName || '').toLowerCase().includes(q);
      const matchDrugs = p.items.some((item) => item.drugName.toLowerCase().includes(q));

      return matchPatient || matchBed || matchWard || matchPrescriber || matchDrugs;
    });
  }, [prescriptions, searchQuery, filterType]);

  return (
    <div className="space-y-6 pb-20">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <ClipboardList className="w-7 h-7 text-sky-600" />
            Receitas & Prescrições Salvas
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Histórico completo de receitas e prescrições identificadas por foto ou cadastradas na tela de Interações.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
          {filteredPrescriptions.length > 0 && (
            <button
              type="button"
              onClick={() => exportAllPrescriptionsToPDF(filteredPrescriptions)}
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-slate-900 px-4 py-2.5 text-xs font-bold text-white shadow-md hover:bg-slate-800 transition"
            >
              <Download className="w-4 h-4 text-sky-300" />
              <span>Exportar Relatório Geral (PDF)</span>
            </button>
          )}

          <button
            type="button"
            onClick={onGoToNewPrescription}
            className="inline-flex items-center justify-center gap-2 rounded-2xl bg-sky-600 px-4 py-2.5 text-xs font-bold text-white shadow-md hover:bg-sky-700 transition"
          >
            <Sparkles className="w-4 h-4" />
            <span>Nova Leitura / Receita</span>
          </button>
        </div>
      </div>

      {/* Search & Filters */}
      <div className="rounded-3xl bg-white p-4 shadow-sm border border-slate-200 space-y-3">
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Buscar receita por paciente, leito, setor, médico ou medicamento..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-2xl border border-slate-300 py-2.5 pl-10 pr-9 text-sm focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {[
            { id: 'todas', label: `Todas (${prescriptions.length})` },
            { id: 'alertas', label: 'Com Interação / Alerta' },
            { id: 'seguras', label: 'Prescrição Segura' },
            { id: 'com_foto', label: 'Com Foto da Receita' }
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setFilterType(tab.id as any)}
              className={`rounded-xl px-3 py-1.5 text-xs font-bold transition ${
                filterType === tab.id
                  ? 'bg-sky-600 text-white shadow-sm'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Prescriptions List */}
      {filteredPrescriptions.length === 0 ? (
        <div className="rounded-3xl bg-white p-10 text-center shadow-sm border border-slate-200 space-y-3">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-sky-50 text-sky-600">
            <ClipboardList className="w-7 h-7" />
          </div>
          <h3 className="text-base font-bold text-slate-900">
            {prescriptions.length === 0
              ? 'Nenhuma receita salva ainda'
              : 'Nenhuma receita encontrada para este filtro'}
          </h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            {prescriptions.length === 0
              ? 'Na tela de Interações, envie a foto de uma receita ou adicione os medicamentos e clique em "Salvar Receita" para guardá-la aqui.'
              : 'Tente ajustar o termo de busca ou selecionar outro filtro acima.'}
          </p>
          {prescriptions.length === 0 && (
            <button
              type="button"
              onClick={onGoToNewPrescription}
              className="mt-2 inline-flex items-center gap-2 rounded-2xl bg-sky-600 px-5 py-2.5 text-xs font-bold text-white shadow hover:bg-sky-700 transition"
            >
              <Sparkles className="w-4 h-4" />
              <span>Ir para Tela de Interações</span>
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {filteredPrescriptions.map((presc) => {
            const hasAlert = Boolean(
              presc.analysisResult?.requiredIntervention ||
                (presc.analysisResult?.interactions && presc.analysisResult.interactions.length > 0) ||
                (presc.analysisResult?.allergyRisks && presc.analysisResult.allergyRisks.length > 0)
            );
            const interactionsCount = Array.isArray(presc.analysisResult?.interactions)
              ? presc.analysisResult.interactions.length
              : 0;
            const allergyCount = Array.isArray(presc.analysisResult?.allergyRisks)
              ? presc.analysisResult.allergyRisks.length
              : 0;

            return (
              <div
                key={presc.id}
                className="rounded-3xl bg-white p-5 shadow-sm border border-slate-200 hover:border-sky-300 transition space-y-4"
              >
                {/* Top Row: Patient & Status */}
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 border-b border-slate-100 pb-3.5">
                  <div className="flex items-start gap-3">
                    {presc.photoUrl ? (
                      <button
                        type="button"
                        onClick={() => setZoomedPhotoUrl(presc.photoUrl || null)}
                        className="group relative h-16 w-20 rounded-2xl overflow-hidden border border-slate-200 bg-slate-900 shrink-0 shadow-sm"
                        title="Clique para ampliar a foto da receita"
                      >
                        <img
                          src={presc.photoUrl}
                          alt="Foto da receita"
                          className="h-full w-full object-cover group-hover:scale-105 transition"
                        />
                        <span className="absolute bottom-1 right-1 rounded bg-black/70 px-1.5 py-0.5 text-[9px] font-bold text-white flex items-center gap-0.5">
                          <ImageIcon className="w-2.5 h-2.5" /> Foto
                        </span>
                      </button>
                    ) : (
                      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-sky-100 text-sky-700 shrink-0">
                        <FileText className="w-6 h-6" />
                      </div>
                    )}

                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h2 className="text-base font-black text-slate-900">
                          {presc.patientName || 'Paciente não informado'}
                        </h2>
                        {presc.patientAge && (
                          <span className="rounded-lg bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-700">
                            {presc.patientAge}
                          </span>
                        )}
                      </div>

                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-600">
                        {presc.patientBed && (
                          <span className="inline-flex items-center gap-1 font-semibold text-sky-800">
                            <BedDouble className="w-3.5 h-3.5 text-sky-600" />
                            Leito: {presc.patientBed}
                          </span>
                        )}
                        {presc.patientWard && (
                          <span className="inline-flex items-center gap-1 font-medium text-slate-700">
                            <MapPin className="w-3.5 h-3.5 text-sky-600" />
                            Setor: {presc.patientWard}
                          </span>
                        )}
                        {presc.prescriberName && (
                          <span className="inline-flex items-center gap-1 text-slate-600">
                            <Stethoscope className="w-3.5 h-3.5 text-slate-400" />
                            Prescritor: {presc.prescriberName}
                          </span>
                        )}
                      </div>

                      <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-400">
                        <span className="inline-flex items-center gap-1">
                          <Calendar className="w-3 h-3" /> {presc.createdAt}
                        </span>
                        {presc.savedBy && (
                          <span className="inline-flex items-center gap-1">
                            <UserCheck className="w-3 h-3" /> Salvo por: {presc.savedBy}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Status Badges */}
                  <div className="flex flex-wrap items-center gap-2 self-start">
                    {hasAlert ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-rose-100 px-3 py-1 text-xs font-extrabold text-rose-800 border border-rose-200">
                        <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
                        {allergyCount > 0
                          ? `${allergyCount} Alerta(s) de Alergia`
                          : `${interactionsCount || 1} Interação(ões)`}
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-3 py-1 text-xs font-extrabold text-emerald-800 border border-emerald-200">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                        Prescrição Segura
                      </span>
                    )}
                  </div>
                </div>

                {/* Allergies if any */}
                {presc.allergies && presc.allergies.length > 0 && (
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="text-[11px] font-bold text-rose-700">Alergias registradas:</span>
                    {presc.allergies.map((alg) => (
                      <span
                        key={alg}
                        className="rounded-lg bg-rose-50 px-2 py-0.5 text-[11px] font-bold text-rose-700 border border-rose-200"
                      >
                        {alg}
                      </span>
                    ))}
                  </div>
                )}

                {/* Medications Identified in Prescription */}
                <div className="space-y-2">
                  <p className="text-xs font-bold uppercase tracking-wider text-slate-500">
                    Medicamentos Identificados ({presc.items.length})
                  </p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                    {presc.items.map((item, idx) => (
                      <div
                        key={item.id || idx}
                        className="rounded-2xl bg-slate-50 p-3 border border-slate-200/80 space-y-1"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-1.5 min-w-0">
                            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-sky-600 text-[10px] font-bold text-white shrink-0">
                              {idx + 1}
                            </span>
                            <span className="text-xs font-black text-slate-900 truncate">
                              {item.drugName}
                            </span>
                          </div>
                          <span className="rounded bg-sky-100 px-2 py-0.5 text-[10px] font-bold text-sky-800 shrink-0">
                            {item.route}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-700">
                          <strong>Dose:</strong> {item.dose} • <strong>Posologia:</strong> {item.posology}
                        </p>
                        <p className="text-[11px] text-slate-500">
                          <strong>Frequência:</strong> {item.frequency} ({item.schedule})
                        </p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Action Footer */}
                <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100">
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setSelectedPrescription(presc)}
                      className="inline-flex items-center gap-1.5 rounded-xl bg-sky-50 px-3.5 py-2 text-xs font-bold text-sky-700 hover:bg-sky-100 transition"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>Ver Parecer e Detalhes</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => exportPrescriptionToPDF(presc)}
                      className="inline-flex items-center gap-1.5 rounded-xl bg-slate-900 px-3.5 py-2 text-xs font-bold text-white hover:bg-slate-800 transition shadow-2xs"
                    >
                      <Download className="w-3.5 h-3.5 text-sky-300" />
                      <span>Exportar PDF</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => onOpenInInteractions(presc)}
                      className="inline-flex items-center gap-1.5 rounded-xl bg-slate-100 px-3.5 py-2 text-xs font-bold text-slate-700 hover:bg-slate-200 transition"
                    >
                      <ArrowUpRight className="w-3.5 h-3.5" />
                      <span>Abrir na Tela de Interações</span>
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={() => onDeletePrescription(presc.id)}
                    className="inline-flex items-center gap-1 rounded-xl bg-rose-50 px-3 py-2 text-xs font-bold text-rose-600 hover:bg-rose-100 transition"
                    title="Excluir receita salva"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Excluir</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Detailed Prescription & Clinical Analysis Modal */}
      {selectedPrescription && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/75 p-4 backdrop-blur-sm overflow-y-auto">
          <div className="w-full max-w-2xl rounded-3xl bg-white p-6 shadow-2xl text-slate-900 my-auto max-h-[90vh] overflow-y-auto space-y-5">
            <div className="flex items-start justify-between border-b border-slate-100 pb-4">
              <div>
                <span className="rounded-full bg-sky-100 px-2.5 py-0.5 text-[10px] font-extrabold uppercase text-sky-800">
                  Receita / Prescrição Salva
                </span>
                <h2 className="text-lg font-black text-slate-900 mt-1">
                  {selectedPrescription.patientName || 'Paciente não informado'}
                </h2>
                <p className="text-xs text-slate-500">
                  {selectedPrescription.patientBed ? `Leito ${selectedPrescription.patientBed} • ` : ''}
                  {selectedPrescription.patientWard ? `Setor: ${selectedPrescription.patientWard} • ` : ''}
                  Salva em {selectedPrescription.createdAt}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedPrescription(null)}
                className="rounded-xl p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Attached Photo if available */}
            {selectedPrescription.photoUrl && (
              <div className="space-y-1.5">
                <p className="text-xs font-bold text-slate-700">Foto da Receita / Prescrição Original</p>
                <div className="overflow-hidden rounded-2xl border border-slate-200 bg-slate-950 max-h-72 flex items-center justify-center">
                  <img
                    src={selectedPrescription.photoUrl}
                    alt="Receita"
                    className="max-h-72 w-auto object-contain cursor-pointer"
                    onClick={() => setZoomedPhotoUrl(selectedPrescription.photoUrl || null)}
                  />
                </div>
              </div>
            )}

            {/* Medications list */}
            <div className="space-y-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Medicamentos Prescritos ({selectedPrescription.items.length})
              </h3>
              <div className="space-y-2">
                {selectedPrescription.items.map((item, idx) => (
                  <div
                    key={item.id || idx}
                    className="rounded-2xl bg-slate-50 p-3.5 border border-slate-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <Pill className="w-4 h-4 text-sky-600" />
                        <span className="font-bold text-sm text-slate-900">{item.drugName}</span>
                        <span className="rounded bg-sky-100 px-2 py-0.5 text-[10px] font-bold text-sky-800">
                          {item.route}
                        </span>
                      </div>
                      <p className="text-xs text-slate-600 mt-1">
                        <strong>Dose:</strong> {item.dose} • <strong>Posologia:</strong> {item.posology}
                      </p>
                      <p className="text-[11px] text-slate-500">
                        <strong>Frequência / Aprazamento:</strong> {item.frequency} ({item.schedule})
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Clinical Analysis Results */}
            {selectedPrescription.analysisResult && (
              <div className="space-y-3 border-t border-slate-100 pt-4">
                <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
                  <ShieldAlert className="w-4 h-4 text-rose-600" />
                  Parecer Farmacêutico & Interações Identificadas
                </h3>

                {selectedPrescription.analysisResult.interventionSummary && (
                  <div className="rounded-2xl bg-slate-50 p-3.5 border border-slate-200 text-xs text-slate-700">
                    {safeText(selectedPrescription.analysisResult.interventionSummary)}
                  </div>
                )}

                {Array.isArray(selectedPrescription.analysisResult.interactions) &&
                selectedPrescription.analysisResult.interactions.length > 0 ? (
                  <div className="space-y-2">
                    {selectedPrescription.analysisResult.interactions.map((inter: any, i: number) => (
                      <div
                        key={i}
                        className="rounded-2xl bg-amber-50 border border-amber-200 p-3.5 text-xs space-y-1"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-slate-900">
                            {safeText(inter.drug1)} {inter.drug2 ? `+ ${safeText(inter.drug2)}` : ''}
                          </span>
                          <span className="rounded bg-amber-500 px-2 py-0.5 text-[10px] font-extrabold text-white uppercase">
                            {safeText(inter.severity || 'Moderada')}
                          </span>
                        </div>
                        <p className="text-slate-700">{safeText(inter.description)}</p>
                        {inter.management && (
                          <p className="text-slate-800 font-semibold">
                            Conduta: {safeText(inter.management)}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="rounded-2xl bg-emerald-50 border border-emerald-200 p-3 text-xs font-medium text-emerald-800">
                    Nenhuma interação medicamentosa grave identificada entre os itens desta receita.
                  </div>
                )}
              </div>
            )}

            <div className="flex flex-wrap items-center justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => exportPrescriptionToPDF(selectedPrescription)}
                className="inline-flex items-center gap-1.5 rounded-xl bg-slate-900 px-4 py-2.5 text-xs font-bold text-white shadow hover:bg-slate-800 transition"
              >
                <Download className="w-4 h-4 text-sky-300" />
                <span>Exportar Prescrição (PDF)</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  const target = selectedPrescription;
                  setSelectedPrescription(null);
                  onOpenInInteractions(target);
                }}
                className="inline-flex items-center gap-1.5 rounded-xl bg-sky-600 px-4 py-2.5 text-xs font-bold text-white shadow hover:bg-sky-700 transition"
              >
                <ArrowUpRight className="w-4 h-4" />
                <span>Carregar na Tela de Interações</span>
              </button>
              <button
                type="button"
                onClick={() => setSelectedPrescription(null)}
                className="rounded-xl bg-slate-100 px-4 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-200 transition"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Fullscreen Photo Zoom Modal */}
      {zoomedPhotoUrl && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4"
          onClick={() => setZoomedPhotoUrl(null)}
        >
          <div className="relative max-w-4xl max-h-[90vh]">
            <button
              type="button"
              onClick={() => setZoomedPhotoUrl(null)}
              className="absolute -top-10 right-0 rounded-xl bg-white/20 px-3 py-1.5 text-xs font-bold text-white hover:bg-white/30"
            >
              Fechar Imagem
            </button>
            <img
              src={zoomedPhotoUrl}
              alt="Receita ampliada"
              className="max-h-[85vh] w-auto rounded-2xl object-contain"
            />
          </div>
        </div>
      )}
    </div>
  );
};
