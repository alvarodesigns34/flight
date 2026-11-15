"""Visual reconstruction parameters. SI units; secondary dimensions are artistic estimates."""
from pathlib import Path
from math import tan,radians
ROOT = Path(__file__).resolve().parents[1]
LENGTH = 19.1008  # NNAM 62 ft 8 in, including nose probe envelope
SPAN = 19.5326    # NNAM 64 ft 1 in; Museum of Flight 64.08 ft agrees within rounding
HEIGHT = 4.8768   # NNAM 16 ft, parked envelope
FIN_CANT_DEG = 5.0  # Ray Whitford, Design for Air Combat, fin position section; secondary source
FIN_CANT_SLOPE = tan(radians(FIN_CANT_DEG))
FIN_CANT_OFFSET = (HEIGHT-2.44)*FIN_CANT_SLOPE
IDENTITY = 'F-14A-95-GR / BuNo 160391 / VF-84 / circa 1978'
SECTIONS = [
    (-9.30,.025,.035,2.18),(-9.08,.105,.13,2.19),
    (-8.65,.225,.245,2.22),(-8.05,.375,.34,2.25),
    (-7.4,.505,.43,2.27),(-6.75,.60,.50,2.28),
    (-6.10,.66,.56,2.27),(-5.4,.70,.59,2.25),
    (-4.65,.73,.59,2.23),(-3.8,.78,.56,2.23),
    (-2.9,.91,.50,2.23),(-2.0,1.23,.44,2.22),
    (-1.,1.72,.38,2.24),(0,2.03,.335,2.25),
    (1.2,2.07,.30,2.23),(2.6,1.92,.31,2.16),
    (4.2,1.69,.32,2.08),(5.6,1.47,.30,2.04),
    (6.8,1.22,.26,2.02),(7.8,.80,.19,2.00),
    (8.6,.49,.10,1.98),(9.25,.28,.055,1.97)]
COLLECTIONS = ['Fuselage','Wings','Stabilizers','Intakes','Engines_Exterior',
 'Cockpit_Front','Cockpit_Rear','Canopy','Gear_Nose','Gear_Main',
 'Removable_Panels','Exhibition_Structure','Surface_Detail','Auxiliary',
 'Lighting','Cameras','Stage']
