import bpy

M = {}
def material(name, color, rough=.4, metal=0, noise=0, bump=0):
    m=bpy.data.materials.new(name);m.use_nodes=True
    n=m.node_tree.nodes;p=n.get('Principled BSDF')
    p.inputs['Base Color'].default_value=(*color,1)
    p.inputs['Roughness'].default_value=rough
    p.inputs['Metallic'].default_value=metal
    if noise:
        tex=n.new('ShaderNodeTexNoise');tex.inputs['Scale'].default_value=noise
        tex.inputs['Detail'].default_value=2
        ramp=n.new('ShaderNodeValToRGB')
        ramp.color_ramp.elements[0].position=.2
        ramp.color_ramp.elements[0].color=(*(c*.94 for c in color),1)
        ramp.color_ramp.elements[1].position=.8
        ramp.color_ramp.elements[1].color=(*(min(1,c*1.035) for c in color),1)
        m.node_tree.links.new(tex.outputs['Fac'],ramp.inputs[0])
        m.node_tree.links.new(ramp.outputs['Color'],p.inputs['Base Color'])
        roughmap=n.new('ShaderNodeMapRange');roughmap.inputs['From Min'].default_value=0
        roughmap.inputs['From Max'].default_value=1
        roughmap.inputs['To Min'].default_value=max(.05,rough-.04)
        roughmap.inputs['To Max'].default_value=min(1,rough+.05)
        m.node_tree.links.new(tex.outputs['Fac'],roughmap.inputs[0])
        m.node_tree.links.new(roughmap.outputs[0],p.inputs['Roughness'])
        if bump:
            b=n.new('ShaderNodeBump');b.inputs['Strength'].default_value=.16
            b.inputs['Distance'].default_value=bump
            m.node_tree.links.new(tex.outputs['Fac'],b.inputs['Height'])
            m.node_tree.links.new(b.outputs['Normal'],p.inputs['Normal'])
    M[name]=m;return m

def build():
    material('Gull_gray',(.49,.51,.50),.37,0,190,.00016)
    material('Gray_panel',(.445,.465,.455),.43,0,180,.00013)
    material('Warm_white',(.80,.79,.73),.34,0,180,.00012)
    material('Radome',(.71,.70,.64),.46,0,90,.00014)
    material('Antiglare',(.018,.023,.024),.58,0,130,.00014)
    material('Panel_gap',(.068,.078,.077),.52)
    material('Black_tail',(.009,.014,.019),.35,0,210,.00012)
    material('Marking_white',(.88,.88,.82),.4)
    material('Marking_black',(.012,.017,.019),.43)
    material('Insignia_blue',(.014,.028,.058),.39)
    material('Warning_red',(.50,.026,.018),.45)
    material('Squadron_yellow',(.93,.56,.035),.39)
    material('Aluminum',(.51,.55,.56),.29,.83,320,.00010)
    material('Steel',(.24,.28,.30),.25,.88,230,.0001)
    material('Chrome',(.63,.69,.71),.16,.95)
    material('Titanium',(.22,.20,.18),.36,.85,130,.00020)
    material('Heat_bronze',(.22,.15,.083),.43,.82,100,.00015)
    material('Heat_blue',(.11,.14,.18),.39,.83,130,.00015)
    material('Exhaust_dark',(.033,.029,.025),.63,.55,170,.0003)
    material('Rubber',(.014,.018,.021),.71,0,240,.00035)
    material('Wheel_white',(.70,.71,.67),.34,.25,190,.00015)
    material('Cockpit_gray',(.095,.115,.117),.53,0,160,.00017)
    material('Instrument_black',(.008,.012,.013),.42)
    material('Instrument_face',(.018,.026,.027),.52)
    material('Needle',(.75,.79,.70),.43)
    material('CRT',(.028,.08,.063),.2)
    material('Seat_frame',(.065,.072,.067),.49,.25,180,.00015)
    material('Olive_fabric',(.17,.195,.10),.86,0,320,.0007)
    material('Harness',(.39,.40,.29),.80,0,400,.0004)
    material('Zinc_chromate',(.29,.34,.15),.52,.1,100,.0002)
    material('Floor',(.115,.14,.16),.54,.1,45,.0003)
    glass=material('Canopy_optical_glass',(.95,.98,.99),.035)
    p=glass.node_tree.nodes.get('Principled BSDF')
    p.inputs['Transmission Weight'].default_value=1
    p.inputs['IOR'].default_value=1.45
    material('Gauge_glass',(.72,.87,.82),.12)
    p=M['Gauge_glass'].node_tree.nodes.get('Principled BSDF')
    p.inputs['Transmission Weight'].default_value=1;p.inputs['IOR'].default_value=1.46
    p.inputs['Specular IOR Level'].default_value=.12
    for name,col in [('Nav_red',(.9,.008,.004)),('Nav_green',(.005,.5,.06)),('Lamp',(.9,.85,.64))]:
        m=material(name,col,.18);p=m.node_tree.nodes.get('Principled BSDF')
        p.inputs['Emission Color'].default_value=(*col,1);p.inputs['Emission Strength'].default_value=.7
    return M
