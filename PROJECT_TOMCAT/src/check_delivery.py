"""Validate delivered images and technical evidence after all final renders finish."""
from pathlib import Path
import json,hashlib
from PIL import Image,ImageStat
from delivery_provenance import image_provenance
ROOT=Path(__file__).resolve().parents[1]
master=ROOT/'F14A_TOMCAT_MASTER.blend'
assert master.exists() and master.stat().st_size>1_000_000
validation=json.loads((ROOT/'logs'/'validation.json').read_text())
reopened=json.loads((ROOT/'logs'/'reopened_validation.json').read_text())
assert validation['technical_pass'] and reopened['technical_pass']
for key in ['mesh_vertices','mesh_faces','measurements','evaluated_triangles_including_curves']:
    assert validation[key]==reopened[key], key
assert all(json.loads((ROOT/'logs'/'component_regeneration_comparison.json').read_text()).values())
frames=json.loads((ROOT/'logs'/'camera_framing.json').read_text())
assert len(frames)==6 and all(r['full_aircraft_in_frame'] for r in frames)
records=[]
manifest=json.loads((ROOT/'DELIVERY_MANIFEST.json').read_text())
adjustment_path=ROOT/'logs'/'label_adjustment.json'
adjustment=json.loads(adjustment_path.read_text()) if adjustment_path.exists() else None
label_only_revision=bool(adjustment and adjustment['master_sha256']==hashlib.sha256(master.read_bytes()).hexdigest() and adjustment['other_renderable_object_fingerprints_unchanged'] and set(adjustment['changed_renderable_objects'])=={'Port_bay_door_identification','Starboard_bay_door_identification'})
for number in range(1,12):
    files=list((ROOT/'renders').glob(f'{number:02}_*.png'))
    assert len(files)==1, (number,files)
    path=files[0]
    record=json.loads((ROOT/'logs'/f'render_{path.stem}.json').read_text())
    provenance=image_provenance(path,master,record,manifest,ROOT)
    with Image.open(path) as im:
        im.load();assert im.width==record['width']
        expected_height=im.width if number==4 else round(im.width*11/16)
        assert im.height==expected_height
        deviation=ImageStat.Stat(im.convert('RGB')).stddev
        assert max(deviation)>5, 'Nearly uniform image: '+path.name
        records.append({'file':path.name,'size_px':im.size,'samples':record['samples'],'file_bytes':path.stat().st_size,'provenance':provenance,'documented_cosmetic_difference':number!=11 and label_only_revision,'nonuniform_pixels':True})
result={'master_reopened':True,'technical_validation':True,'component_regeneration':True,'whole_aircraft_camera_framing':True,'image_count':len(records),'images':records}
(ROOT/'logs'/'delivery_check_current.json').write_text(json.dumps(result,indent=2))
print('DELIVERY_CHECK_PASSED',len(records),'images')
