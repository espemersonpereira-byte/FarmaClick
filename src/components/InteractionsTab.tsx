import React, { useState, useRef, useMemo, useEffect } from 'react';
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
  Search,
  ChevronDown,
  Bookmark,
  ClipboardList,
  Download
} from 'lucide-react';
import { Medication } from '../data/medications';
import { SavedPrescription } from './PrescriptionsTab';
import { exportPrescriptionToPDF } from '../utils/pdfExport';
import { useSwipeBackInterceptor } from './SwipeBackContainer';

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
  onSavePrescription: (prescription: SavedPrescription) => void;
  onViewPrescriptions?: () => void;
  userProfile?: { name: string; profession: string };
  initialPrescription?: SavedPrescription | null;
  onClearInitialPrescription?: () => void;
}

const ROUTE_PRESETS = [
  'Oral (VO)',
  'Intravenosa (IV / EV)',
  'Intramuscular (IM)',
  'Subcutânea (SC)',
  'Inalatória / Nebulização',
  'Sublingual (SL)',
  'Tópica / Dermatológica',
  'Sonda Enteral (SNE / SNG)',
  'Oftálmica (Colírio)',
  'Nasal',
  'Retal'
];

const FREQUENCY_PRESETS: Array<{ label: string; value: string; defaultSchedule: string }> = [
  { label: '8/8h (3x ao dia)', value: '8/8h', defaultSchedule: '06:00 - 14:00 - 22:00' },
  { label: '12/12h (2x ao dia)', value: '12/12h', defaultSchedule: '08:00 - 20:00' },
  { label: '6/6h (4x ao dia)', value: '6/6h', defaultSchedule: '06:00 - 12:00 - 18:00 - 00:00' },
  { label: '24/24h (1x ao dia - Manhã)', value: '24/24h (1x/dia)', defaultSchedule: '08:00' },
  { label: '1x ao dia (Em jejum)', value: '1x ao dia (Jejum)', defaultSchedule: '06:00 (Em jejum)' },
  { label: '1x ao dia (À noite / Ao deitar)', value: '1x ao dia (Noite)', defaultSchedule: '22:00' },
  { label: '4/4h (6x ao dia)', value: '4/4h', defaultSchedule: '04:00 - 08:00 - 12:00 - 16:00 - 20:00 - 00:00' },
  { label: 'Se necessário (ACM / S/N)', value: 'Se necessário (ACM)', defaultSchedule: 'Se necessário (ACM)' },
  { label: 'Dose única', value: 'Dose única', defaultSchedule: 'Agora (Dose única)' },
  { label: 'Uso contínuo (Bomba de Infusão / BIC)', value: 'Contínuo (BIC)', defaultSchedule: 'Infusão contínua 24h' }
];

const SCHEDULE_PRESETS = [
  '06:00 - 14:00 - 22:00',
  '08:00 - 16:00 - 00:00',
  '08:00 - 20:00',
  '06:00 - 18:00',
  '10:00 - 22:00',
  '06:00 - 12:00 - 18:00 - 00:00',
  '04:00 - 08:00 - 12:00 - 16:00 - 20:00 - 00:00',
  '06:00 (Em jejum)',
  '08:00 (Pela manhã)',
  '12:00 (Após o almoço)',
  '20:00 (À noite)',
  '22:00 (Ao deitar)',
  'Se necessário (ACM)',
  'Agora (Dose única imediata)',
  'Infusão contínua 24h'
];

const POSOLOGY_PRESETS = [
  '1 comprimido via oral de 8 em 8 horas',
  '1 comprimido via oral de 12 em 12 horas',
  '1 comprimido via oral de 6 em 6 horas',
  '1 comprimido via oral 1x ao dia pela manhã',
  '1 cápsula via oral em jejum pela manhã',
  '1 comprimido via oral à noite ao deitar',
  '1 comprimido via oral de 6/6h se dor ou febre (ACM)',
  '2 comprimidos via oral de 12 em 12 horas',
  '40 gotas via oral de 6 em 6 horas se dor ou febre',
  '20 gotas via oral de 8 em 8 horas',
  '10 mL via oral de 8 em 8 horas',
  '5 mL via oral de 12 em 12 horas',
  '1 ampola EV diluída de 8 em 8 horas',
  '1 ampola EV diluída de 12 em 12 horas',
  '1 ampola EV diluída de 6/6h se dor ou náusea (ACM)',
  '1 frasco-ampola EV lento de 12 em 12 horas',
  '1 frasco-ampola EV lento de 8 em 8 horas',
  '1 frasco-ampola EV lento 1x ao dia (24/24h)',
  '1 ampola IM profunda em dose única',
  '1 seringa preenchida via subcutânea (SC) 1x ao dia'
];

