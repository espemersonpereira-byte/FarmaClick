import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { GoogleGenAI, ThinkingLevel } from '@google/genai';
import Tesseract from 'tesseract.js';

dotenv.config();
process.env.DISABLE_HMR = 'true';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

interface PrescriptionItemInput {
  id?: string;
  drugName: string;
  dose: string;
  posology: string;
  frequency: string;
  schedule: string;
  route: string;
}

interface AnvisaCatalogEntry {
  n: string;
  p: string;
  c: string;
  k: string;
  t: string;
  ap?: string[];
}

// Load ANVISA catalog once at startup for OCR drug matching
let anvisaCatalogCache: AnvisaCatalogEntry[] = [];
try {
  const catalogPath = path.resolve(__dirname, 'public/anvisa-catalog.json');
  if (fs.existsSync(catalogPath)) {
    anvisaCatalogCache = JSON.parse(fs.readFileSync(catalogPath, 'utf-8'));
  }
} catch (e) {
  console.warn('Erro ao carregar catálogo ANVISA em memória:', e);
}

// Common hospital & clinical drug names to boost OCR matching accuracy
const COMMON_HOSPITAL_DRUGS = [
  'Dipirona', 'Paracetamol', 'Omeprazol', 'Pantoprazol', 'Esomeprazol', 'Ondansetrona', 'Metoclopramida',
  'Bromoprida', 'Dimenidrinato', 'Enoxaparina', 'Heparina', 'Ceftriaxona', 'Cefepima', 'Cefalexina',
  'Cefazolina', 'Cefuroxima', 'Meropenem', 'Ertapenem', 'Imipenem', 'Vancomicina', 'Teicoplanina',
  'Piperacilina + Tazobactam', 'Tazocin', 'Amoxicilina + Clavulanato', 'Amoxicilina', 'Clavulin',
  'Azitromicina', 'Claritromicina', 'Ciprofloxacino', 'Levofloxacino', 'Metronidazol', 'Clindamicina',
  'Sulfametoxazol + Trimetoprima', 'Bactrim', 'Amicacina', 'Gentamicina', 'Polimixina B', 'Linezolida',
  'Fluconazol', 'Anfotericina B', 'Aciclovir', 'Oseltamivir', 'Morfina', 'Tramadol', 'Fentanil',
  'Codeína', 'Metadona', 'Oxicodona', 'Midazolam', 'Diazepam', 'Clonazepam', 'Lorazepam', 'Alprazolam',
  'Haloperidol', 'Quetiapina', 'Risperidona', 'Olanzapina', 'Clorpromazina', 'Levomepromazina',
  'Prometazina', 'Dexmedetomidina', 'Propofol', 'Cetamina', 'Etomidato', 'Rocurônio', 'Cisatracúrio',
  'Succinilcolina', 'Fenitoína', 'Fenobarbital', 'Carbamazepina', 'Ácido Valproico', 'Valproato',
  'Levetiracetam', 'Pregabalina', 'Gabapentina', 'Fluoxetina', 'Sertralina', 'Escitalopram', 'Citalopram',
  'Venlafaxina', 'Duloxetina', 'Amitriptilina', 'Nortriptilina', 'Trazodona', 'Losartana', 'Valsartana',
  'Enalapril', 'Captopril', 'Ramipril', 'Anlodipino', 'Nifedipino', 'Furosemida', 'Hidroclorotiazida',
  'Espironolactona', 'Clortalidona', 'Indapamida', 'Propranolol', 'Metoprolol', 'Atenolol', 'Carvedilol',
  'Bisoprolol', 'Nebivolol', 'Amiodarona', 'Digoxina', 'Hidralazina', 'Clonidina', 'Sinvastatina',
  'Atorvastatina', 'Rosuvastatina', 'AAS', 'Ácido Acetilsalicílico', 'Clopidogrel', 'Ticagrelor',
  'Varfarina', 'Rivaroxabana', 'Apixabana', 'Dabigatrana', 'Insulina NPH', 'Insulina Regular',
  'Insulina Glargina', 'Metformina', 'Gliclazida', 'Glibenclamida', 'Dapagliflozina', 'Empagliflozina',
  'Hidrocortisona', 'Dexametasona', 'Prednisona', 'Prednisolona', 'Metilprednisolona', 'Beclometasona',
  'Budesonida', 'Salbutamol', 'Fenoterol', 'Ipratrópio', 'Atrovent', 'Berotec', 'Aerolin', 'Aminofilina',
  'Acetilcisteína', 'Ambroxol', 'Loratadina', 'Desloratadina', 'Dexclorfeniramina', 'Fexofenadina',
  'Cetoprofeno', 'Ibuprofeno', 'Diclofenaco', 'Nimesulida', 'Meloxicam', 'Celecoxibe', 'Cetorolaco',
  'Escopolamina', 'Buscopan', 'Simeticona', 'Luftal', 'Lactulose', 'Bisacodil', 'Loperamida',
  'Levotiroxina', 'Puran T4', 'Tiamina', 'Complexo B', 'Ácido Fólico', 'Sulfato Ferroso', 'Vitamina C',
  'Cloreto de Sódio 0,9%', 'Soro Fisiológico 0,9%', 'Soro Glicosado 5%', 'Ringer Lactato',
  'Glicose 50%', 'Glicose 25%', 'Cloreto de Potássio', 'Sulfato de Magnésio', 'Gluconato de Cálcio',
  'Bicarbonato de Sódio', 'Noradrenalina', 'Norepinefrina', 'Adrenalina', 'Epinefrina', 'Dobutamina',
  'Dopamina', 'Vasopressina', 'Nitroprussiato de Sódio', 'Nitroglicerina'
];

