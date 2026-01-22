# -*- coding: utf-8 -*-
from pathlib import Path
path = Path('src/pages/AddCar.tsx')
text = path.read_text(encoding='utf-8')
text = text.replace('// Function to extract city from location text\n\n// Function to extract city from location text\n', '// Function to extract city from location text\n')
path.write_text(text, encoding='utf-8')
