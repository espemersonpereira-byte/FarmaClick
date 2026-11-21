export interface ProfessionConfig {
  label: string;
  hasCouncil: boolean;
  councilLabel?: string;
  councilPlaceholder?: string;
  workplaceType: 'hospital' | 'drogaria';
  workplaceLabel: string;
  workplacePlaceholder: string;
}

export const PROFESSION_OPTIONS: ProfessionConfig[] = [
  {
    label: 'Farmacêutico(a) Hospitalar / Clínico(a)',
    hasCouncil: true,
    councilLabel: 'Registro no Conselho (CRF) *',
    councilPlaceholder: 'Ex: CRF-SP 48291',
    workplaceType: 'hospital',
    workplaceLabel: 'Nome do Hospital / Setor *',
    workplacePlaceholder: 'Ex: Hospital das Clínicas - Farmácia Central'
  },
  {
    label: 'Farmacêutico(a) de Drogaria / Farmácia',
    hasCouncil: true,
    councilLabel: 'Registro no Conselho (CRF) *',
    councilPlaceholder: 'Ex: CRF-SP 48291',
    workplaceType: 'drogaria',
    workplaceLabel: 'Nome da Drogaria / Farmácia *',
    workplacePlaceholder: 'Ex: Drogaria São Paulo / Farmácia Raia'
  },
  {
    label: 'Médico(a)',
    hasCouncil: true,
    councilLabel: 'Registro no Conselho (CRM) *',
    councilPlaceholder: 'Ex: CRM-SP 123456',
    workplaceType: 'hospital',
    workplaceLabel: 'Nome do Hospital / Unidade *',
    workplacePlaceholder: 'Ex: Hospital Santa Casa - Clínica Médica'
  },
  {
    label: 'Enfermeiro(a)',
    hasCouncil: true,
    councilLabel: 'Registro no Conselho (COREN) *',
    councilPlaceholder: 'Ex: COREN-SP 654321',
    workplaceType: 'hospital',
    workplaceLabel: 'Nome do Hospital / Setor *',
    workplacePlaceholder: 'Ex: Hospital Geral - UTI Adulto'
  },
  {
    label: 'Técnico(a) de Farmácia (Hospitalar)',
    hasCouncil: false,
    workplaceType: 'hospital',
    workplaceLabel: 'Nome do Hospital / Setor *',
    workplacePlaceholder: 'Ex: Hospital Santa Casa - Farmácia Hospitalar'
  },
  {
    label: 'Técnico(a) de Farmácia (Drogaria)',
    hasCouncil: false,
    workplaceType: 'drogaria',
    workplaceLabel: 'Nome da Drogaria / Farmácia *',
    workplacePlaceholder: 'Ex: Drogaria Pacheco / Farmácia Pague Menos'
  },
  {
    label: 'Auxiliar de Farmácia (Hospitalar)',
    hasCouncil: false,
    workplaceType: 'hospital',
    workplaceLabel: 'Nome do Hospital / Setor *',
    workplacePlaceholder: 'Ex: Hospital Municipal - Farmácia Central'
  },
  {
    label: 'Auxiliar de Farmácia (Drogaria)',
    hasCouncil: false,
    workplaceType: 'drogaria',
    workplaceLabel: 'Nome da Drogaria / Farmácia *',
    workplacePlaceholder: 'Ex: Drogaria São Paulo / Farmácia Popular'
  },
  {
    label: 'Balconista de Farmácia / Drogaria',
    hasCouncil: false,
    workplaceType: 'drogaria',
    workplaceLabel: 'Nome da Drogaria / Farmácia *',
    workplacePlaceholder: 'Ex: Drogaria Raia / Farmácia São João'
  },
  {
    label: 'Atendente de Farmácia / Drogaria',
    hasCouncil: false,
    workplaceType: 'drogaria',
    workplaceLabel: 'Nome da Drogaria / Farmácia *',
    workplacePlaceholder: 'Ex: Drogaria Araújo / Farmácia Nissei'
  },
  {
    label: 'Técnico(a) de Enfermagem',
    hasCouncil: false,
    workplaceType: 'hospital',
    workplaceLabel: 'Nome do Hospital / Setor *',
    workplacePlaceholder: 'Ex: Hospital Geral - Enfermaria / Pronto Socorro'
  },
  {
    label: 'Auxiliar de Enfermagem',
    hasCouncil: false,
    workplaceType: 'hospital',
    workplaceLabel: 'Nome do Hospital / Setor *',
    workplacePlaceholder: 'Ex: Hospital Regional - Clínica Médica'
  }
];

export function getProfessionConfig(profession: string): ProfessionConfig {
  const exact = PROFESSION_OPTIONS.find(p => p.label === profession);
  if (exact) return exact;

  const lower = (profession || '').toLowerCase();
  const isNoCouncil =
    /t[eé]cnic|auxiliar|balconista|atendente|estagi[aá]ri|estudante/i.test(lower);
  const isDrogaria =
    /drogaria|balconista|atendente|comunit[aá]ri|comercial/i.test(lower);

  let councilLabel = 'Registro no Conselho (CRF/CRM) *';
  let councilPlaceholder = 'Ex: CRF-SP 48291';
  if (/m[eé]dic/i.test(lower)) {
    councilLabel = 'Registro no Conselho (CRM) *';
    councilPlaceholder = 'Ex: CRM-SP 123456';
  } else if (/enfermeir/i.test(lower)) {
    councilLabel = 'Registro no Conselho (COREN) *';
    councilPlaceholder = 'Ex: COREN-SP 654321';
  }

  return {
    label: profession || PROFESSION_OPTIONS[0].label,
    hasCouncil: !isNoCouncil,
    councilLabel,
    councilPlaceholder,
    workplaceType: isDrogaria ? 'drogaria' : 'hospital',
    workplaceLabel: isDrogaria ? 'Nome da Drogaria / Farmácia *' : 'Nome do Hospital / Setor *',
    workplacePlaceholder: isDrogaria
      ? 'Ex: Drogaria São Paulo / Farmácia Pague Menos'
      : 'Ex: Hospital das Clínicas - UTI Adulto'
  };
}
