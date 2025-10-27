import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Shield, Clock, UserCheck, Lock } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";

const Index = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted">
      <div className="container mx-auto px-4 py-16">
        <div className="absolute top-4 right-4">
          <LanguageSwitcher />
        </div>
        
        <div className="text-center mb-16 space-y-6">
          <div className="flex justify-center mb-6">
            <div className="p-4 bg-primary/10 rounded-2xl shadow-[var(--shadow-glow)]">
              <Shield className="w-16 h-16 text-primary" />
            </div>
          </div>
          <a 
            href="https://parsec-sicherheitsdienst.de/" 
            target="_blank" 
            rel="noopener noreferrer"
            className="text-5xl md:text-6xl font-bold text-foreground tracking-tight hover:text-primary transition-colors inline-block"
          >
            {t("companyName")}
          </a>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            {t("hero.subtitle")}
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto mb-16">
          <Card className="p-8 bg-card border-border hover:shadow-[var(--shadow-card)] transition-all duration-300 hover:scale-105">
            <div className="flex flex-col items-center text-center space-y-6">
              <div className="p-4 bg-primary/10 rounded-xl">
                <Clock className="w-12 h-12 text-primary" />
              </div>
              <h2 className="text-2xl font-bold text-foreground">{t("hero.title")}</h2>
              <p className="text-muted-foreground">
                {t("hero.subtitle")}
              </p>
              <Button 
                size="lg" 
                className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-semibold"
                onClick={() => navigate("/availability")}
              >
                <UserCheck className="mr-2 h-5 w-5" />
                {t("hero.title")}
              </Button>
            </div>
          </Card>

          <Card className="p-8 bg-card border-border hover:shadow-[var(--shadow-card)] transition-all duration-300 hover:scale-105">
            <div className="flex flex-col items-center text-center space-y-6">
              <div className="p-4 bg-secondary/10 rounded-xl">
                <Lock className="w-12 h-12 text-secondary" />
              </div>
              <h2 className="text-2xl font-bold text-foreground">{t("admin.title")}</h2>
              <p className="text-muted-foreground">
                Verwalten Sie alle Verfügbarkeiten zentral – mit Filteroptionen und Export-Funktionen.
              </p>
              <Button 
                size="lg" 
                variant="secondary"
                className="w-full bg-secondary hover:bg-secondary/90 text-secondary-foreground font-semibold"
                onClick={() => navigate("/admin/login")}
              >
                <Lock className="mr-2 h-5 w-5" />
                Admin-Login
              </Button>
            </div>
          </Card>
        </div>

        <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
          <Card className="p-6 bg-card/50 border-border">
            <div className="flex items-start space-x-4">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Shield className="w-6 h-6 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold text-foreground mb-2">Einfach & Schnell</h3>
                <p className="text-sm text-muted-foreground">
                  Keine Registrierung erforderlich – nur Telefonnummer eingeben
                </p>
              </div>
            </div>
          </Card>

          <Card className="p-6 bg-card/50 border-border">
            <div className="flex items-start space-x-4">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Clock className="w-6 h-6 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold text-foreground mb-2">Flexible Zeiten</h3>
                <p className="text-sm text-muted-foreground">
                  Wählen Sie Datum, Start- und Endzeit nach Ihren Möglichkeiten
                </p>
              </div>
            </div>
          </Card>

          <Card className="p-6 bg-card/50 border-border">
            <div className="flex items-start space-x-4">
              <div className="p-2 bg-primary/10 rounded-lg">
                <UserCheck className="w-6 h-6 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold text-foreground mb-2">Zentral Verwaltet</h3>
                <p className="text-sm text-muted-foreground">
                  Alle Einträge auf einen Blick im Admin-Dashboard
                </p>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Index;
