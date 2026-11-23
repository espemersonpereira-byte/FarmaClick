export interface Medication {
  id: string;
  name: string;
  activePrinciple?: string;
  registrationNumber?: string;
  registrationExpiry?: string;
  laboratory?: string;
  activePresentationsCount?: number;
  presentations: string[];
  brandNames: string[];
  category: 'Referência' | 'Genérico' | 'Similar';
  regulatoryCategoryRaw?: string;
  tarja: 'Preta' | 'Vermelha (Retém Receita)' | 'Vermelha' | 'Livre';
  therapeuticClass: string;
  indication: string;
  mechanism: string;
  dosageForm: string;
  contraindications: string[];
  sideEffects: string[];
  pregnancyCategory: string;
  isAntimicrobial?: boolean;
  isPsychotropic?: boolean;
  isHospitalRestricted?: boolean;
  retentionRule: string;
  symptoms: string[];
}

export interface RawAnvisaRecord {
  n: string; // NOME_PRODUTO
  c: string; // CATEGORIA_REGULATORIA
  r: string; // NUMERO_REGISTRO_PRODUTO
  v: string; // DATA_VENCIMENTO_REGISTRO (MMYYYY)
  t: string; // CLASSE_TERAPEUTICA
  e: string; // EMPRESA_DETENTORA_REGISTRO
  p: string; // PRINCIPIO_ATIVO
  k: number; // active presentations count
  ap?: string[]; // list of real ANVISA presentations
  tr?: string; // official ANVISA tarja from CMED
  rh?: number; // hospital restriction (1 = Sim, 0 = Não)
}

