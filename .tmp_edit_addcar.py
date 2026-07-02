# -*- coding: utf-8 -*-
from pathlib import Path
path = Path('src/pages/AddCar.tsx')
text = path.read_text(encoding='utf-8')
if 'const derivedCity' not in text:
    text = text.replace('onLocationSelect={(lat, lng, address) => {\n\n                          setFormData({',
                        'onLocationSelect={(lat, lng, address) => {\n\n                          const derivedCity = address ? extractCityFromLocation(address) : "";\n\n                          setFormData({')
text = text.replace('derivedCity !== "DiŽYer"', 'derivedCity !== "Diğer"')
path.write_text(text, encoding='utf-8')
