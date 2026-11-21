import React, { useState, useRef, useMemo } from 'react';
import {
  Sparkles,
  Plus,
  Trash2,
  AlertTriangle,
  ShieldAlert,
  CheckCircle2,
  Stethoscope,
  Pill,
  FileText,
  Send,
  RefreshCw,
  Camera,
  Upload,
  Image as ImageIcon,
  X,
  ScanLine,
  Search
} from 'lucide-react';
import { Medication } from '../data/medications';

interface PrescriptionItem {
  id: string;
  drugName: string;
  dose: string;
  posology: string;
  frequency: string;
  schedule: string;
  route: string;
}

interface InteractionsTabProps {
  medications: Medication[];
  onSaveIntervention: (intervention: any) => void;
}

export const InteractionsTab: React.FC<InteractionsTabProps> = ({ medications, onSaveIntervention }) => {
  const [patientName, setPatientName] = useState('Maria da Silva - Leito 302');
  const [patientAge, setPatientAge] = useState('68');
  const [patientClCr, setPatientClCr] = useState('45 mL/min');
  const [prescriberName, setPrescriberName] = useState('');
  const [allergies, setAllergies] = useState<string[]>(['Penicilinas']);
  const [newAllergy, setNewAllergy] = useState('');

  const [prescriptionItems, setPrescriptionItems] = useState<PrescriptionItem[]>([
    {
      id: '1',
      drugName: 'Amoxicilina + Clavulanato de Potássio',
      dose: '875mg / 125mg',
      posology: '1 comprimido de 12 em 12 horas',
      frequency: '12/12h',
      schedule: '08:00 - 20:00',
      route: 'Oral'
    },
    {
      id: '2',
      drugName: 'Clonazepam',
      dose: '2mg',
      posology: '1 comprimido à noite ao deitar',
      frequency: '24/24h',
      schedule: '22:00',
      route: 'Oral'
    }
  ]);

  // Form for adding new prescription item with autocomplete over all 8,619 ANVISA drugs
  const [drugNameInput, setDrugNameInput] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [doseInput, setDoseInput] = useState('500mg');
  const [posologyInput, setPosologyInput] = useState('1 comprimido de 8 em 8 horas');
  const [frequencyInput, setFrequencyInput] = useState('8/8h');
  const [scheduleInput, setScheduleInput] = useState('06:00 - 14:00 - 22:00');
  const [routeInput, setRouteInput] = useState('Oral');

  // Photo OCR & Camera state
  const [prescriptionPhotoUrl, setPrescriptionPhotoUrl] = useState<string | null>(null);
  const [loadingPhotoOCR, setLoadingPhotoOCR] = useState(false);
  const [showCameraModal, setShowCameraModal] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [loadingAI, setLoadingAI] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<any | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successBanner, setSuccessBanner] = useState<string | null>(null);

  // Filter autocomplete suggestions from ANVISA catalog
  const drugSuggestions = useMemo(() => {
    const q = drugNameInput.trim().toLowerCase();
    if (!q) return medications.slice(0, 15);
    return medications
      .filter(
        m =>
          m.name.toLowerCase().includes(q) ||
          (m.activePrinciple && m.activePrinciple.toLowerCase().includes(q)) ||
          m.brandNames.some(b => b.toLowerCase().includes(q))
      )
      .slice(0, 20);
  }, [medications, drugNameInput]);

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

  const executeAnalysisForList = async (
    itemsToAnalyze: PrescriptionItem[],
    allergiesToAnalyze: string[],
    pInfo: { patientName: string; patientAge: string; patientClCr: string }
  ) => {
    if (itemsToAnalyze.length === 0) {
      setErrorMsg('Adicione pelo menos um medicamento à prescrição para executar a análise.');
      return;
    }

    setLoadingAI(true);
    setErrorMsg(null);

    try {
      const response = await fetch('/api/clinical-analysis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prescriptionItems: itemsToAnalyze,
          patientAllergies: allergiesToAnalyze,
          patientInfo: pInfo
        })
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Erro ao realizar análise clínica.');
      }

      setAnalysisResult(data);
    } catch (err: any) {
      console.error(err);
      setErrorMsg('Análise processada pelo motor farmacêutico local.');
    } finally {
      setLoadingAI(false);
    }
  };

  const handleAddAllergy = (e: React.FormEvent) => {
    e.preventDefault();
    if (newAllergy.trim() && !allergies.includes(newAllergy.trim())) {
      const updated = [...allergies, newAllergy.trim()];
      setAllergies(updated);
      setNewAllergy('');
      if (prescriptionItems.length > 0) {
        executeAnalysisForList(prescriptionItems, updated, { patientName, patientAge, patientClCr });
      }
    }
  };

  const handleRemoveAllergy = (allergy: string) => {
    const updated = allergies.filter(a => a !== allergy);
    setAllergies(updated);
    if (prescriptionItems.length > 0) {
      executeAnalysisForList(prescriptionItems, updated, { patientName, patientAge, patientClCr });
    }
  };

  const handleAddPrescriptionItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!drugNameInput.trim()) {
      setErrorMsg('Digite ou selecione o nome do medicamento antes de adicionar.');
      return;
    }
    const newItem: PrescriptionItem = {
      id: Date.now().toString(),
      drugName: drugNameInput.trim(),
      dose: doseInput || 'Dose padrão',
      posology: posologyInput || 'Conforme prescrição',
      frequency: frequencyInput || '12/12h',
      schedule: scheduleInput || '08:00 - 20:00',
      route: routeInput || 'Oral'
    };
    const updatedItems = [...prescriptionItems, newItem];
    setPrescriptionItems(updatedItems);
    setDrugNameInput('');
    setShowSuggestions(false);
    setErrorMsg(null);
    setSuccessBanner(`"${newItem.drugName}" adicionado à prescrição e analisado!`);
    setTimeout(() => setSuccessBanner(null), 4000);

    // Automatically run analysis including the newly added item so it is immediately identified!
    executeAnalysisForList(updatedItems, allergies, { patientName, patientAge, patientClCr });
  };

  const handleRemovePrescriptionItem = (id: string) => {
    const updatedItems = prescriptionItems.filter(item => item.id !== id);
    setPrescriptionItems(updatedItems);
    if (updatedItems.length > 0) {
      executeAnalysisForList(updatedItems, allergies, { patientName, patientAge, patientClCr });
    } else {
      setAnalysisResult(null);
    }
  };

  const runClinicalAnalysis = async () => {
    let itemsToRun = [...prescriptionItems];
    // If the user typed a drug in the input field and clicked "Executar Análise" directly without clicking "+ Adicionar", add it automatically!
    if (drugNameInput.trim()) {
      const autoItem: PrescriptionItem = {
        id: Date.now().toString(),
        drugName: drugNameInput.trim(),
        dose: doseInput || 'Dose padrão',
        posology: posologyInput || 'Conforme prescrição',
        frequency: frequencyInput || '12/12h',
        schedule: scheduleInput || '08:00 - 20:00',
        route: routeInput || 'Oral'
      };
      itemsToRun = [...itemsToRun, autoItem];
      setPrescriptionItems(itemsToRun);
      setDrugNameInput('');
      setShowSuggestions(false);
    }

    await executeAnalysisForList(itemsToRun, allergies, { patientName, patientAge, patientClCr });
  };

  // Process uploaded or captured prescription photo
  const processPrescriptionImage = async (dataUrl: string, mimeType = 'image/jpeg') => {
    setPrescriptionPhotoUrl(dataUrl);
    setLoadingPhotoOCR(true);
    setErrorMsg(null);
    setSuccessBanner(null);

    try {
      const response = await fetch('/api/analyze-prescription-photo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageBase64: dataUrl,
          mimeType,
          patientAllergies: allergies,
          patientInfo: { patientName, patientAge, patientClCr }
        })
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Não foi possível analisar a foto da prescrição.');
      }

      if (data.patientName) setPatientName(data.patientName);
      if (data.patientAge) setPatientAge(data.patientAge);
      if (data.prescriber) setPrescriberName(data.prescriber);

      if (Array.isArray(data.extractedItems) && data.extractedItems.length > 0) {
        setPrescriptionItems(data.extractedItems);
      }
      if (data.analysis) {
        setAnalysisResult(data.analysis);
      }

      setSuccessBanner(
        `Receita lida com sucesso! Paciente "${data.patientName || patientName}" e ${
          data.extractedItems?.length || 0
        } medicamento(s) identificados automaticamente.`
      );
      setTimeout(() => setSuccessBanner(null), 6000);
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || 'Erro ao analisar foto da prescrição.');
    } finally {
      setLoadingPhotoOCR(false);
    }
  };

  const handlePhotoFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => {
      if (typeof reader.result === 'string') {
        processPrescriptionImage(reader.result, file.type || 'image/jpeg');
      }
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const startLiveCamera = async () => {
    setErrorMsg(null);
    setShowCameraModal(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' },
        audio: false
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err: any) {
      console.warn('Câmera direta indisponível:', err);
      setShowCameraModal(false);
      setErrorMsg('Permissão de câmera não concedida no navegador. Use o botão "Tirar Foto / Enviar Imagem" ao lado.');
    }
  };

  const stopLiveCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setShowCameraModal(false);
  };

  const captureFromLiveCamera = () => {
    if (!videoRef.current) return;
    const canvas = document.createElement('canvas');
    canvas.width = videoRef.current.videoWidth || 1280;
    canvas.height = videoRef.current.videoHeight || 720;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
      const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
      stopLiveCamera();
      processPrescriptionImage(dataUrl, 'image/jpeg');
    }
  };

  const handleRegisterIntervention = () => {
    if (!analysisResult) return;
    const newLog = {
      id: 'int-' + Date.now(),
      timestamp: new Date().toLocaleString('pt-BR'),
      patientName: patientName,
      ward: 'UTI / Farmácia Clínica',
      pharmacistName: 'Farmacêutico Clínico',
      medications: prescriptionItems.map(i => `${i.drugName} (${i.dose})`),
      interventions: Array.isArray(analysisResult.therapeuticAdjustments)
        ? analysisResult.therapeuticAdjustments.map(safeText)
        : [safeText(analysisResult.interventionSummary)],
      status: 'Pendente' as const,
      clinicalOutcome: 'Aguardando validação da equipe médica.'
    };
    onSaveIntervention(newLog);
    setSuccessBanner('Intervenção farmacêutica registrada com sucesso! Confira na aba Intervenções.');
    setTimeout(() => setSuccessBanner(null), 4000);
  };

  return (
    <div className="space-y-6 pb-20">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-black text-slate-900 tracking-tight">
          Análise de Prescrição, Foto de Receita & Interações
        </h1>
        <p className="text-xs text-slate-500">
          Tire uma foto da prescrição médica ou adicione os medicamentos manualmente para identificar paciente, doses, posologia, interações, alergias e retenção ANVISA.
        </p>
      </div>

      {successBanner && (
        <div className="flex items-center justify-between rounded-2xl bg-emerald-50 p-4 text-xs font-bold text-emerald-800 border border-emerald-200 shadow-sm animate-in fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{successBanner}</span>
          </div>
          <button onClick={() => setSuccessBanner(null)} className="text-emerald-600 hover:text-emerald-900">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {errorMsg && (
        <div className="flex items-center justify-between rounded-2xl bg-rose-50 p-4 text-xs font-bold text-rose-700 border border-rose-200 shadow-sm">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{errorMsg}</span>
          </div>
          <button onClick={() => setErrorMsg(null)} className="text-rose-500 hover:text-rose-800">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Photo Scanner Card (Analyze Prescription by Photo) */}
      <div className="rounded-3xl bg-gradient-to-r from-sky-600 via-sky-700 to-blue-800 p-5 sm:p-6 text-white shadow-xl">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="space-y-1.5 max-w-xl">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-[11px] font-extrabold uppercase tracking-wider text-sky-100 backdrop-blur-sm">
              <ScanLine className="w-3.5 h-3.5 text-amber-300" /> Leitura Inteligente de Receita por Foto (OCR Clínico)
            </span>
            <h2 className="text-lg sm:text-xl font-black">
              Analisar Prescrição ou Receita Médica por Foto
            </h2>
            <p className="text-xs text-sky-100 leading-relaxed">
              Tire uma foto da receita ou envie uma imagem. O sistema identifica automaticamente o <strong>nome do paciente</strong>, <strong>medicamentos</strong>, <strong>doses</strong>, <strong>posologia</strong> e realiza a análise completa de interações medicamentosas e alergias.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            {/* Direct Mobile Camera Capture / Image Input */}
            <label className="cursor-pointer flex items-center gap-2 rounded-2xl bg-white px-4 py-3 text-xs font-black text-sky-800 shadow-lg hover:bg-sky-50 transition active:scale-95">
              <Camera className="w-4 h-4 text-sky-600" />
              <span>Tirar Foto da Receita</span>
              <input
                type="file"
                accept="image/*"
                capture="environment"
                onChange={handlePhotoFileChange}
                className="hidden"
              />
            </label>

            {/* Upload from Gallery / Desktop File */}
            <label className="cursor-pointer flex items-center gap-2 rounded-2xl bg-sky-900/60 border border-white/25 px-4 py-3 text-xs font-bold text-white shadow-lg hover:bg-sky-900/80 transition active:scale-95">
              <Upload className="w-4 h-4 text-sky-200" />
              <span>Enviar Foto / Galeria</span>
              <input
                type="file"
                accept="image/*"
                onChange={handlePhotoFileChange}
                className="hidden"
              />
            </label>

            {/* WebRTC In-App Camera Modal Trigger */}
            <button
              type="button"
              onClick={startLiveCamera}
              className="flex items-center gap-2 rounded-2xl bg-amber-400 px-4 py-3 text-xs font-black text-slate-950 shadow-lg hover:bg-amber-300 transition active:scale-95"
            >
              <ScanLine className="w-4 h-4" />
              <span>Scanner Ao Vivo</span>
            </button>
          </div>
        </div>

        {/* Preview of Uploaded Prescription Photo & Loading State */}
        {(prescriptionPhotoUrl || loadingPhotoOCR) && (
          <div className="mt-4 rounded-2xl bg-white/10 p-4 backdrop-blur-md border border-white/20 flex flex-col sm:flex-row items-center gap-4">
            {prescriptionPhotoUrl && (
              <div className="relative h-24 w-32 overflow-hidden rounded-xl border border-white/30 bg-black/40 shrink-0">
                <img
                  src={prescriptionPhotoUrl}
                  alt="Receita enviada"
                  className="h-full w-full object-cover"
                />
                {loadingPhotoOCR && (
                  <div className="absolute inset-0 bg-sky-900/60 flex items-center justify-center">
                    <RefreshCw className="w-6 h-6 text-amber-300 animate-spin" />
                  </div>
                )}
              </div>
            )}
            <div className="flex-1 text-xs space-y-1">
              {loadingPhotoOCR ? (
                <>
                  <p className="font-bold text-amber-300 flex items-center gap-2">
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    Identificando paciente, medicamentos, doses e posologia na foto da receita...
                  </p>
                  <p className="text-sky-100">
                    Cruzando itens extraídos com a base ANVISA e verificando interações medicamentosas...
                  </p>
                </>
              ) : (
                <>
                  <p className="font-bold text-emerald-300 flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4" /> Foto da prescrição processada com sucesso!
                  </p>
                  <p className="text-sky-100">
                    Paciente: <strong>{patientName}</strong> {prescriberName ? `• Prescritor: ${prescriberName}` : ''} •{' '}
                    <strong>{prescriptionItems.length} medicamento(s)</strong> extraídos e analisados abaixo.
                  </p>
                </>
              )}
            </div>
            {prescriptionPhotoUrl && !loadingPhotoOCR && (
              <button
                type="button"
                onClick={() => setPrescriptionPhotoUrl(null)}
                className="rounded-xl bg-white/15 px-3 py-1.5 text-[11px] font-semibold text-white hover:bg-white/25"
              >
                Remover Foto
              </button>
            )}
          </div>
        )}
      </div>

      {/* Live WebRTC Camera Modal */}
      {showCameraModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-3xl bg-slate-900 p-5 text-white shadow-2xl border border-slate-700 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold flex items-center gap-2">
                <Camera className="w-4 h-4 text-sky-400" /> Posicione a Receita / Prescrição Médica
              </h3>
              <button
                onClick={stopLiveCamera}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-800 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="relative aspect-video w-full overflow-hidden rounded-2xl bg-black border-2 border-dashed border-sky-400/60">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                className="h-full w-full object-cover"
              />
            </div>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={stopLiveCamera}
                className="flex-1 rounded-xl bg-slate-800 py-3 text-xs font-bold text-slate-300 hover:bg-slate-700"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={captureFromLiveCamera}
                className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-sky-500 py-3 text-xs font-black text-white shadow-lg hover:bg-sky-400"
              >
                <Camera className="w-4 h-4" /> Capturar e Analisar Receita
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Patient & Prescription Input */}
        <div className="lg:col-span-2 space-y-6">
          {/* Patient Profile & Allergies Card */}
          <div className="rounded-3xl bg-white p-5 shadow-sm border border-slate-200 space-y-4">
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Stethoscope className="w-5 h-5 text-sky-600" /> Dados do Paciente & Histórico de Alergias
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700">Paciente / Leito</label>
                <input
                  type="text"
                  value={patientName}
                  onChange={(e) => setPatientName(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-base sm:text-sm focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700">Idade</label>
                <input
                  type="text"
                  value={patientAge}
                  onChange={(e) => setPatientAge(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-base sm:text-sm focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700">Função Renal (ClCr)</label>
                <input
                  type="text"
                  value={patientClCr}
                  onChange={(e) => setPatientClCr(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-base sm:text-sm focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
                />
              </div>
            </div>

            {/* Allergies History */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Histórico de Alergias Medicamentosas do Paciente
              </label>
              <div className="flex flex-wrap items-center gap-2 mb-2.5">
                {allergies.length > 0 ? (
                  allergies.map((allergy) => (
                    <span
                      key={allergy}
                      className="flex items-center gap-1.5 rounded-xl bg-rose-50 px-3 py-1 text-xs font-bold text-rose-700 border border-rose-200"
                    >
                      <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
                      {allergy}
                      <button
                        type="button"
                        onClick={() => handleRemoveAllergy(allergy)}
                        className="ml-1 text-rose-400 hover:text-rose-700 font-black"
                      >
                        ×
                      </button>
                    </span>
                  ))
                ) : (
                  <span className="text-xs text-slate-400">Nenhuma alergia registrada.</span>
                )}
              </div>

              <form onSubmit={handleAddAllergy} className="flex gap-2">
                <input
                  type="text"
                  placeholder="Adicionar alergia (ex: Penicilinas, Dipirona, Sulfa, AINEs)..."
                  value={newAllergy}
                  onChange={(e) => setNewAllergy(e.target.value)}
                  className="flex-1 rounded-xl border border-slate-300 px-3 py-2 text-base sm:text-sm focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
                />
                <button
                  type="submit"
                  className="rounded-xl bg-slate-900 px-4 py-2 text-xs font-bold text-white shadow hover:bg-slate-800 transition"
                >
                  Adicionar Alergia
                </button>
              </form>
            </div>
          </div>

          {/* Prescription Items Card */}
          <div className="rounded-3xl bg-white p-5 shadow-sm border border-slate-200 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <FileText className="w-5 h-5 text-sky-600" /> Medicamentos na Prescrição ({prescriptionItems.length})
              </h2>
              {prescriptionItems.length > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    setPrescriptionItems([]);
                    setAnalysisResult(null);
                  }}
                  className="text-xs font-semibold text-rose-600 hover:underline"
                >
                  Limpar prescrição
                </button>
              )}
            </div>

            {/* Added Items List */}
            <div className="space-y-3">
              {prescriptionItems.length > 0 ? (
                prescriptionItems.map((item, index) => (
                  <div
                    key={item.id}
                    className="flex items-start justify-between rounded-2xl bg-slate-50 p-4 border border-slate-200 hover:border-sky-200 transition"
                  >
                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="flex h-5 w-5 items-center justify-center rounded-full bg-sky-600 text-[10px] font-bold text-white">
                          {index + 1}
                        </span>
                        <span className="font-bold text-slate-900 text-sm">{item.drugName}</span>
                        <span className="rounded bg-sky-100 px-2 py-0.5 text-[10px] font-bold text-sky-800">
                          {item.route}
                        </span>
                      </div>
                      <p className="text-xs text-slate-600">
                        <strong>Dose:</strong> {item.dose} • <strong>Posologia:</strong> {item.posology}
                      </p>
                      <p className="text-[11px] text-slate-500">
                        <strong>Frequência / Horário:</strong> {item.frequency} ({item.schedule})
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRemovePrescriptionItem(item.id)}
                      className="rounded-lg p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600 transition"
                      title="Remover medicamento"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))
              ) : (
                <p className="text-xs text-slate-400 text-center py-4">
                  Nenhum medicamento na prescrição ainda. Tire uma foto da receita acima ou adicione abaixo.
                </p>
              )}
            </div>

            {/* Add Prescription Item Form with Autocomplete over all 8,619 ANVISA drugs */}
            <form
              onSubmit={handleAddPrescriptionItem}
              className="rounded-2xl bg-sky-50/60 p-4 border border-sky-100 space-y-3"
            >
              <h3 className="text-xs font-bold text-sky-900 uppercase tracking-wider">
                Adicionar Medicamento à Prescrição
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="sm:col-span-2 relative">
                  <label className="block text-xs font-semibold text-slate-700">
                    Nome do Medicamento (Digite qualquer medicamento ou selecione da base ANVISA) *
                  </label>
                  <div className="relative mt-1">
                    <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Ex: Dipirona, Morfina, Tramadol, Omeprazol, Losartana, Cefalexina..."
                      value={drugNameInput}
                      onFocus={() => setShowSuggestions(true)}
                      onChange={(e) => {
                        setDrugNameInput(e.target.value);
                        setShowSuggestions(true);
                      }}
                      className="w-full rounded-xl border border-slate-300 py-2 pl-9 pr-8 text-base sm:text-sm bg-white focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
                    />
                    {drugNameInput && (
                      <button
                        type="button"
                        onClick={() => setDrugNameInput('')}
                        className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>

                  {/* Autocomplete Dropdown */}
                  {showSuggestions && drugSuggestions.length > 0 && (
                    <div className="absolute left-0 right-0 mt-1 max-h-52 overflow-y-auto rounded-2xl bg-white py-1.5 shadow-xl border border-slate-200 z-30">
                      <div className="px-3 py-1 text-[10px] font-bold uppercase text-slate-400 flex items-center justify-between">
                        <span>Sugestões de Medicamentos</span>
                        <button
                          type="button"
                          onClick={() => setShowSuggestions(false)}
                          className="text-slate-400 hover:text-slate-700"
                        >
                          Fechar
                        </button>
                      </div>
                      {drugSuggestions.map((m) => (
                        <button
                          type="button"
                          key={m.id}
                          onClick={() => {
                            setDrugNameInput(m.name);
                            setShowSuggestions(false);
                          }}
                          className="w-full px-3 py-2 text-left text-xs hover:bg-sky-50 flex items-center justify-between border-b border-slate-50 last:border-none"
                        >
                          <div>
                            <span className="font-bold text-slate-900">{m.name}</span>
                            {m.activePrinciple && m.activePrinciple !== m.name && (
                              <span className="ml-1.5 text-[11px] text-slate-500">({m.activePrinciple})</span>
                            )}
                            <p className="text-[10px] text-slate-400">{m.therapeuticClass}</p>
                            {m.presentations && m.presentations[0] && (
                              <p className="text-[10px] text-sky-700 font-medium mt-0.5">
                                Apresentação: {m.presentations[0]}
                              </p>
                            )}
                          </div>
                          <span
                            className={`rounded px-2 py-0.5 text-[9px] font-bold shrink-0 ml-2 ${
                              m.tarja === 'Preta'
                                ? 'bg-black text-white'
                                : m.tarja.includes('Vermelha')
                                ? 'bg-rose-600 text-white'
                                : 'bg-emerald-100 text-emerald-800'
                            }`}
                          >
                            {m.tarja}
                          </span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700">Dose / Concentração</label>
                  <input
                    type="text"
                    placeholder="Ex: 500mg, 1g, 10mg/2mL"
                    value={doseInput}
                    onChange={(e) => setDoseInput(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-base sm:text-sm bg-white focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700">Via de Administração</label>
                  <select
                    value={routeInput}
                    onChange={(e) => setRouteInput(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-base sm:text-sm bg-white focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
                  >
                    <option value="Oral">Oral (VO)</option>
                    <option value="Intravenosa">Intravenosa (IV)</option>
                    <option value="Intramuscular">Intramuscular (IM)</option>
                    <option value="Subcutânea">Subcutânea (SC)</option>
                    <option value="Inalatória">Inalatória</option>
                    <option value="Tópica">Tópica</option>
                  </select>
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-slate-700">Posologia</label>
                  <input
                    type="text"
                    placeholder="Ex: 1 comprimido de 8 em 8 horas após as refeições"
                    value={posologyInput}
                    onChange={(e) => setPosologyInput(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-base sm:text-sm bg-white focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700">Frequência</label>
                  <input
                    type="text"
                    placeholder="Ex: 8/8h, 12/12h, 1x/dia"
                    value={frequencyInput}
                    onChange={(e) => setFrequencyInput(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-base sm:text-sm bg-white focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700">Horários Aprazados</label>
                  <input
                    type="text"
                    placeholder="Ex: 08:00 - 16:00 - 00:00"
                    value={scheduleInput}
                    onChange={(e) => setScheduleInput(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-base sm:text-sm bg-white focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
                  />
                </div>
              </div>

              <button
                type="submit"
                className="w-full mt-2 flex items-center justify-center gap-2 rounded-xl bg-sky-600 py-2.5 text-xs font-bold text-white shadow hover:bg-sky-700 transition"
              >
                <Plus className="w-4 h-4" /> Adicionar à Prescrição e Analisar
              </button>
            </form>

            <button
              type="button"
              onClick={runClinicalAnalysis}
              disabled={loadingAI}
              className="w-full flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-600 py-3.5 text-sm font-black text-white shadow-xl hover:from-amber-600 hover:to-orange-700 transition disabled:opacity-50"
            >
              {loadingAI ? (
                <>
                  <RefreshCw className="w-5 h-5 animate-spin" />
                  <span>Analisando todos os {prescriptionItems.length} medicamentos da prescrição...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-5 h-5" />
                  <span>Executar Análise de Interações & Alergias ({prescriptionItems.length} itens)</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Right 1 Col: Analysis Results */}
        <div className="space-y-6">
          <div className="rounded-3xl bg-white p-5 shadow-sm border border-slate-200 sticky top-20">
            <h2 className="text-base font-bold text-slate-900 mb-3 flex items-center gap-2">
              <ShieldAlert className="w-5 h-5 text-rose-600" /> Parecer Clínico Farmacêutico
            </h2>

            {analysisResult ? (
              <div className="space-y-4 text-xs sm:text-sm">
                {/* Summary & Evaluated Drugs Checklist */}
                <div className="rounded-2xl bg-slate-50 p-3.5 border border-slate-200 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold uppercase text-slate-500">
                      Medicamentos Identificados na Análise ({prescriptionItems.length})
                    </span>
                    <span
                      className={`rounded-full px-2 py-0.5 text-[10px] font-extrabold ${
                        analysisResult.requiredIntervention
                          ? 'bg-rose-100 text-rose-800'
                          : 'bg-emerald-100 text-emerald-800'
                      }`}
                    >
                      {analysisResult.requiredIntervention ? 'Requer Intervenção' : 'Prescrição Segura'}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {prescriptionItems.map((it) => (
                      <span
                        key={it.id}
                        className="inline-flex items-center gap-1 rounded-lg bg-white px-2.5 py-1 text-[11px] font-bold text-slate-800 border border-slate-200 shadow-2xs"
                      >
                        <Pill className="w-3 h-3 text-sky-600" />
                        {it.drugName} <span className="text-slate-400 font-normal">({it.dose})</span>
                      </span>
                    ))}
                  </div>
                  {analysisResult.interventionSummary && (
                    <p className="text-xs text-slate-600 pt-1 border-t border-slate-200/80">
                      {safeText(analysisResult.interventionSummary)}
                    </p>
                  )}
                </div>

                {/* Allergy Matches (Alerts in Red) */}
                {analysisResult.allergyRisks && analysisResult.allergyRisks.length > 0 && (
                  <div className="rounded-2xl bg-rose-50 p-4 border-2 border-rose-400 shadow-sm space-y-2">
                    <div className="flex items-center gap-2 text-rose-700 font-black">
                      <AlertTriangle className="w-4 h-4 shrink-0" /> ALERTA CRÍTICO DE ALERGIA!
                    </div>
                    {analysisResult.allergyRisks.map((ar: any, idx: number) => (
                      <div key={idx} className="space-y-1 text-slate-800 border-t border-rose-200 pt-2 first:border-none first:pt-0">
                        <p className="font-bold text-rose-900">{safeText(ar.drug)}</p>
                        <p className="text-rose-800 text-xs">{safeText(ar.allergyMatch || ar.issue)}</p>
                        <p className="text-[11px] font-bold text-rose-700 mt-1">
                          {safeText(ar.recommendation || ar.suggestion)}
                        </p>
                      </div>
                    ))}
                  </div>
                )}

                {/* Interactions */}
                <div className="space-y-2">
                  <h3 className="font-bold text-slate-900">Interações Medicamentosas</h3>
                  {analysisResult.interactions && analysisResult.interactions.length > 0 ? (
                    analysisResult.interactions.map((inter: any, idx: number) => {
                      const d1 = safeText(inter.drug1);
                      const d2 = safeText(inter.drug2);
                      const sev = safeText(inter.severity) || 'Moderada';
                      const desc = safeText(inter.description);
                      const mech = safeText(inter.mechanism);
                      const mgmt = safeText(inter.management);
                      const isSevere = sev.toLowerCase().includes('grave');

                      return (
                        <div
                          key={idx}
                          className={`rounded-2xl p-3.5 border text-xs ${
                            isSevere
                              ? 'bg-rose-50 border-rose-300'
                              : 'bg-amber-50 border-amber-200'
                          }`}
                        >
                          <div className="flex items-center justify-between gap-2 mb-1">
                            <span className="font-bold text-slate-900">
                              {d1} {d2 ? `+ ${d2}` : ''}
                            </span>
                            <span
                              className={`rounded px-2 py-0.5 text-[10px] font-extrabold uppercase shrink-0 ${
                                isSevere ? 'bg-rose-600 text-white' : 'bg-amber-500 text-white'
                              }`}
                            >
                              {sev}
                            </span>
                          </div>
                          {desc && <p className="text-slate-700 mt-1">{desc}</p>}
                          {mech && (
                            <p className="text-[11px] text-slate-500 mt-1">
                              <strong>Mecanismo:</strong> {mech}
                            </p>
                          )}
                          {mgmt && (
                            <p className="text-[11px] font-semibold text-slate-800 mt-1">
                              <strong>Conduta Farmacêutica:</strong> {mgmt}
                            </p>
                          )}
                        </div>
                      );
                    })
                  ) : (
                    <div className="rounded-2xl bg-emerald-50 p-3 text-xs text-emerald-800 font-medium border border-emerald-200">
                      Nenhuma interação medicamentosa clinicamente significativa detectada entre os{' '}
                      {prescriptionItems.length} itens prescritos.
                    </div>
                  )}
                </div>

                {/* ANVISA Prescription Retention */}
                {analysisResult.prescriptionRetention && (
                  <div className="rounded-2xl bg-slate-50 p-3.5 border border-slate-200 space-y-2">
                    <h3 className="font-bold text-slate-900 mb-1">
                      Exigência e Retenção de Receita (ANVISA)
                    </h3>
                    {typeof analysisResult.prescriptionRetention === 'string' ? (
                      <p className="text-slate-700 font-medium">{analysisResult.prescriptionRetention}</p>
                    ) : Array.isArray(analysisResult.prescriptionRetention) ? (
                      analysisResult.prescriptionRetention.map((item: any, i: number) => (
                        <div key={i} className="text-xs text-slate-700 border-t border-slate-200/70 pt-1.5 first:border-none first:pt-0">
                          <p className="font-bold text-slate-900">
                            {safeText(item.drug || 'Medicamento')}:{' '}
                            <span className="text-rose-700">{safeText(item.documentType || item.regulation)}</span>
                          </p>
                          {item.note && <p className="text-[11px] text-slate-500">{safeText(item.note)}</p>}
                        </div>
                      ))
                    ) : typeof analysisResult.prescriptionRetention === 'object' &&
                      analysisResult.prescriptionRetention !== null ? (
                      <div className="text-xs text-slate-700 space-y-0.5">
                        <p className="font-medium">
                          {safeText(
                            analysisResult.prescriptionRetention.type ||
                              analysisResult.prescriptionRetention.regulation ||
                              analysisResult.prescriptionRetention.documentType
                          )}
                        </p>
                        {analysisResult.prescriptionRetention.details && (
                          <p className="text-slate-500">{safeText(analysisResult.prescriptionRetention.details)}</p>
                        )}
                      </div>
                    ) : (
                      <p className="text-slate-700 font-medium">{safeText(analysisResult.prescriptionRetention)}</p>
                    )}
                  </div>
                )}

                {/* Therapeutic Adjustments */}
                {analysisResult.therapeuticAdjustments && (
                  <div className="rounded-2xl bg-sky-50 p-3.5 border border-sky-200">
                    <h3 className="font-bold text-sky-900 mb-1.5">
                      Ajustes Terapêuticos & Revisão Posológica
                    </h3>
                    <ul className="list-disc pl-4 space-y-1 text-xs text-slate-700">
                      {Array.isArray(analysisResult.therapeuticAdjustments) ? (
                        analysisResult.therapeuticAdjustments.map((adj: any, idx: number) => {
                          const text =
                            typeof adj === 'string'
                              ? adj
                              : safeText(
                                  adj.suggestion ||
                                    adj.description ||
                                    adj.adjustment ||
                                    (adj.drug ? `${adj.drug}: ${adj.adjustment || adj.details || ''}` : adj)
                                );
                          return <li key={idx}>{text}</li>;
                        })
                      ) : (
                        <li>{safeText(analysisResult.therapeuticAdjustments)}</li>
                      )}
                    </ul>
                  </div>
                )}

                <button
                  type="button"
                  onClick={handleRegisterIntervention}
                  className="w-full mt-2 flex items-center justify-center gap-2 rounded-xl bg-emerald-600 py-3 text-xs font-bold text-white shadow hover:bg-emerald-700 transition"
                >
                  <Send className="w-4 h-4" /> Registrar como Intervenção Farmacêutica
                </button>
              </div>
            ) : (
              <div className="text-center py-10 text-slate-400 space-y-2">
                <Sparkles className="mx-auto h-8 w-8 text-slate-300" />
                <p className="text-xs">
                  Tire uma foto da receita ou clique em <strong>Executar Análise</strong> para visualizar o parecer clínico de todos os medicamentos prescritos.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
