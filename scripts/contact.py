# Joins single-figure pictures (move0.png ...) from sheet-shots.sh into one contact sheet.
# Usage: python3 scripts/contact.py <dir> [prefix] [cols]
import sys, glob, re
from PIL import Image
d = sys.argv[1]; prefix = sys.argv[2] if len(sys.argv) > 2 else 'move'; cols = int(sys.argv[3]) if len(sys.argv) > 3 else 5
files = sorted(glob.glob(f'{d}/{prefix}[0-9]*.png'), key=lambda f: int(re.findall(r'(\d+)\.png$', f)[0]))
ims = [Image.open(f).crop((350, 20, 1050, 600)).resize((420, 348)) for f in files]
rows = (len(ims) + cols - 1) // cols
out = Image.new('RGB', (cols * 420, rows * 348), (58, 64, 72))
for i, im in enumerate(ims): out.paste(im, ((i % cols) * 420, (i // cols) * 348))
out.save(f'{d}/{prefix}s-sheet.png'); print(out.size, [re.findall(r'(\d+)\.png$', f)[0] for f in files])