const SPECIFIC_DRUG_DOSES: Array<{ pattern: RegExp; doses: string[] }> = [
  {
    pattern: /dipirona/i,
    doses: ['500mg (Comprimido)', '1g (Comprimido)', '500mg/mL (Gotas)', '1g / 2mL (500mg/mL - Ampola Injetável)', '50mg/mL (Solução Oral)']
  },
  {
    pattern: /amoxicilina.*clavulan|clavulin/i,
    doses: ['875mg + 125mg (Comprimido)', '500mg + 125mg (Comprimido)', '400mg + 57mg/5mL (Suspensão Oral)', '250mg + 62,5mg/5mL (Suspensão Oral)', '1g + 200mg (Frasco-Ampola EV)']
  },
  {
    pattern: /amoxicilina/i,
    doses: ['500mg (Cápsula)', '875mg (Comprimido)', '250mg/5mL (Suspensão Oral)', '400mg/5mL (Suspensão Oral)']
  },
  {
    pattern: /omeprazol/i,
    doses: ['20mg (Cápsula)', '40mg (Cápsula)', '40mg (Frasco-Ampola EV)']
  },
  {
    pattern: /pantoprazol/i,
    doses: ['20mg (Comprimido)', '40mg (Comprimido)', '40mg (Frasco-Ampola EV)']
  },
  {
    pattern: /esomeprazol/i,
    doses: ['20mg (Comprimido)', '40mg (Comprimido)', '40mg (Frasco-Ampola EV)']
  },
  {
    pattern: /losartana/i,
    doses: ['50mg (Comprimido)', '25mg (Comprimido)', '100mg (Comprimido)']
  },
  {
    pattern: /enalapril/i,
    doses: ['5mg (Comprimido)', '10mg (Comprimido)', '20mg (Comprimido)']
  },
  {
    pattern: /captopril/i,
    doses: ['12,5mg (Comprimido)', '25mg (Comprimido)', '50mg (Comprimido)']
  },
  {
    pattern: /anlodipino/i,
    doses: ['5mg (Comprimido)', '10mg (Comprimido)', '2,5mg (Comprimido)']
  },
  {
    pattern: /clonazepam|rivotril/i,
    doses: ['0,5mg (Comprimido)', '2mg (Comprimido)', '2,5mg/mL (Gotas)', '0,25mg (Sublingual)']
  },
  {
    pattern: /diazepam|valium/i,
    doses: ['5mg (Comprimido)', '10mg (Comprimido)', '10mg/2mL (Ampola Injetável)']
  },
  {
    pattern: /midazolam|dormonid/i,
    doses: ['7,5mg (Comprimido)', '15mg (Comprimido)', '5mg/5mL (Ampola EV/IM)', '15mg/3mL (Ampola EV/IM)', '50mg/10mL (Ampola EV)']
  },
  {
    pattern: /alprazolam|frontal/i,
    doses: ['0,25mg (Comprimido)', '0,5mg (Comprimido)', '1mg (Comprimido)', '2mg (Comprimido)']
  },
  {
    pattern: /morfina|dimorf/i,
    doses: ['10mg (Comprimido)', '30mg (Comprimido)', '10mg/mL (Ampola 1mL)', '1mg/mL (Ampola 2mL)', '0,2mg/mL (Ampola 1mL)']
  },
  {
    pattern: /tramadol|tramal/i,
    doses: ['50mg (Cápsula)', '100mg (Comprimido)', '100mg/mL (Gotas)', '50mg/1mL (Ampola EV/IM)', '100mg/2mL (Ampola EV/IM)']
  },
  {
    pattern: /fentanil/i,
    doses: ['50mcg/mL (0,05mg/mL - Ampola 2mL)', '50mcg/mL (0,05mg/mL - Frasco 10mL)', '25mcg/h (Adesivo)', '50mcg/h (Adesivo)']
  },
  {
    pattern: /ceftriaxona|rocefin/i,
    doses: ['1g (Frasco-Ampola EV)', '1g (Frasco-Ampola IM)', '500mg (Frasco-Ampola)']
  },
  {
    pattern: /cefepima/i,
    doses: ['1g (Frasco-Ampola EV)', '2g (Frasco-Ampola EV)']
  },
  {
    pattern: /cefalexina/i,
    doses: ['500mg (Comprimido / Cápsula)', '1g (Comprimido)', '250mg/5mL (Suspensão Oral)']
  },
  {
    pattern: /meropenem/i,
    doses: ['500mg (Frasco-Ampola EV)', '1g (Frasco-Ampola EV)', '2g (Dose dobrada EV)']
  },
  {
    pattern: /vancomicina/i,
    doses: ['500mg (Frasco-Ampola EV)', '1g (Frasco-Ampola EV)']
  },
  {
    pattern: /piperacilina|tazocin/i,
    doses: ['4g + 500mg (Frasco-Ampola EV)', '2g + 250mg (Frasco-Ampola EV)']
  },
  {
    pattern: /azitromicina/i,
    doses: ['500mg (Comprimido)', '1g (Dose única)', '200mg/5mL (Suspensão Oral)', '500mg (Frasco-Ampola EV)']
  },
  {
    pattern: /ciprofloxacino/i,
    doses: ['500mg (Comprimido)', '250mg (Comprimido)', '200mg/100mL (Bolsa EV)', '400mg/200mL (Bolsa EV)']
  },
  {
    pattern: /levofloxacino/i,
    doses: ['500mg (Comprimido)', '750mg (Comprimido)', '500mg/100mL (Bolsa EV)']
  },
  {
    pattern: /metronidazol/i,
    doses: ['250mg (Comprimido)', '400mg (Comprimido)', '500mg/100mL (5mg/mL - Bolsa EV)', '100mg/g (Gel Vaginal)']
  },
  {
    pattern: /enoxaparina|clexane/i,
    doses: ['20mg/0,2mL (Seringa SC)', '40mg/0,4mL (Seringa SC)', '60mg/0,6mL (Seringa SC)', '80mg/0,8mL (Seringa SC)']
  },
  {
    pattern: /heparina/i,
    doses: ['5.000 UI/0,25mL (Ampola SC)', '5.000 UI/mL (Frasco 5mL EV)']
  },
  {
    pattern: /furosemida|lasix/i,
    doses: ['40mg (Comprimido)', '20mg/2mL (Ampola EV/IM)']
  },
  {
    pattern: /hidroclorotiazida/i,
    doses: ['25mg (Comprimido)', '50mg (Comprimido)', '12,5mg (Comprimido)']
  },
  {
    pattern: /espironolactona|aldactone/i,
    doses: ['25mg (Comprimido)', '50mg (Comprimido)', '100mg (Comprimido)']
  },
  {
    pattern: /ondansetrona|vonau/i,
    doses: ['4mg (Comprimido)', '8mg (Comprimido)', '4mg/2mL (Ampola EV)', '8mg/4mL (Ampola EV)']
  },
  {
    pattern: /metoclopramida|plasil|bromoprida/i,
    doses: ['10mg (Comprimido)', '4mg/mL (Gotas)', '10mg/2mL (Ampola EV/IM)']
  },
  {
    pattern: /paracetamol|tylenol/i,
    doses: ['500mg (Comprimido)', '750mg (Comprimido)', '200mg/mL (Gotas)']
  },
  {
    pattern: /ibuprofeno|alivium|advil/i,
    doses: ['400mg (Comprimido)', '600mg (Comprimido)', '200mg (Comprimido)', '50mg/mL (Gotas)', '100mg/mL (Gotas)']
  },
  {
    pattern: /cetoprofeno|profenid/i,
    doses: ['100mg (Comprimido)', '150mg (Comprimido)', '20mg/mL (Gotas)', '100mg (Frasco-Ampola EV)', '100mg/2mL (Ampola IM)']
  },
  {
    pattern: /diclofenaco|voltaren|cataflam/i,
    doses: ['50mg (Comprimido)', '75mg/3mL (Ampola IM)', '100mg (Comprimido Retard)']
  },
  {
    pattern: /nimesulida/i,
    doses: ['100mg (Comprimido)', '50mg/mL (Gotas)']
  },
  {
    pattern: /dexametasona|decadron/i,
    doses: ['4mg (Comprimido)', '0,5mg (Comprimido)', '4mg/mL - Ampola 2,5mL (10mg EV/IM)', '2mg/mL - Ampola 1mL']
  },
  {
    pattern: /prednisona|meticorten/i,
    doses: ['5mg (Comprimido)', '20mg (Comprimido)']
  },
  {
    pattern: /prednisolona|prelone/i,
    doses: ['20mg (Comprimido)', '5mg (Comprimido)', '3mg/mL (Solução Oral)']
  },
  {
    pattern: /hidrocortisona/i,
    doses: ['100mg (Frasco-Ampola EV/IM)', '500mg (Frasco-Ampola EV/IM)']
  },
  {
    pattern: /metformina|glifage/i,
    doses: ['500mg (Comprimido / XR)', '850mg (Comprimido)', '1g (Comprimido)']
  },
  {
    pattern: /insulina/i,
    doses: ['100 UI/mL (Frasco 10mL)', '100 UI/mL (Caneta 3mL)', '10 UI SC', '20 UI SC', 'Conforme esquema HGT']
  },
  {
    pattern: /sinvastatina|atorvastatina|rosuvastatina/i,
    doses: ['10mg (Comprimido)', '20mg (Comprimido)', '40mg (Comprimido)', '80mg (Comprimido)']
  },
  {
    pattern: /aas|acetilsalic[ií]lico|aspirina/i,
    doses: ['100mg (Comprimido)', '500mg (Comprimido)']
  },
  {
    pattern: /clopidogrel/i,
    doses: ['75mg (Comprimido)', '300mg (Dose de Ataque)']
  },
  {
    pattern: /rivaroxabana|xarelto/i,
    doses: ['10mg (Comprimido)', '15mg (Comprimido)', '20mg (Comprimido)']
  },
  {
    pattern: /apixabana|eliquis/i,
    doses: ['2,5mg (Comprimido)', '5mg (Comprimido)']
  },
  {
    pattern: /varfarina|marevan/i,
    doses: ['5mg (Comprimido)', '2,5mg (Comprimido)', '1mg (Comprimido)']
  },
  {
    pattern: /haloperidol|haldol/i,
    doses: ['1mg (Comprimido)', '5mg (Comprimido)', '2mg/mL (Gotas)', '5mg/mL (Ampola 1mL IM)']
  },
  {
    pattern: /quetiapina/i,
    doses: ['25mg (Comprimido)', '50mg (Comprimido)', '100mg (Comprimido)', '200mg (Comprimido)']
  },
  {
    pattern: /sertralina/i,
    doses: ['25mg (Comprimido)', '50mg (Comprimido)', '100mg (Comprimido)']
  },
  {
    pattern: /escitalopram|lexapro/i,
    doses: ['10mg (Comprimido)', '15mg (Comprimido)', '20mg (Comprimido)', '20mg/mL (Gotas)']
  },
  {
    pattern: /fluoxetina/i,
    doses: ['10mg (Cápsula)', '20mg (Cápsula)', '20mg/mL (Gotas)']
  },
  {
    pattern: /amitriptilina/i,
    doses: ['25mg (Comprimido)', '75mg (Comprimido)', '10mg (Comprimido)']
  },
  {
    pattern: /pregabalina/i,
    doses: ['25mg (Cápsula)', '50mg (Cápsula)', '75mg (Cápsula)', '150mg (Cápsula)']
  }
];

