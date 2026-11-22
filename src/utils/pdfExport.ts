import { jsPDF } from 'jspdf';
import { SavedPrescription } from '../components/PrescriptionsTab';
import { InterventionLog } from '../data/medications';

function safeText(val: any): string {
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
}

function sanitizeFilename(raw: string): string {
  return (raw || 'documento')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9_-]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .toLowerCase();
}

function addDocumentFooter(doc: jsPDF) {
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setDrawColor(226, 232, 240);
    doc.line(14, 282, 196, 282);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    doc.text(
      `FarmaClick • Sistema de Apoio Clínico & Farmácia • Emitido em ${new Date().toLocaleString('pt-BR')}`,
      14,
      287
    );
    doc.text(`Página ${i} de ${pageCount}`, 196, 287, { align: 'right' });
  }
}

export function exportPrescriptionToPDF(prescription: SavedPrescription): void {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const pageWidth = 210;
  const margin = 14;
  const contentWidth = pageWidth - margin * 2;
  let y = 14;

  const ensureSpace = (neededHeight: number) => {
    if (y + neededHeight > 274) {
      doc.addPage();
      y = 16;
    }
  };

  // Top Header Banner (Light Blue #0284c7)
  doc.setFillColor(2, 132, 199);
  doc.roundedRect(margin, y, contentWidth, 24, 3, 3, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.text('FarmaClick — Relatório de Prescrição & Parecer Clínico', margin + 5, y + 9);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text(
    `Data do Registro: ${prescription.createdAt || new Date().toLocaleString('pt-BR')}   |   Responsável: ${
      prescription.savedBy || 'Profissional de Saúde'
    }`,
    margin + 5,
    y + 16
  );
  doc.text('Documento para compartilhamento clínico, checagem de interações e arquivamento.', margin + 5, y + 21);

  y += 30;

  // Patient Identification Box
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(203, 213, 225);
  doc.roundedRect(margin, y, contentWidth, 30, 2, 2, 'FD');

  doc.setTextColor(15, 23, 42);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text('DADOS DO PACIENTE & PRESCRIÇÃO', margin + 4, y + 6);

  doc.setFontSize(9);
  doc.text(`Paciente: ${prescription.patientName || 'Não informado'}`, margin + 4, y + 12);
  doc.text(`Leito / Quarto: ${prescription.patientBed || '—'}`, margin + 100, y + 12);
  doc.text(`Idade: ${prescription.patientAge || '—'}`, margin + 150, y + 12);

  doc.setFont('helvetica', 'normal');
  doc.text(`Setor / Unidade: ${prescription.patientWard || 'Não informado'}`, margin + 4, y + 18);
  doc.text(`Função Renal (ClCr): ${prescription.patientClCr || 'Não informada'}`, margin + 100, y + 18);

  doc.text(`Médico Prescritor / CRM: ${prescription.prescriberName || 'Não informado'}`, margin + 4, y + 24);

  const allergiesStr =
    prescription.allergies && prescription.allergies.length > 0
      ? prescription.allergies.join(', ')
      : 'Nenhuma alergia registrada';
  if (prescription.allergies && prescription.allergies.length > 0) {
    doc.setTextColor(190, 18, 60);
    doc.setFont('helvetica', 'bold');
  } else {
    doc.setTextColor(71, 85, 105);
  }
  doc.text(`Alergias: ${allergiesStr}`, margin + 100, y + 24);

  y += 36;

  // Clinical Status Banner
  const analysis = prescription.analysisResult;
  const hasAlert = Boolean(
    analysis?.requiredIntervention ||
      (analysis?.interactions && analysis.interactions.length > 0) ||
      (analysis?.allergyRisks && analysis.allergyRisks.length > 0)
  );

  if (hasAlert) {
    doc.setFillColor(255, 241, 242);
    doc.setDrawColor(244, 63, 94);
    doc.roundedRect(margin, y, contentWidth, 10, 2, 2, 'FD');
    doc.setTextColor(190, 18, 60);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9.5);
    doc.text('STATUS CLÍNICO: ATENÇÃO — REQUER REVISÃO / INTERAÇÃO OU ALERGIA DETECTADA', margin + 4, y + 6.5);
  } else {
    doc.setFillColor(236, 253, 245);
    doc.setDrawColor(16, 185, 129);
    doc.roundedRect(margin, y, contentWidth, 10, 2, 2, 'FD');
    doc.setTextColor(6, 95, 70);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9.5);
    doc.text('STATUS CLÍNICO: PRESCRIÇÃO SEGURA — SEM INTERAÇÕES GRAVES DETECTADAS', margin + 4, y + 6.5);
  }

  y += 16;

  // Medications List Section
  doc.setTextColor(2, 132, 199);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text(`MEDICAMENTOS PRESCRITOS (${prescription.items.length})`, margin, y);
  y += 4;

  if (prescription.items.length === 0) {
    doc.setTextColor(100, 116, 139);
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(9);
    doc.text('Nenhum medicamento listado nesta prescrição.', margin, y + 6);
    y += 12;
  } else {
    prescription.items.forEach((item, index) => {
      ensureSpace(22);
      doc.setFillColor(248, 250, 252);
      doc.setDrawColor(226, 232, 240);
      doc.roundedRect(margin, y, contentWidth, 18, 2, 2, 'FD');

      doc.setTextColor(15, 23, 42);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9.5);
      doc.text(`${index + 1}. ${item.drugName}`, margin + 4, y + 6);

      doc.setTextColor(2, 132, 199);
      doc.setFontSize(8.5);
      doc.text(`Via: ${item.route || 'Oral'}`, margin + contentWidth - 4, y + 6, { align: 'right' });

      doc.setTextColor(51, 65, 85);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8.5);
      const line1 = `Dose/Concentração: ${item.dose || 'Conforme prescrição'}   |   Posologia: ${
        item.posology || 'Conforme prescrição'
      }`;
      doc.text(doc.splitTextToSize(line1, contentWidth - 8)[0] || line1, margin + 4, y + 11.5);

      const line2 = `Frequência: ${item.frequency || '—'}   |   Horários Aprazados: ${item.schedule || '—'}`;
      doc.text(doc.splitTextToSize(line2, contentWidth - 8)[0] || line2, margin + 4, y + 16);

      y += 21;
    });
  }

  y += 3;

  // Clinical Analysis Details
  if (analysis) {
    ensureSpace(20);
    doc.setTextColor(2, 132, 199);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.text('PARECER CLÍNICO FARMACÊUTICO', margin, y);
    y += 5;

    // Summary
    if (analysis.interventionSummary) {
      const summaryLines = doc.splitTextToSize(safeText(analysis.interventionSummary), contentWidth - 8);
      const boxH = summaryLines.length * 4.5 + 6;
      ensureSpace(boxH + 4);
      doc.setFillColor(241, 245, 249);
      doc.setDrawColor(203, 213, 225);
      doc.roundedRect(margin, y, contentWidth, boxH, 2, 2, 'FD');
      doc.setTextColor(30, 41, 59);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.text(summaryLines, margin + 4, y + 5);
      y += boxH + 5;
    }

    // Allergy Alerts
    if (Array.isArray(analysis.allergyRisks) && analysis.allergyRisks.length > 0) {
      ensureSpace(16);
      doc.setTextColor(190, 18, 60);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.text('ALERTAS CRÍTICOS DE ALERGIA:', margin, y);
      y += 4;

      analysis.allergyRisks.forEach((ar: any) => {
        const title = `• ${safeText(ar.drug)}: ${safeText(ar.allergyMatch || ar.issue)}`;
        const rec = `Conduta: ${safeText(ar.recommendation || ar.suggestion)}`;
        const lines = doc.splitTextToSize(`${title}\n${rec}`, contentWidth - 8);
        const boxH = lines.length * 4.5 + 6;
        ensureSpace(boxH + 3);
        doc.setFillColor(255, 241, 242);
        doc.setDrawColor(244, 63, 94);
        doc.roundedRect(margin, y, contentWidth, boxH, 2, 2, 'FD');
        doc.setTextColor(159, 18, 57);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(8.5);
        doc.text(lines, margin + 4, y + 5);
        y += boxH + 3;
      });
      y += 2;
    }

    // Drug Interactions
    ensureSpace(14);
    doc.setTextColor(15, 23, 42);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.text('INTERAÇÕES MEDICAMENTOSAS:', margin, y);
    y += 4;

    if (Array.isArray(analysis.interactions) && analysis.interactions.length > 0) {
      analysis.interactions.forEach((inter: any) => {
        const d1 = safeText(inter.drug1);
        const d2 = safeText(inter.drug2);
        const sev = safeText(inter.severity || 'Moderada').toUpperCase();
        const desc = safeText(inter.description);
        const mgmt = safeText(inter.management);

        const headerText = `${d1}${d2 ? ' + ' + d2 : ''}  [${sev}]`;
        const bodyText = `${desc}${mgmt ? '\nConduta Farmacêutica: ' + mgmt : ''}`;
        const bodyLines = doc.splitTextToSize(bodyText, contentWidth - 8);
        const boxH = bodyLines.length * 4.3 + 11;

        ensureSpace(boxH + 3);
        const isSevere = sev.toLowerCase().includes('grave');
        if (isSevere) {
          doc.setFillColor(255, 241, 242);
          doc.setDrawColor(251, 113, 133);
        } else {
          doc.setFillColor(255, 251, 235);
          doc.setDrawColor(252, 211, 77);
        }
        doc.roundedRect(margin, y, contentWidth, boxH, 2, 2, 'FD');

        doc.setTextColor(15, 23, 42);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(9);
        doc.text(headerText, margin + 4, y + 5.5);

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8.5);
        doc.setTextColor(51, 65, 85);
        doc.text(bodyLines, margin + 4, y + 10.5);

        y += boxH + 3;
      });
    } else {
      ensureSpace(12);
      doc.setFillColor(236, 253, 245);
      doc.setDrawColor(167, 243, 208);
      doc.roundedRect(margin, y, contentWidth, 10, 2, 2, 'FD');
      doc.setTextColor(6, 95, 70);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8.5);
      doc.text('Nenhuma interação medicamentosa clinicamente significativa detectada entre os itens.', margin + 4, y + 6.3);
      y += 14;
    }

    // ANVISA Retention Rules
    if (analysis.prescriptionRetention) {
      ensureSpace(16);
      doc.setTextColor(15, 23, 42);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.text('EXIGÊNCIA E RETENÇÃO DE RECEITA (ANVISA):', margin, y);
      y += 4;

      let retentionText = '';
      if (typeof analysis.prescriptionRetention === 'string') {
        retentionText = analysis.prescriptionRetention;
      } else if (Array.isArray(analysis.prescriptionRetention)) {
        retentionText = analysis.prescriptionRetention
          .map(
            (r: any) =>
              `• ${safeText(r.drug || 'Medicamento')}: ${safeText(r.documentType || r.regulation)}${
                r.note ? ' (' + safeText(r.note) + ')' : ''
              }`
          )
          .join('\n');
      } else {
        retentionText = safeText(analysis.prescriptionRetention);
      }

      const retLines = doc.splitTextToSize(retentionText, contentWidth - 8);
      const boxH = retLines.length * 4.3 + 6;
      ensureSpace(boxH + 4);
      doc.setFillColor(248, 250, 252);
      doc.setDrawColor(203, 213, 225);
      doc.roundedRect(margin, y, contentWidth, boxH, 2, 2, 'FD');
      doc.setTextColor(51, 65, 85);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8.5);
      doc.text(retLines, margin + 4, y + 5);
      y += boxH + 5;
    }

    // Therapeutic Adjustments
    if (analysis.therapeuticAdjustments) {
      ensureSpace(16);
      doc.setTextColor(2, 132, 199);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.text('AJUSTES TERAPÊUTICOS & REVISÃO POSOLÓGICA:', margin, y);
      y += 4;

      const adjList = Array.isArray(analysis.therapeuticAdjustments)
        ? analysis.therapeuticAdjustments.map((a: any) => `• ${safeText(a)}`).join('\n')
        : `• ${safeText(analysis.therapeuticAdjustments)}`;

      const adjLines = doc.splitTextToSize(adjList, contentWidth - 8);
      const boxH = adjLines.length * 4.3 + 6;
      ensureSpace(boxH + 4);
      doc.setFillColor(240, 249, 255);
      doc.setDrawColor(186, 230, 253);
      doc.roundedRect(margin, y, contentWidth, boxH, 2, 2, 'FD');
      doc.setTextColor(12, 74, 110);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8.5);
      doc.text(adjLines, margin + 4, y + 5);
      y += boxH + 5;
    }
  }

  addDocumentFooter(doc);
  const filePatient = sanitizeFilename(prescription.patientName || 'paciente');
  doc.save(`prescricao_farmaclick_${filePatient}.pdf`);
}