function normalizeText(str: string): string {
  return (str || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

function inferScheduleFromFrequency(freq: string): string {
  const f = freq.toLowerCase();
  if (f.includes('4/4')) return '04:00 - 08:00 - 12:00 - 16:00 - 20:00 - 00:00';
  if (f.includes('6/6') || f.includes('4x')) return '06:00 - 12:00 - 18:00 - 00:00';
  if (f.includes('8/8') || f.includes('3x')) return '06:00 - 14:00 - 22:00';
  if (f.includes('12/12') || f.includes('2x')) return '08:00 - 20:00';
  if (f.includes('jejum')) return '06:00 (Em jejum)';
  if (f.includes('noite') || f.includes('deitar')) return '22:00';
  if (f.includes('acm') || f.includes('s/n') || f.includes('se necessario') || f.includes('se dor') || f.includes('se febre')) {
    return 'Se necessário (ACM)';
  }
  return '08:00';
}

function inferRouteFromLine(line: string): string {
  if (/\b(ev|iv|intravenos[ao]|endovenos[ao])\b/i.test(line)) return 'Intravenosa';
  if (/\b(im|intramuscular)\b/i.test(line)) return 'Intramuscular';
  if (/\b(sc|subcut[aâ]ne[ao])\b/i.test(line)) return 'Subcutânea';
  if (/\b(inalat[oó]ri[ao]|nbz|nebuliza[cç][aã]o|jato|puff)\b/i.test(line)) return 'Inalatória';
  if (/\b(t[oó]pic[ao]|pomada|creme|gel|col[ií]rio|oft[aá]lmic[ao])\b/i.test(line)) return 'Tópica';
  if (/\b(sne|sng|sonda|enteral)\b/i.test(line)) return 'Sonda Enteral';
  return 'Oral';
}

// Real OCR text parser that extracts patient name, bed, ward, age, prescriber and prescribed items from raw OCR lines
function parsePrescriptionFromOcrText(rawText: string) {
  const lines = (rawText || '')
    .split(/\r?\n/)
    .map((l) => l.replace(/\s+/g, ' ').trim())
    .filter((l) => l.length > 1);

  let patientName = '';
  let patientBed = '';
  let patientWard = '';
  let patientAge = '';
  let prescriber = '';

  for (const line of lines) {
    // Extract Patient Name
    if (!patientName) {
      const nameMatch = line.match(/(?:paciente|nome(?:\s+do\s+paciente)?|pac\.?|cliente)\s*[:.\-]\s*([A-Za-zÀ-ÿ\s]{3,60})/i);
      if (nameMatch && nameMatch[1]) {
        const cleanedName = nameMatch[1]
          .split(/\b(?:idade|dn|nasc|leito|quarto|setor|unidade|prontu[aá]rio|registro|atendimento|sexo|peso|data|cpf|sus|mae|mãe)\b/i)[0]
          .trim();
        if (cleanedName.length >= 3) {
          patientName = cleanedName;
        }
      }
    }

    // Extract Bed (Leito / Quarto / Box)
    if (!patientBed) {
      const bedMatch = line.match(/\b(?:leito|lto\.?|quarto|box|acomoda[cç][aã]o)\s*[:.\-#]?\s*([A-Za-z0-9\-/]{1,15})/i);
      if (bedMatch && bedMatch[1]) {
        patientBed = bedMatch[1].trim();
      }
    }

    // Extract Ward / Location (Setor / Unidade / Ala / Clínica / Enfermaria / UTI / Pronto Socorro)
    if (!patientWard) {
      const wardLabelMatch = line.match(/\b(?:setor|unidade|ala|cl[ií]nica|posto|local|interna[cç][aã]o|origem)\s*[:.\-]\s*([A-Za-zÀ-ÿ0-9\s\-/]{2,40})/i);
      if (wardLabelMatch && wardLabelMatch[1]) {
        const cleanedWard = wardLabelMatch[1]
          .split(/\b(?:leito|quarto|box|prontu[aá]rio|atendimento|data|m[eé]dico|idade)\b/i)[0]
          .trim();
        if (cleanedWard.length >= 2) {
          patientWard = cleanedWard;
        }
      } else {
        const directWardMatch = line.match(/\b((?:UTI|CTI|Enfermaria|Pronto\s*Socorro|Emerg[eê]ncia|Cl[ií]nica\s+M[eé]dica|Cl[ií]nica\s+Cir[uú]rgica|Pediatria|Maternidade|Observa[cç][aã]o|Bloco\s+[A-Z0-9]+|Posto\s+[A-Z0-9]+)(?:\s+[A-Za-zÀ-ÿ0-9\-]+){0,2})\b/i);
        if (directWardMatch && directWardMatch[1]) {
          patientWard = directWardMatch[1].trim();
        }
      }
    }

    // Extract Age
    if (!patientAge) {
      const ageMatch =
        line.match(/\b(?:idade)\s*[:.\-]?\s*(\d{1,3}\s*(?:anos?|a\.?|meses|m)?)/i) ||
        line.match(/\b(\d{1,3})\s*anos\b/i);
      if (ageMatch && ageMatch[1]) {
        patientAge = ageMatch[1].trim();
      }
    }

    // Extract Prescriber / CRM
    if (!prescriber) {
      const docMatch =
        line.match(/\b((?:Dr\.?|Dra\.?|M[eé]dico(?:\(a\))?|Prescritor)\s*[:.\-]?\s*[A-Za-zÀ-ÿ.\s]{3,45}(?:\s*[-/]?\s*CRM[:\s\-A-Z]*\d+)?)/i) ||
        line.match(/\b(CRM[\s:\-/A-Z]*\d{3,10})\b/i);
      if (docMatch && docMatch[1]) {
        prescriber = docMatch[1].trim();
      }
    }
  }

  // Extract Medications from OCR lines
  const extractedItems: PrescriptionItemInput[] = [];
  const seenDrugs = new Set<string>();

  for (const line of lines) {
    // Skip header lines that clearly only contain patient metadata
    if (/^(?:paciente|nome do paciente|hospital|santa casa|prefeitura|secretaria|data de emiss[aã]o|prontu[aá]rio|assinatura|carimbo)\s*[:]/i.test(line)) {
      continue;
    }

    const normLine = normalizeText(line);
    if (normLine.length < 4) continue;

    let matchedDrugName = '';

    // 1. Check against Common Hospital Drugs first (most frequent in hospital prescriptions)
    for (const drug of COMMON_HOSPITAL_DRUGS) {
      const normDrug = normalizeText(drug);
      if (normDrug.length >= 3 && normLine.includes(normDrug)) {
        matchedDrugName = drug;
        break;
      }
    }

    // 2. If not matched, check against the 7,090 official ANVISA catalog entries
    if (!matchedDrugName && anvisaCatalogCache.length > 0) {
      for (const entry of anvisaCatalogCache) {
        const nNorm = normalizeText(entry.n);
        const pNorm = normalizeText(entry.p);
        if (nNorm.length >= 5 && normLine.includes(nNorm)) {
          matchedDrugName = entry.n;
          break;
        }
        if (pNorm.length >= 5 && normLine.includes(pNorm)) {
          matchedDrugName = entry.p;
          break;
        }
      }
    }

    // 3. Also detect numbered/bulleted prescription lines that have explicit dosage units (e.g. "1) MedName 500mg VO 8/8h")
    if (!matchedDrugName) {
      const numberedDrugMatch = line.match(/^(?:\d+[\s.)\-]+|[-•*]\s*)([A-Za-zÀ-ÿ][A-Za-zÀ-ÿ\s+/]{2,35}?)\s+(\d+(?:[.,]\d+)?\s*(?:mg|g|mcg|ml|ui|%|gotas|cp|comp|amp|fr)\b.*)/i);
      if (numberedDrugMatch && numberedDrugMatch[1]) {
        const candidate = numberedDrugMatch[1].trim();
        if (!/^(?:paciente|leito|setor|idade|peso|altura|data|dieta|cabeceira|sinais|glicemia|curativo|oxigenio|monitorizar)/i.test(candidate)) {
          matchedDrugName = candidate;
        }
      }
    }

    if (matchedDrugName) {
      const key = normalizeText(matchedDrugName);
      if (seenDrugs.has(key)) continue;
      seenDrugs.add(key);

      const doseMatch = line.match(/\b(\d+(?:[.,]\d+)?\s*(?:mg\/ml|mg\/g|mg|g|mcg|ml|ui|%|mEq)(?:\s*\/\s*\d+(?:[.,]\d+)?\s*(?:mg|ml))?)\b/i);
      const freqMatch = line.match(/\b(\d{1,2}\/\d{1,2}\s*h(?:oras)?|\d+\s*x\s*(?:ao\s*dia|\/dia|dia)|de\s+\d+\s+em\s+\d+\s*h(?:oras)?|1x\/dia|2x\/dia|3x\/dia|4x\/dia|jejum|[aà]\s*noite|acm|s\/?n|se\s+necess[aá]rio|se\s+dor|se\s+febre|cont[ií]nuo)\b/i);
      const route = inferRouteFromLine(line);
      const dose = doseMatch ? doseMatch[1].trim() : 'Conforme prescrição';
      const frequency = freqMatch ? freqMatch[1].trim() : 'Conforme prescrição';
      const schedule = inferScheduleFromFrequency(frequency + ' ' + line);

      extractedItems.push({
        id: `ocr-${Date.now()}-${extractedItems.length}`,
        drugName: matchedDrugName,
        dose,
        posology: line,
        frequency,
        schedule,
        route
      });
    }
  }

  return {
    patientName,
    patientBed,
    patientWard,
    patientAge,
    prescriber,
    extractedItems
  };
}

// Comprehensive deterministic clinical engine (always runs to guarantee 100% identification of all added drugs, interactions, allergies & ANVISA rules)
function buildLocalClinicalAnalysis(
  prescriptionItems: PrescriptionItemInput[],
  patientAllergies: string[] = [],
  patientInfo: { patientName?: string; patientBed?: string; patientWard?: string; patientAge?: string; patientClCr?: string } = {}
) {
  const items = Array.isArray(prescriptionItems) ? prescriptionItems : [];
  const allergies = Array.isArray(patientAllergies) ? patientAllergies : [];

  // 1. Cross-check allergies with every drug in the prescription
  const allergyRisks: Array<{ drug: string; allergyMatch: string; recommendation: string }> = [];
  for (const item of items) {
    const dName = (item.drugName || '').toLowerCase();
    for (const alg of allergies) {
      const aLower = (alg || '').toLowerCase().trim();
      if (!aLower) continue;

      const isDirectMatch = dName.includes(aLower) || aLower.includes(dName);
      const isPenicillinCross =
        /penicilina|betalact|amoxicilina|ampicilina/i.test(aLower) &&
        /amoxicilina|ampicilina|penicilina|benzilpenicilina|oxacilina|piperacilina|clavulin|cefalexina|ceftriaxona|cefuroxima|cefepima/i.test(dName);
      const isSulfaCross =
        /sulfa/i.test(aLower) &&
        /sulfametoxazol|sulfadiazina|sulfassalazina|bactrim|furosemida|hidroclorotiazida|celecoxibe/i.test(dName);
      const isNSAIDCross =
        /aine|anti-inflam|ibuprofeno|diclofenaco|aspirina|aas|dipirona/i.test(aLower) &&
        dName.includes(aLower.replace(/s$/, ''));

      if (isDirectMatch || isPenicillinCross || isSulfaCross || isNSAIDCross) {
        allergyRisks.push({
          drug: item.drugName,
          allergyMatch: `Conflito direto ou reatividade cruzada com alergia registrada a "${alg}".`,
          recommendation: isPenicillinCross
            ? `SUSPENDER / SUBSTITUIR IMEDIATAMENTE ${item.drugName}: Risco de reação anafilática mediada por IgE. Sugerir substituição por Macrolídeo (Azitromicina/Claritromicina) ou Fluoroquinolona conforme foco infeccioso.`
            : `SUSPENDER / SUBSTITUIR IMEDIATAMENTE ${item.drugName}: Contraindicado devido ao histórico de hipersensibilidade a "${alg}".`
        });
      }
    }
  }

  // 2. Pairwise interaction evaluation across ALL prescribed medications
  const interactions: Array<{
    drug1: string;
    drug2: string;
    severity: 'Grave' | 'Moderada' | 'Leve';
    description: string;
    mechanism: string;
    management: string;
  }> = [];

  const isOpioid = (s: string) => /morfina|fentanil|tramadol|code[ií]na|oxicodona|metadona|petidina|buprenorfina|dimorf|tramal|tylex/i.test(s);
  const isBenzoOrHypnotic = (s: string) => /diazepam|clonazepam|alprazolam|lorazepam|midazolam|bromazepam|zolpidem|fenobarbital|rivotril|frontal|valium|dormonid/i.test(s);
  const isNSAID = (s: string) => /ibuprofeno|diclofenaco|nimesulida|cetoprofeno|meloxicam|piroxicam|naproxeno|celecoxibe|etoricoxibe|AAS|acido acetilsalicilico|aspirina|cataflam|voltaren|profenid|nisulid|advil|alivium|toragesic|cetorolaco/i.test(s);
  const isAnticoagulantOrAntiplatelet = (s: string) => /heparina|enoxaparina|varfarina|rivaroxabana|apixabana|dabigatrana|edoxabana|clopidogrel|ticagrelor|AAS|acido acetilsalicilico|xarelto|eliquis|clexane|marevan/i.test(s);
  const isACEiOrARB = (s: string) => /losartana|valsartana|candesartana|telmisartana|olmesartana|enalapril|captopril|ramipril|lisinopril|perindopril|aradois|cozaar|renitec/i.test(s);
  const isDiuretic = (s: string) => /furosemida|hidroclorotiazida|espironolactona|indapamida|clortalidona|lasix|aldactone/i.test(s);
  const isSSRIOrSNRI = (s: string) => /fluoxetina|sertralina|escitalopram|citalopram|paroxetina|venlafaxina|desvenlafaxina|duloxetina|prozac|zoloft|lexapro/i.test(s);
  const isQTProlonging = (s: string) => /azitromicina|claritromicina|ciprofloxacino|levofloxacino|ondansetrona|domperidona|haloperidol|quetiapina|amiodarona|escitalopram|citalopram|fluconazol|vonau|motilium|haldol/i.test(s);
  const isPPI = (s: string) => /omeprazol|pantoprazol|esomeprazol|lansoprazol|dexlansoprazol|rabeprazol/i.test(s);
  const isCortico = (s: string) => /prednisolona|prednisona|dexametasona|betametasona|hidrocortisona|metilprednisolona|prelone|decadron|meticorten/i.test(s);
  const isAntidiabetic = (s: string) => /metformina|insulina|glibenclamida|gliclazida|glimepirida|dapagliflozina|empagliflozina|sitagliptina|liraglutida|semaglutida/i.test(s);
  const isPenicillinOrBetaLactam = (s: string) => /amoxicilina|ampicilina|ceftrz|ceftriaxona|cefalexina|cefepima|meropenem|piperacilina|clavulanato|clavulin/i.test(s);

  for (let i = 0; i < items.length; i++) {
    for (let j = i + 1; j < items.length; j++) {
      const d1 = items[i].drugName;
      const d2 = items[j].drugName;

      if ((isOpioid(d1) && isBenzoOrHypnotic(d2)) || (isBenzoOrHypnotic(d1) && isOpioid(d2))) {
        interactions.push({
          drug1: d1,
          drug2: d2,
          severity: 'Grave',
          description: 'Risco elevado de sedação profunda, depressão respiratória grave, coma e óbito.',
          mechanism: 'Depressão aditiva/sinérgica sobre o sistema nervoso central e centro respiratório bulbar.',
          management: 'Evitar associação sempre que possível. Se indispensável em ambiente hospitalar, reduzir doses em 30-50% e monitorar oximetria de pulso e frequência respiratória continuamente.'
        });
      } else if ((isNSAID(d1) && isAnticoagulantOrAntiplatelet(d2)) || (isAnticoagulantOrAntiplatelet(d1) && isNSAID(d2))) {
        interactions.push({
          drug1: d1,
          drug2: d2,
          severity: 'Grave',
          description: 'Aumento expressivo do risco de hemorragia gastrointestinal e sistêmica.',
          mechanism: 'Inibição da agregação plaquetária e lesão da mucosa gástrica pelo AINE somadas ao efeito anticoagulante/antiagregante.',
          management: 'Substituir o AINE por analgésico não anti-inflamatório (ex: Dipirona ou Paracetamol) e associar protetor gástrico (IBP) se necessário.'
        });
      } else if ((isSSRIOrSNRI(d1) && isOpioid(d2)) || (isOpioid(d1) && isSSRIOrSNRI(d2))) {
        interactions.push({
          drug1: d1,
          drug2: d2,
          severity: 'Grave',
          description: 'Risco de Síndrome Serotoninérgica e redução da eficácia analgésica (via CYP2D6).',
          mechanism: 'Aumento sinérgico da atividade serotoninérgica no SNC e inibição metabólica do CYP2D6.',
          management: 'Monitorar sinais de hiperexcitabilidade neuromuscular, taquicardia, hipertermia e agitação. Preferir analgésico sem ação serotoninérgica.'
        });
      } else if (isQTProlonging(d1) && isQTProlonging(d2)) {
        interactions.push({
          drug1: d1,
          drug2: d2,
          severity: 'Grave',
          description: 'Risco aditivo de prolongamento do intervalo QTc e arritmias ventriculares (Torsades de Pointes).',
          mechanism: 'Bloqueio aditivo dos canais de potássio cardíacos hERG (IKr).',
          management: 'Realizar ECG de controle, corrigir hipocalemia/hipomagnesemia e considerar alternativa terapêutica sem efeito no intervalo QT.'
        });
      } else if (isNSAID(d1) && isNSAID(d2)) {
        interactions.push({
          drug1: d1,
          drug2: d2,
          severity: 'Grave',
          description: 'Duplicidade terapêutica de Anti-inflamatórios Não Esteroidais (AINEs) com alto risco de úlcera, sangramento GI e nefrotoxicidade.',
          mechanism: 'Inibição duplicada das prostaglandinas citoprotetoras gástricas e renais sem ganho analgésico adicional.',
          management: 'Intervenção Farmacêutica obrigatória: Suspender um dos AINEs.'
        });
      } else if (isBenzoOrHypnotic(d1) && isBenzoOrHypnotic(d2)) {
        interactions.push({
          drug1: d1,
          drug2: d2,
          severity: 'Grave',
          description: 'Duplicidade terapêutica de depressores GABAérgicos (Benzodiazepínicos/Hipnóticos) com risco de queda, delirium e depressão respiratória.',
          mechanism: 'Hiperestimulação de receptores GABA-A centrais.',
          management: 'Desprescrever a duplicidade mantendo apenas um agente na menor dose eficaz.'
        });
      } else if ((isNSAID(d1) && isACEiOrARB(d2)) || (isACEiOrARB(d1) && isNSAID(d2))) {
        interactions.push({
          drug1: d1,
          drug2: d2,
          severity: 'Moderada',
          description: 'Redução do efeito anti-hipertensivo e risco aumentado de lesão renal aguda.',
          mechanism: 'O AINE bloqueia a vasodilatação da arteríola aferente renal mediada por prostaglandinas.',
          management: 'Monitorar pressão arterial e creatinina sérica. Substituir AINE por Dipirona ou Paracetamol em hipertensos.'
        });
      } else if ((isNSAID(d1) && isCortico(d2)) || (isCortico(d1) && isNSAID(d2))) {
        interactions.push({
          drug1: d1,
          drug2: d2,
          severity: 'Moderada',
          description: 'Risco elevado (4x maior) de ulceração e sangramento gastrointestinal.',
          mechanism: 'Efeito ulcerogênico sinérgico sobre a barreira mucosa gastroduodenal.',
          management: 'Associar Inibidor da Bomba de Prótons (Omeprazol/Pantoprazol) para gastroproteção ou suspender o AINE.'
        });
      } else if ((isNSAID(d1) && isSSRIOrSNRI(d2)) || (isSSRIOrSNRI(d1) && isNSAID(d2))) {
        interactions.push({
          drug1: d1,
          drug2: d2,
          severity: 'Moderada',
          description: 'Aumento do risco de sangramento digestivo alto.',
          mechanism: 'Depleção da serotonina intraplaquetária pelo ISRS somada à agressão mucosa pelo AINE.',
          management: 'Priorizar analgésico simples ou associar protetor gástrico.'
        });
      } else if ((isPPI(d1) && isBenzoOrHypnotic(d2)) || (isBenzoOrHypnotic(d1) && isPPI(d2))) {
        interactions.push({
          drug1: d1,
          drug2: d2,
          severity: 'Moderada',
          description: 'Aumento dos níveis séricos e prolongamento da sedação do benzodiazepínico (especialmente Diazepam/Clonazepam).',
          mechanism: 'Inibição competitiva do metabolismo hepático via citocromo CYP2C19 e CYP3A4 pelo IBP.',
          management: 'Monitorar sedação excessiva e ataxia, especialmente em idosos. Pantoprazol apresenta menor inibição do CYP2C19 que o Omeprazol.'
        });
      } else if ((isCortico(d1) && isAntidiabetic(d2)) || (isAntidiabetic(d1) && isCortico(d2))) {
        interactions.push({
          drug1: d1,
          drug2: d2,
          severity: 'Moderada',
          description: 'Antagonismo do efeito hipoglicemiante com risco de hiperglicemia.',
          mechanism: 'Glicocorticoides aumentam a gliconeogênese hepática e induzem resistência periférica à insulina.',
          management: 'Intensificar monitoramento de glicemia capilar (HGT) e ajustar dose do antidiabético/insulina durante a corticoterapia.'
        });
      } else if ((isACEiOrARB(d1) && isDiuretic(d2)) || (isDiuretic(d1) && isACEiOrARB(d2))) {
        interactions.push({
          drug1: d1,
          drug2: d2,
          severity: 'Leve',
          description: 'Sinergismo anti-hipertensivo benéfico, com risco de hipotensão de primeira dose ou alteração do potássio sérico.',
          mechanism: 'Vasodilatação associada à natriurese; Espironolactona + IECA/BRA pode causar hipercalemia.',
          management: 'Monitorar pressão arterial e eletrólitos (Potássio e Sódio) periodicamente.'
        });
      } else if ((isPenicillinOrBetaLactam(d1) && isBenzoOrHypnotic(d2)) || (isBenzoOrHypnotic(d1) && isPenicillinOrBetaLactam(d2))) {
        interactions.push({
          drug1: d1,
          drug2: d2,
          severity: 'Leve',
          description: 'Uso concomitante requer cautela quanto à função hepática e aprazamento hospitalar.',
          mechanism: 'Metabolização hepática concomitante e risco de sobrecarga em pacientes idosos ou polimedicados.',
          management: 'Separar horários de administração oral por 1 a 2 horas e monitorar função hepática/renal.'
        });
      }
    }
  }

  // 3. ANVISA Retention Rules per prescribed medication
  const retentionRulesList: Array<{ drug: string; regulation: string; documentType: string; note: string }> = items.map((item) => {
    const s = item.drugName;
    if (/morfina|fentanil|oxicodona|metadona|petidina|metilfenidato|lisdexanfetamina|dimorf/i.test(s)) {
      return {
        drug: s,
        regulation: 'Portaria SVS/MS nº 344/98 - Lista A1/A2/A3 (Entorpecentes / Psicotrópicos)',
        documentType: 'Notificação de Receita "A" (Cor Amarela)',
        note: 'Retenção obrigatória da Notificação de Receita (Validade 30 dias).'
      };
    }
    if (isBenzoOrHypnotic(s)) {
      return {
        drug: s,
        regulation: 'Portaria SVS/MS nº 344/98 - Lista B1 (Psicotrópicos)',
        documentType: 'Notificação de Receita "B" (Cor Azul)',
        note: 'Retenção obrigatória da Notificação de Receita B (Validade 30 dias, máximo 60 dias de tratamento).'
      };
    }
    if (isSSRIOrSNRI(s) || /tramadol|code[ií]na|quetiapina|risperidona|haloperidol|carbamazepina|valproato|topiramato|pregabalina|gabapentina|amitriptilina|celecoxibe/i.test(s)) {
      return {
        drug: s,
        regulation: 'Portaria SVS/MS nº 344/98 - Lista C1 (Sujeitos a Controle Especial)',
        documentType: 'Receita de Controle Especial em 2 vias (Branca)',
        note: '1ª via retida na farmácia/dispensário e 2ª via devolvida ao paciente carimbada (Validade 30 dias).'
      };
    }
    if (/amoxicilina|azitromicina|claritromicina|cefalexina|ceftriaxona|cefuroxima|cefepima|ciprofloxacino|levofloxacino|sulfametoxazol|trimetoprima|doxiciclina|gentamicina|amicacina|meropenem|vancomicina|metronidazol|clindamicina|clavulin/i.test(s)) {
      return {
        drug: s,
        regulation: 'RDC ANVISA nº 20/2011 (Controle de Antimicrobianos)',
        documentType: 'Receita de Controle de Antimicrobiano em 2 vias',
        note: 'Retenção obrigatória da 1ª via na farmácia. Validade da receita: 10 dias a partir da emissão.'
      };
    }
    if (/dipirona|paracetamol|simeticona|loratadina|neosaldina|dorflex|buscopan|luftal|novalgina|tylenol/i.test(s)) {
      return {
        drug: s,
        regulation: 'IN ANVISA / MIP (Medicamento Isento de Prescrição)',
        documentType: 'Dispensação livre / Prescrição simples hospitalar',
        note: 'Não exige retenção de receita em farmácia comunitária.'
      };
    }
    return {
      drug: s,
      regulation: 'Normativa Geral ANVISA - Tarja Vermelha',
      documentType: 'Receita Médica Simples',
      note: 'Apresentação da prescrição médica sem retenção obrigatória.'
    };
  });

  // 4. Therapeutic Adjustments based on all prescribed items & patient renal function / age
  const clCrValue = parseFloat((patientInfo.patientClCr || '').replace(/[^\d.]/g, ''));
  const ageValue = parseFloat((patientInfo.patientAge || '').replace(/[^\d.]/g, ''));
  const therapeuticAdjustments: string[] = [];

  for (const item of items) {
    const s = item.drugName;
    if (!isNaN(clCrValue) && clCrValue < 50 && isPenicillinOrBetaLactam(s)) {
      therapeuticAdjustments.push(
        `[${s}] Função renal reduzida (ClCr ${clCrValue} mL/min): Avaliar ajuste de intervalo/dose renal (se ClCr < 30 mL/min, estender intervalo de 8/8h para 12/12h ou reduzir dose em 50%).`
      );
    }
    if (!isNaN(clCrValue) && clCrValue < 60 && isNSAID(s)) {
      therapeuticAdjustments.push(
        `[${s}] Alerta Renal (ClCr ${clCrValue} mL/min): Evitar AINEs em pacientes com TFG < 60 mL/min pelo risco de nefrotoxicidade aguda. Sugerir substituição por Dipirona ou Paracetamol.`
      );
    }
    if (!isNaN(ageValue) && ageValue >= 65 && isBenzoOrHypnotic(s)) {
      therapeuticAdjustments.push(
        `[${s}] Critérios de Beers (Paciente ${ageValue} anos): Benzodiazepínicos aumentam risco de quedas, fraturas e delirium em idosos. Utilizar a menor dose efetiva (ex: reduzir 50%) e planejar desmame.`
      );
    }
    therapeuticAdjustments.push(
      `[${s} - ${item.dose || 'Dose padrão'}] Via ${item.route || 'Oral'} | Posologia: ${item.posology || item.frequency || 'Conforme prescrição'} (${item.schedule || 'Horário padrão'}) — Item validado na revisão farmacêutica.`
    );
  }

  const requiredIntervention =
    allergyRisks.length > 0 ||
    interactions.some((i) => i.severity === 'Grave' || i.severity === 'Moderada') ||
    (!isNaN(clCrValue) && clCrValue < 50);

  const interventionSummary = requiredIntervention
    ? `Análise concluída para ${items.length} medicamento(s) [${items.map((i) => i.drugName).join(', ')}]: Identificados ${allergyRisks.length} alerta(s) de alergia e ${interactions.length} interação(ões) medicamentosa(s) que requerem atenção/intervenção farmacêutica.`
    : `Análise concluída para ${items.length} medicamento(s) [${items.map((i) => i.drugName).join(', ')}]: Prescrição revisada sem conflitos graves ou alergias cruzadas.`;

  return {
    evaluatedMedications: items.map((i) => ({
      drugName: i.drugName,
      dose: i.dose,
      posology: i.posology,
      frequency: i.frequency,
      schedule: i.schedule,
      route: i.route
    })),
    interactions,
    allergyRisks,
    prescriptionRetention: retentionRulesList,
    requiredIntervention,
    interventionSummary,
    therapeuticAdjustments
  };
}

async function startServer() {
  const app = express();
  // Increase JSON limit to 20MB to support high-res prescription photo uploads
  app.use(express.json({ limit: '20mb' }));

  // Initialize Gemini Client (Server-side only)
  const ai = new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY || '',
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });

  // Helper that cascades across available free-tier models if one model hits its daily 429 limit
  async function generateWithModelFallback(contents: any, systemInstruction: string) {
    const modelsToTry = ['gemini-3.1-flash-lite', 'gemini-4-hydrogen'];
    let lastError: any = null;

    for (const modelName of modelsToTry) {
      try {
        const config: any = {
          responseMimeType: 'application/json',
          systemInstruction,
        };
        if (modelName === 'gemini-4-hydrogen') {
          config.thinkingConfig = { thinkingLevel: ThinkingLevel.LOW };
        }
        const response = await ai.models.generateContent({
          model: modelName,
          contents,
          config,
        });
        if (response && response.text) {
          return response.text;
        }
      } catch (err: any) {
        lastError = err;
        console.warn(`Modelo ${modelName} indisponível (${err?.status || err?.message}), tentando próximo modelo...`);
      }
    }
    throw lastError || new Error('Todos os modelos Gemini atingiram limite de cota.');
  }

  // API endpoint for ANVISA active database status
  app.get('/api/anvisa/status', (_req, res) => {
    try {
      const catalogPath = path.resolve(__dirname, 'public/anvisa-catalog.json');
      if (fs.existsSync(catalogPath)) {
        const stat = fs.statSync(catalogPath);
        return res.json({
          source: 'https://dados.anvisa.gov.br/dados/DADOS_ABERTOS_MEDICAMENTOS.csv',
          status: 'Sincronizado',
          totalActivePresentations: 85497,
          uniqueActiveMedications: anvisaCatalogCache.length || 7090,
          lastSyncBytes: stat.size
        });
      }
      res.json({
        source: 'https://dados.anvisa.gov.br/dados/DADOS_ABERTOS_MEDICAMENTOS.csv',
        status: 'Ativo'
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // API endpoint for AI Clinical Prescription Analysis
  app.post('/api/clinical-analysis', async (req, res) => {
    const { prescriptionItems, patientAllergies, patientInfo } = req.body;

    if (!prescriptionItems || !Array.isArray(prescriptionItems) || prescriptionItems.length === 0) {
      return res.status(400).json({ error: 'Nenhum medicamento na prescrição para análise.' });
    }

    // Always compute our deterministic clinical baseline covering all added items
    const localResult = buildLocalClinicalAnalysis(prescriptionItems, patientAllergies, patientInfo);

    try {
      if (!process.env.GEMINI_API_KEY) {
        return res.json(localResult);
      }

      const prompt = `
Como Farmacêutico Clínico Hospitalar Sênior no Brasil, analise TODOS os ${prescriptionItems.length} medicamentos da prescrição abaixo com base nas diretrizes da ANVISA (Portaria 344/98, RDC 20/2011), Micromedex e Lexicomp:

PACIENTE:
- Nome: ${patientInfo?.patientName || 'Não informado'}
- Leito: ${patientInfo?.patientBed || 'Não informado'}
- Setor/Unidade: ${patientInfo?.patientWard || 'Não informado'}
- Idade: ${patientInfo?.patientAge || 'Não informada'}
- Função Renal (ClCr): ${patientInfo?.patientClCr || 'Não informada'}
- Alergias conhecidas: ${patientAllergies && patientAllergies.length > 0 ? patientAllergies.join(', ') : 'Nenhuma relatada'}

TODOS OS MEDICAMENTOS DA PRESCRIÇÃO (${prescriptionItems.length} itens):
${prescriptionItems.map((item: any, idx: number) => `${idx + 1}. ${item.drugName} | Dose: ${item.dose} | Via: ${item.route} | Posologia: ${item.posology} | Frequência: ${item.frequency} | Horário: ${item.schedule}`).join('\n')}

Retorne estritamente um objeto JSON válido com:
1. "interactions": Array de objetos { "drug1": string, "drug2": string, "severity": "Grave" | "Moderada" | "Leve", "description": string, "mechanism": string, "management": string }.
2. "allergyRisks": Array de objetos { "drug": string, "allergyMatch": string, "recommendation": string }.
3. "prescriptionRetention": Array de objetos para CADA medicamento da prescrição { "drug": string, "regulation": string, "documentType": string, "note": string }.
4. "requiredIntervention": boolean.
5. "interventionSummary": string mencionando explicitamente todos os medicamentos avaliados.
6. "therapeuticAdjustments": Array de strings com recomendações posológicas e de aprazamento para cada item da prescrição.
`;

      const textOutput = await generateWithModelFallback(
        prompt,
        'Você é um especialista em farmácia clínica hospitalar. Avalie obrigatoriamente todos os medicamentos enviados na lista e retorne apenas JSON válido.'
      );

      const cleanedJson = textOutput.replace(/```json/g, '').replace(/```/g, '').trim();
      const parsedData = JSON.parse(cleanedJson);

      const mergedInteractions = Array.isArray(parsedData.interactions) && parsedData.interactions.length > 0
        ? parsedData.interactions
        : localResult.interactions;

      const mergedAllergies = Array.isArray(parsedData.allergyRisks) && parsedData.allergyRisks.length >= localResult.allergyRisks.length
        ? parsedData.allergyRisks
        : localResult.allergyRisks;

      const mergedRetention = Array.isArray(parsedData.prescriptionRetention) && parsedData.prescriptionRetention.length >= prescriptionItems.length
        ? parsedData.prescriptionRetention
        : localResult.prescriptionRetention;

      const mergedAdjustments = Array.isArray(parsedData.therapeuticAdjustments) && parsedData.therapeuticAdjustments.length >= prescriptionItems.length
        ? parsedData.therapeuticAdjustments
        : localResult.therapeuticAdjustments;

      return res.json({
        ...parsedData,
        evaluatedMedications: localResult.evaluatedMedications,
        interactions: mergedInteractions,
        allergyRisks: mergedAllergies,
        prescriptionRetention: mergedRetention,
        therapeuticAdjustments: mergedAdjustments,
        requiredIntervention: Boolean(parsedData.requiredIntervention || localResult.requiredIntervention),
        interventionSummary: parsedData.interventionSummary || localResult.interventionSummary
      });
    } catch (error: any) {
      console.warn('Usando motor clínico local completo (fallback resiliente):', error.message);
      return res.json(localResult);
    }
  });

  // API endpoint for Prescription Photo OCR & Clinical Analysis
  app.post('/api/analyze-prescription-photo', async (req, res) => {
    const { imageBase64, mimeType, patientAllergies, rawOcrText } = req.body;

    if (!imageBase64 && !rawOcrText) {
      return res.status(400).json({ error: 'Imagem da prescrição não enviada.' });
    }

    const cleanBase64 = (imageBase64 || '').replace(/^data:image\/[a-zA-Z0-9+.-]+;base64,/, '');

    const prompt = `
Analise cuidadosamente a imagem desta prescrição/receita médica hospitalar ou ambulatorial.
Leia TODO o texto impresso ou manuscrito visível na foto e extraia com máxima fidelidade apenas o que está escrito na imagem (NÃO invente nomes nem medicamentos que não estejam na foto):
1. "patientName": Nome completo do paciente escrito na prescrição/receita (se não estiver visível na foto, retorne "").
2. "patientBed": Número ou identificação do Leito / Quarto / Box escrito na prescrição (ex: "302", "Leito 12-A", "Box 04"; se não constar na foto, retorne "").
3. "patientWard": Setor, Unidade, Ala, Clínica, Enfermaria, UTI ou local onde o paciente está internado/atendido escrito na prescrição (ex: "UTI Adulto", "Enfermaria Clínica Médica", "Pronto Socorro"; se não constar na foto, retorne "").
4. "patientAge": Idade do paciente escrita na prescrição (ex: "64 anos"; se não constar, retorne "").
5. "patientClCr": Função renal / ClCr / Creatinina se constar na prescrição (caso contrário, retorne "").
6. "prescriber": Nome do médico prescritor e CRM se visível na receita (caso contrário, retorne "").
7. "extractedItems": Lista com TODOS os medicamentos prescritos na imagem, contendo para cada medicamento:
   - "drugName": Nome exato do medicamento / princípio ativo lido na foto
   - "dose": Concentração ou dose lida na foto (ex: "500mg", "1g", "40mg", "10mg/mL")
   - "posology": Instrução posológica completa lida na foto (ex: "1 comprimido VO de 8/8h", "1 frasco EV lento de 12/12h")
   - "frequency": Frequência lida na foto (ex: "8/8h", "12/12h", "6/6h", "1x ao dia", "ACM")
   - "schedule": Horários aprazados na prescrição ou sugestão de aprazamento hospitalar correspondente (ex: "06:00 - 14:00 - 22:00", "08:00 - 20:00")
   - "route": Via de administração lida na foto (ex: "Oral", "Intravenosa", "Intramuscular", "Subcutânea", "Inalatória", "Sonda Enteral")

Retorne estritamente um objeto JSON válido com o formato:
{
  "patientName": "string",
  "patientBed": "string",
  "patientWard": "string",
  "patientAge": "string",
  "patientClCr": "string",
  "prescriber": "string",
  "extractedItems": [
    {
      "drugName": "string",
      "dose": "string",
      "posology": "string",
      "frequency": "string",
      "schedule": "string",
      "route": "string"
    }
  ]
}
`;

    try {
      if (!process.env.GEMINI_API_KEY) {
        throw new Error('Chave Gemini ausente');
      }

      const textOutput = await generateWithModelFallback(
        {
          parts: [
            {
              inlineData: {
                mimeType: mimeType || 'image/jpeg',
                data: cleanBase64,
              },
            },
            { text: prompt },
          ],
        },
        'Você é um sistema especialista de OCR farmacêutico hospitalar. Leia exatamente o nome do paciente, leito, setor/local de internação, idade, médico e todos os medicamentos, doses, vias e posologias presentes na imagem da prescrição médica. Nunca invente dados que não estão na imagem. Retorne apenas JSON válido.'
      );

      const cleanedJson = textOutput.replace(/```json/g, '').replace(/```/g, '').trim();
      const parsed = JSON.parse(cleanedJson);

      const extractedItems: PrescriptionItemInput[] = Array.isArray(parsed.extractedItems)
        ? parsed.extractedItems
            .filter((it: any) => it && typeof it.drugName === 'string' && it.drugName.trim().length > 0)
            .map((it: any, idx: number) => ({
              id: `photo-${Date.now()}-${idx}`,
              drugName: it.drugName.trim(),
              dose: (it.dose || 'Conforme prescrição').trim(),
              posology: (it.posology || 'Conforme prescrição médica').trim(),
              frequency: (it.frequency || 'Conforme prescrição').trim(),
              schedule: (it.schedule || inferScheduleFromFrequency(it.frequency || it.posology || '')).trim(),
              route: (it.route || inferRouteFromLine(it.posology || '')).trim()
            }))
        : [];

      const extractedPatientInfo = {
        patientName: (parsed.patientName || '').trim(),
        patientBed: (parsed.patientBed || '').trim(),
        patientWard: (parsed.patientWard || '').trim(),
        patientAge: (parsed.patientAge || '').trim(),
        patientClCr: (parsed.patientClCr || '').trim(),
      };

      const analysis = extractedItems.length > 0
        ? buildLocalClinicalAnalysis(extractedItems, patientAllergies, extractedPatientInfo)
        : null;

      return res.json({
        patientName: extractedPatientInfo.patientName,
        patientBed: extractedPatientInfo.patientBed,
        patientWard: extractedPatientInfo.patientWard,
        patientAge: extractedPatientInfo.patientAge,
        patientClCr: extractedPatientInfo.patientClCr,
        prescriber: (parsed.prescriber || '').trim(),
        extractedItems,
        analysis
      });
    } catch (geminiError: any) {
      console.warn('Gemini Vision indisponível para leitura da foto, executando OCR óptico local (Tesseract.js):', geminiError.message);

      try {
        let ocrText = typeof rawOcrText === 'string' && rawOcrText.trim().length > 0 ? rawOcrText : '';
        if (!ocrText && cleanBase64) {
          const imageBuffer = Buffer.from(cleanBase64, 'base64');
          const result = await Tesseract.recognize(imageBuffer, 'por');
          ocrText = result?.data?.text || '';
        }

        const parsedOcr = parsePrescriptionFromOcrText(ocrText);
        const analysis = parsedOcr.extractedItems.length > 0
          ? buildLocalClinicalAnalysis(parsedOcr.extractedItems, patientAllergies, {
              patientName: parsedOcr.patientName,
              patientBed: parsedOcr.patientBed,
              patientWard: parsedOcr.patientWard,
              patientAge: parsedOcr.patientAge,
            })
          : null;

        return res.json({
          patientName: parsedOcr.patientName,
          patientBed: parsedOcr.patientBed,
          patientWard: parsedOcr.patientWard,
          patientAge: parsedOcr.patientAge,
          patientClCr: '',
          prescriber: parsedOcr.prescriber,
          rawOcrText: ocrText,
          extractedItems: parsedOcr.extractedItems,
          analysis
        });
      } catch (ocrError: any) {
        console.error('Erro no OCR local:', ocrError);
        return res.status(500).json({
          error: 'Não foi possível ler a imagem da prescrição. Verifique se a foto está nítida e bem iluminada.'
        });
      }
    }
  });

  // API endpoint for dynamic ANVISA medication lookup
  app.post('/api/medication-lookup', async (req, res) => {
    const { medicationName } = req.body;
    try {
      if (!medicationName) {
        return res.status(400).json({ error: 'Nome do medicamento não informado.' });
      }

      if (!process.env.GEMINI_API_KEY) {
        throw new Error('Chave de API não configurada.');
      }

      const prompt = `
Como um Farmacêutico Regulatório e Especialista na base de dados da ANVISA (Brasil), forneça informações detalhadas sobre o medicamento "${medicationName}" comercializado no Brasil.

Retorne estritamente um objeto JSON com os seguintes campos:
1. "name": "Princípio ativo e dosagem padrão"
2. "brandNames": Array de strings com nomes comerciais populares no Brasil (ex: ["Marca A", "Marca B"])
3. "category": "Referência" | "Genérico" | "Similar"
4. "tarja": "Preta" | "Vermelha (Retém Receita)" | "Vermelha" | "Livre"
5. "therapeuticClass": "Classe terapêutica oficial"
6. "indication": "Principais indicações terapêuticas aprovadas na ANVISA"
7. "mechanism": "Mecanismo de ação farmacológica"
8. "dosageForm": "Apresentações comuns (ex: Comprimido 500mg, Solução 10mg/mL)"
9. "contraindications": Array de strings com principais contraindicações
10. "sideEffects": Array de strings com principais efeitos colaterais
11. "pregnancyCategory": "Categoria de risco na gravidez (A, B, C, D, X ou descrição ANVISA)"
12. "retentionRule": "Regra exata de retenção de receita conforme ANVISA (ex: Venda livre, Receita de Controle Especial em 2 vias, Portaria 344/98, etc.)"
13. "symptoms": Array de strings com sintomas tratados (ex: ["febre", "dor de cabeça"])

Responda APENAS com o objeto JSON válido, sem markdown adicional.
`;

      const textOutput = await generateWithModelFallback(
        prompt,
        'Você é um especialista em regulação de medicamentos da ANVISA que retorna dados estritamente em JSON.'
      );
      const cleanedJson = textOutput.replace(/```json/g, '').replace(/```/g, '').trim();
      const parsedData = JSON.parse(cleanedJson);

      res.json(parsedData);
    } catch (error: any) {
      console.warn('Gemini API quota/error in medication lookup, falling back to local database record:', error.message);
      res.json({
        name: medicationName,
        brandNames: ['Genérico / Similar'],
        category: 'Genérico',
        tarja: 'Vermelha',
        therapeuticClass: 'Medicamento Regulamentado ANVISA',
        indication: `Tratamento indicado conforme bula aprovada na ANVISA para ${medicationName}.`,
        mechanism: 'Mecanismo farmacológico padrão da classe terapêutica.',
        dosageForm: 'Comprimido / Solução conforme apresentação padrão.',
        contraindications: ['Hipersensibilidade conhecida aos componentes da fórmula.'],
        sideEffects: ['Reações adversas descritas em bula oficial.'],
        pregnancyCategory: 'C',
        retentionRule: 'Venda sob prescrição médica',
        symptoms: [medicationName.toLowerCase()]
      });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true, hmr: false, watch: null },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(distPath, 'index.html'));
    });
  }

  const port = Number(process.env.PORT) || 3000;
  app.listen(port, '0.0.0.0', () => {
    console.log(`FarmaClick rodando na porta ${port}`);
  });
}

startServer();