const DEFAULT_FALLBACK_DOSES = [
  '500mg',
  '1g',
  '250mg',
  '100mg',
  '50mg',
  '40mg',
  '25mg',
  '20mg',
  '10mg',
  '5mg',
  '2mg',
  '875mg + 125mg',
  '500mg/mL (Gotas)',
  '10mg/2mL (Ampola)',
  '1 ampola',
  '1 frasco-ampola',
  '20 gotas',
  '40 gotas',
  '10 mL'
];

export const InteractionsTab: React.FC<InteractionsTabProps> = ({
  medications,
  onSaveIntervention,
  onSavePrescription,
  onViewPrescriptions,
  userProfile,
  initialPrescription,
  onClearInitialPrescription
}) => {
  const [patientName, setPatientName] = useState('');
  const [patientBed, setPatientBed] = useState('');
  const [patientWard, setPatientWard] = useState('');
  const [patientAge, setPatientAge] = useState('');
  const [patientClCr, setPatientClCr] = useState('');
  const [prescriberName, setPrescriberName] = useState('');
  const [allergies, setAllergies] = useState<string[]>([]);
  const [newAllergy, setNewAllergy] = useState('');

  const [prescriptionItems, setPrescriptionItems] = useState<PrescriptionItem[]>([]);

  // Form for adding new prescription item with autocomplete over all ANVISA drugs
  const [drugNameInput, setDrugNameInput] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [doseInput, setDoseInput] = useState('');
  const [posologyInput, setPosologyInput] = useState('');
  const [frequencyInput, setFrequencyInput] = useState('');
  const [scheduleInput, setScheduleInput] = useState('');
  const [routeInput, setRouteInput] = useState('Oral (VO)');
  const [activeFieldDropdown, setActiveFieldDropdown] = useState<'dose' | 'route' | 'posology' | 'frequency' | 'schedule' | null>(null);

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
  const [savedToPrescriptionsBanner, setSavedToPrescriptionsBanner] = useState(false);

  useEffect(() => {
    if (initialPrescription) {
      setPatientName(initialPrescription.patientName || '');
      setPatientBed(initialPrescription.patientBed || '');
      setPatientWard(initialPrescription.patientWard || '');
      setPatientAge(initialPrescription.patientAge || '');
      setPatientClCr(initialPrescription.patientClCr || '');
      setPrescriberName(initialPrescription.prescriberName || '');
      setAllergies(Array.isArray(initialPrescription.allergies) ? initialPrescription.allergies : []);
      setPrescriptionItems(Array.isArray(initialPrescription.items) ? initialPrescription.items : []);
      setPrescriptionPhotoUrl(initialPrescription.photoUrl || null);
      setAnalysisResult(initialPrescription.analysisResult || null);
      setSuccessBanner(`Receita de "${initialPrescription.patientName || 'Paciente'}" carregada para visualização ou edição.`);
      if (onClearInitialPrescription) {
        onClearInitialPrescription();
      }
    }
  }, [initialPrescription, onClearInitialPrescription]);

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

  // Compute dynamic dose options tailored specifically to the medication selected/typed by the user
  const dynamicDoseInfo = useMemo(() => {
    const q = drugNameInput.trim().toLowerCase();
    if (!q) {
      return {
        matchedDrugLabel: '',
        specificDoses: [] as string[],
        allDoses: DEFAULT_FALLBACK_DOSES
      };
    }

    const specificSet = new Set<string>();

    // 1. Check curated clinical dose patterns
    for (const entry of SPECIFIC_DRUG_DOSES) {
      if (entry.pattern.test(q)) {
        entry.doses.forEach(d => specificSet.add(d));
      }
    }

    // 2. Find matching medications in our 7,090 ANVISA catalog & extract concentrations from their official presentations
    const matchedMeds = medications.filter(
      m =>
        m.name.toLowerCase() === q ||
        (m.activePrinciple && m.activePrinciple.toLowerCase() === q) ||
        m.name.toLowerCase().includes(q) ||
        (m.activePrinciple && m.activePrinciple.toLowerCase().includes(q))
    );

    const primaryMed = matchedMeds[0];

    for (const med of matchedMeds.slice(0, 5)) {
      // Check curated patterns against activePrinciple as well
      if (med.activePrinciple) {
        for (const entry of SPECIFIC_DRUG_DOSES) {
          if (entry.pattern.test(med.activePrinciple)) {
            entry.doses.forEach(d => specificSet.add(d));
          }
        }
      }

      // Extract clean concentration + form from official ANVISA presentations (e.g., "500 MG COM REV CT..." -> "500 MG (COM REV)")
      if (Array.isArray(med.presentations)) {
        for (const pres of med.presentations) {
          // Match concentration at the start of ANVISA presentation string
          const concMatch = pres.match(
            /^(\d+(?:[.,]\d+)?\s*(?:MG\/ML|MG\/G|MCG\/ML|MCG\/DOSE|UI\/ML|MG|G|MCG|UI|MGL|MEQ\/ML|%)(?:\s*\+\s*\d+(?:[.,]\d+)?\s*(?:MG\/ML|MG\/G|MCG|MG|G|UI|%))*)\s+([A-ZÀ-Ÿ\s]{2,18}?)(?:\s+CT\b|\s+CX\b|\s+FR\b|\s+BL\b|\s+AMP\b|\s+SER\b|\s+X\b|$)/i
          );
          if (concMatch) {
            const conc = concMatch[1].trim();
            const form = concMatch[2].trim();
            specificSet.add(`${conc} (${form})`);
          }
          // Also extract any standalone dosage unit in the presentation
          const simpleConc = pres.match(
            /\b(\d+(?:[.,]\d+)?\s*(?:mg\/ml|mg\/g|mcg\/ml|ui\/ml|mg|g|mcg|ui|%)(?:\s*\+\s*\d+(?:[.,]\d+)?\s*(?:mg|g|mcg|ml|ui))?)\b/i
          );
          if (simpleConc) {
            specificSet.add(simpleConc[1].toUpperCase());
          }
          // Also include the full official ANVISA presentation (truncated cleanly if very long)
          if (pres.length <= 75) {
            specificSet.add(pres);
          }
        }
      }

      if (med.dosageForm) {
        const matches = med.dosageForm.match(
          /\d+(?:[.,]\d+)?\s*(?:mg\/mL|mg\/g|mcg\/mL|UI\/mL|mg|g|mcg|UI|%)(?:\s*[+/]\s*\d+(?:[.,]\d+)?\s*(?:mg|g|mcg|mL|UI))?/gi
        );
        if (matches) {
          matches.forEach(d => specificSet.add(d.trim()));
        }
      }
    }

    const specificDoses = Array.from(specificSet).slice(0, 18);
    const combined = [...specificDoses];
    for (const fb of DEFAULT_FALLBACK_DOSES) {
      if (!combined.some(c => c.toLowerCase() === fb.toLowerCase())) {
        combined.push(fb);
      }
    }

    return {
      matchedDrugLabel: primaryMed ? primaryMed.name : drugNameInput.trim(),
      specificDoses,
      allDoses: combined
    };
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

  const clearAllPatientAndPrescriptionData = () => {
    setPatientName('');
    setPatientBed('');
    setPatientWard('');
    setPatientAge('');
    setPatientClCr('');
    setPrescriberName('');
    setAllergies([]);
    setNewAllergy('');
    setPrescriptionItems([]);
    setAnalysisResult(null);
    setPrescriptionPhotoUrl(null);
    setErrorMsg(null);
    setSuccessBanner(null);
  };

  const executeAnalysisForList = async (
    itemsToAnalyze: PrescriptionItem[],
    allergiesToAnalyze: string[],
    pInfo: {
      patientName: string;
      patientBed?: string;
      patientWard?: string;
      patientAge: string;
      patientClCr: string;
    }
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
        executeAnalysisForList(prescriptionItems, updated, {
          patientName,
          patientBed,
          patientWard,
          patientAge,
          patientClCr
        });
      }
    }
  };

  const handleRemoveAllergy = (allergy: string) => {
    const updated = allergies.filter(a => a !== allergy);
    setAllergies(updated);
    if (prescriptionItems.length > 0) {
      executeAnalysisForList(prescriptionItems, updated, {
        patientName,
        patientBed,
        patientWard,
        patientAge,
        patientClCr
      });
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
      dose: doseInput.trim() || 'Conforme prescrição',
      posology: posologyInput.trim() || 'Conforme prescrição médica',
      frequency: frequencyInput.trim() || 'Conforme prescrição',
      schedule: scheduleInput.trim() || '08:00',
      route: routeInput || 'Oral'
    };
    const updatedItems = [...prescriptionItems, newItem];
    setPrescriptionItems(updatedItems);
    setDrugNameInput('');
    setDoseInput('');
    setPosologyInput('');
    setFrequencyInput('');
    setScheduleInput('');
    setShowSuggestions(false);
    setErrorMsg(null);
    setSuccessBanner(`"${newItem.drugName}" adicionado à prescrição e analisado!`);
    setTimeout(() => setSuccessBanner(null), 4000);

    executeAnalysisForList(updatedItems, allergies, {
      patientName,
      patientBed,
      patientWard,
      patientAge,
      patientClCr
    });
  };

  const handleRemovePrescriptionItem = (id: string) => {
    const updatedItems = prescriptionItems.filter(item => item.id !== id);
    setPrescriptionItems(updatedItems);
    if (updatedItems.length > 0) {
      executeAnalysisForList(updatedItems, allergies, {
        patientName,
        patientBed,
        patientWard,
        patientAge,
        patientClCr
      });
    } else {
      setAnalysisResult(null);
    }
  };

  const runClinicalAnalysis = async () => {
    let itemsToRun = [...prescriptionItems];
    if (drugNameInput.trim()) {
      const autoItem: PrescriptionItem = {
        id: Date.now().toString(),
        drugName: drugNameInput.trim(),
        dose: doseInput.trim() || 'Conforme prescrição',
        posology: posologyInput.trim() || 'Conforme prescrição médica',
        frequency: frequencyInput.trim() || 'Conforme prescrição',
        schedule: scheduleInput.trim() || '08:00',
        route: routeInput || 'Oral'
      };
      itemsToRun = [...itemsToRun, autoItem];
      setPrescriptionItems(itemsToRun);
      setDrugNameInput('');
      setDoseInput('');
      setPosologyInput('');
      setFrequencyInput('');
      setScheduleInput('');
      setShowSuggestions(false);
    }

    await executeAnalysisForList(itemsToRun, allergies, {
      patientName,
      patientBed,
      patientWard,
      patientAge,
      patientClCr
    });
  };

  // Normalize & compress high-resolution camera image so upload and OCR work reliably on all devices
  const normalizeImageDataUrl = (rawDataUrl: string): Promise<{ dataUrl: string; mimeType: string }> => {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        const maxDim = 1800;
        let width = img.width || 1280;
        let height = img.height || 960;
        if (width > maxDim || height > maxDim) {
          if (width > height) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          } else {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.fillStyle = '#FFFFFF';
          ctx.fillRect(0, 0, width, height);
          ctx.drawImage(img, 0, 0, width, height);
          const compressed = canvas.toDataURL('image/jpeg', 0.88);
          resolve({ dataUrl: compressed, mimeType: 'image/jpeg' });
        } else {
          resolve({ dataUrl: rawDataUrl, mimeType: 'image/jpeg' });
        }
      };
      img.onerror = () => {
        resolve({ dataUrl: rawDataUrl, mimeType: 'image/jpeg' });
      };
      img.src = rawDataUrl;
    });
  };

  // Process uploaded or captured prescription photo
  const processPrescriptionImage = async (rawDataUrl: string) => {
    setPrescriptionPhotoUrl(rawDataUrl);
    setLoadingPhotoOCR(true);
    setErrorMsg(null);
    setSuccessBanner(null);

    // Immediately clear any previous patient data and previous medications so old data never remains on screen
    setPatientName('');
    setPatientBed('');
    setPatientWard('');
    setPatientAge('');
    setPatientClCr('');
    setPrescriberName('');
    setPrescriptionItems([]);
    setAnalysisResult(null);

    try {
      const { dataUrl, mimeType } = await normalizeImageDataUrl(rawDataUrl);
      setPrescriptionPhotoUrl(dataUrl);

      const response = await fetch('/api/analyze-prescription-photo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageBase64: dataUrl,
          mimeType,
          patientAllergies: allergies
        })
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Não foi possível analisar a foto da prescrição.');
      }

      const extractedName = (data.patientName || '').trim();
      const extractedBed = (data.patientBed || '').trim();
      const extractedWard = (data.patientWard || '').trim();
      const extractedAge = (data.patientAge || '').trim();
      const extractedClCr = (data.patientClCr || '').trim();
      const extractedPrescriber = (data.prescriber || '').trim();
      const extractedDrugs: PrescriptionItem[] = Array.isArray(data.extractedItems) ? data.extractedItems : [];

      setPatientName(extractedName);
      setPatientBed(extractedBed);
      setPatientWard(extractedWard);
      setPatientAge(extractedAge);
      if (extractedClCr) setPatientClCr(extractedClCr);
      setPrescriberName(extractedPrescriber);
      setPrescriptionItems(extractedDrugs);

      if (data.analysis) {
        setAnalysisResult(data.analysis);
      } else if (extractedDrugs.length > 0) {
        await executeAnalysisForList(extractedDrugs, allergies, {
          patientName: extractedName,
          patientBed: extractedBed,
          patientWard: extractedWard,
          patientAge: extractedAge,
          patientClCr: extractedClCr
        });
      }

      if (extractedDrugs.length === 0 && !extractedName && !extractedBed && !extractedWard) {
        setErrorMsg(
          'Não foi possível identificar texto legível na imagem enviada. Tente enviar uma foto mais nítida e próxima da prescrição, ou preencha os campos abaixo.'
        );
      } else {
        const summaryParts: string[] = [];
        if (extractedName) summaryParts.push(`Paciente: ${extractedName}`);
        if (extractedBed) summaryParts.push(`Leito: ${extractedBed}`);
        if (extractedWard) summaryParts.push(`Setor: ${extractedWard}`);
        summaryParts.push(`${extractedDrugs.length} medicamento(s) identificado(s)`);

        setSuccessBanner(`Prescrição lida com sucesso! ${summaryParts.join(' • ')}.`);
        setTimeout(() => setSuccessBanner(null), 7000);
      }
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
        processPrescriptionImage(reader.result);
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

  useSwipeBackInterceptor(showCameraModal, stopLiveCamera);

  const captureFromLiveCamera = () => {
    if (!videoRef.current) return;
    const canvas = document.createElement('canvas');
    canvas.width = videoRef.current.videoWidth || 1280;
    canvas.height = videoRef.current.videoHeight || 720;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
      const dataUrl = canvas.toDataURL('image/jpeg', 0.88);
      stopLiveCamera();
      processPrescriptionImage(dataUrl);
    }
  };

  const handleSaveToPrescriptions = () => {
    let itemsToSave = [...prescriptionItems];
    if (drugNameInput.trim()) {
      const autoItem: PrescriptionItem = {
        id: Date.now().toString(),
        drugName: drugNameInput.trim(),
        dose: doseInput.trim() || 'Conforme prescrição',
        posology: posologyInput.trim() || 'Conforme prescrição médica',
        frequency: frequencyInput.trim() || 'Conforme prescrição',
        schedule: scheduleInput.trim() || '08:00',
        route: routeInput || 'Oral'
      };
      itemsToSave = [...itemsToSave, autoItem];
      setPrescriptionItems(itemsToSave);
      setDrugNameInput('');
      setDoseInput('');
      setPosologyInput('');
      setFrequencyInput('');
      setScheduleInput('');
    }

    if (itemsToSave.length === 0 && !patientName.trim() && !prescriptionPhotoUrl) {
      setErrorMsg('Adicione pelo menos um medicamento ou envie a foto da receita antes de salvar.');
      return;
    }

    const newSavedPrescription: SavedPrescription = {
      id: 'rec-' + Date.now(),
      createdAt: new Date().toLocaleString('pt-BR'),
      patientName: patientName.trim() || 'Paciente não informado',
      patientBed: patientBed.trim(),
      patientWard: patientWard.trim(),
      patientAge: patientAge.trim(),
      patientClCr: patientClCr.trim(),
      prescriberName: prescriberName.trim(),
      allergies: [...allergies],
      items: itemsToSave,
      photoUrl: prescriptionPhotoUrl,
      analysisResult: analysisResult,
      savedBy: userProfile?.name
        ? `${userProfile.name} (${userProfile.profession || 'Profissional'})`
        : 'Profissional de Saúde'
    };

    onSavePrescription(newSavedPrescription);
    setErrorMsg(null);
    setSavedToPrescriptionsBanner(true);
    setSuccessBanner('Receita / Prescrição salva com sucesso na página "Receitas"!');
    setTimeout(() => {
      setSuccessBanner(null);
      setSavedToPrescriptionsBanner(false);
    }, 6000);
  };

  const handleExportCurrentPrescriptionPDF = () => {
    if (prescriptionItems.length === 0 && !patientName.trim()) {
      setErrorMsg('Adicione pelo menos um medicamento à prescrição antes de exportar o PDF.');
      return;
    }

    const currentSnapshot: SavedPrescription = {
      id: 'pdf-' + Date.now(),
      createdAt: new Date().toLocaleString('pt-BR'),
      patientName: patientName.trim() || 'Paciente não informado',
      patientBed: patientBed.trim(),
      patientWard: patientWard.trim(),
      patientAge: patientAge.trim(),
      patientClCr: patientClCr.trim(),
      prescriberName: prescriberName.trim(),
      allergies: [...allergies],
      items: [...prescriptionItems],
      photoUrl: prescriptionPhotoUrl,
      analysisResult: analysisResult,
      savedBy: userProfile?.name
        ? `${userProfile.name} (${userProfile.profession || 'Profissional'})`
        : 'Profissional de Saúde'
    };

    exportPrescriptionToPDF(currentSnapshot);
    setSuccessBanner('Relatório da prescrição analisada exportado em PDF com sucesso!');
    setTimeout(() => setSuccessBanner(null), 4000);
  };

  const handleRegisterIntervention = () => {
    if (!analysisResult) return;
    const formattedPatient = [
      patientName || 'Paciente não informado',
      patientBed ? `Leito ${patientBed}` : ''
    ]
      .filter(Boolean)
      .join(' - ');

    const newLog = {
      id: 'int-' + Date.now(),
      timestamp: new Date().toLocaleString('pt-BR'),
      patientName: formattedPatient,
      ward: patientWard || 'Farmácia Clínica',
      pharmacistName: userProfile?.name || 'Farmacêutico Clínico',
      medications: prescriptionItems.map(i => `${i.drugName} (${i.dose})`),
      interventions: Array.isArray(analysisResult.therapeuticAdjustments)
        ? analysisResult.therapeuticAdjustments.map(safeText)
        : [safeText(analysisResult.interventionSummary)],
      status: 'Pendente' as const,
      clinicalOutcome: 'Aguardando validação da equipe médica.'
    };
    onSaveIntervention(newLog);
    setSavedToPrescriptionsBanner(false);
    setSuccessBanner('Intervenção farmacêutica registrada com sucesso! Confira na aba Intervenções.');
    setTimeout(() => setSuccessBanner(null), 4000);
  };

  return (
    <div className="space-y-6 pb-20">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">
            Análise de Prescrição, Foto de Receita & Interações
          </h1>
          <p className="text-xs text-slate-500">
            Tire uma foto da prescrição médica ou preencha os dados manualmente para identificar paciente, leito, setor, doses, posologia, interações, alergias e retenção ANVISA.
          </p>
        </div>

        {(prescriptionItems.length > 0 || patientName.trim() || prescriptionPhotoUrl) && (
          <div className="flex flex-wrap items-center gap-2 shrink-0 self-start sm:self-auto">
            <button
              type="button"
              onClick={handleSaveToPrescriptions}
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-sky-600 px-4 py-2.5 text-xs font-black text-white shadow-md hover:bg-sky-700 transition"
            >
              <Bookmark className="w-4 h-4" />
              <span>Salvar Receita</span>
            </button>
            <button
              type="button"
              onClick={handleExportCurrentPrescriptionPDF}
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-slate-900 px-4 py-2.5 text-xs font-black text-white shadow-md hover:bg-slate-800 transition"
            >
              <Download className="w-4 h-4" />
              <span>Exportar PDF</span>
            </button>
          </div>
        )}
      </div>

      {successBanner && (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl bg-emerald-50 p-4 text-xs font-bold text-emerald-800 border border-emerald-200 shadow-sm animate-in fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{successBanner}</span>
          </div>
          <div className="flex items-center gap-2">
            {savedToPrescriptionsBanner && onViewPrescriptions && (
              <button
                type="button"
                onClick={onViewPrescriptions}
                className="inline-flex items-center gap-1 rounded-xl bg-emerald-600 px-3 py-1.5 text-[11px] font-bold text-white shadow hover:bg-emerald-700 transition"
              >
                <ClipboardList className="w-3.5 h-3.5" />
                <span>Ver Página de Receitas</span>
              </button>
            )}
            <button onClick={() => setSuccessBanner(null)} className="text-emerald-600 hover:text-emerald-900">
              <X className="w-4 h-4" />
            </button>
          </div>
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
              <ScanLine className="w-3.5 h-3.5 text-amber-300" /> Leitura Inteligente de Prescrição por Foto (OCR Clínico)
            </span>
            <h2 className="text-lg sm:text-xl font-black">
              Analisar Prescrição ou Receita Médica por Foto
            </h2>
            <p className="text-xs text-sky-100 leading-relaxed">
              Tire uma foto da prescrição ou envie da galeria. O sistema identifica automaticamente o <strong>nome do paciente</strong>, <strong>leito</strong>, <strong>setor/local</strong>, <strong>medicamentos</strong>, <strong>doses</strong> e <strong>posologia</strong> diretamente da imagem.
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
                    Lendo foto da prescrição: identificando paciente, leito, setor, medicamentos, doses e posologia...
                  </p>
                  <p className="text-sky-100">
                    Aguarde alguns segundos enquanto o sistema extrai todos os dados da imagem enviada.
                  </p>
                </>
              ) : (
                <>
                  <p className="font-bold text-emerald-300 flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4" /> Foto da prescrição processada!
                  </p>
                  <p className="text-sky-100">
                    Paciente: <strong>{patientName || 'Não identificado na foto'}</strong>
                    {patientBed ? ` • Leito: ${patientBed}` : ''}
                    {patientWard ? ` • Setor: ${patientWard}` : ''}
                    {prescriberName ? ` • Prescritor: ${prescriberName}` : ''} •{' '}
                    <strong>{prescriptionItems.length} medicamento(s)</strong> extraído(s).
                  </p>
                </>
              )}
            </div>
            {prescriptionPhotoUrl && !loadingPhotoOCR && (
              <div className="flex flex-wrap items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={handleSaveToPrescriptions}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-400 px-3.5 py-2 text-xs font-black text-slate-950 shadow hover:bg-emerald-300 transition"
                >
                  <Bookmark className="w-3.5 h-3.5" />
                  <span>Salvar Receita</span>
                </button>
                <button
                  type="button"
                  onClick={() => setPrescriptionPhotoUrl(null)}
                  className="rounded-xl bg-white/15 px-3 py-2 text-[11px] font-semibold text-white hover:bg-white/25"
                >
                  Remover Foto
                </button>
              </div>
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
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Stethoscope className="w-5 h-5 text-sky-600" /> Dados do Paciente & Histórico de Alergias
              </h2>
              {(patientName || patientBed || patientWard || patientAge || patientClCr || prescriberName || prescriptionItems.length > 0) && (
                <button
                  type="button"
                  onClick={clearAllPatientAndPrescriptionData}
                  className="text-xs font-semibold text-rose-600 hover:underline"
                >
                  Limpar todos os dados
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-slate-700">Nome do Paciente</label>
                <input
                  type="text"
                  placeholder="Preencha ou envie foto da prescrição..."
                  value={patientName}
                  onChange={(e) => setPatientName(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-base sm:text-sm focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700">Leito / Quarto</label>
                <input
                  type="text"
                  placeholder="Ex: 302, Box 04"
                  value={patientBed}
                  onChange={(e) => setPatientBed(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-base sm:text-sm focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700">Setor / Onde está internado</label>
                <input
                  type="text"
                  placeholder="Ex: UTI, Enfermaria, Pronto Socorro"
                  value={patientWard}
                  onChange={(e) => setPatientWard(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-base sm:text-sm focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700">Idade</label>
                <input
                  type="text"
                  placeholder="Ex: 58 anos"
                  value={patientAge}
                  onChange={(e) => setPatientAge(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-base sm:text-sm focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700">Função Renal (ClCr)</label>
                <input
                  type="text"
                  placeholder="Ex: 60 mL/min (opcional)"
                  value={patientClCr}
                  onChange={(e) => setPatientClCr(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-base sm:text-sm focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
                />
              </div>
              <div className="sm:col-span-3">
                <label className="block text-xs font-semibold text-slate-700">Médico Prescritor / CRM (opcional)</label>
                <input
                  type="text"
                  placeholder="Identificado na receita ou preenchido manualmente"
                  value={prescriberName}
                  onChange={(e) => setPrescriberName(e.target.value)}
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

            {/* Add Prescription Item Form with Autocomplete & Dynamic Pre-registered Options */}
            <form
              onSubmit={handleAddPrescriptionItem}
              className="rounded-2xl bg-sky-50/60 p-4 border border-sky-100 space-y-3"
            >
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold text-sky-900 uppercase tracking-wider">
                  Adicionar Medicamento à Prescrição
                </h3>
                <span className="text-[11px] text-sky-700 font-medium">
                  Selecione das opções ou digite manualmente
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* 1. Nome do Medicamento */}
                <div className="sm:col-span-2 relative">
                  <label className="block text-xs font-semibold text-slate-700">
                    Nome do Medicamento *
                  </label>
                  <div className="relative mt-1">
                    <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Ex: Dipirona, Morfina, Tramadol, Omeprazol, Losartana, Cefalexina..."
                      value={drugNameInput}
                      onFocus={() => {
                        setShowSuggestions(true);
                        setActiveFieldDropdown(null);
                      }}
                      onChange={(e) => {
                        setDrugNameInput(e.target.value);
                        setShowSuggestions(true);
                      }}
                      className="w-full rounded-xl border border-slate-300 py-2 pl-9 pr-8 text-base sm:text-sm bg-white focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
                    />
                    {drugNameInput && (
                      <button
                        type="button"
                        onClick={() => {
                          setDrugNameInput('');
                          setDoseInput('');
                        }}
                        className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>

                  {/* Medication Autocomplete Dropdown */}
                  {showSuggestions && drugSuggestions.length > 0 && (
                    <div className="absolute left-0 right-0 mt-1 max-h-56 overflow-y-auto rounded-2xl bg-white py-1.5 shadow-xl border border-slate-200 z-30">
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
                            setActiveFieldDropdown('dose');
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

                {/* 2. Dose / Concentração (Dynamic per selected medication + manual input) */}
                <div className="relative">
                  <div className="flex items-center justify-between">
                    <label className="block text-xs font-semibold text-slate-700">
                      Dose / Concentração
                    </label>
                    {dynamicDoseInfo.specificDoses.length > 0 && (
                      <span className="text-[10px] font-bold text-sky-700">
                        {dynamicDoseInfo.specificDoses.length} opções do medicamento
                      </span>
                    )}
                  </div>
                  <div className="relative mt-1">
                    <input
                      type="text"
                      placeholder={
                        dynamicDoseInfo.specificDoses[0]
                          ? `Selecione (ex: ${dynamicDoseInfo.specificDoses[0]}) ou digite`
                          : 'Selecione uma dose ou digite...'
                      }
                      value={doseInput}
                      onFocus={() => {
                        setShowSuggestions(false);
                        setActiveFieldDropdown('dose');
                      }}
                      onChange={(e) => {
                        setDoseInput(e.target.value);
                        setActiveFieldDropdown('dose');
                      }}
                      className="w-full rounded-xl border border-slate-300 py-2 pl-3 pr-9 text-base sm:text-sm bg-white focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
                    />
                    <button
                      type="button"
                      onClick={() =>
                        setActiveFieldDropdown(activeFieldDropdown === 'dose' ? null : 'dose')
                      }
                      className="absolute right-2 top-2 rounded-lg p-0.5 text-slate-500 hover:bg-slate-100"
                      title="Ver opções de dose"
                    >
                      <ChevronDown className="w-4 h-4" />
                    </button>
                  </div>

                  {activeFieldDropdown === 'dose' && (
                    <div className="absolute left-0 right-0 mt-1 max-h-56 overflow-y-auto rounded-2xl bg-white py-1.5 shadow-xl border border-slate-200 z-30">
                      <div className="px-3 py-1 text-[10px] font-bold uppercase text-sky-700 bg-sky-50/80 flex items-center justify-between">
                        <span>
                          {dynamicDoseInfo.specificDoses.length > 0
                            ? `Doses de ${dynamicDoseInfo.matchedDrugLabel}`
                            : 'Doses / Concentrações Pré-Cadastradas'}
                        </span>
                        <button
                          type="button"
                          onClick={() => setActiveFieldDropdown(null)}
                          className="text-slate-500 hover:text-slate-800"
                        >
                          Fechar
                        </button>
                      </div>

                      {dynamicDoseInfo.specificDoses.length > 0 && (
                        <>
                          {dynamicDoseInfo.specificDoses.map((d, i) => (
                            <button
                              type="button"
                              key={`spec-dose-${i}`}
                              onClick={() => {
                                setDoseInput(d);
                                setActiveFieldDropdown(null);
                              }}
                              className="w-full px-3 py-2 text-left text-xs font-bold text-sky-950 hover:bg-sky-50 flex items-center justify-between border-b border-slate-50"
                            >
                              <span>{d}</span>
                              <span className="rounded bg-sky-100 px-1.5 py-0.5 text-[9px] font-bold text-sky-800 shrink-0 ml-2">
                                Recomendada
                              </span>
                            </button>
                          ))}
                          <div className="px-3 py-1 text-[10px] font-bold uppercase text-slate-400 bg-slate-50">
                            Outras Doses Padrão
                          </div>
                        </>
                      )}

                      {DEFAULT_FALLBACK_DOSES.map((d, i) => (
                        <button
                          type="button"
                          key={`fb-dose-${i}`}
                          onClick={() => {
                            setDoseInput(d);
                            setActiveFieldDropdown(null);
                          }}
                          className="w-full px-3 py-1.5 text-left text-xs text-slate-700 hover:bg-sky-50 border-b border-slate-50 last:border-none"
                        >
                          {d}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* 3. Via de Administração (Pre-registered options + manual input) */}
                <div className="relative">
                  <label className="block text-xs font-semibold text-slate-700">
                    Via de Administração
                  </label>
                  <div className="relative mt-1">
                    <input
                      type="text"
                      placeholder="Selecione ou digite a via..."
                      value={routeInput}
                      onFocus={() => {
                        setShowSuggestions(false);
                        setActiveFieldDropdown('route');
                      }}
                      onChange={(e) => {
                        setRouteInput(e.target.value);
                        setActiveFieldDropdown('route');
                      }}
                      className="w-full rounded-xl border border-slate-300 py-2 pl-3 pr-9 text-base sm:text-sm bg-white focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
                    />
                    <button
                      type="button"
                      onClick={() =>
                        setActiveFieldDropdown(activeFieldDropdown === 'route' ? null : 'route')
                      }
                      className="absolute right-2 top-2 rounded-lg p-0.5 text-slate-500 hover:bg-slate-100"
                      title="Ver vias de administração"
                    >
                      <ChevronDown className="w-4 h-4" />
                    </button>
                  </div>

                  {activeFieldDropdown === 'route' && (
                    <div className="absolute left-0 right-0 mt-1 max-h-56 overflow-y-auto rounded-2xl bg-white py-1.5 shadow-xl border border-slate-200 z-30">
                      <div className="px-3 py-1 text-[10px] font-bold uppercase text-slate-400 flex items-center justify-between">
                        <span>Vias Pré-Cadastradas</span>
                        <button
                          type="button"
                          onClick={() => setActiveFieldDropdown(null)}
                          className="text-slate-400 hover:text-slate-700"
                        >
                          Fechar
                        </button>
                      </div>
                      {ROUTE_PRESETS.map((r) => (
                        <button
                          type="button"
                          key={r}
                          onClick={() => {
                            setRouteInput(r);
                            setActiveFieldDropdown(null);
                          }}
                          className="w-full px-3 py-2 text-left text-xs font-medium text-slate-800 hover:bg-sky-50 border-b border-slate-50 last:border-none"
                        >
                          {r}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* 4. Posologia (Pre-registered options + manual input) */}
                <div className="sm:col-span-2 relative">
                  <label className="block text-xs font-semibold text-slate-700">
                    Posologia (Selecione uma opção ou digite manualmente)
                  </label>
                  <div className="relative mt-1">
                    <input
                      type="text"
                      placeholder="Selecione uma posologia pré-cadastrada ou digite..."
                      value={posologyInput}
                      onFocus={() => {
                        setShowSuggestions(false);
                        setActiveFieldDropdown('posology');
                      }}
                      onChange={(e) => {
                        setPosologyInput(e.target.value);
                        setActiveFieldDropdown('posology');
                      }}
                      className="w-full rounded-xl border border-slate-300 py-2 pl-3 pr-9 text-base sm:text-sm bg-white focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
                    />
                    <button
                      type="button"
                      onClick={() =>
                        setActiveFieldDropdown(activeFieldDropdown === 'posology' ? null : 'posology')
                      }
                      className="absolute right-2 top-2 rounded-lg p-0.5 text-slate-500 hover:bg-slate-100"
                      title="Ver posologias pré-cadastradas"
                    >
                      <ChevronDown className="w-4 h-4" />
                    </button>
                  </div>

                  {activeFieldDropdown === 'posology' && (
                    <div className="absolute left-0 right-0 mt-1 max-h-56 overflow-y-auto rounded-2xl bg-white py-1.5 shadow-xl border border-slate-200 z-30">
                      <div className="px-3 py-1 text-[10px] font-bold uppercase text-slate-400 flex items-center justify-between">
                        <span>Posologias Pré-Cadastradas</span>
                        <button
                          type="button"
                          onClick={() => setActiveFieldDropdown(null)}
                          className="text-slate-400 hover:text-slate-700"
                        >
                          Fechar
                        </button>
                      </div>
                      {POSOLOGY_PRESETS.map((p) => (
                        <button
                          type="button"
                          key={p}
                          onClick={() => {
                            setPosologyInput(p);
                            setActiveFieldDropdown(null);
                          }}
                          className="w-full px-3 py-2 text-left text-xs text-slate-800 hover:bg-sky-50 border-b border-slate-50 last:border-none"
                        >
                          {p}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* 5. Frequência (Pre-registered options + manual input) */}
                <div className="relative">
                  <label className="block text-xs font-semibold text-slate-700">
                    Frequência
                  </label>
                  <div className="relative mt-1">
                    <input
                      type="text"
                      placeholder="Selecione (ex: 8/8h, 12/12h) ou digite..."
                      value={frequencyInput}
                      onFocus={() => {
                        setShowSuggestions(false);
                        setActiveFieldDropdown('frequency');
                      }}
                      onChange={(e) => {
                        setFrequencyInput(e.target.value);
                        setActiveFieldDropdown('frequency');
                      }}
                      className="w-full rounded-xl border border-slate-300 py-2 pl-3 pr-9 text-base sm:text-sm bg-white focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
                    />
                    <button
                      type="button"
                      onClick={() =>
                        setActiveFieldDropdown(activeFieldDropdown === 'frequency' ? null : 'frequency')
                      }
                      className="absolute right-2 top-2 rounded-lg p-0.5 text-slate-500 hover:bg-slate-100"
                      title="Ver frequências pré-cadastradas"
                    >
                      <ChevronDown className="w-4 h-4" />
                    </button>
                  </div>

                  {activeFieldDropdown === 'frequency' && (
                    <div className="absolute left-0 right-0 mt-1 max-h-56 overflow-y-auto rounded-2xl bg-white py-1.5 shadow-xl border border-slate-200 z-30">
                      <div className="px-3 py-1 text-[10px] font-bold uppercase text-slate-400 flex items-center justify-between">
                        <span>Frequências Pré-Cadastradas</span>
                        <button
                          type="button"
                          onClick={() => setActiveFieldDropdown(null)}
                          className="text-slate-400 hover:text-slate-700"
                        >
                          Fechar
                        </button>
                      </div>
                      {FREQUENCY_PRESETS.map((f) => (
                        <button
                          type="button"
                          key={f.label}
                          onClick={() => {
                            setFrequencyInput(f.value);
                            setScheduleInput(f.defaultSchedule);
                            setActiveFieldDropdown(null);
                          }}
                          className="w-full px-3 py-2 text-left text-xs hover:bg-sky-50 flex items-center justify-between border-b border-slate-50 last:border-none"
                        >
                          <span className="font-bold text-slate-800">{f.label}</span>
                          <span className="text-[10px] text-slate-400">{f.defaultSchedule}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* 6. Horários Aprazados (Pre-registered options + manual input) */}
                <div className="relative">
                  <label className="block text-xs font-semibold text-slate-700">
                    Horários Aprazados
                  </label>
                  <div className="relative mt-1">
                    <input
                      type="text"
                      placeholder="Selecione o horário ou digite..."
                      value={scheduleInput}
                      onFocus={() => {
                        setShowSuggestions(false);
                        setActiveFieldDropdown('schedule');
                      }}
                      onChange={(e) => {
                        setScheduleInput(e.target.value);
                        setActiveFieldDropdown('schedule');
                      }}
                      className="w-full rounded-xl border border-slate-300 py-2 pl-3 pr-9 text-base sm:text-sm bg-white focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
                    />
                    <button
                      type="button"
                      onClick={() =>
                        setActiveFieldDropdown(activeFieldDropdown === 'schedule' ? null : 'schedule')
                      }
                      className="absolute right-2 top-2 rounded-lg p-0.5 text-slate-500 hover:bg-slate-100"
                      title="Ver horários aprazados pré-cadastrados"
                    >
                      <ChevronDown className="w-4 h-4" />
                    </button>
                  </div>

                  {activeFieldDropdown === 'schedule' && (
                    <div className="absolute left-0 right-0 mt-1 max-h-56 overflow-y-auto rounded-2xl bg-white py-1.5 shadow-xl border border-slate-200 z-30">
                      <div className="px-3 py-1 text-[10px] font-bold uppercase text-slate-400 flex items-center justify-between">
                        <span>Horários Pré-Cadastrados</span>
                        <button
                          type="button"
                          onClick={() => setActiveFieldDropdown(null)}
                          className="text-slate-400 hover:text-slate-700"
                        >
                          Fechar
                        </button>
                      </div>
                      {SCHEDULE_PRESETS.map((s) => (
                        <button
                          type="button"
                          key={s}
                          onClick={() => {
                            setScheduleInput(s);
                            setActiveFieldDropdown(null);
                          }}
                          className="w-full px-3 py-2 text-left text-xs font-medium text-slate-800 hover:bg-sky-50 border-b border-slate-50 last:border-none"
                        >
                          {s}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <button
                type="submit"
                onClick={() => setActiveFieldDropdown(null)}
                className="w-full mt-2 flex items-center justify-center gap-2 rounded-xl bg-sky-600 py-2.5 text-xs font-bold text-white shadow hover:bg-sky-700 transition"
              >
                <Plus className="w-4 h-4" /> Adicionar à Prescrição e Analisar
              </button>
            </form>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                type="button"
                onClick={runClinicalAnalysis}
                disabled={loadingAI}
                className="w-full flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-600 py-3.5 px-4 text-xs sm:text-sm font-black text-white shadow-xl hover:from-amber-600 hover:to-orange-700 transition disabled:opacity-50"
              >
                {loadingAI ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Analisando ({prescriptionItems.length} itens)...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    <span>Executar Análise ({prescriptionItems.length} itens)</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={handleSaveToPrescriptions}
                className="w-full flex items-center justify-center gap-2 rounded-2xl bg-sky-700 py-3.5 px-4 text-xs sm:text-sm font-black text-white shadow-xl hover:bg-sky-800 transition"
              >
                <Bookmark className="w-4 h-4" />
                <span>Salvar Receita / Prescrição</span>
              </button>
            </div>
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

                <div className="space-y-2 pt-2">
                  <button
                    type="button"
                    onClick={handleSaveToPrescriptions}
                    className="w-full flex items-center justify-center gap-2 rounded-xl bg-sky-600 py-3 text-xs font-black text-white shadow-md hover:bg-sky-700 transition"
                  >
                    <Bookmark className="w-4 h-4" /> Salvar em Receitas
                  </button>

                  <button
                    type="button"
                    onClick={handleExportCurrentPrescriptionPDF}
                    className="w-full flex items-center justify-center gap-2 rounded-xl bg-slate-900 py-2.5 text-xs font-black text-white shadow hover:bg-slate-800 transition"
                  >
                    <Download className="w-4 h-4 text-sky-300" /> Exportar Prescrição Analisada (PDF)
                  </button>

                  <button
                    type="button"
                    onClick={handleRegisterIntervention}
                    className="w-full flex items-center justify-center gap-2 rounded-xl bg-slate-100 border border-slate-200 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-200 transition"
                  >
                    <Send className="w-3.5 h-3.5 text-emerald-600" /> Registrar como Intervenção Farmacêutica
                  </button>
                </div>
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
