# -*- coding: utf-8 -*-
from pathlib import Path
path = Path('src/pages/AddCar.tsx')
text = path.read_text(encoding='utf-8')
text = text.replace('</div>                    <div className="space-y-2">', '</div>\n\n                    <div className="space-y-2">')
path.write_text(text, encoding='utf-8')
