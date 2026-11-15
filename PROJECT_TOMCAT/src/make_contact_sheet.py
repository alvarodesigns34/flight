"""Optional presentation utility. Run with a Python installation containing Pillow."""
from pathlib import Path
from PIL import Image,ImageOps,ImageDraw,ImageFont
ROOT=Path(__file__).resolve().parents[1]
files=sorted((ROOT/'renders').glob('[0-9][0-9]_*.png'))
cols=3;tw=600;th=440;header=130
rows=(len(files)+cols-1)//cols
canvas=Image.new('RGB',(cols*tw,header+rows*th),(18,25,31));draw=ImageDraw.Draw(canvas)
fontpath='/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf'
try:
 titlefont=ImageFont.truetype(fontpath,38);font=ImageFont.truetype(fontpath,18);small=ImageFont.truetype(fontpath,20)
except OSError:titlefont=font=small=ImageFont.load_default()
draw.text((30,22),'PROJECT TOMCAT  /  F-14A',fill='#f1eee5',font=titlefont)
draw.text((32,80),'VF-84 · 160391 · circa 1978   |   Reconstrucción artística estática',fill='#b7c5cd',font=small)
for i,path in enumerate(files):
 x=(i%cols)*tw;y=header+(i//cols)*th
 im=Image.open(path).convert('RGB');im.thumbnail((tw-16,th-48),Image.Resampling.LANCZOS)
 canvas.paste(im,(x+(tw-im.width)//2,y+(th-48-im.height)//2))
 label=path.stem.replace('_',' ')
 draw.text((x+16,y+th-36),label,fill='#d3dce0',font=font)
canvas.save(ROOT/'renders'/'CONTACT_SHEET.jpg',quality=92)
