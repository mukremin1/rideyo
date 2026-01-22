# -*- coding: utf-8 -*-
from pathlib import Path
path = Path('src/pages/AddCar.tsx')
text = path.read_text(encoding='utf-8')
if 'htmlFor="city"' not in text:
    city_block = """                    <div className=\"space-y-2\">\n                      <Label htmlFor=\"city\">İl *</Label>\n                      <Select value={formData.city} onValueChange={(value) => setFormData({ ...formData, city: value })}>\n                        <SelectTrigger>\n                          <SelectValue placeholder=\"İl seçin\" />\n                        </SelectTrigger>\n                        <SelectContent>\n                          {turkeyCities.map((city) => (\n                            <SelectItem key={city} value={city}>{city}</SelectItem>\n                          ))}\n                        </SelectContent>\n                      </Select>\n                    </div>\n\n"""
    marker = '                    <div className="space-y-2">\n                      <Label className="flex items-center gap-2">\n                        <MapPin className="w-4 h-4" />\n                        Lokasyon *\n                      </Label>\n'
    text = text.replace(marker, city_block + marker)
path.write_text(text, encoding='utf-8')