export function exportAllPrescriptionsToPDF(
  prescriptions: SavedPrescription[],
  professionalName?: string
): void {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const pageWidth = 210;
  const margin = 14;
  const contentWidth = pageWidth - margin * 2;
  let y = 14;

  const ensureSpace = (neededHeight: number) => {
    if (y + neededHeight > 272) {
      doc.addPage();
      y = 16;
    }
  };

  doc.setFillColor(2, 132, 199);
  doc.roundedRect(margin, y, contentWidth, 22, 3, 3, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.text('FarmaClick — Relatório Geral de Receitas & Prescrições', margin + 5, y + 9);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text(
    `Total de Receitas Arquivadas: ${prescriptions.length}   |   Emitido por: ${
      professionalName || 'Profissional de Saúde'
    }   |   Data: ${new Date().toLocaleDateString('pt-BR')}`,
    margin + 5,
    y + 16
  );

  y += 28;

  prescriptions.forEach((presc, idx) => {
    const medsText = presc.items
      .map((i) => `${i.drugName} (${i.dose} - ${i.route} - ${i.frequency})`)
      .join('; ');
    const medsLines = doc.splitTextToSize(`Medicamentos: ${medsText || 'Nenhum'}`, contentWidth - 8);
    const summaryText = presc.analysisResult?.interventionSummary
      ? `Parecer: ${safeText(presc.analysisResult.interventionSummary)}`
      : '';
    const summaryLines = summaryText ? doc.splitTextToSize(summaryText, contentWidth - 8) : [];
    const boxH = 18 + medsLines.length * 4.2 + summaryLines.length * 4.2;

    ensureSpace(boxH + 4);
    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(203, 213, 225);
    doc.roundedRect(margin, y, contentWidth, boxH, 2, 2, 'FD');

    doc.setTextColor(15, 23, 42);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.text(
      `${idx + 1}. Paciente: ${presc.patientName || 'Não informado'}${
        presc.patientBed ? ' • Leito: ' + presc.patientBed : ''
      }${presc.patientWard ? ' • Setor: ' + presc.patientWard : ''}`,
      margin + 4,
      y + 6
    );

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    doc.text(
      `Data: ${presc.createdAt}   |   Prescritor: ${presc.prescriberName || '—'}   |   Alergias: ${
        presc.allergies?.length ? presc.allergies.join(', ') : 'Nenhuma'
      }`,
      margin + 4,
      y + 11
    );

    doc.setTextColor(30, 41, 59);
    doc.setFontSize(8.5);
    doc.text(medsLines, margin + 4, y + 16);

    if (summaryLines.length > 0) {
      doc.setTextColor(2, 132, 199);
      doc.text(summaryLines, margin + 4, y + 16 + medsLines.length * 4.2);
    }

    y += boxH + 4;
  });

  addDocumentFooter(doc);
  doc.save(`relatorio_receitas_farmaclick_${new Date().toISOString().slice(0, 10)}.pdf`);
}

export function exportInterventionToPDF(
  intervention: InterventionLog,
  userProfile?: { name: string; profession: string; workplace: string }
): void {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const margin = 14;
  const contentWidth = 182;
  let y = 14;

  // Header
  doc.setFillColor(2, 132, 199);
  doc.roundedRect(margin, y, contentWidth, 24, 3, 3, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.text('FarmaClick — Termo de Intervenção Farmacêutica', margin + 5, y + 9);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text(
    `Unidade / Local: ${userProfile?.workplace || intervention.ward || 'Farmácia Clínica'}   |   Data: ${
      intervention.timestamp
    }`,
    margin + 5,
    y + 16
  );
  doc.text('Documento oficial para prontuário clínico e comunicação multiprofissional.', margin + 5, y + 21);

  y += 32;

  // Patient & Status Box
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(203, 213, 225);
  doc.roundedRect(margin, y, contentWidth, 26, 2, 2, 'FD');

  doc.setTextColor(15, 23, 42);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text(`Paciente / Leito: ${intervention.patientName}`, margin + 4, y + 7);
  doc.text(`Status da Intervenção: ${intervention.status.toUpperCase()}`, margin + contentWidth - 4, y + 7, {
    align: 'right'
  });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(51, 65, 85);
  doc.text(`Setor / Ala: ${intervention.ward}`, margin + 4, y + 14);
  doc.text(`Profissional Responsável: ${intervention.pharmacistName}`, margin + 4, y + 21);

  y += 34;

  // Medications involved
  doc.setTextColor(2, 132, 199);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10.5);
  doc.text('MEDICAMENTOS ENVOLVIDOS', margin, y);
  y += 4;

  const medsStr =
    intervention.medications && intervention.medications.length > 0
      ? intervention.medications.join('  •  ')
      : 'Não especificado';
  const medLines = doc.splitTextToSize(medsStr, contentWidth - 8);
  const medBoxH = medLines.length * 5 + 6;
  doc.setFillColor(241, 245, 249);
  doc.setDrawColor(203, 213, 225);
  doc.roundedRect(margin, y, contentWidth, medBoxH, 2, 2, 'FD');
  doc.setTextColor(15, 23, 42);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.text(medLines, margin + 4, y + 6);

  y += medBoxH + 8;

  // Intervention Description
  doc.setTextColor(2, 132, 199);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10.5);
  doc.text('CONDUTA / INTERVENÇÃO FARMACÊUTICA REALIZADA', margin, y);
  y += 4;

  const intLines = doc.splitTextToSize(intervention.interventions.join('\n\n'), contentWidth - 8);
  const intBoxH = Math.max(22, intLines.length * 4.8 + 8);
  doc.setFillColor(240, 249, 255);
  doc.setDrawColor(186, 230, 253);
  doc.roundedRect(margin, y, contentWidth, intBoxH, 2, 2, 'FD');
  doc.setTextColor(12, 74, 110);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9.5);
  doc.text(intLines, margin + 4, y + 6);

  y += intBoxH + 8;

  // Clinical Outcome
  doc.setTextColor(15, 23, 42);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10.5);
  doc.text('DESFECHO CLÍNICO', margin, y);
  y += 4;

  const outLines = doc.splitTextToSize(intervention.clinicalOutcome || 'Aguardando evolução.', contentWidth - 8);
  const outBoxH = Math.max(16, outLines.length * 4.8 + 8);
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(203, 213, 225);
  doc.roundedRect(margin, y, contentWidth, outBoxH, 2, 2, 'FD');
  doc.setTextColor(51, 65, 85);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9.5);
  doc.text(outLines, margin + 4, y + 6);

  y += outBoxH + 25;

  // Signature line
  if (y < 265) {
    doc.setDrawColor(148, 163, 184);
    doc.line(60, y, 150, y);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(30, 41, 59);
    doc.text(intervention.pharmacistName || userProfile?.name || 'Profissional Responsável', 105, y + 5, {
      align: 'center'
    });
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    doc.text(userProfile?.profession || 'Farmácia Clínica & Hospitalar', 105, y + 9.5, { align: 'center' });
  }

  addDocumentFooter(doc);
  const filePatient = sanitizeFilename(intervention.patientName);
  doc.save(`intervencao_farmaclick_${filePatient}.pdf`);
}