// Clinical enrichment rules based on ANVISA Therapeutic Classes, Active Principles, and CMED presentations
export function enrichAnvisaRecord(raw: RawAnvisaRecord, index: number): Medication {
  const upperName = (raw.n || '').toUpperCase();
  const upperPrinciple = (raw.p || '').toUpperCase();
  const upperClass = (raw.t || '').toUpperCase();
  const rawCat = (raw.c || '').trim();
  const rawTarja = (raw.tr || '').trim();
  const combined = `${upperName} ${upperPrinciple} ${upperClass}`;

  // Map regulatory category strictly to Referência, Genérico, or Similar
  let category: Medication['category'] = 'Referência';
  if (/^GEN[EÉ]RICO/i.test(rawCat)) {
    category = 'Genérico';
  } else if (/^SIMILAR/i.test(rawCat)) {
    category = 'Similar';
  } else if (
    !rawCat &&
    upperPrinciple &&
    upperName.includes(upperPrinciple.split(/[;,]/)[0].trim())
  ) {
    category = 'Genérico';
  } else {
    category = 'Referência';
  }

  // Classify psychotropic, antimicrobial, tarja, and retention rules
  const isListaA =
    /LISTA A|MORFINA|FENTANIL|OXICODONA|METADONA|PETIDINA|REMIFENTANIL|SUFENTANIL|ALFENTANIL|BUPRENORFINA|METILFENIDATO|LISDEXANFETAMINA/i.test(
      combined
    );
  const isListaB =
    /LISTA B|BENZODIAZEP|DIAZEPAM|CLONAZEPAM|ALPRAZOLAM|LORAZEPAM|BROMAZEPAM|MIDAZOLAM|ZOLPIDEM|FENOBARBITAL|CLOBAZAM|FLUNITRAZEPAM|CLORDIAZEPOXIDO|ANSIOLITICO|HIPNOTICO/i.test(
      combined
    );
  const isListaC =
    /LISTA C|ANTIDEPRESSIVO|ANTIPSICOTICO|NEUROLEPTICO|ANTICONVULSIVANTE|ANTIEPILEPTICO|FLUOXETINA|SERTRALINA|ESCITALOPRAM|CITALOPRAM|PAROXETINA|VENLAFAXINA|DESVENLAFAXINA|DULOXETINA|AMITRIPTILINA|NORTRIPTILINA|BUPROPIONA|MIRTAZAPINA|TRAZODONA|QUETIAPINA|RISPERIDONA|OLANZAPINA|ARIPIPRAZOL|HALOPERIDOL|CLORPROMAZINA|LEVOMEPROMAZINA|CARBAMAZEPINA|OXCARBAZEPINA|VALPROATO|ACIDO VALPROICO|DIVALPROATO|LAMOTRIGINA|TOPIRAMATO|PREGABALINA|GABAPENTINA|FENITOINA|TRAMADOL|CODEINA|CELECOXIBE|ISOTRETINOINA/i.test(
      combined
    );

  const isAntimicrobial =
    /ANTIBIOTICO|ANTIBACTERIANO|PENICILINA|CEFALOSPORINA|MACROLIDEO|QUINOLONA|SULFA|TETRACICLINA|AMINOGLICOSIDEO|CARBAPENEM|GLICOPEPTIDEO|AMOXICILINA|AZITROMICINA|CLARITROMICINA|ERITROMICINA|CEFALEXINA|CEFTRIAXONA|CEFUROXIMA|CEFEPIMA|CEFTAZIDIMA|CEFAZOLINA|CIPROFLOXACINO|LEVOFLOXACINO|MOXIFLOXACINO|NORFLOXACINO|SULFAMETOXAZOL|TRIMETOPRIMA|DOXICICLINA|GENTAMICINA|AMICACINA|MEROPENEM|IMIPENEM|ERTAPENEM|VANCOMICINA|TEICOPLANINA|LINEZOLIDA|POLIMIXINA|METRONIDAZOL|CLINDAMICINA|AMPICILINA|BENZILPENICILINA|OXACILINA|PIPERACILINA|TAZOBACTAM|FOSFOMICINA|NITROFURANTOINA/i.test(
      combined
    );

  const isOTC =
    (/VENDA LIVRE/i.test(rawTarja) ||
      /FITOTERAPICO|DINAMIZADO|ANTIACIDO|ANTIFLATULENTO|VITAMINA|SUPLEMENTO|REIDRATANTE ORAL|ANALGESICOS NAO NARCOTICOS|SIMETICONA|DIPIRONA|PARACETAMOL|IBUPROFENO|LORATADINA|DESLORATADINA|CETIRIZINA|FEXOFENADINA|HIDROXIDO DE ALUMINIO|HIDROXIDO DE MAGNESIO|CARBONATO DE CALCIO|ASCORBICO|COLECALCIFEROL|ESCOPOLAMINA|ORFENADRINA|CAFEINA|ISOMETEPTENO|BISACODIL|LACTULOSE|SENE/i.test(
        combined
      )) &&
    !isListaA &&
    !isListaB &&
    !isListaC &&
    !isAntimicrobial;

  let tarja: Medication['tarja'] = 'Vermelha';
  let retentionRule = 'Venda sob prescrição médica (Tarja Vermelha)';
  let isPsychotropic = false;

  if (isListaA || /TARJA PRETA/i.test(rawTarja)) {
    tarja = 'Preta';
    isPsychotropic = true;
    retentionRule = isListaA
      ? 'Portaria 344/98 (Lista A): Exige Notificação de Receita "A" (Amarela) com retenção obrigatória - Validade 30 dias'
      : 'Portaria 344/98 (Lista B): Exige Notificação de Receita "B" (Azul) com retenção obrigatória - Validade 30 dias';
  } else if (isListaB) {
    tarja = 'Preta';
    isPsychotropic = true;
    retentionRule =
      'Portaria 344/98 (Lista B): Exige Notificação de Receita "B" (Azul) com retenção obrigatória - Validade 30 dias';
  } else if (isListaC || /SOB RESTRI/i.test(rawTarja)) {
    tarja = 'Vermelha (Retém Receita)';
    isPsychotropic = true;
    retentionRule =
      'Portaria 344/98 (Lista C1/C2/C5): Receita de Controle Especial em 2 vias (1ª via retida na farmácia) - Validade 30 dias';
  } else if (isAntimicrobial) {
    tarja = 'Vermelha (Retém Receita)';
    retentionRule =
      'RDC 20/2011 (ANVISA): Antimicrobiano - Receita em 2 vias com retenção da 1ª via (Validade 10 dias)';
  } else if (isOTC) {
    tarja = 'Livre';
    retentionRule = 'MIP (Medicamento Isento de Prescrição) - Venda livre sem retenção de receita';
  }

  // Determine therapeutic profile, indication, mechanism, side effects, contraindications & symptoms
  let indication = `Medicamento registrado na ANVISA sob a classe ${
    raw.t || 'Farmacêutica Geral'
  }, indicado para o tratamento clínico correspondente ao princípio ativo ${raw.p || raw.n}.`;
  let mechanism = `Atua farmacologicamente por meio do princípio ativo ${
    raw.p || raw.n
  } nos receptores/alvos biológicos da classe ${raw.t || 'terapêutica específica'}.`;
  const contraindications = [
    `Hipersensibilidade conhecida a ${raw.p || raw.n} ou a qualquer excipiente da fórmula.`
  ];
  let sideEffects = ['Reações de hipersensibilidade cutânea', 'Desconforto gastrointestinal leve'];
  let pregnancyCategory = 'C (Avaliar risco-benefício clínico)';
  const symptoms: string[] = [];

  if (/ANALGESICO|ANTITERMICO|ANTIPIRETICO|DIPIRONA|PARACETAMOL/i.test(combined)) {
    indication =
      'Alívio sintomático de dores agudas/crônicas, cefaleia, enxaqueca, dores musculares e estados febris.';
    mechanism =
      'Inibição da síntese de prostaglandinas no SNC e bloqueio periférico da geração do impulso doloroso.';
    contraindications.push('Insuficiência hepática ou renal severa', 'Discrasias sanguíneas graves');
    sideEffects = ['Náusea', 'Reações alérgicas cutâneas', 'Hipotensão transitória (via parenteral rápida)'];
    pregnancyCategory = 'B / C';
    symptoms.push(
      'febre',
      'dor de cabeça',
      'cefaleia',
      'dor no corpo',
      'dor muscular',
      'dor de dente',
      'cólica',
      'enxaqueca'
    );
  }

  if (
    /ANTI-INFLAMATORIO|ANTIREUMATICO|IBUPROFENO|DICLOFENACO|NIMESULIDA|CETOPROFENO|MELOXICAM|PIROXICAM|NAPROXENO|CELECOXIBE|ETORICOXIBE/i.test(
      combined
    )
  ) {
    indication =
      'Tratamento de processos inflamatórios e dolorosos agudos ou crônicos (artrite, lombalgia, tendinite, dor pós-operatória, dismenorreia, odontalgia).';
    mechanism =
      'Inibição da enzima ciclooxigenase (COX-1 e/ou COX-2), reduzindo a síntese de prostaglandinas pró-inflamatórias.';
    contraindications.push(
      'Úlcera péptica ativa ou sangramento gastrointestinal',
      'Insuficiência renal ou cardíaca grave',
      'Asma induzida por AINEs',
      '3º trimestre de gestação'
    );
    sideEffects = [
      'Epigastralgia e dispepsia',
      'Náusea',
      'Retenção hídrica / edema',
      'Elevação da pressão arterial',
      'Risco de lesão renal aguda'
    ];
    pregnancyCategory = 'C (D no 3º trimestre)';
    symptoms.push(
      'inflamação',
      'dor muscular',
      'dor nas articulações',
      'inchaço',
      'dor nas costas',
      'lombalgia',
      'dor de dente',
      'febre',
      'cólica menstrual',
      'torcicolo'
    );
  }

  if (isAntimicrobial) {
    indication =
      'Tratamento de infecções bacterianas sensíveis do trato respiratório superior e inferior, trato urinário, pele e partes moles, intra-abdominais ou sistêmicas.';
    mechanism =
      'Ação bactericida ou bacteriostática por inibição da síntese da parede celular, síntese proteica ribossomal ou replicação do DNA bacteriano.';
    contraindications.push(
      'Histórico de reação anafilática ou alergia grave à classe antimicrobiana correspondente'
    );
    sideEffects = [
      'Diarreia e disbiose intestinal',
      'Náusea e vômito',
      'Candidíase secundária',
      'Rash cutâneo',
      'Elevação transitória de transaminases'
    ];
    pregnancyCategory = 'B / C (conforme classe específica)';
    symptoms.push(
      'infecção',
      'febre',
      'dor de garganta',
      'tosse com catarro',
      'sinusite',
      'infecção urinária',
      'pneumonia',
      'amigdalite'
    );
  }

  if (
    /ANTIULCEROSO|ANTIACIDO|REFLUXO|OMEPRAZOL|PANTOPRAZOL|ESOMEPRAZOL|LANSOPRAZOL|DEXLANSOPRAZOL|RABEPRAZOL|FAMOTIDINA|RANITIDINA/i.test(
      combined
    )
  ) {
    indication =
      'Tratamento de doença do refluxo gastroesofágico (DRGE), esofagite erosiva, úlcera péptica gástrica/duodenal, gastrite, dispepsia ácida e profilaxia de úlcera de estresse.';
    mechanism =
      'Supressão da secreção cloridropéptica gástrica por inibição da bomba de prótons (H+/K+-ATPase) ou bloqueio H2.';
    contraindications.push('Uso concomitante com rilpivirina ou atazanavir sem ajuste clínico');
    sideEffects = [
      'Cefaleia',
      'Diarreia ou constipação',
      'Dor abdominal',
      'Flatulência',
      'Hipomagnesemia e hipovitaminose B12 (uso crônico)'
    ];
    pregnancyCategory = 'B / C';
    symptoms.push('azia', 'refluxo', 'queimação no estômago', 'gastrite', 'má digestão', 'dor no estômago', 'acidez');
  }

  if (
    /ANTIEMETICO|ANTINAUSEANTE|PROCINETICO|ONDANSETRONA|DOMPERIDONA|METOCLOPRAMIDA|BROMOPRIDA|DIMENIDRINATO|MECLIZINA/i.test(
      combined
    )
  ) {
    indication =
      'Prevenção e tratamento de náuseas, vômitos (pós-operatórios, quimioterapia, gastroenterites), cinetose e gastroparesia.';
    mechanism =
      'Antagonismo de receptores serotoninérgicos (5-HT3), dopaminérgicos (D2) ou histaminérgicos (H1) no centro do vômito e trato GI.';
    contraindications.push(
      'Hemorragia, obstrução ou perfuração gastrointestinal mecânica',
      'Prolongamento congênito do intervalo QT'
    );
    sideEffects = [
      'Sonolência ou fadiga',
      'Cefaleia',
      'Constipação ou diarreia',
      'Sintomas extrapiramidais (antagonistas D2)'
    ];
    pregnancyCategory = 'B';
    symptoms.push('náusea', 'vômito', 'enjoo', 'estômago embrulhado', 'tontura', 'má digestão');
  }

  if (
    /ANTI-HIPERTENSIVO|CARDIOVASCULAR|BETABLOQUEADOR|DIURETICO|LOSARTANA|VALSARTANA|CANDESARTANA|TELMISARTANA|OLMESARTANA|ENALAPRIL|CAPTOPRIL|RAMIPRIL|LISINOPRIL|PERINDOPRIL|ANLODIPINO|NIFEDIPINO|ATENOLOL|PROPRANOLOL|METOPROLOL|CARVEDILOL|BISOPROLOL|NEBIVOLOL|HIDROCLOROTIAZIDA|FUROSEMIDA|ESPIRONOLACTONA|INDAPAMIDA|CLORTALIDONA/i.test(
      combined
    )
  ) {
    indication =
      'Controle da hipertensão arterial sistêmica, insuficiência cardíaca, cardiopatia isquêmica, angina e redução de morbimortalidade cardiovascular e renal.';
    mechanism =
      'Modulação do sistema renina-angiotensina-aldosterona, bloqueio de canais de cálcio, antagonismo beta-adrenérgico ou natriurese renal.';
    contraindications.push('Choque cardiogênico', 'Hipotensão sintomática grave', 'Gestação (para IECA e BRA)');
    sideEffects = [
      'Hipotensão postural e tontura',
      'Cefaleia',
      'Distúrbios hidroeletrolíticos (potássio/sódio)',
      'Fadiga'
    ];
    pregnancyCategory = 'C / D (IECA e BRA contraindicados na gestação)';
    symptoms.push('pressão alta', 'hipertensão', 'inchaço nas pernas', 'edema', 'retenção de líquidos', 'palpitações');
  }

  if (
    /ANTILIPEMICO|COLESTEROL|SINVASTATINA|ATORVASTATINA|ROSUVASTATINA|PRAVASTATINA|PITAVASTATINA|EZETIMIBA|FENOFIBRATO|CIPROFIBRATO|BEZAFIBRATO/i.test(
      combined
    )
  ) {
    indication =
      'Tratamento de dislipidemias (hipercolesterolemia, hipertrigliceridemia mista) e prevenção primária/secundária de eventos cardiovasculares.';
    mechanism =
      'Inibição da HMG-CoA redutase hepática, redução da absorção intestinal de colesterol ou ativação de PPAR-alfa.';
    contraindications.push(
      'Doença hepática ativa ou elevações persistentes inexplicadas das transaminases',
      'Gravidez e amamentação'
    );
    sideEffects = ['Mialgia e artralgia', 'Elevação de CPK e transaminases hepáticas', 'Desconforto gastrointestinal'];
    pregnancyCategory = 'X';
    symptoms.push('colesterol alto', 'triglicérides altos');
  }

  if (
    /ANTIDIABETICO|HIPOGLICEMIANTE|INSULINA|METFORMINA|GLIBENCLAMIDA|GLICLAZIDA|GLIMEPIRIDA|DAPAGLIFLOZINA|EMPAGLIFLOZINA|CANAGLIFLOZINA|SITAGLIPTINA|VILDAGLIPTINA|LINAGLIPTINA|LIRAGLUTIDA|SEMAGLUTIDA|DULAGLUTIDA|PIOGLITAZONA/i.test(
      combined
    )
  ) {
    indication =
      'Controle glicêmico no Diabetes Mellitus tipo 1 e/ou tipo 2, prevenção de complicações micro e macrovasculares.';
    mechanism =
      'Redução da gliconeogênese hepática, aumento da sensibilidade periférica à insulina, estímulo incretínico, glicosúria renal (SGLT2) ou reposição insulínica.';
    contraindications.push(
      'Cetoacidose diabética (para antidiabéticos orais)',
      'Insuficiência renal severa (conforme TFG)'
    );
    sideEffects = [
      'Hipoglicemia (especialmente sulfonilureias e insulinas)',
      'Náusea e diarreia',
      'Infecções genitourinárias (iSGLT2)'
    ];
    pregnancyCategory = 'B / C';
    symptoms.push('diabetes', 'glicemia alta', 'açúcar alto no sangue', 'excesso de sede');
  }

  if (
    /ANTIALERGICO|ANTI-HISTAMINICO|CORTICOSTEROIDE|GLICOCORTICOIDE|BRONCODILATADOR|ANTIASMATICO|LORATADINA|DESLORATADINA|CETIRIZINA|LEVOCETIRIZINA|FEXOFENADINA|BILASTINA|DEXCLORFENIRAMINA|HIDROXIZINA|PROMETAZINA|PREDNISOLONA|PREDNISONA|DEXAMETASONA|BETAMETASONA|HIDROCORTISONA|METILPREDNISOLONA|SALBUTAMOL|FENOTEROL|FORMOTEROL|SALMETEROL|BUDESONIDA|FLUTICASONA|BECLOMETASONA|MOMETASONA|MONTELUCASTE|TIOTROPIO|IPRATROPIO/i.test(
      combined
    )
  ) {
    indication =
      'Manejo de quadros alérgicos (rinite, urticária, conjuntivite, dermatite), broncoespasmo, asma brônquica, DPOC e processos inflamatórios responsivos a corticoides.';
    mechanism =
      'Antagonismo de receptores H1 da histamina, transcrição anti-inflamatória glicocorticoide ou agonismo beta-2/antagonismo muscarínico brônquico.';
    contraindications.push('Infecções sistêmicas não controladas (para corticoides sistêmicos)');
    sideEffects = [
      'Boca seca',
      'Sonolência (anti-histamínicos de 1ª geração)',
      'Taquicardia/tremor (beta-2 agonistas)',
      'Hiperglicemia e retenção hídrica (corticoides)'
    ];
    pregnancyCategory = 'B / C';
    symptoms.push(
      'alergia',
      'rinite',
      'espirros',
      'coriza',
      'coceira',
      'urticária',
      'falta de ar',
      'chiado no peito',
      'crise de asma',
      'tosse'
    );
  }

  if (isListaA || isListaB || isListaC) {
    if (
      !symptoms.includes('ansiedade') &&
      /ANSIOLITICO|ANTIDEPRESSIVO|HIPNOTICO|BENZODIAZEP|CLONAZEPAM|DIAZEPAM|ALPRAZOLAM|ZOLPIDEM|FLUOXETINA|SERTRALINA|ESCITALOPRAM|VENLAFAXINA|QUETIAPINA|AMITRIPTILINA|TRAZODONA/i.test(
        combined
      )
    ) {
      indication =
        'Tratamento de transtornos de ansiedade, depressão, síndrome do pânico, insônia ou distúrbios psiquiátricos/neurológicos.';
      mechanism =
        'Modulação da neurotransmissão central (GABAérgica, serotoninérgica, noradrenérgica ou dopaminérgica).';
      contraindications.push(
        'Uso concomitante com álcool ou depressores potentes do SNC',
        'Uso concomitante com IMAO'
      );
      sideEffects = [
        'Sonolência e sedação',
        'Tontura',
        'Boca seca',
        'Alteração do sono ou apetite',
        'Risco de dependência/abstinência na retirada abrupta'
      ];
      pregnancyCategory = 'C / D';
      symptoms.push('ansiedade', 'insônia', 'depressão', 'crise de pânico', 'estresse', 'nervosismo', 'tristeza');
    }
  }

  // Format expiration MMYYYY -> MM/YYYY
  let formattedExpiry = raw.v || '';
  if (/^\d{6}$/.test(formattedExpiry)) {
    formattedExpiry = `${formattedExpiry.slice(0, 2)}/${formattedExpiry.slice(2)}`;
  }

  const presentations =
    raw.ap && raw.ap.length > 0
      ? raw.ap
      : ['Comprimido / Cápsula - Caixa com Blíster (Apresentação Comercial ANVISA)'];

  return {
    id: `anvisa-${raw.r || index}-${index}`,
    name: raw.n,
    activePrinciple: raw.p || raw.n,
    registrationNumber: raw.r || 'Registrado ANVISA',
    registrationExpiry: formattedExpiry || 'Vigente (Ativo)',
    laboratory: raw.e || 'Laboratório Registrado ANVISA',
    activePresentationsCount: presentations.length,
    presentations,
    brandNames:
      raw.p && raw.p.toUpperCase() !== raw.n.toUpperCase()
        ? [raw.n, `Princípio Ativo: ${raw.p}`]
        : [raw.n],
    category,
    regulatoryCategoryRaw: rawCat || 'Medicamento Ativo ANVISA',
    tarja,
    therapeuticClass: raw.t || 'Medicamento Regulamentado ANVISA',
    indication,
    mechanism,
    dosageForm: presentations.join(' • '),
    contraindications,
    sideEffects,
    pregnancyCategory,
    isAntimicrobial,
    isPsychotropic,
    isHospitalRestricted: raw.rh === 1,
    retentionRule,
    symptoms
  };
}

