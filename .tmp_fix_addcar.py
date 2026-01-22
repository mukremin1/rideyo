# -*- coding: utf-8 -*-
import re
from pathlib import Path

path = Path('src/pages/AddCar.tsx')
data = path.read_bytes()
if data.startswith(b'\xff\xfe'):
    enc = 'utf-16'
elif data.startswith(b'\xfe\xff'):
    enc = 'utf-16-be'
else:
    enc = None

if enc is None:
    try:
        text = data.decode('utf-8')
        enc = 'utf-8'
    except UnicodeDecodeError:
        text = data.decode('cp1254')
        enc = 'cp1254'
else:
    text = data.decode(enc)

city_list = """const turkeyCities = [
  \"Adana\", \"Adıyaman\", \"Afyonkarahisar\", \"Ağrı\", \"Aksaray\", \"Amasya\", \"Ankara\", \"Antalya\", \"Ardahan\", \"Artvin\",
  \"Aydın\", \"Balıkesir\", \"Bartın\", \"Batman\", \"Bayburt\", \"Bilecik\", \"Bingöl\", \"Bitlis\", \"Bolu\", \"Burdur\",
  \"Bursa\", \"Çanakkale\", \"Çankırı\", \"Çorum\", \"Denizli\", \"Diyarbakır\", \"Düzce\", \"Edirne\", \"Elazığ\", \"Erzincan\",
  \"Erzurum\", \"Eskişehir\", \"Gaziantep\", \"Giresun\", \"Gümüşhane\", \"Hakkari\", \"Hatay\", \"Iğdır\", \"Isparta\", \"İstanbul\",
  \"İzmir\", \"Kahramanmaraş\", \"Karabük\", \"Karaman\", \"Kars\", \"Kastamonu\", \"Kayseri\", \"Kilis\", \"Kırıkkale\", \"Kırklareli\",
  \"Kırşehir\", \"Kocaeli\", \"Konya\", \"Kütahya\", \"Malatya\", \"Manisa\", \"Mardin\", \"Mersin\", \"Muğla\", \"Muş\",
  \"Nevşehir\", \"Niğde\", \"Ordu\", \"Osmaniye\", \"Rize\", \"Sakarya\", \"Samsun\", \"Şanlıurfa\", \"Siirt\", \"Sinop\",
  \"Sivas\", \"Şırnak\", \"Tekirdağ\", \"Tokat\", \"Trabzon\", \"Tunceli\", \"Uşak\", \"Van\", \"Yalova\", \"Yozgat\", \"Zonguldak\",
];
"""

if 'const turkeyCities = [' not in text:
    text = text.replace('import LocationPickerMap from "@/components/LocationPickerMap";\n', 'import LocationPickerMap from "@/components/LocationPickerMap";\n\n' + city_list)
else:
    text = re.sub(r'const turkeyCities = \[.*?\];\n', city_list, text, flags=re.S)

extract_func = """// Function to extract city from location text
const extractCityFromLocation = (location: string): string => {
  const lowerLocation = location.toLocaleLowerCase(\"tr\");
  const match = turkeyCities.find((city) =>
    lowerLocation.includes(city.toLocaleLowerCase(\"tr\"))
  );
  return match || \"Diğer\";
};
"""
text = re.sub(r'// Function to extract city from location text[\s\S]*?\n};\n', extract_func, text, count=1)

text = text.replace('  seats: z.number().min(2).max(9),\n', '  seats: z.number().min(2).max(9),\n  city: z.string().min(2, "Lütfen geçerli bir il seçin"),\n')
text = text.replace('    seats: "5",\n', '    seats: "5",\n    city: "",\n')
text = text.replace('        seats: parseInt(formData.seats),\n', '        seats: parseInt(formData.seats),\n        city: formData.city,\n')

if 'Lütfen haritadan konum seçin' not in text:
    text = text.replace('      setLoading(true);\n', '      if (formData.latitude === null || formData.longitude === null) {\n        toast.error("Lütfen haritadan konum seçin.");\n        return;\n      }\n\n      setLoading(true);\n')

text = text.replace('        city: extractCityFromLocation(validatedData.location),\n', '        city: validatedData.city,\n')

text = text.replace('                        onLocationSelect={(lat, lng, address) => {\n', '                        onLocationSelect={(lat, lng, address) => {\n                          const derivedCity = address ? extractCityFromLocation(address) : "";\n')
text = text.replace('                            location: address || `${lat.toFixed(6)}, ${lng.toFixed(6)}`,' , '                            location: address || `${lat.toFixed(6)}, ${lng.toFixed(6)}`,' + "\n                            city: derivedCity && derivedCity !== \"Diğer\" ? derivedCity : formData.city,")

if 'htmlFor="city"' not in text:
    city_block = """                    <div className=\"space-y-2\">\n                      <Label htmlFor=\"city\">İl *</Label>\n                      <Select value={formData.city} onValueChange={(value) => setFormData({ ...formData, city: value })}>\n                        <SelectTrigger>\n                          <SelectValue placeholder=\"İl seçin\" />\n                        </SelectTrigger>\n                        <SelectContent>\n                          {turkeyCities.map((city) => (\n                            <SelectItem key={city} value={city}>{city}</SelectItem>\n                          ))}\n                        </SelectContent>\n                      </Select>\n                    </div>\n\n"""
    text = text.replace('                    <div className="space-y-2">\n                      <Label className="flex items-center gap-2">\n                        <MapPin className="w-4 h-4" />\n                        Lokasyon *\n                      </Label>\n', city_block + '                    <div className="space-y-2">\n                      <Label className="flex items-center gap-2">\n                        <MapPin className="w-4 h-4" />\n                        Lokasyon *\n                      </Label>\n')

path.write_text(text, encoding='utf-8')