export function exportInterventionsReportToPDF(
  interventions: InterventionLog[],
  userProfile?: { name: string; profession: string; workplace: string }
): void {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const margin = 14;
  const contentWidth = 182;
  let y = 14;

  const ensureSpace = (neededHeight: number) => {
    if (y + neededHeight > 272) {
      doc.addPage();
      y = 16;
    }
  };

  // Header
  doc.setFillColor(2, 132, 199);
  doc.roundedRect(margin, y, contentWidth, 24, 3, 3, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.text('FarmaClick — Relatório Consolidado de Intervenções Clínicas', margin + 5, y + 9);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text(
    `Instituição: ${userProfile?.workplace || 'Farmácia Hospitalar & Clínica'}   |   Emitido por: ${
      userProfile?.name || 'Profissional'
    }`,
    margin + 5,
    y + 16
  );
  doc.text(`Data de Emissão: ${new Date().toLocaleString('pt-BR')}`, margin + 5, y + 21);

  y += 30;

  // Summary KPIs
  const total = interventions.length;
  const accepted = interventions.filter((i) => i.status === 'Aceita').length;
  const pending = interventions.filter((i) => i.status === 'Pendente').length;
  const rejected = interventions.filter((i) => i.status === 'Rejeitada').length;
  const acceptanceRate = total > 0 ? Math.round((accepted / total) * 100) : 0;

  doc.setFillColor(241, 245, 249);
  doc.setDrawColor(203, 213, 225);
  doc.roundedRect(margin, y, contentWidth, 16, 2, 2, 'FD');
  doc.setTextColor(15, 23, 42);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.text(`Total de Intervenções: ${total}`, margin + 5, y + 6.5);
  doc.setTextColor(6, 95, 70);
  doc.text(`Aceitas: ${accepted} (${acceptanceRate}%)`, margin + 58, y + 6.5);
  doc.setTextColor(180, 83, 9);
  doc.text(`Pendentes: ${pending}`, margin + 108, y + 6.5);
  doc.setTextColor(190, 18, 60);
  doc.text(`Rejeitadas: ${rejected}`, margin + 148, y + 6.5);

  doc.setTextColor(71, 85, 105);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.text(
    'Indicador de acompanhamento farmacoterapêutico para auditoria clínica, qualidade hospitalar e arquivamento.',
    margin + 5,
    y + 12.5
  );

  y += 22;

  interventions.forEach((item, index) => {
    const medsText = `Medicamentos: ${item.medications.join(', ') || 'Não informado'}`;
    const condutaText = `Conduta: ${item.interventions.join(' ')}`;
    const desfechoText = `Desfecho: ${item.clinicalOutcome}`;

    const medLines = doc.splitTextToSize(medsText, contentWidth - 8);
    const condutaLines = doc.splitTextToSize(condutaText, contentWidth - 8);
    const desfechoLines = doc.splitTextToSize(desfechoText, contentWidth - 8);

    const boxH = 14 + (medLines.length + condutaLines.length + desfechoLines.length) * 4.3;
    ensureSpace(boxH + 4);

    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(203, 213, 225);
    doc.roundedRect(margin, y, contentWidth, boxH, 2, 2, 'FD');

    doc.setTextColor(15, 23, 42);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9.5);
    doc.text(`${index + 1}. ${item.patientName}  (${item.ward})`, margin + 4, y + 6);

    // Status label on the right
    if (item.status === 'Aceita') doc.setTextColor(6, 95, 70);
    else if (item.status === 'Pendente') doc.setTextColor(180, 83, 9);
    else doc.setTextColor(190, 18, 60);
    doc.setFontSize(8.5);
    doc.text(`[${item.status.toUpperCase()}]`, margin + contentWidth - 4, y + 6, { align: 'right' });

    doc.setTextColor(100, 116, 139);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.8);
    doc.text(`Data: ${item.timestamp}   |   Responsável: ${item.pharmacistName}`, margin + 4, y + 10.5);

    let lineY = y + 15;
    doc.setTextColor(30, 41, 59);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.text(medLines, margin + 4, lineY);
    lineY += medLines.length * 4.3;

    doc.setFont('helvetica', 'normal');
    doc.setTextColor(12, 74, 110);
    doc.text(condutaLines, margin + 4, lineY);
    lineY += condutaLines.length * 4.3;

    doc.setTextColor(71, 85, 105);
    doc.text(desfechoLines, margin + 4, lineY);

    y += boxH + 4;
  });

  addDocumentFooter(doc);
  doc.save(`relatorio_intervencoes_farmaclick_${new Date().toISOString().slice(0, 10)}.pdf`);
}
