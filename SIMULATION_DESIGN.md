# Tomcat Flight Lab — arquitectura

## Estado actual 0.2 — Flight & Archive

Dos escenas: inspector del original y vuelo. `export_original.py` conserva todos los triángulos y normales, sin decimación. La copia nativa es idéntica por SHA-256. El estudio y el vuelo usan HDRI y texturas CC0 locales; `terrain.mjs` comparte la altura con la física. Los detalles están en `VISUAL_UPGRADE.md`. El render se solicita solo cuando la vista cambia si está en pausa; en vuelo o giro automático avanza continuamente.

## Base dinámica del incremento 0.1

Aplicación local ejecutable y sin servicios remotos: el avión artístico existente se representa en Three.js sobre un paisaje ficticio. El modelo dinámico es **genérico y educativo**, con seis grados de libertad. No es un modelo de prestaciones del F-14A ni una simulación operativa de sus motores TF30. La identidad histórica pertenece a la reconstrucción visual; sus límites originales siguen en `PROJECT_TOMCAT/RESEARCH_AND_REFERENCES.md`.

## Evaluación de alternativas

| Alternativa | Ventajas verificadas | Coste / decisión |
|---|---|---|
| [JSBSim](https://github.com/JSBSim-Team/jsbsim), LGPL-2.1 | Motor aeronáutico maduro, seis grados de libertad, configuración por XML y API Python. Se instaló 1.2.3 y se ejecutó el adaptador civil `simulator/reference/jsbsim_reference.py`. | Es la vía preferida para una futura dinámica civil más completa. En este incremento se usa como referencia ejecutable independiente; **no impulsa el visor** y su prueba no valida nuestros coeficientes. Un motor consolidado no aporta por sí solo los datos de una aeronave. |
| [FlightGear](https://www.flightgear.org/about/), GPL | Entorno abierto completo, multiplataforma y extensible. | Instalación, recursos y empaquetado más pesados; no se instaló ni midió su rendimiento. Es candidato para integración externa, sin incluir aquí sus recursos o modelos. |
| Física educativa propia + Three.js, MIT | Funciona en navegador sin instalar un motor nativo, módulo físico idéntico en Node y navegador, pruebas deterministas y paquete offline. | Selección para un primer incremento accesible. Mayor obligación de validación y alcance físico limitado. No se presenta como sustituto equivalente de JSBSim o FlightGear. |

Se consultaron las páginas oficiales el 15-11-2026. La web de documentación de JSBSim devolvió 404 en la consulta; se utilizó su repositorio oficial. No se descargaron modelos militares ni tablas de prestaciones para calibración.

## Separación de responsabilidades

- `parameters.mjs`: valores físicos genéricos y estimados; procedencia en `FLIGHT_MODEL.md`.
- `physics.mjs`: estado NED, fuerzas y momentos, atmósfera, contacto, RK4, trim, reloj y telemetría. No depende del DOM ni de Three.js.
- `input.mjs`: teclado, gamepad y eventos táctiles; vuelve al trim al soltar los mandos.
- `renderer.mjs`: entorno ficticio, conversión de coordenadas, cámaras y articulaciones visuales. No modifica la trayectoria.
- `audio.mjs`: síntesis original opcional. No usa grabaciones de motores.
- `main.mjs`, `index.html`, `style.css`: interfaz, escenarios y exportación CSV.
- `reference/`: integración nativa civil opcional; no es una dependencia para lanzar el visor.
- `scripts/`, `tests/`, `evidence/`: exportación, auditoría, escenarios, regresiones y resultados reales.

La física avanza a 120 Hz. El render usa `requestAnimationFrame`. Se acumula tiempo de cuadros; se limita la recuperación a 0,25 s por cuadro y se registra `droppedTime`. Una pausa larga ralentiza el tiempo simulado en vez de cambiar el paso o producir un salto enorme. Al ocultar la pestaña se pausa. No se interpolan estados gráficos entre pasos en esta versión.

## Modelo visual derivado

El maestro conserva su SHA-256 original. `export_aircraft.py` crea otra escena, evalúa modificadores, agrupa por material y conjunto móvil, suelda y reduce geometría. Omite 106 objetos interiores de estructura expositiva. Las marcas del ala de babor y sus luces siguen su pivote. La copia reducida de 0.1 tenía aproximadamente 255.000 triángulos; queda como artefacto histórico. La versión 0.2 utiliza `assets/tomcat-original.glb` con 1.316.961 triángulos, todos los componentes y las normales de esquina, sin decimación. El registro actual es `assets/original-model.json`.

Blender: +X babor, +Y atrás, +Z arriba. glTF exportado: +X babor, +Y arriba, +Z delante. Física: +X delante, +Y estribor, +Z abajo, cuaternión cuerpo→NED. Mundo gráfico: +X este, +Y arriba, −Z norte. Dos matrices explícitas en el render convierten cuerpo y representación. Los tests comprueban los signos físicos; la revisión visual comprueba la apariencia.

La conversión de shaders conserva los colores PBR base creados en Blender; el ruido y el bump procedural no se hornean. La transmisión es física en Ultra y se aproxima con alpha en los modos de menor coste. El tren cambia de visibilidad, sin cinemática real; la geometría alar y estabilizadores tienen pivotes artísticos. No hay articulación independiente de flaps o timones: sus controles afectan a las fuerzas, pero no animan toda la geometría correspondiente.

## Instalación y licencias

El visor entregado solo requiere Python 3 y WebGL 2. Node/npm se usan para desarrollo; el bundle y los recursos están incluidos y no hacen peticiones externas. Three.js conserva su licencia en `assets/THREE-LICENSE.txt` y avisos del bundle. No se cambia la licencia del material previo del repositorio ni se presume una licencia global inexistente. Las fotografías con atribuciones originales no se redistribuyen dentro del paquete del simulador; no se usan como texturas. JSBSim se instala opcionalmente desde su paquete y conserva sus propias licencias y datos civiles.

## Arquitectura de la evolución 0.3

La evolución añade módulos específicos, sin mezclar el integrador con Three.js:

- `terrain.mjs`: función de elevación, caché e interpolación/normal de contacto.
- `terrain-rings.mjs`: cinco anillos visuales y enlaces de borde.
- `physics.mjs`: estado, mandos objetivo/aplicados, contacto tangente, RK4 y telemetría.
- `input-profile.mjs`: validación, zona muerta y curva puras; `input.mjs` adapta dispositivos.
- `environment.mjs`: mapas HDR prefiltrados y reserva de cálculo local.
- `rigid-batches.mjs`: agrupación de render por material, preservando la jerarquía de animación.
- `renderer.mjs`: cámaras, escenas, partes, calidad y contadores por fotograma completo.
- `main.mjs`: DOM, estados de uso y ritmo de instrumentación limitado a 20 Hz.

La física conserva paso fijo independiente de requestAnimationFrame. La posición de render interpola estados; las fuerzas no se interpolan ni se calculan a partir de animaciones. La vista estática dibuja bajo demanda. Los diagnósticos distinguen objetivos y estados aplicados, tiempo físico descartado y tiempo de función de render. Se conserva una ruta de mallas normales para equipos sin WEBGL_multi_draw.

El pipeline de activos separa maestro inmutable, nativo evolucionado, derivado GLB completo y copia de distribución comprimida sin pérdida. Los manifiestos de Pages y del paquete registran el commit y SHA-256 de cada archivo entregado. [Resultados y límites](TRANSFORMATION_REPORT.md).
