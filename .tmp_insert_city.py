# -*- coding: utf-8 -*-
import re
from pathlib import Path
path = Path('src/pages/AddCar.tsx')
text = path.read_text(encoding='utf-8')
if 'htmlFor="city"' not in text:
    city_block = """                    <div className=\"space-y-2\">\n                      <Label htmlFor=\"city\">İl *</Label>\n                      <Select value={formData.city} onValueChange={(value) => setFormData({ ...formData, city: value })}>\n                        <SelectTrigger>\n                          <SelectValue placeholder=\"İl seçin\" />\n                        </SelectTrigger>\n                        <SelectContent>\n                          {turkeyCities.map((city) => (\n                            <SelectItem key={city} value={city}>{city}</SelectItem>\n                          ))}\n                        </SelectContent>\n                      </Select>\n                    </div>\n\n"""
    pattern = r'(\s*<div className="space-y-2">\s*<Label className="flex items-center gap-2">\s*<MapPin className="w-4 h-4" />\s*Lokasyon \*\s*</Label>)'
    text = re.sub(pattern, city_block + r'\1', text, count=1)
path.write_text(text, encoding='utf-8')
