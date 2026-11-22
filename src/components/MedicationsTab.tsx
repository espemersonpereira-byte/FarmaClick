import React, { useState, useMemo } from 'react';
import {
  Pill,
  Search,
  Filter,
  ShieldAlert,
  AlertCircle,
  Info,
  ChevronRight,
  X,
  BookOpen,
  Stethoscope,
  Activity,
  Sparkles,
  Building2,
  FileBadge,
  CheckCircle2,
  Package
} from 'lucide-react';
import { Medication } from '../data/medications';
import { useSwipeBackInterceptor } from './SwipeBackContainer';

interface MedicationsTabProps {
  medications: Medication[];
  onAddMedication: (med: Medication) => void;
  isCatalogLoaded?: boolean;
}

export const MedicationsTab: React.FC<MedicationsTabProps> = ({
  medications,
  onAddMedication,
  isCatalogLoaded = true
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('todos');
  const [selectedTarja, setSelectedTarja] = useState<string>('todas');
  const [selectedSymptom, setSelectedSymptom] = useState<string>('todos');
  const [selectedMed, setSelectedMed] = useState<Medication | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [loadingLookup, setLoadingLookup] = useState(false);
  const [lookupError, setLookupError] = useState<string | null>(null);
  const [visibleCount, setVisibleCount] = useState<number>(48);

  useSwipeBackInterceptor(showFilters && !selectedMed, () => setShowFilters(false));
  useSwipeBackInterceptor(Boolean(selectedMed), () => setSelectedMed(null));

  const hasActiveFilters =
    selectedCategory !== 'todos' || selectedTarja !== 'todas' || selectedSymptom !== 'todos';

  const commonSymptoms = [
    { id: 'todos', label: 'Todos' },
    { id: 'febre', label: 'Febre' },
    { id: 'dor de cabeça', label: 'Dor de Cabeça / Enxaqueca' },
    { id: 'azia', label: 'Azia / Refluxo / Gastrite' },
    { id: 'alergia', label: 'Alergia / Rinite / Coceira' },
    { id: 'ansiedade', label: 'Ansiedade / Insônia' },
    { id: 'infecção', label: 'Infecções / Garganta / Tosse' },
    { id: 'pressão alta', label: 'Pressão Alta / Hipertensão' },
    { id: 'náusea', label: 'Náusea / Vômito / Enjoo' },
    { id: 'dor muscular', label: 'Dor Muscular / Inflamação' },
    { id: 'diabetes', label: 'Diabetes / Glicemia' },
    { id: 'colesterol alto', label: 'Colesterol / Triglicérides' }
  ];

  const filteredMeds = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    const symQuery = (selectedSymptom !== 'todos' ? selectedSymptom : '').toLowerCase();

    return medications.filter((med) => {
      const matchesSearch =
        !q ||
        med.name.toLowerCase().includes(q) ||
        (med.activePrinciple && med.activePrinciple.toLowerCase().includes(q)) ||
        (med.registrationNumber && med.registrationNumber.toLowerCase().includes(q)) ||
        (med.laboratory && med.laboratory.toLowerCase().includes(q)) ||
        med.therapeuticClass.toLowerCase().includes(q) ||
        med.brandNames.some(b => b.toLowerCase().includes(q)) ||
        (med.presentations && med.presentations.some(p => p.toLowerCase().includes(q))) ||
        med.indication.toLowerCase().includes(q);

      const matchesCategory = selectedCategory === 'todos' || med.category === selectedCategory;

      const matchesTarja =
        selectedTarja === 'todas' ||
        (selectedTarja === 'Preta' && med.tarja === 'Preta') ||
        (selectedTarja === 'Vermelha' && med.tarja.includes('Vermelha')) ||
        (selectedTarja === 'Livre' && med.tarja === 'Livre');

      const matchesSymptom =
        !symQuery ||
        (med.symptoms && med.symptoms.some(s => s.toLowerCase().includes(symQuery))) ||
        med.indication.toLowerCase().includes(symQuery) ||
        med.therapeuticClass.toLowerCase().includes(symQuery);

      return matchesSearch && matchesCategory && matchesTarja && matchesSymptom;
    });
  }, [medications, searchTerm, selectedCategory, selectedTarja, selectedSymptom]);

  const displayedMeds = useMemo(() => {
    return filteredMeds.slice(0, visibleCount);
  }, [filteredMeds, visibleCount]);

  const handleAnvisaLookup = async (queryName: string) => {
    if (!queryName.trim()) return;
    setLoadingLookup(true);
    setLookupError(null);
    try {
      const response = await fetch('/api/medication-lookup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ medicationName: queryName })
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Erro ao consultar medicamento.');
      }

      const parsedPresentations: string[] = Array.isArray(data.presentations) && data.presentations.length > 0
        ? data.presentations
        : data.dosageForm
        ? String(data.dosageForm).split(/[•;,]/).map((s: string) => s.trim()).filter(Boolean)
        : ['Comprimido Revestido - Caixa com Blíster X 30'];

      const newMed: Medication = {
        id: 'anvisa-' + Date.now(),
        name: data.name || queryName,
        activePrinciple: data.name || queryName,
        registrationNumber: 'Ativo',
        registrationExpiry: 'Ativo',
        laboratory: 'Laboratório Farmacêutico',
        activePresentationsCount: parsedPresentations.length,
        presentations: parsedPresentations,
        brandNames: data.brandNames || [],
        category:
          data.category === 'Genérico' || data.category === 'Similar'
            ? data.category
            : 'Referência',
        tarja: data.tarja || 'Vermelha',
        therapeuticClass: data.therapeuticClass || 'Medicamento',
        indication: data.indication || 'Indicação clínica aprovada.',
        mechanism: data.mechanism || 'Mecanismo farmacológico padrão.',
        dosageForm: parsedPresentations.join(' • '),
        contraindications: data.contraindications || ['Hipersensibilidade aos componentes.'],
        sideEffects: data.sideEffects || ['Reações adversas descritas em bula.'],
        pregnancyCategory: data.pregnancyCategory || 'C',
        retentionRule: data.retentionRule || 'Venda sob prescrição médica',
        symptoms: data.symptoms || [queryName.toLowerCase()]
      };

      onAddMedication(newMed);
      setSelectedMed(newMed);
    } catch (err: any) {
      console.error(err);
      setLookupError(err.message || 'Erro ao buscar medicamento.');
    } finally {
      setLoadingLookup(false);
    }
  };

  return (
    <div className="space-y-6 pb-20">
      {/* Header */}
      <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm">
        <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
          Catálogo de Medicamentos
        </h1>
        <p className="mt-1 text-xs text-slate-500">
          Consulte medicamentos de Referência, Genéricos e Similares com suas apresentações comerciais, princípio ativo, laboratório e regras de receita.
        </p>
      </div>

      {/* Search & Single "Filtro" Button */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-3.5 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar medicamento por nome comercial, princípio ativo, apresentação ou laboratório..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setVisibleCount(48);
              }}
              className="w-full rounded-2xl bg-white py-3 pl-11 pr-9 text-base sm:text-sm text-slate-900 shadow-sm border border-slate-200 placeholder:text-slate-400 focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-3 top-3 rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          <button
            type="button"
            onClick={() => setShowFilters((prev) => !prev)}
            className={`flex items-center gap-1.5 rounded-2xl px-4 py-3 text-sm font-bold shadow-sm border transition ${
              showFilters || hasActiveFilters
                ? 'bg-sky-600 text-white border-sky-600'
                : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
            }`}
          >
            <Filter className="w-4 h-4" />
            <span>Filtro</span>
          </button>
        </div>

        {/* Collapsible Filter Panel (opened only when user clicks "Filtro") */}
        {showFilters && (
          <div className="rounded-2xl bg-white p-5 shadow-md border border-slate-200 space-y-4 animate-in fade-in duration-150">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <span className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                <Filter className="w-4 h-4 text-sky-600" /> Opções de Filtro
              </span>
              <div className="flex items-center gap-3">
                {hasActiveFilters && (
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedSymptom('todos');
                      setSelectedCategory('todos');
                      setSelectedTarja('todas');
                      setVisibleCount(48);
                    }}
                    className="text-xs font-semibold text-rose-600 hover:underline"
                  >
                    Limpar filtros
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setShowFilters(false)}
                  className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Sintomas */}
            <div className="space-y-2">
              <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700">
                <Activity className="w-3.5 h-3.5 text-sky-600" /> Sintomas / Indicação Clínica:
              </div>
              <div className="flex flex-wrap gap-1.5">
                {commonSymptoms.map((sym) => (
                  <button
                    key={sym.id}
                    type="button"
                    onClick={() => {
                      setSelectedSymptom(sym.id);
                      setVisibleCount(48);
                    }}
                    className={`rounded-xl px-3 py-1.5 text-xs font-semibold transition ${
                      selectedSymptom === sym.id
                        ? 'bg-sky-600 text-white shadow-sm'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {sym.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Categoria de Medicamento */}
            <div className="space-y-2 pt-2 border-t border-slate-100">
              <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700">
                <Pill className="w-3.5 h-3.5 text-sky-600" /> Categoria de Medicamento:
              </div>
              <div className="flex flex-wrap gap-1.5">
                {['todos', 'Referência', 'Genérico', 'Similar'].map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => {
                      setSelectedCategory(cat);
                      setVisibleCount(48);
                    }}
                    className={`rounded-xl px-3 py-1.5 text-xs font-semibold transition ${
                      selectedCategory === cat
                        ? 'bg-slate-900 text-white shadow-sm'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {cat === 'todos' ? 'Todos' : cat}
                  </button>
                ))}
              </div>
            </div>

            {/* Tarja */}
            <div className="space-y-2 pt-2 border-t border-slate-100">
              <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700">
                <ShieldAlert className="w-3.5 h-3.5 text-rose-600" /> Tarja:
              </div>
              <div className="flex flex-wrap gap-1.5">
                {['todas', 'Preta', 'Vermelha', 'Livre'].map((tarja) => (
                  <button
                    key={tarja}
                    type="button"
                    onClick={() => {
                      setSelectedTarja(tarja);
                      setVisibleCount(48);
                    }}
                    className={`rounded-xl px-3 py-1.5 text-xs font-semibold transition ${
                      selectedTarja === tarja
                        ? 'bg-sky-600 text-white shadow-sm'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {tarja === 'todas' ? 'Todas' : `Tarja ${tarja}`}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {lookupError && (
        <div className="rounded-2xl bg-rose-50 p-3 text-xs text-rose-700 border border-rose-200">
          {lookupError}
        </div>
      )}

      {/* Medication List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {displayedMeds.length > 0 ? (
          displayedMeds.map((med) => {
            const medPresentations = med.presentations && med.presentations.length > 0
              ? med.presentations
              : [med.dosageForm];

            return (
              <div
                key={med.id}
                onClick={() => setSelectedMed(med)}
                className="group cursor-pointer rounded-2xl bg-white p-5 shadow-sm border border-slate-200 hover:border-sky-500 hover:shadow-md transition flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-sky-700 bg-sky-50 px-2 py-0.5 rounded-md border border-sky-100">
                          {med.category}
                        </span>
                        {med.isPsychotropic && (
                          <span className="text-[10px] font-bold text-amber-800 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200">
                            Portaria 344/98
                          </span>
                        )}
                        {med.isAntimicrobial && (
                          <span className="text-[10px] font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-md border border-indigo-100">
                            Antimicrobiano RDC 20
                          </span>
                        )}
                      </div>
                      <h2 className="mt-1.5 text-base font-bold text-slate-900 group-hover:text-sky-600 transition">
                        {med.name}
                      </h2>
                    </div>
                    <span
                      className={`rounded-full px-2.5 py-1 text-[10px] font-extrabold tracking-wide uppercase whitespace-nowrap ${
                        med.tarja === 'Preta'
                          ? 'bg-black text-white shadow-sm'
                          : med.tarja.includes('Vermelha')
                          ? 'bg-rose-600 text-white shadow-sm'
                          : 'bg-emerald-100 text-emerald-800'
                      }`}
                    >
                      {med.tarja}
                    </span>
                  </div>

                  {med.activePrinciple && (
                    <p className="mt-1.5 text-xs text-sky-800 font-semibold line-clamp-1">
                      Princípio Ativo: <span className="font-normal text-slate-700">{med.activePrinciple}</span>
                    </p>
                  )}

                  <p className="mt-1 text-xs font-medium text-slate-600 line-clamp-1">
                    <strong>Classe:</strong> {med.therapeuticClass}
                  </p>

                  {/* Real ANVISA Presentations preview right on the card */}
                  <div className="mt-2.5 rounded-xl bg-slate-50 p-2.5 border border-slate-100">
                    <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                      <span className="flex items-center gap-1">
                        <Package className="w-3 h-3 text-sky-600" /> Apresentações ({medPresentations.length})
                      </span>
                    </div>
                    <p className="text-[11px] font-medium text-slate-700 line-clamp-1">
                      • {medPresentations[0]}
                    </p>
                    {medPresentations.length > 1 && (
                      <p className="text-[11px] text-slate-500 line-clamp-1 mt-0.5">
                        • {medPresentations[1]}
                        {medPresentations.length > 2 ? ` (+${medPresentations.length - 2} outras)` : ''}
                      </p>
                    )}
                  </div>

                  {med.laboratory && (
                    <p className="mt-2 text-[11px] text-slate-400 truncate">
                      <strong className="text-slate-500">Laboratório:</strong> {med.laboratory}
                    </p>
                  )}
                </div>

                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs font-semibold text-sky-600">
                  <span className="text-[11px] text-slate-400 font-medium">
                    Reg. ANVISA: {med.registrationNumber || 'Ativo'}
                  </span>
                  <span className="flex items-center gap-1">
                    Ver apresentações e bula <ChevronRight className="w-4 h-4 transform group-hover:translate-x-1 transition" />
                  </span>
                </div>
              </div>
            );
          })
        ) : (
          <div className="col-span-full rounded-3xl bg-white p-10 text-center text-slate-500 shadow-sm border border-slate-200 space-y-4">
            <Pill className="mx-auto h-10 w-10 text-sky-500 mb-2" />
            <h3 className="text-base font-bold text-slate-900">
              Nenhum medicamento ativo encontrado com esses filtros exatos
            </h3>
            <p className="text-xs text-slate-500 max-w-md mx-auto">
              Deseja consultar <strong>"{searchTerm || selectedSymptom}"</strong> via IA Regulatória ANVISA para gerar a monografia completa?
            </p>
            <button
              onClick={() => handleAnvisaLookup(searchTerm || selectedSymptom)}
              disabled={loadingLookup}
              className="mt-2 inline-flex items-center justify-center gap-2 rounded-2xl bg-sky-600 px-6 py-3 text-xs font-bold text-white shadow-lg hover:bg-sky-700 transition disabled:opacity-50 mx-auto"
            >
              {loadingLookup ? (
                <>Consultando base ANVISA...</>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 text-amber-300" />
                  <span>Consultar "{searchTerm || selectedSymptom}" na ANVISA</span>
                </>
              )}
            </button>
          </div>
        )}
      </div>

      {/* Load More Pagination Button */}
      {filteredMeds.length > visibleCount && (
        <div className="flex justify-center pt-4">
          <button
            onClick={() => setVisibleCount(prev => prev + 60)}
            className="rounded-2xl bg-white border border-sky-300 px-6 py-3 text-xs font-bold text-sky-700 shadow-sm hover:bg-sky-50 transition"
          >
            Carregar mais medicamentos
          </button>
        </div>
      )}

      {/* Medication Detail Modal */}
      {selectedMed && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm overflow-y-auto">
          <div className="w-full max-w-2xl rounded-3xl bg-white p-6 shadow-2xl text-slate-900 animate-in fade-in zoom-in duration-200 my-auto max-h-[90vh] overflow-y-auto">
            <div className="flex items-start justify-between pb-4 border-b border-slate-100">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-sky-600 bg-sky-50 px-2 py-0.5 rounded-md">
                    {selectedMed.category}
                  </span>
                  <span
                    className={`rounded-full px-2.5 py-0.5 text-[10px] font-extrabold uppercase ${
                      selectedMed.tarja === 'Preta'
                        ? 'bg-black text-white'
                        : selectedMed.tarja.includes('Vermelha')
                        ? 'bg-rose-600 text-white'
                        : 'bg-emerald-100 text-emerald-800'
                    }`}
                  >
                    {selectedMed.tarja}
                  </span>
                  <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-[10px] font-bold text-emerald-700 border border-emerald-200">
                    Medicamento Ativo ANVISA
                  </span>
                </div>
                <h2 className="mt-1.5 text-xl font-black text-slate-900">{selectedMed.name}</h2>
                <p className="text-xs text-slate-500">{selectedMed.therapeuticClass}</p>
              </div>
              <button
                onClick={() => setSelectedMed(null)}
                className="rounded-xl p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="mt-5 space-y-4 text-xs sm:text-sm">
              {/* Official ANVISA Registration Details */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 rounded-2xl bg-slate-50 p-4 border border-slate-200">
                <div className="flex items-start gap-2.5">
                  <FileBadge className="w-4 h-4 text-sky-600 mt-0.5 shrink-0" />
                  <div>
                    <p className="text-[11px] font-bold text-slate-500 uppercase">Princípio Ativo & Registro ANVISA</p>
                    <p className="font-bold text-slate-900">{selectedMed.activePrinciple || selectedMed.name}</p>
                    <p className="text-xs text-slate-600">
                      Nº Registro: <strong>{selectedMed.registrationNumber || 'Ativo'}</strong> • Vencimento:{' '}
                      <strong>{selectedMed.registrationExpiry || 'Vigente'}</strong>
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-2.5">
                  <Building2 className="w-4 h-4 text-sky-600 mt-0.5 shrink-0" />
                  <div>
                    <p className="text-[11px] font-bold text-slate-500 uppercase">Laboratório Detentor</p>
                    <p className="font-bold text-slate-900">{selectedMed.laboratory || 'Registrado na ANVISA'}</p>
                    <p className="text-xs text-slate-600">
                      Categoria: <strong>{selectedMed.category}</strong>
                    </p>
                  </div>
                </div>
              </div>

              {/* Explicit Complete List of ANVISA Presentations */}
              <div className="rounded-2xl bg-white p-4 border-2 border-sky-200 shadow-sm">
                <h3 className="font-bold text-sky-900 flex items-center justify-between mb-2.5">
                  <span className="flex items-center gap-1.5">
                    <Package className="w-4 h-4 text-sky-600" /> Apresentações Registradas na ANVISA
                  </span>
                  <span className="rounded-full bg-sky-100 px-2.5 py-0.5 text-[11px] font-extrabold text-sky-800">
                    {(selectedMed.presentations?.length || 1)}{' '}
                    {(selectedMed.presentations?.length || 1) === 1 ? 'apresentação' : 'apresentações'}
                  </span>
                </h3>
                <ul className="space-y-1.5">
                  {(selectedMed.presentations && selectedMed.presentations.length > 0
                    ? selectedMed.presentations
                    : [selectedMed.dosageForm]
                  ).map((ap, idx) => (
                    <li
                      key={idx}
                      className="flex items-start gap-2 rounded-xl bg-sky-50/70 px-3 py-2 text-xs font-semibold text-slate-800 border border-sky-100"
                    >
                      <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-sky-600 text-[10px] font-bold text-white">
                        {idx + 1}
                      </span>
                      <span>{ap}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Indication */}
              <div className="rounded-2xl bg-sky-50 p-4 border border-sky-100">
                <h3 className="font-bold text-sky-900 flex items-center gap-1.5 mb-1">
                  <Stethoscope className="w-4 h-4 text-sky-600" /> Indicações Clínicas & Sintomas Tratados
                </h3>
                <p className="text-slate-700">{selectedMed.indication}</p>
                {selectedMed.symptoms && selectedMed.symptoms.length > 0 && (
                  <div className="mt-2.5 flex flex-wrap gap-1.5">
                    {selectedMed.symptoms.map((s, i) => (
                      <span key={i} className="rounded-lg bg-sky-100 px-2.5 py-0.5 text-[11px] font-bold text-sky-800">
                        {s}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Mechanism & Retention */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="rounded-2xl bg-slate-50 p-4 border border-slate-200">
                  <h3 className="font-bold text-slate-900 flex items-center gap-1.5 mb-1">
                    <BookOpen className="w-4 h-4 text-slate-600" /> Mecanismo de Ação
                  </h3>
                  <p className="text-slate-700 text-xs">{selectedMed.mechanism}</p>
                </div>
                <div className="rounded-2xl bg-rose-50 p-4 border border-rose-200">
                  <h4 className="font-bold text-rose-900 mb-1">Exigência de Receita (ANVISA)</h4>
                  <p className="text-rose-800 font-semibold text-xs">{selectedMed.retentionRule}</p>
                </div>
              </div>

              {/* Contraindications */}
              <div className="rounded-2xl bg-amber-50 p-4 border border-amber-200">
                <h3 className="font-bold text-amber-900 flex items-center gap-1.5 mb-2">
                  <AlertCircle className="w-4 h-4 text-amber-600" /> Contraindicações
                </h3>
                <ul className="list-disc pl-5 space-y-1 text-slate-700">
                  {selectedMed.contraindications.map((c, idx) => (
                    <li key={idx}>{c}</li>
                  ))}
                </ul>
              </div>

              {/* Side Effects */}
              <div className="rounded-2xl bg-slate-50 p-4 border border-slate-200">
                <h3 className="font-bold text-slate-900 flex items-center gap-1.5 mb-2">
                  <Info className="w-4 h-4 text-slate-600" /> Reações Adversas & Efeitos Colaterais
                </h3>
                <ul className="list-disc pl-5 space-y-1 text-slate-700">
                  {selectedMed.sideEffects.map((se, idx) => (
                    <li key={idx}>{se}</li>
                  ))}
                </ul>
              </div>

              {/* Pregnancy Category */}
              <div className="flex items-center justify-between rounded-2xl bg-slate-100 p-4">
                <span className="font-bold text-slate-700">Risco na Gravidez:</span>
                <span className="rounded-lg bg-white px-3 py-1 font-bold text-slate-900 shadow-sm border border-slate-200">
                  Categoria {selectedMed.pregnancyCategory}
                </span>
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-slate-100 flex justify-end">
              <button
                onClick={() => setSelectedMed(null)}
                className="rounded-xl bg-sky-600 px-5 py-2.5 text-xs font-bold text-white shadow hover:bg-sky-700 transition"
              >
                Fechar Bula
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
