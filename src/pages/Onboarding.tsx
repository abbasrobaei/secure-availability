import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { toast } from "sonner";
import { SignaturePad, SignaturePadRef } from "@/components/SignaturePad";
import { generatePersonalDataPDF, generateRulesPDF } from "@/lib/pdfGenerator";
import { format, subYears, isAfter } from "date-fns";
import { de } from "date-fns/locale";
import { CalendarIcon, CheckCircle, ArrowRight, ArrowLeft, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { z } from "zod";

const personalDataSchema = z.object({
  salutation: z.string().min(1, "Anrede ist erforderlich"),
  firstName: z.string().min(1, "Vorname ist erforderlich").regex(/^[a-zA-ZäöüÄÖÜß\s-]+$/, "Nur Buchstaben erlaubt"),
  lastName: z.string().min(1, "Nachname ist erforderlich").regex(/^[a-zA-ZäöüÄÖÜß\s-]+$/, "Nur Buchstaben erlaubt"),
  birthDate: z.date({ required_error: "Geburtsdatum ist erforderlich" }),
  birthPlace: z.string().min(1, "Geburtsort ist erforderlich"),
  nationality: z.string().min(1, "Nationalität ist erforderlich"),
  street: z.string().min(1, "Straße ist erforderlich"),
  houseNumber: z.string().min(1, "Hausnummer ist erforderlich").regex(/^[a-zA-Z0-9\s-]+$/, "Ungültige Hausnummer"),
  postalCode: z.string().regex(/^\d{5}$/, "PLZ muss 5-stellig sein"),
  city: z.string().min(1, "Ort ist erforderlich"),
  socialSecurityNumber: z.string().regex(/^\d{2}\s?\d{6}\s?[A-Z]\s?\d{3}$/, "Ungültige Sozialversicherungsnummer"),
  taxId: z.string().regex(/^\d{11}$/, "Steuer-ID muss 11-stellig sein"),
  taxClass: z.string().min(1, "Steuerklasse ist erforderlich"),
  healthInsurance: z.string().min(1, "Krankenversicherung ist erforderlich"),
  bankName: z.string().min(1, "Bankname ist erforderlich"),
  iban: z.string().regex(/^DE\d{2}\s?\d{4}\s?\d{4}\s?\d{4}\s?\d{4}\s?\d{2}$/, "Ungültige IBAN"),
});

const nationalities = [
  "Deutsch", "Türkisch", "Polnisch", "Russisch", "Italienisch", "Griechisch",
  "Kroatisch", "Serbisch", "Rumänisch", "Bulgarisch", "Spanisch", "Portugiesisch",
  "Französisch", "Niederländisch", "Österreichisch", "Schweizer", "Syrisch",
  "Afghanisch", "Irakisch", "Iranisch", "Ukrainisch", "Andere"
];

const Onboarding = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [userFullName, setUserFullName] = useState("");
  const signaturePadRef1 = useRef<SignaturePadRef>(null);
  const signaturePadRef2 = useRef<SignaturePadRef>(null);
  const [hasSignature1, setHasSignature1] = useState(false);
  const [hasSignature2, setHasSignature2] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const [personalData, setPersonalData] = useState({
    salutation: "",
    firstName: "",
    lastName: "",
    birthDate: undefined as Date | undefined,
    birthPlace: "",
    nationality: "",
    street: "",
    houseNumber: "",
    postalCode: "",
    city: "",
    socialSecurityNumber: "",
    taxId: "",
    taxClass: "",
    healthInsurance: "",
    bankName: "",
    iban: "",
  });

  const [rulesData, setRulesData] = useState({
    location: "",
  });

  useEffect(() => {
    checkOnboardingStatus();
  }, []);

  const checkOnboardingStatus = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
      navigate("/login");
      return;
    }

    setUserId(session.user.id);

    const { data: profile, error } = await supabase
      .from("profiles")
      .select("first_name, last_name, onboarding_completed, personal_data_completed, rules_acknowledged")
      .eq("id", session.user.id)
      .single();

    if (error) {
      console.error("Error fetching profile:", error);
      setLoading(false);
      return;
    }

    setUserFullName(`${profile.first_name || ""} ${profile.last_name || ""}`.trim());
    setPersonalData(prev => ({
      ...prev,
      firstName: profile.first_name || "",
      lastName: profile.last_name || ""
    }));

    if (profile.onboarding_completed) {
      navigate("/dashboard");
      return;
    }

    if (profile.personal_data_completed && !profile.rules_acknowledged) {
      setStep(2);
    } else if (profile.personal_data_completed && profile.rules_acknowledged) {
      setStep(3);
    }

    setLoading(false);
  };

  const validatePersonalData = () => {
    try {
      personalDataSchema.parse(personalData);
      
      // Age validation (16+)
      const minAge = subYears(new Date(), 16);
      if (personalData.birthDate && isAfter(personalData.birthDate, minAge)) {
        setErrors({ birthDate: "Sie müssen mindestens 16 Jahre alt sein" });
        return false;
      }

      if (signaturePadRef1.current?.isEmpty()) {
        setErrors({ signature: "Unterschrift ist erforderlich" });
        return false;
      }

      setErrors({});
      return true;
    } catch (error) {
      if (error instanceof z.ZodError) {
        const newErrors: Record<string, string> = {};
        error.errors.forEach(err => {
          if (err.path[0]) {
            newErrors[err.path[0].toString()] = err.message;
          }
        });
        setErrors(newErrors);
      }
      return false;
    }
  };

  const handleStep1Submit = async () => {
    if (!validatePersonalData()) {
      toast.error("Bitte alle Felder korrekt ausfüllen");
      return;
    }

    setSubmitting(true);
    try {
      const signatureDataUrl = signaturePadRef1.current?.toDataURL() || "";
      
      // Generate PDF
      const pdfBlob = generatePersonalDataPDF({
        ...personalData,
        firstName: personalData.firstName,
        lastName: personalData.lastName,
        birthDate: personalData.birthDate ? format(personalData.birthDate, "dd.MM.yyyy") : "",
        signatureDataUrl,
        signatureDate: format(new Date(), "dd.MM.yyyy"),
      });

      // Upload PDF to storage
      const { error: uploadError } = await supabase.storage
        .from("onboarding-documents")
        .upload(`${userId}/personalstammdaten_${userId}.pdf`, pdfBlob, {
          contentType: "application/pdf",
          upsert: true,
        });

      if (uploadError) throw uploadError;

      // Update profile
      const { error: updateError } = await supabase
        .from("profiles")
        .update({
          personal_data_completed: true,
          salutation: personalData.salutation,
          birth_date: personalData.birthDate?.toISOString().split("T")[0],
          birth_place: personalData.birthPlace,
          nationality: personalData.nationality,
          street: personalData.street,
          house_number: personalData.houseNumber,
          postal_code: personalData.postalCode,
          city: personalData.city,
          social_security_number: personalData.socialSecurityNumber,
          tax_id: personalData.taxId,
          tax_class: personalData.taxClass,
          health_insurance: personalData.healthInsurance,
          bank_name: personalData.bankName,
          iban: personalData.iban,
        })
        .eq("id", userId);

      if (updateError) throw updateError;

      toast.success("Personalstammdaten gespeichert");
      setStep(2);
    } catch (error) {
      console.error("Error:", error);
      toast.error("Fehler beim Speichern");
    } finally {
      setSubmitting(false);
    }
  };

  const handleStep2Submit = async () => {
    if (!rulesData.location) {
      setErrors({ location: "Ort ist erforderlich" });
      toast.error("Bitte den Ort eingeben");
      return;
    }

    if (signaturePadRef2.current?.isEmpty()) {
      setErrors({ signature2: "Unterschrift ist erforderlich" });
      toast.error("Bitte unterschreiben Sie");
      return;
    }

    setSubmitting(true);
    try {
      const signatureDataUrl = signaturePadRef2.current?.toDataURL() || "";
      
      // Generate PDF
      const pdfBlob = generateRulesPDF({
        fullName: userFullName || `${personalData.firstName} ${personalData.lastName}`,
        location: rulesData.location,
        date: format(new Date(), "dd.MM.yyyy"),
        signatureDataUrl,
      });

      // Upload PDF to storage
      const { error: uploadError } = await supabase.storage
        .from("onboarding-documents")
        .upload(`${userId}/strafe_katalog_${userId}.pdf`, pdfBlob, {
          contentType: "application/pdf",
          upsert: true,
        });

      if (uploadError) throw uploadError;

      // Update profile - complete onboarding
      const { error: updateError } = await supabase
        .from("profiles")
        .update({
          rules_acknowledged: true,
          onboarding_completed: true,
        })
        .eq("id", userId);

      if (updateError) throw updateError;

      toast.success("Onboarding abgeschlossen!");
      setStep(3);
    } catch (error) {
      console.error("Error:", error);
      toast.error("Fehler beim Speichern");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted py-8 px-4">
      <div className="container mx-auto max-w-3xl">
        {/* Progress Header */}
        <Card className="p-6 bg-card border-border mb-6">
          <h1 className="text-2xl font-bold text-foreground mb-4">Willkommen bei Lockaly</h1>
          <div className="space-y-2">
            <div className="flex justify-between text-sm text-muted-foreground">
              <span>Fortschritt</span>
              <span>Schritt {step} von 2</span>
            </div>
            <Progress value={step === 3 ? 100 : (step - 1) * 50 + 25} className="h-2" />
            <div className="flex justify-between text-xs text-muted-foreground mt-2">
              <span className={cn("transition-colors", step >= 1 && "text-primary font-medium")}>
                Personalstammdaten
              </span>
              <span className={cn("transition-colors", step >= 2 && "text-primary font-medium")}>
                Belehrung & Strafe-Katalog
              </span>
              <span className={cn("transition-colors", step === 3 && "text-primary font-medium")}>
                Fertig
              </span>
            </div>
          </div>
        </Card>

        {/* Step 1: Personal Data */}
        {step === 1 && (
          <Card className="p-6 bg-card border-border">
            <h2 className="text-xl font-bold text-foreground mb-6">
              Schritt 1 von 2 – Personalstammdaten
            </h2>
            
            <div className="space-y-6">
              {/* Personal Info */}
              <div className="grid md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label className="text-foreground">Anrede *</Label>
                  <Select value={personalData.salutation} onValueChange={v => setPersonalData(p => ({ ...p, salutation: v }))}>
                    <SelectTrigger className={cn("bg-muted border-border", errors.salutation && "border-destructive")}>
                      <SelectValue placeholder="Auswählen" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Herr">Herr</SelectItem>
                      <SelectItem value="Frau">Frau</SelectItem>
                      <SelectItem value="Divers">Divers</SelectItem>
                    </SelectContent>
                  </Select>
                  {errors.salutation && <p className="text-xs text-destructive">{errors.salutation}</p>}
                </div>

                <div className="space-y-2">
                  <Label className="text-foreground">Vorname *</Label>
                  <Input
                    value={personalData.firstName}
                    onChange={e => setPersonalData(p => ({ ...p, firstName: e.target.value }))}
                    className={cn("bg-muted border-border", errors.firstName && "border-destructive")}
                  />
                  {errors.firstName && <p className="text-xs text-destructive">{errors.firstName}</p>}
                </div>

                <div className="space-y-2">
                  <Label className="text-foreground">Nachname *</Label>
                  <Input
                    value={personalData.lastName}
                    onChange={e => setPersonalData(p => ({ ...p, lastName: e.target.value }))}
                    className={cn("bg-muted border-border", errors.lastName && "border-destructive")}
                  />
                  {errors.lastName && <p className="text-xs text-destructive">{errors.lastName}</p>}
                </div>
              </div>

              <div className="grid md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label className="text-foreground">Geburtsdatum *</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal bg-muted border-border",
                          !personalData.birthDate && "text-muted-foreground",
                          errors.birthDate && "border-destructive"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {personalData.birthDate ? format(personalData.birthDate, "dd.MM.yyyy", { locale: de }) : "Auswählen"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={personalData.birthDate}
                        onSelect={d => setPersonalData(p => ({ ...p, birthDate: d }))}
                        disabled={d => d > new Date() || d < new Date("1940-01-01")}
                        initialFocus
                        className="pointer-events-auto"
                        locale={de}
                      />
                    </PopoverContent>
                  </Popover>
                  {errors.birthDate && <p className="text-xs text-destructive">{errors.birthDate}</p>}
                </div>

                <div className="space-y-2">
                  <Label className="text-foreground">Geburtsort *</Label>
                  <Input
                    value={personalData.birthPlace}
                    onChange={e => setPersonalData(p => ({ ...p, birthPlace: e.target.value }))}
                    className={cn("bg-muted border-border", errors.birthPlace && "border-destructive")}
                  />
                  {errors.birthPlace && <p className="text-xs text-destructive">{errors.birthPlace}</p>}
                </div>

                <div className="space-y-2">
                  <Label className="text-foreground">Nationalität *</Label>
                  <Select value={personalData.nationality} onValueChange={v => setPersonalData(p => ({ ...p, nationality: v }))}>
                    <SelectTrigger className={cn("bg-muted border-border", errors.nationality && "border-destructive")}>
                      <SelectValue placeholder="Auswählen" />
                    </SelectTrigger>
                    <SelectContent>
                      {nationalities.map(n => (
                        <SelectItem key={n} value={n}>{n}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors.nationality && <p className="text-xs text-destructive">{errors.nationality}</p>}
                </div>
              </div>

              {/* Address */}
              <div className="grid md:grid-cols-4 gap-4">
                <div className="md:col-span-2 space-y-2">
                  <Label className="text-foreground">Straße *</Label>
                  <Input
                    value={personalData.street}
                    onChange={e => setPersonalData(p => ({ ...p, street: e.target.value }))}
                    className={cn("bg-muted border-border", errors.street && "border-destructive")}
                  />
                  {errors.street && <p className="text-xs text-destructive">{errors.street}</p>}
                </div>

                <div className="space-y-2">
                  <Label className="text-foreground">Hausnummer *</Label>
                  <Input
                    value={personalData.houseNumber}
                    onChange={e => setPersonalData(p => ({ ...p, houseNumber: e.target.value }))}
                    className={cn("bg-muted border-border", errors.houseNumber && "border-destructive")}
                  />
                  {errors.houseNumber && <p className="text-xs text-destructive">{errors.houseNumber}</p>}
                </div>

                <div className="space-y-2">
                  <Label className="text-foreground">PLZ *</Label>
                  <Input
                    value={personalData.postalCode}
                    onChange={e => setPersonalData(p => ({ ...p, postalCode: e.target.value.replace(/\D/g, "").slice(0, 5) }))}
                    placeholder="12345"
                    className={cn("bg-muted border-border", errors.postalCode && "border-destructive")}
                  />
                  {errors.postalCode && <p className="text-xs text-destructive">{errors.postalCode}</p>}
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-foreground">Ort *</Label>
                <Input
                  value={personalData.city}
                  onChange={e => setPersonalData(p => ({ ...p, city: e.target.value }))}
                  className={cn("bg-muted border-border", errors.city && "border-destructive")}
                />
                {errors.city && <p className="text-xs text-destructive">{errors.city}</p>}
              </div>

              {/* Social Security & Tax */}
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-foreground">Sozialversicherungsnummer *</Label>
                  <Input
                    value={personalData.socialSecurityNumber}
                    onChange={e => setPersonalData(p => ({ ...p, socialSecurityNumber: e.target.value.toUpperCase() }))}
                    placeholder="12 123456 A 123"
                    className={cn("bg-muted border-border", errors.socialSecurityNumber && "border-destructive")}
                  />
                  {errors.socialSecurityNumber && <p className="text-xs text-destructive">{errors.socialSecurityNumber}</p>}
                </div>

                <div className="space-y-2">
                  <Label className="text-foreground">Steuer-ID *</Label>
                  <Input
                    value={personalData.taxId}
                    onChange={e => setPersonalData(p => ({ ...p, taxId: e.target.value.replace(/\D/g, "").slice(0, 11) }))}
                    placeholder="12345678901"
                    className={cn("bg-muted border-border", errors.taxId && "border-destructive")}
                  />
                  {errors.taxId && <p className="text-xs text-destructive">{errors.taxId}</p>}
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-foreground">Steuerklasse *</Label>
                  <Select value={personalData.taxClass} onValueChange={v => setPersonalData(p => ({ ...p, taxClass: v }))}>
                    <SelectTrigger className={cn("bg-muted border-border", errors.taxClass && "border-destructive")}>
                      <SelectValue placeholder="Auswählen" />
                    </SelectTrigger>
                    <SelectContent>
                      {["1", "2", "3", "4", "5", "6"].map(c => (
                        <SelectItem key={c} value={c}>Steuerklasse {c}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors.taxClass && <p className="text-xs text-destructive">{errors.taxClass}</p>}
                </div>

                <div className="space-y-2">
                  <Label className="text-foreground">Krankenversicherung *</Label>
                  <Input
                    value={personalData.healthInsurance}
                    onChange={e => setPersonalData(p => ({ ...p, healthInsurance: e.target.value }))}
                    className={cn("bg-muted border-border", errors.healthInsurance && "border-destructive")}
                  />
                  {errors.healthInsurance && <p className="text-xs text-destructive">{errors.healthInsurance}</p>}
                </div>
              </div>

              {/* Bank Details */}
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-foreground">Bankname *</Label>
                  <Input
                    value={personalData.bankName}
                    onChange={e => setPersonalData(p => ({ ...p, bankName: e.target.value }))}
                    className={cn("bg-muted border-border", errors.bankName && "border-destructive")}
                  />
                  {errors.bankName && <p className="text-xs text-destructive">{errors.bankName}</p>}
                </div>

                <div className="space-y-2">
                  <Label className="text-foreground">IBAN *</Label>
                  <Input
                    value={personalData.iban}
                    onChange={e => setPersonalData(p => ({ ...p, iban: e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 22) }))}
                    placeholder="DE89370400440532013000"
                    className={cn("bg-muted border-border", errors.iban && "border-destructive")}
                  />
                  {errors.iban && <p className="text-xs text-destructive">{errors.iban}</p>}
                </div>
              </div>

              {/* Signature */}
              <div className="space-y-2">
                <Label className="text-foreground">Unterschrift *</Label>
                <SignaturePad ref={signaturePadRef1} onSignatureChange={isEmpty => setHasSignature1(!isEmpty)} />
                {errors.signature && <p className="text-xs text-destructive">{errors.signature}</p>}
              </div>

              <Button
                onClick={handleStep1Submit}
                disabled={submitting}
                className="w-full bg-primary hover:bg-primary/90"
                size="lg"
              >
                {submitting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <ArrowRight className="w-4 h-4 mr-2" />}
                Weiter zu Schritt 2
              </Button>
            </div>
          </Card>
        )}

        {/* Step 2: Rules Acknowledgment */}
        {step === 2 && (
          <Card className="p-6 bg-card border-border">
            <h2 className="text-xl font-bold text-foreground mb-6">
              Schritt 2 von 2 – Belehrung & Strafe-Katalog
            </h2>

            <div className="space-y-6">
              <div className="bg-muted/50 rounded-lg p-4 border border-border max-h-96 overflow-y-auto">
                <h3 className="font-bold text-foreground mb-4">
                  Belehrung und Verpflichtungserklärung für Mitarbeiter
                </h3>
                
                <p className="text-sm text-muted-foreground mb-4">
                  Ich, <strong>{userFullName || `${personalData.firstName} ${personalData.lastName}`}</strong>, verpflichte mich, folgende Arbeitsregeln einzuhalten:
                </p>

                <div className="space-y-4 text-sm">
                  <div>
                    <h4 className="font-semibold text-foreground">1. Pünktlichkeit</h4>
                    <p className="text-muted-foreground">Verspätungen sind zu vermeiden.</p>
                    <p className="text-destructive font-medium">Strafe: 20 € pro angefangene 15 Minuten</p>
                  </div>

                  <div>
                    <h4 className="font-semibold text-foreground">2. Dienstabsagen</h4>
                    <p className="text-muted-foreground">Absage {"<"} 24h verboten. Im Krankheitsfall sofort melden.</p>
                    <p className="text-destructive font-medium">Strafe: 70 €</p>
                  </div>

                  <div>
                    <h4 className="font-semibold text-foreground">3. Dienstende</h4>
                    <p className="text-muted-foreground">Arbeitsplatz erst verlassen, wenn Ablösung angekommen ist.</p>
                    <p className="text-destructive font-medium">Strafe: 120 €</p>
                  </div>

                  <div>
                    <h4 className="font-semibold text-foreground">4. Zutrittskontrolle</h4>
                    <p className="text-muted-foreground">Keine Freunde/Familie im Objekt.</p>
                    <p className="text-destructive font-medium">Strafe: 250 €</p>
                  </div>

                  <div>
                    <h4 className="font-semibold text-foreground">5. Verlassen des Objekts</h4>
                    <p className="text-muted-foreground">Nur mit Erlaubnis des Vorgesetzten.</p>
                    <p className="text-destructive font-medium">Strafe: 120 €</p>
                  </div>

                  <div>
                    <h4 className="font-semibold text-foreground">6. Dienstkleidung & Ausweise</h4>
                    <p className="text-muted-foreground">Komplette Dienstkleidung, Ausweis & ID mitführen.</p>
                    <p className="text-destructive font-medium">Strafe: 50 €</p>
                  </div>

                  <div>
                    <h4 className="font-semibold text-foreground">7. Übergabeprotokoll</h4>
                    <p className="text-muted-foreground">Alles übergeben + Fotos in WhatsApp-Gruppe senden.</p>
                    <p className="text-destructive font-medium">Strafe: 20 €</p>
                  </div>

                  <div>
                    <h4 className="font-semibold text-foreground">8. Verschwiegenheitspflicht</h4>
                    <p className="text-muted-foreground">Keine Weitergabe vertraulicher Infos – auch nach Anstellung.</p>
                    <p className="text-destructive font-medium">Strafe: 250 €</p>
                  </div>

                  <div>
                    <h4 className="font-semibold text-foreground">9. Allgemeine Pflichten</h4>
                    <p className="text-muted-foreground">Anweisungen befolgen. Andere Verstöße:</p>
                    <p className="text-destructive font-medium">Strafe: 15–120 €</p>
                  </div>
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-foreground">Ort *</Label>
                  <Input
                    value={rulesData.location}
                    onChange={e => setRulesData(p => ({ ...p, location: e.target.value }))}
                    placeholder="z.B. Berlin"
                    className={cn("bg-muted border-border", errors.location && "border-destructive")}
                  />
                  {errors.location && <p className="text-xs text-destructive">{errors.location}</p>}
                </div>

                <div className="space-y-2">
                  <Label className="text-foreground">Datum</Label>
                  <Input
                    value={format(new Date(), "dd.MM.yyyy")}
                    disabled
                    className="bg-muted border-border"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-foreground">Unterschrift *</Label>
                <SignaturePad ref={signaturePadRef2} onSignatureChange={isEmpty => setHasSignature2(!isEmpty)} />
                {errors.signature2 && <p className="text-xs text-destructive">{errors.signature2}</p>}
              </div>

              <div className="flex gap-4">
                <Button
                  variant="outline"
                  onClick={() => setStep(1)}
                  className="flex-1"
                >
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Zurück
                </Button>
                <Button
                  onClick={handleStep2Submit}
                  disabled={submitting}
                  className="flex-1 bg-primary hover:bg-primary/90"
                >
                  {submitting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <CheckCircle className="w-4 h-4 mr-2" />}
                  Abschließen
                </Button>
              </div>
            </div>
          </Card>
        )}

        {/* Step 3: Completed */}
        {step === 3 && (
          <Card className="p-8 bg-card border-border text-center">
            <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-foreground mb-2">
              Fertig – Verfügbarkeit ist jetzt freigeschaltet
            </h2>
            <p className="text-muted-foreground mb-6">
              Sie haben alle erforderlichen Schritte abgeschlossen und können nun Ihre Verfügbarkeit eintragen.
            </p>
            <Button
              onClick={() => navigate("/dashboard")}
              className="bg-primary hover:bg-primary/90"
              size="lg"
            >
              Zum Dashboard
            </Button>
          </Card>
        )}
      </div>
    </div>
  );
};

export default Onboarding;
