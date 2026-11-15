"""Selective exhibition AO atlas. Geometry remains full resolution.
Cycles traces a 0.35 m artistic occlusion radius, not a substitute for lighting.
"""
import bpy,hashlib
def bake(objects,out):
    names=('primary_skin','variable_sweep_wing','wing_glove_cover','seat_cushion','back_cushion','instrument_panel','tub_floor','tub_sidewall','main_outer_door','bay_ceiling')
    selected=[o for o in objects if o.type=='MESH' and any(n in o.name for n in names)]
    bpy.ops.object.select_all(action='DESELECT')
    for o in selected:
        o.select_set(True);layer=o.data.uv_layers.new(name='AO_UV');o.data.uv_layers.active=layer
    bpy.context.view_layer.objects.active=selected[0]
    bpy.ops.object.mode_set(mode='EDIT');bpy.ops.mesh.select_all(action='SELECT')
    bpy.ops.uv.smart_project(angle_limit=1.15,island_margin=.006,area_weight=.5,correct_aspect=True)
    bpy.ops.object.mode_set(mode='OBJECT')
    atlas=bpy.data.images.new('Evolved_local_occlusion',width=2048,height=2048,alpha=False)
    atlas.generated_color=(1,1,1,1);atlas.colorspace_settings.name='Non-Color'
    temp=bpy.data.materials.new('AO_bake_only');temp.use_nodes=True;nodes=temp.node_tree.nodes;nodes.clear()
    output=nodes.new('ShaderNodeOutputMaterial');emission=nodes.new('ShaderNodeEmission');ao=nodes.new('ShaderNodeAmbientOcclusion');ao.inputs['Distance'].default_value=.35;ao.samples=16
    target=nodes.new('ShaderNodeTexImage');target.image=atlas;target.select=True;nodes.active=target
    temp.node_tree.links.new(ao.outputs['Color'],emission.inputs['Color']);temp.node_tree.links.new(emission.outputs[0],output.inputs[0])
    backups={o:list(o.data.materials) for o in selected}
    for o in selected:
        for i in range(len(o.data.materials)):o.data.materials[i]=temp
    scene=bpy.context.scene;scene.render.engine='CYCLES';scene.cycles.device='CPU';scene.cycles.samples=8
    scene.render.threads_mode='FIXED';scene.render.threads=2;scene.render.bake.margin=8
    print('AO_BAKE_BEGIN',len(selected),flush=True)
    bpy.ops.object.bake(type='EMIT',use_clear=True,margin=8)
    atlas.filepath_raw=str(out/'local-occlusion.png');atlas.file_format='PNG';atlas.save();atlas.pack()
    group=bpy.data.node_groups.new('glTF Material Output','ShaderNodeTree');group.interface.new_socket(name='Occlusion',in_out='INPUT',socket_type='NodeSocketFloat');group.nodes.new('NodeGroupInput')
    material_cache={}
    for o,materials in backups.items():
        for i,original in enumerate(materials):
            if original not in material_cache:
                m=original.copy();m.name=original.name+'_AO';n=m.node_tree.nodes
                image=n.new('ShaderNodeTexImage');image.image=atlas;uv=n.new('ShaderNodeUVMap');uv.uv_map='AO_UV';g=n.new('ShaderNodeGroup');g.node_tree=group
                m.node_tree.links.new(uv.outputs['UV'],image.inputs['Vector']);m.node_tree.links.new(image.outputs['Color'],g.inputs['Occlusion']);material_cache[original]=m
            o.data.materials[i]=material_cache[original]
        # UV0 remains the authored paint/fabric mapping.
        o.data.uv_layers.active=o.data.uv_layers[0];o.data.uv_layers[0].active_render=True
    print('AO_BAKE_END',flush=True)
    return {'resolution':[2048,2048],'radius_m':.35,'samples':16,'cycles_render_samples':8,'selected_objects':[o.name for o in selected],'sha256':hashlib.sha256((out/'local-occlusion.png').read_bytes()).hexdigest(),'scope':'Local exhibition occlusion, not globally baked lighting'}
