"""Run in a fresh Blender process after opening the saved master."""
import bpy,json,sys
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parent))
from config import ROOT
import validate
result=validate.audit(ROOT/'logs'/'reopened_validation.json')
assert result['technical_pass'], 'Reopened file failed technical checks'
assert bpy.context.scene.unit_settings.scale_length==1
assert bpy.context.scene.render.engine=='CYCLES'
assert len([o for o in bpy.data.objects if o.type=='CAMERA'])==11
assert not bpy.data.actions, 'Unexpected animation actions'
assert all(not o.hide_render for o in bpy.data.collections['Removable_Panels'].objects)
assert not bpy.data.objects['Canopy_transparent_shell'].hide_render
print('REOPENED_MASTER_VERIFIED',bpy.data.filepath,flush=True)
