# -*- coding: utf-8 -*-
import re
from pathlib import Path
path = Path('src/pages/AddCar.tsx')
text = path.read_text(encoding='utf-8')
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
text = re.sub(r'const turkeyCities = \[.*?\];\n', city_list, text, flags=re.S)
text = text.replace('return match || "DiŽYer";', 'return match || "Diğer";')
text = text.replace('derivedCity !== "DiŽYer"', 'derivedCity !== "Diğer"')
text = text.replace('>İl *<', '>İl *</')
text = text.replace('placeholder="İl seçin"', 'placeholder="İl seçin"')
path.write_text(text, encoding='utf-8')