export const INITIAL_MEDICATIONS: Medication[] = [
  {
    id: 'med-1',
    name: 'Dipirona Monoidratada',
    activePrinciple: 'dipirona monoidratada',
    registrationNumber: '113001053',
    registrationExpiry: '08/2029',
    laboratory: 'SANOFI MEDLEY FARMACÊUTICA LTDA.',
    activePresentationsCount: 5,
    presentations: [
      '500 MG Comprimido - Caixa com Blíster X 30',
      '1 G Comprimido - Caixa com Blíster X 10',
      '500 MG/ML Solução Oral Gotas - Caixa com Frasco Gotejador X 20 ML',
      '50 MG/ML Solução Oral - Caixa com Frasco X 100 ML + Copo Dosador',
      '500 MG/ML Solução Injetável IV/IM - Caixa com 5 Ampolas X 2 ML'
    ],
    brandNames: ['Novalgina', 'Anador', 'Maxalgina'],
    category: 'Referência',
    tarja: 'Livre',
    therapeuticClass: 'ANALGESICOS NAO NARCOTICOS / ANTIPIRETICOS',
    indication: 'Tratamento da dor aguda, cefaleia, cólicas e febre.',
    mechanism:
      'Inibição da síntese de prostaglandinas no sistema nervoso central e dessensibilização de nociceptores periféricos.',
    dosageForm:
      '500 MG Comprimido • 1 G Comprimido • 500 MG/ML Solução Oral Gotas (20 ML) • 50 MG/ML Solução Oral (100 ML) • 500 MG/ML Solução Injetável IV/IM (Ampola 2 ML)',
    contraindications: [
      'Hipersensibilidade a pirazolonas',
      'Porfiria hepática aguda',
      'Deficiência congênita da G6PD',
      'Supressão da medula óssea'
    ],
    sideEffects: [
      'Hipotensão (em infusão IV rápida)',
      'Reações cutâneas alérgicas',
      'Agranulocitose (muito rara)'
    ],
    pregnancyCategory: 'C',
    retentionRule: 'Venda livre (MIP - não retém receita)',
    symptoms: [
      'febre',
      'dor de cabeça',
      'cefaleia',
      'dor no corpo',
      'febre alta',
      'cólica',
      'dor muscular',
      'dor de dente'
    ]
  },
  {
    id: 'med-2',
    name: 'Paracetamol',
    activePrinciple: 'paracetamol',
    registrationNumber: '112363326',
    registrationExpiry: '10/2030',
    laboratory: 'JANSSEN-CILAG FARMACÊUTICA LTDA',
    activePresentationsCount: 4,
    presentations: [
      '500 MG Comprimido Revestido - Caixa com Blíster X 20',
      '750 MG Comprimido Revestido - Caixa com Blíster X 20',
      '200 MG/ML Solução Oral Gotas - Caixa com Frasco X 15 ML',
      '32 MG/ML Suspensão Oral Infantil - Caixa com Frasco X 60 ML + Seringa Dosadora'
    ],
    brandNames: ['Tylenol', 'Dôrico', 'Tylenol Bebê / Criança'],
    category: 'Referência',
    tarja: 'Livre',
    therapeuticClass: 'ANALGESICOS NAO NARCOTICOS',
    indication:
      'Alívio sintomático de dores leves a moderadas (cefaleia, mialgia, artralgia) e redução da febre.',
    mechanism:
      'Inibição central da síntese de prostaglandinas e ativação de vias serotoninérgicas descendentes inibitórias da dor.',
    dosageForm:
      '500 MG Comprimido • 750 MG Comprimido • 200 MG/ML Solução Oral Gotas (15 ML) • 32 MG/ML Suspensão Oral (60 ML)',
    contraindications: [
      'Insuficiência hepática grave ou hepatopatia ativa',
      'Hipersensibilidade ao paracetamol'
    ],
    sideEffects: ['Hepatotoxicidade dose-dependente (>4g/dia)', 'Náusea', 'Erupções cutâneas raras'],
    pregnancyCategory: 'B',
    retentionRule: 'Venda livre (MIP - não retém receita)',
    symptoms: ['febre', 'dor de cabeça', 'cefaleia', 'dor no corpo', 'gripe', 'resfriado', 'dor de garganta']
  },
  {
    id: 'med-3',
    name: 'Ibuprofeno',
    activePrinciple: 'ibuprofeno',
    registrationNumber: '178170790',
    registrationExpiry: '05/2031',
    laboratory: 'COSMED INDÚSTRIA DE COSMÉTICOS E MEDICAMENTOS S.A.',
    activePresentationsCount: 5,
    presentations: [
      '400 MG Cápsula Mole Líquida - Caixa com Blíster X 10',
      '200 MG Comprimido Revestido - Caixa com Blíster X 20',
      '600 MG Comprimido Revestido - Caixa com Blíster X 30',
      '50 MG/ML Suspensão Oral Gotas - Caixa com Frasco X 30 ML',
      '100 MG/ML Suspensão Oral Gotas Forte - Caixa com Frasco X 20 ML'
    ],
    brandNames: ['Alivium', 'Advil', 'Buscofem'],
    category: 'Referência',
    tarja: 'Livre',
    therapeuticClass: 'ANTI-INFLAMATORIOS E ANTIREUMATICOS',
    indication:
      'Alívio de dor inflamatória, febre, cólicas menstruais, odontalgia e dores musculoesqueléticas.',
    mechanism: 'Inibição reversível não seletiva das enzimas COX-1 e COX-2.',
    dosageForm:
      '400 MG Cápsula Mole • 200 MG / 400 MG / 600 MG Comprimido • 50 MG/ML e 100 MG/ML Suspensão Oral Gotas',
    contraindications: [
      'Úlcera péptica ativa',
      'Insuficiência renal ou cardíaca grave',
      'Asma induzida por AAS/AINEs',
      '3º trimestre de gestação'
    ],
    sideEffects: ['Dispepsia e gastrite', 'Náusea', 'Retenção hídrica', 'Elevação da pressão arterial'],
    pregnancyCategory: 'C (D no 3º trimestre)',
    retentionRule: 'Isento de prescrição até 400mg (600mg sob prescrição médica)',
    symptoms: [
      'dor de cabeça',
      'febre',
      'dor muscular',
      'dor nas articulações',
      'cólica menstrual',
      'inflamação',
      'dor de dente'
    ]
  },
  {
    id: 'med-4',
    name: 'Amoxicilina + Clavulanato de Potássio',
    activePrinciple: 'amoxicilina tri-hidratada, clavulanato de potássio',
    registrationNumber: '101070076',
    registrationExpiry: '06/2030',
    laboratory: 'GLAXOSMITHKLINE BRASIL LTDA',
    activePresentationsCount: 4,
    presentations: [
      '875 MG + 125 MG Comprimido Revestido - Caixa com Frasco/Blíster X 14',
      '500 MG + 125 MG Comprimido Revestido - Caixa com Blíster X 18',
      '(400 MG + 57 MG)/5 ML Pó para Suspensão Oral - Caixa com Frasco X 70 ML + Seringa Dosadora',
      '1 G + 200 MG Pó para Solução Injetável IV - Caixa com 10 Frascos-Ampola'
    ],
    brandNames: ['Clavulin', 'Clavulin BD', 'Sigma-Clav BD'],
    category: 'Referência',
    tarja: 'Vermelha (Retém Receita)',
    therapeuticClass: 'PENICILINAS EM ASSOCIACAO',
    indication:
      'Infecções bacterianas do trato respiratório superior e inferior (sinusite, otite média, pneumonia), trato urinário e pele.',
    mechanism:
      'Amoxicilina inibe a síntese da parede celular bacteriana; ácido clavulânico inativa beta-lactamases bacterianas.',
    dosageForm:
      '875/125 MG Comprimido Revestido • 500/125 MG Comprimido • 400/57 MG/5ML Suspensão Oral • 1 G/200 MG Frasco-Ampola IV',
    contraindications: [
      'Alergia a penicilinas ou cefalosporinas',
      'Histórico prévio de icterícia colestática induzida por amoxicilina/clavulanato'
    ],
    sideEffects: [
      'Diarreia',
      'Náusea e vômito',
      'Candidíase mucocutânea',
      'Elevação transitória de transaminases'
    ],
    pregnancyCategory: 'B',
    isAntimicrobial: true,
    retentionRule:
      'RDC 20/2011: Retenção obrigatória da 1ª via da Receita de Controle de Antimicrobiano (Validade 10 dias)',
    symptoms: [
      'infecção',
      'tosse com catarro',
      'dor de garganta',
      'febre alta',
      'infecção de ouvido',
      'sinusite',
      'infecção urinária'
    ]
  },
  {
    id: 'med-5',
    name: 'Azitromicina Di-hidratada',
    activePrinciple: 'azitromicina di-hidratada',
    registrationNumber: '102160024',
    registrationExpiry: '04/2029',
    laboratory: 'LABORATÓRIOS PFIZER LTDA',
    activePresentationsCount: 3,
    presentations: [
      '500 MG Comprimido Revestido - Caixa com Blíster X 3',
      '500 MG Comprimido Revestido - Caixa com Blíster X 5',
      '200 MG/5 ML Pó para Suspensão Oral - Caixa com Frasco X 15 ML + Seringa Dosadora'
    ],
    brandNames: ['Zitromax', 'Astro', 'Azi'],
    category: 'Referência',
    tarja: 'Vermelha (Retém Receita)',
    therapeuticClass: 'MACROLIDEOS',
    indication:
      'Infecções respiratórias (faringoamigdalite, sinusite, bronquite, pneumonia atípica), infecções de pele e ISTs.',
    mechanism:
      'Inibição da síntese proteica bacteriana dependente de RNA por ligação à subunidade ribossômica 50S.',
    dosageForm: '500 MG Comprimido Revestido (Caixa X 3 e X 5) • 200 MG/5ML Suspensão Oral',
    contraindications: ['Hipersensibilidade à azitromicina, eritromicina ou qualquer macrolídeo'],
    sideEffects: [
      'Diarreia',
      'Dor abdominal',
      'Náusea',
      'Prolongamento do intervalo QT em pacientes suscetíveis'
    ],
    pregnancyCategory: 'B',
    isAntimicrobial: true,
    retentionRule:
      'RDC 20/2011: Retenção obrigatória da 1ª via da Receita de Antimicrobiano (Validade 10 dias)',
    symptoms: ['infecção', 'tosse', 'dor de garganta', 'pneumonia', 'amigdalite', 'sinusite']
  },
  {
    id: 'med-6',
    name: 'Clonazepam',
    activePrinciple: 'clonazepam',
    registrationNumber: '101000073',
    registrationExpiry: '11/2031',
    laboratory: 'BIOMM S.A. / ROCHE',
    activePresentationsCount: 4,
    presentations: [
      '2 MG Comprimido - Caixa com Blíster X 30',
      '0,5 MG Comprimido - Caixa com Blíster X 30',
      '0,25 MG Comprimido Sublingual - Caixa com Blíster X 30',
      '2,5 MG/ML Solução Oral Gotas - Caixa com Frasco Vidro Âmbar X 20 ML'
    ],
    brandNames: ['Rivotril', 'Clopam'],
    category: 'Referência',
    tarja: 'Preta',
    therapeuticClass: 'ANTICONVULSIVANTES / ANSIOLITICOS',
    indication:
      'Transtorno do pânico, transtornos de ansiedade, crises epilépticas e espasmos infantis.',
    mechanism:
      'Modulação alostérica positiva dos receptores GABA-A, aumentando a frequência de abertura dos canais de cloreto.',
    dosageForm:
      '0,5 MG e 2 MG Comprimido (Caixa X 30) • 0,25 MG Comprimido Sublingual • 2,5 MG/ML Solução Oral Gotas (Frasco 20 ML)',
    contraindications: [
      'Insuficiência respiratória grave',
      'Insuficiência hepática grave',
      'Glaucoma agudo de ângulo fechado'
    ],
    sideEffects: [
      'Sonolência e sedação diurna',
      'Ataxia e tontura',
      'Comprometimento cognitivo/motor',
      'Dependência física e tolerância'
    ],
    pregnancyCategory: 'D',
    isPsychotropic: true,
    retentionRule:
      'Portaria 344/98 (Lista B1): Notificação de Receita "B" (Azul) - Retenção obrigatória (Validade 30 dias)',
    symptoms: ['ansiedade', 'crise de pânico', 'insônia', 'falta de sono', 'convulsão', 'nervosismo']
  },
  {
    id: 'med-7',
    name: 'Omeprazol',
    activePrinciple: 'omeprazol',
    registrationNumber: '116180075',
    registrationExpiry: '09/2029',
    laboratory: 'ASTRAZENECA DO BRASIL LTDA',
    activePresentationsCount: 4,
    presentations: [
      '20 MG Cápsula Dura com Microgrânulos Gastrorresistentes - Caixa com Blíster X 28',
      '40 MG Cápsula Dura com Microgrânulos Gastrorresistentes - Caixa com Blíster X 28',
      '10 MG Cápsula Dura com Microgrânulos Gastrorresistentes - Caixa com Blíster X 14',
      '40 MG Pó Liofilizado para Solução Injetável IV - Caixa com 1 Frasco-Ampola + Diluente 10 ML'
    ],
    brandNames: ['Losec Mups', 'Peprazol', 'Gastrium'],
    category: 'Referência',
    tarja: 'Vermelha',
    therapeuticClass: 'ANTIULCEROSOS',
    indication:
      'Doença do refluxo gastroesofágico (DRGE), úlcera gástrica e duodenal, erradicação de H. pylori e síndrome de Zollinger-Ellison.',
    mechanism: 'Inibição específica da bomba de prótons (H+/K+-ATPase) na célula parietal gástrica.',
    dosageForm:
      '10 MG, 20 MG e 40 MG Cápsula Gastrorresistente (Caixa X 28) • 40 MG Pó Liofilizado Injetável IV',
    contraindications: [
      'Hipersensibilidade aos benzimidazóis substituídos',
      'Uso concomitante com nelfinavir'
    ],
    sideEffects: ['Cefaleia', 'Dor abdominal', 'Diarreia ou constipação', 'Flatulência'],
    pregnancyCategory: 'C',
    retentionRule: 'Venda sob prescrição médica',
    symptoms: ['azia', 'refluxo', 'má digestão', 'queimação no estômago', 'gastrite', 'dor no estômago', 'acidez']
  },
  {
    id: 'med-8',
    name: 'Losartana Potássica',
    activePrinciple: 'losartana potássica',
    registrationNumber: '100290007',
    registrationExpiry: '03/2031',
    laboratory: 'ORGANON FARMACÊUTICA LTDA.',
    activePresentationsCount: 3,
    presentations: [
      '50 MG Comprimido Revestido - Caixa com Blíster X 30',
      '50 MG Comprimido Revestido - Caixa com Blíster X 60',
      '100 MG Comprimido Revestido - Caixa com Blíster X 30'
    ],
    brandNames: ['Cozaar', 'Aradois', 'Corus'],
    category: 'Referência',
    tarja: 'Vermelha',
    therapeuticClass: 'ANTI-HIPERTENSIVOS',
    indication:
      'Hipertensão arterial sistêmica, insuficiência cardíaca e nefroproteção em pacientes com diabetes tipo 2 e proteinúria.',
    mechanism: 'Antagonismo seletivo competitivo dos receptores AT1 da angiotensina II.',
    dosageForm: '50 MG Comprimido Revestido (Caixa X 30 e X 60) • 100 MG Comprimido Revestido (Caixa X 30)',
    contraindications: ['Gestação (2º e 3º trimestres)', 'Associação com alisquireno em diabéticos'],
    sideEffects: ['Tontura', 'Hipotensão ortostática', 'Hipercalemia', 'Fadiga'],
    pregnancyCategory: 'D',
    retentionRule: 'Venda sob prescrição médica',
    symptoms: ['pressão alta', 'hipertensão', 'dor de cabeça tensional']
  }
];

export interface InterventionLog {
  id: string;
  timestamp: string;
  patientName: string;
  ward: string;
  pharmacistName: string;
  medications: string[];
  interventions: string[];
  status: 'Aceita' | 'Pendente' | 'Rejeitada';
  clinicalOutcome: string;
  ownerId?: string;
  ownerEmail?: string;
}

export const INITIAL_INTERVENTIONS: InterventionLog[] = [
  {
    id: 'int-1',
    timestamp: '2026-11-21 10:30',
    patientName: 'Maria da Silva Santos (Leito 204-B)',
    ward: 'UTI Geral',
    pharmacistName: 'Dr. Emerson Pereira',
    medications: ['Amoxicilina + Clavulanato de Potássio', 'Clonazepam'],
    interventions: [
      'Ajuste de dose de amoxicilina por clearance de creatinina (ClCr 35 mL/min).',
      'Monitoramento de sedação excessiva em idosa.'
    ],
    status: 'Aceita',
    clinicalOutcome: 'Equipe médica aceitou a redução de dose e monitoramento.'
  }
];
