import jsPDF from "jspdf";

interface PersonalDataPDFInput {
  salutation: string;
  firstName: string;
  lastName: string;
  birthDate: string;
  birthPlace: string;
  nationality: string;
  street: string;
  houseNumber: string;
  postalCode: string;
  city: string;
  socialSecurityNumber: string;
  taxId: string;
  taxClass: string;
  healthInsurance: string;
  bankName: string;
  iban: string;
  signatureDataUrl: string;
  signatureDate: string;
}

interface RulesPDFInput {
  fullName: string;
  location: string;
  date: string;
  signatureDataUrl: string;
}

export const generatePersonalDataPDF = (data: PersonalDataPDFInput): Blob => {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  let yPos = 20;

  // Title
  doc.setFontSize(18);
  doc.setFont("helvetica", "bold");
  doc.text("Personalstammdaten", pageWidth / 2, yPos, { align: "center" });
  yPos += 15;

  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");

  const addField = (label: string, value: string) => {
    doc.setFont("helvetica", "bold");
    doc.text(label + ":", 20, yPos);
    doc.setFont("helvetica", "normal");
    doc.text(value, 80, yPos);
    yPos += 8;
  };

  // Personal Info Section
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.text("Persönliche Daten", 20, yPos);
  yPos += 8;
  doc.setFontSize(10);

  addField("Anrede", data.salutation);
  addField("Vorname", data.firstName);
  addField("Nachname", data.lastName);
  addField("Geburtsdatum", data.birthDate);
  addField("Geburtsort", data.birthPlace);
  addField("Nationalität", data.nationality);

  yPos += 5;
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.text("Adresse", 20, yPos);
  yPos += 8;
  doc.setFontSize(10);

  addField("Straße", data.street);
  addField("Hausnummer", data.houseNumber);
  addField("PLZ", data.postalCode);
  addField("Ort", data.city);

  yPos += 5;
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.text("Sozialversicherung & Steuern", 20, yPos);
  yPos += 8;
  doc.setFontSize(10);

  addField("Sozialversicherungsnr.", data.socialSecurityNumber);
  addField("Steuer-ID", data.taxId);
  addField("Steuerklasse", data.taxClass);
  addField("Krankenversicherung", data.healthInsurance);

  yPos += 5;
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.text("Bankverbindung", 20, yPos);
  yPos += 8;
  doc.setFontSize(10);

  addField("Bankname", data.bankName);
  addField("IBAN", data.iban);

  // Signature
  yPos += 15;
  doc.setFontSize(10);
  doc.text("Datum: " + data.signatureDate, 20, yPos);
  yPos += 10;

  doc.text("Unterschrift:", 20, yPos);
  yPos += 5;

  if (data.signatureDataUrl) {
    doc.addImage(data.signatureDataUrl, "PNG", 20, yPos, 60, 25);
  }

  return doc.output("blob");
};

export const generateRulesPDF = (data: RulesPDFInput): Blob => {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  let yPos = 15;

  // Title
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.text("Belehrung und Verpflichtungserklärung für Mitarbeiter", pageWidth / 2, yPos, { align: "center" });
  yPos += 12;

  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text(`Ich, ${data.fullName}, verpflichte mich, folgende Arbeitsregeln einzuhalten:`, 20, yPos);
  yPos += 10;

  const rules = [
    { title: "1. Pünktlichkeit", desc: "Verspätungen sind zu vermeiden.", penalty: "Strafe: 20 € pro angefangene 15 Minuten" },
    { title: "2. Dienstabsagen", desc: "Absage < 24h verboten. Im Krankheitsfall sofort melden.", penalty: "Strafe: 70 €" },
    { title: "3. Dienstende", desc: "Arbeitsplatz erst verlassen, wenn Ablösung angekommen ist.", penalty: "Strafe: 120 €" },
    { title: "4. Zutrittskontrolle", desc: "Keine Freunde/Familie im Objekt.", penalty: "Strafe: 250 €" },
    { title: "5. Verlassen des Objekts", desc: "Nur mit Erlaubnis des Vorgesetzten.", penalty: "Strafe: 120 €" },
    { title: "6. Dienstkleidung & Ausweise", desc: "Komplette Dienstkleidung, Ausweis & ID mitführen.", penalty: "Strafe: 50 €" },
    { title: "7. Übergabeprotokoll", desc: "Alles übergeben + Fotos in WhatsApp-Gruppe senden.", penalty: "Strafe: 20 €" },
    { title: "8. Verschwiegenheitspflicht", desc: "Keine Weitergabe vertraulicher Infos – auch nach Anstellung.", penalty: "Strafe: 250 €" },
    { title: "9. Allgemeine Pflichten", desc: "Anweisungen befolgen. Andere Verstöße:", penalty: "Strafe: 15–120 €" },
  ];

  doc.setFontSize(9);
  rules.forEach((rule) => {
    doc.setFont("helvetica", "bold");
    doc.text(rule.title, 20, yPos);
    yPos += 5;
    doc.setFont("helvetica", "normal");
    doc.text(rule.desc, 25, yPos);
    yPos += 5;
    doc.setFont("helvetica", "italic");
    doc.text(rule.penalty, 25, yPos);
    yPos += 8;
  });

  yPos += 5;
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text("Mit meiner Unterschrift bestätige ich, dass ich die oben genannten Regeln", 20, yPos);
  yPos += 5;
  doc.text("gelesen, verstanden und akzeptiert habe.", 20, yPos);

  yPos += 15;
  doc.text(`Ort: ${data.location}`, 20, yPos);
  doc.text(`Datum: ${data.date}`, 100, yPos);

  yPos += 15;
  doc.text("Unterschrift:", 20, yPos);
  yPos += 5;

  if (data.signatureDataUrl) {
    doc.addImage(data.signatureDataUrl, "PNG", 20, yPos, 60, 25);
  }

  return doc.output("blob");
};
