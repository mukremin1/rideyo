import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Shield, CheckCircle } from "lucide-react";
import { useState } from "react";

const insurancePackages = [
  {
    id: "basic",
    name: "Temel Sigorta",
    price: 550,
    features: [
      "Trafik Sigortası",
      "Zorunlu Mali Sorumluluk",
      "7/24 Yol Yardım",
    ],
  },
  {
    id: "standard",
    name: "Standart Sigorta",
    price: 750,
    features: [
      "Temel Sigorta + Tüm Hakları",
      "Kasko Sigortası",
      "Cam Kırılması Teminatı",
      "Mini Onarım Hizmeti",
    ],
    recommended: true,
  },
  {
    id: "premium",
    name: "Premium Sigorta",
    price: 950,
    features: [
      "Standart Sigorta + Tüm Hakları",
      "Tam Kasko",
      "Muafiyet İndirimi (%50)",
      "Yedek Araç Garantisi",
      "Kişisel Eşya Sigortası",
    ],
  },
];

interface InsurancePackagesProps {
  onSelect: (packageId: string, price: number) => void;
  selectedPackage?: string;
  rentalType?: string;
}

const InsurancePackages = ({ onSelect, selectedPackage, rentalType }: InsurancePackagesProps) => {
  // Sigorta paketleri sadece günlük kiralama için gösterilir
  if (rentalType !== "day") {
    return null;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Shield className="w-6 h-6 text-primary" />
        <h3 className="text-2xl font-bold">Sigorta Paketleri</h3>
        <span className="text-sm text-muted-foreground">(Günlük kiralama için zorunlu)</span>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {insurancePackages.map((pkg) => (
          <Card
            key={pkg.id}
            className={`relative ${
              selectedPackage === pkg.id
                ? "border-primary shadow-lg"
                : "border-border"
            } ${pkg.recommended ? "border-accent" : ""}`}
          >
            {pkg.recommended && (
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-accent text-accent-foreground px-3 py-1 rounded-full text-sm font-medium">
                Önerilen
              </div>
            )}
            <CardHeader>
              <CardTitle className="text-xl">{pkg.name}</CardTitle>
              <CardDescription>
                <span className="text-3xl font-bold text-foreground">
                  ₺{pkg.price}
                </span>
                <span className="text-muted-foreground">/gün</span>
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <ul className="space-y-2">
                {pkg.features.map((feature, index) => (
                  <li key={index} className="flex items-start gap-2">
                    <CheckCircle className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                    <span className="text-sm">{feature}</span>
                  </li>
                ))}
              </ul>
              <Button
                className="w-full"
                variant={selectedPackage === pkg.id ? "default" : "outline"}
                onClick={() => onSelect(pkg.id, pkg.price)}
              >
                {selectedPackage === pkg.id ? "Seçildi" : "Seç"}
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default InsurancePackages;
