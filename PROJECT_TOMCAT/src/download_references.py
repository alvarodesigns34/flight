"""Download public visual references with explicit author/license manifest. No texture scraping."""
import subprocess,re,json,html
from pathlib import Path
from urllib.parse import quote
DEST=Path(__file__).resolve().parents[1]/'resources'/'references'
FILES=[
 ('ref_1.jpg','Grumman F-14A Tomcat of VF-84 in flight, circa in 1978.jpg','U.S. Navy','Public domain in the USA / US federal work'),
 ('ref_2.jpg','F-14A Tomcat forward landing gear side.JPG','BrokenSphere','CC BY-SA 3.0'),
 ('ref_3.jpg','F-14A Tomcat cockpit.JPG','BrokenSphere','CC BY-SA 3.0'),
 ('ref_4_threeview.png','Grumman F-14 Tomcat.png','U.S. Government; source attributed to airdefense.bliss.army.mil','Public domain / PD-USGov'),
 ('ref_5_main_gear.jpg','F-14A Tomcat rear landing gear 1.JPG','BrokenSphere','CC BY-SA 3.0'),
 ('ref_6_nozzle.jpg','F-14A Tomcat engine.JPG','BrokenSphere','CC BY-SA 3.0'),
 ('ref_7_nose_well.jpg','F-14A Tomcat forward landing gear bay.JPG','BrokenSphere','CC BY-SA 3.0'),
 ('ref_8_front.jpg','F-14A Tomcat front.JPG','BrokenSphere','CC BY-SA 3.0'),
]
records=[]
for filename,title,author,license in FILES:
 page='https://commons.wikimedia.org/wiki/File:'+quote(title.replace(' ','_'))
 p=DEST/(filename+'.html')
 subprocess.run(['curl','-fsSL','--max-time','25','-A','Mozilla/5.0','-o',str(p),page],check=True)
 h=p.read_text();m=re.search(r'class="fullImageLink"[^>]*>\s*<a href="([^"]+)"',h)
 if not m:raise RuntimeError('No original image URL: '+title)
 url=html.unescape(m.group(1))
 subprocess.run(['curl','-fsSL','--max-time','25','-A','Mozilla/5.0','-o',str(DEST/filename),url],check=True)
 records.append(dict(file=filename,title=title,author=author,license=license,license_url='https://creativecommons.org/licenses/by-sa/3.0/' if 'CC BY-SA' in license else 'https://creativecommons.org/publicdomain/mark/1.0/',page=page,source=url,modified=False,use='Visual reference only; not used as an aircraft texture'))
 print(filename,flush=True)
(DEST/'credits.json').write_text(json.dumps(records,indent=2,ensure_ascii=False))
