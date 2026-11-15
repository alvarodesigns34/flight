# Flight & Archive 0.3 — informe de transformación

Fecha: 15 de noviembre de 2026. Referencia previa: `8e799375aa3b0a9ce32d9334d72df0eef8606bc4`. Rama: `codex/tomcat-flight-simulator`. [Aplicación pública](https://alvarodesigns34.github.io/flight/) · [PR de revisión](https://github.com/alvarodesigns34/flight/pull/1).

Se entrega una evolución funcional del modelo, el render, el entorno, la física educativa, los mandos y la interfaz. **No se declara alcanzado el hiperrealismo ni una reproducción operativa del F-14.** El original continúa intacto. La mejora más visible es la experiencia de uso; las mejoras geométricas se concentran en superficies articuladas y tapicería, sin añadir complejidad indiscriminada.

## Original y versión evolucionada

El maestro `PROJECT_TOMCAT/F14A_TOMCAT_MASTER.blend` y su descarga original conservan SHA-256 `72ee953fe589ae43a71eaf63225d689619acb43181011e107d341e7c454c33d0`. La entrega histórica y sus once renders siguen pasando su verificación.

La evolución se guarda en `PROJECT_TOMCAT/evolved/F14A_TOMCAT_EVOLVED.blend`; tiene copia descargable local y empaquetada. Mantiene las **1.832 identidades de componentes** y añade **dos timones**. Su inventario completo y los cambios por objeto están en `simulator/assets/evolved-model.json`; la auditoría independiente del archivo guardado está en `simulator/evidence/evolved-native.json`.

| Propiedad | Original | Evolución |
|---|---:|---:|
| Triángulos evaluados | 1.316.961 | 1,341,681 |
| Identidades originales conservadas | 1.832 | 1.832 |
| Nuevos objetos | — | 2 timones |
| Componentes omitidos accidentalmente | 0 | 0 |
| Decimación / cuantización | No / no | No / no |

La cantidad de triángulos crece aproximadamente un 1,9%, con cambios dirigidos:

- Alas con huecos reales, flaps cerrados y separados con holguras, y marcas que acompañan a cada superficie móvil.
- Derivas con huecos y timones cerrados independientes, con sus detalles asociados.
- Cuatro cojines reconstruidos como volúmenes redondeados, con apoyos laterales, tensión del tejido y depresiones.
- Pintura satinada con rugosidad UV, normales de tejido a escala milimétrica y oclusión local horneada en Cycles para 22 superficies. Atlas de 2.048², radio artístico de 0,35 m; intensidad moderada en WebGL para evitar oscurecimiento excesivo.
- Grupos separados de tren y puertas, con secuencia progresiva en cinco segundos. Se ajustan los pivotes de exposición y se representa la compresión calculada. **La cinemática sigue siendo ilustrativa**: no es un mecanismo de ingeniería, y no se garantiza ausencia de intersecciones en todas las poses.

La pestaña de estudio abre primero el original íntegro y permite alternar a la evolución. Ofrece diez vistas, cortes, órbita, zoom, malla y descarga de ambos nativos. La pose de estudio es independiente del vuelo.

## Render y entorno

La iluminación utiliza los mismos HDR completos, prefiltrados offline con Three 0.181.1 y almacenados como CubeUV RGBA16F de 1.536 × 2.048. Gzip conserva exactamente esos datos; las pruebas comprueban sus hashes tras decodificar. Se elimina el cálculo PMREM obligatorio durante la apertura; existe una ruta de reserva con HDR para navegadores sin DecompressionStream. El estudio y el original se cargan bajo demanda.

Se retira el ruido de rugosidad por píxel del avión anterior, que podía parpadear. Se conserva MSAA, ACES y vidrio físico en Ultra. La revisión Ultra detectó bandas en sombras y lentes demasiado difusas: se ajusta el sesgo normal de estudio y las lentes evolucionadas usan una aproximación PBR de placa fina transparente para mantener legibles los detalles geométricos. El nativo conserva transmisión y menor rugosidad; la cubierta mantiene vidrio físico en Ultra. Las capturas de `verified-render/` recogen esa corrección posterior a la comparativa inicial.

El terreno pasa de **524.288 a 131.072 triángulos**, distribuidos en cinco anillos alrededor del avión, con bordes enlazados y una malla de 20 m en el área de contacto. Suelo y contacto comparten vértices y diagonales en esa zona. Las muestras, colores y distribución son deterministas. La normal y la rugosidad de detalle se muestrean en coordenadas del mundo para evitar cambios de escala entre anillos.

El océano incorpora tres escalas de desplazamiento suave, dos escalas de gradientes de normales animados sin tesela periódica, atenuación lejana y el Fresnel dieléctrico de IOR 1,333. Las superficies cercana y lejana comparten acabado. Sigue sin haber refracción de fondos, espuma física ni interacción hidrodinámica con la costa.

La vegetación combina coníferas y copas de hoja ancha: 4.500 árboles, variación de tamaño/color y 122 grupos espaciales con instancing y descarte por cámara. El aeródromo incorpora cubiertas abovedadas, interiores huecos, hojas de puertas, nervios, ventanas y torre octogonal; la geometría estática se agrupa por material. **Continúa siendo un entorno procedural artístico**, no un paisaje fotogramétrico.

El cielo permanece basado en fotografía HDR. No se añaden nubes volumétricas, TAA ni efectos complejos sin una mejora medida. El atardecer es una dirección de luz y color artística; no una simulación meteorológica o solar completa.

## Física, correspondencia visual y controles

Se conserva el modelo genérico de seis grados de libertad, SI/NED, cuaterniones y RK4 a 120 Hz. Los coeficientes no se calibran al F-14. Las ecuaciones generales y los parámetros ilustrativos se distinguen en `FLIGHT_MODEL.md`.

Los mandos objetivo y aplicados están separados. Las superficies tienen respuesta gradual y tasa limitada; tren, flaps y barrido evolucionan a paso físico fijo. La geometría acompaña a los controles aplicados, incluida la respuesta diferencial de las colas y los timones. Las animaciones no cambian por sí mismas la trayectoria.

El contacto usa normal del triángulo, velocidad del punto incluyendo rotación y fricción longitudinal/lateral en el plano tangente, con límite de magnitud. Hay interbloqueo educativo de apoyos cargados y compresión visual. La transición de pérdida se suaviza con mezcla cúbica; las ráfagas son sumas de senos reproducibles, **no** Dryden ni meteorología validada.

Se rechazan estados no finitos, cuaterniones nulos, viento inválido y pasos fuera de rango. Se documentan el tiempo descartado cuando el render no alcanza el paso físico y los límites de contactos fuertes. El agua sigue siendo un plano medio de contacto, sin flotación o impactos validados. El CSV añade controles aplicados, fuerzas, momentos y tiempo descartado.

La interfaz dispone de preparación desplegable, barra de vuelo, HUD, diagnóstico ampliado y vista limpia. En móvil, el avión queda por encima de los mandos, con palanca izquierda y potencia vertical derecha. Se amplían blancos táctiles y etiquetas esenciales. El perfil permite sensibilidad, zona muerta continua, curva, inversión, selección de guiñada, calibración y reasignación de teclas; se valida y guarda en localStorage. Las combinaciones Ctrl/Alt/Meta quedan protegidas. Las cámaras tienen amortiguación y transiciones; la preferencia de movimiento reducido desactiva animaciones discrecionales. Piloto muestra la cabina geométrica, con instrumentos decorativos.

## Rendimiento medido

Seis procesos de Chromium nuevos, tres por versión, alternados, misma ventana **960 × 720**, escala 1 y modo Ligera, con toda la geometría. Servidor local, Chromium/SwiftShader por software. Se comparan los archivos del commit de referencia con la evolución; no un sitio remoto o una caché precalentada. Evidencia reproducible: `simulator/scripts/benchmark.mjs` y `simulator/evidence/transformation/benchmark.json`.

| Medida local | Referencia 0.2 | Evolución medida |
|---|---:|---:|
| Mediana hasta diagnóstico listo | 71.7 s | 11.7 s |
| Mediana hasta primera captura visible | 73.4 s | 33.5 s |
| Bytes de recursos en apertura | 63,461,884 | 52,990,432 |
| Triángulos en el fotograma inicial | 2,067,607 | 1,468,453 |
| Llamadas en el fotograma inicial | 74 | 75 |
| Fotogramas adicionales en 1,1 s en reposo | 0 | 0 |

La apertura visible medida se reduce un **54.4%**; los bytes iniciales, un **16.5%**; los triángulos del fotograma inicial, un **29.0%**. No se reduce la resolución del ensayo ni la geometría del avión.

El GLB original pasa de 39.861.948 a 18.586.804 bytes y el evolucionado de 51,044,164 a 25,058,828 mediante compresión sin pérdida. Cada buffer de atributos e índices se compara byte a byte después de decodificar; se preserva incluso el orden de índices. Las UV no utilizadas se excluyen del derivado, conservando los datos requeridos por cada material.

La articulación aumentó inicialmente el coste del vuelo a 148 llamadas. El agrupamiento rígido con `BatchedMesh` reduce 135 grupos a 33 lotes cuando existe WEBGL_multi_draw, dejando 75 llamadas totales en el escenario medido. La ruta normal permanece disponible en equipos sin esa extensión. La prueba de render compara ambas rutas con la misma pose: la diferencia absoluta media es inferior a 0,00004 sobre 255 por canal en el fotograma completo. Las matrices y la visibilidad también tienen regresión de Node.

**No hay medición GPU física ni FPS sostenidos representativos.** Los barridos interactivos por software produjeron muy pocas muestras y sus percentiles no se presentan como mejora de FPS. La captura visible incluye sincronización y lectura de pantalla. `cpuSubmitMs` mide tiempo transcurrido de la llamada de render, incluido bloqueo del controlador y compilación; no tiempo exclusivo de CPU ni tiempo GPU. Los contadores de texturas/geometrías no son una medición de VRAM. La agrupación usa texturas de matrices adicionales, una compensación explícita por menos llamadas. El microensayo de física, separado del navegador, está en `physics-benchmark.json`: la mediana de los tiempos medios por paso es 0.047 ms antes y 0.062 ms después, frente a 8,333 ms disponibles a 120 Hz. La validación y los actuadores añaden coste de CPU; no se presenta ese subsistema como más rápido.

## Verificación y revisión visual

- **28 pruebas Node**: atmósfera, coordenadas/signos, equilibrio, energía comparativa, convergencia, 30/60/144 FPS, suspensión, pendientes, actuadores, entradas inválidas, perfil de mando, integridad de activos, compresión exacta, HDR prefiltrado y matrices/visibilidad de lotes.
- **3 pruebas Python**, incluida una regresión del artefacto Pages que verifica modelos comprimidos, iluminación y descargas; verificación del original y sus once renders, y auditoría independiente del nativo evolucionado guardado.
- Navegador: pausa al entrar al estudio, número real de triángulos decodificados del original, ambas ediciones, controles físicos de cabeceo, trim, potencia táctil, perfiles y reasignación, audio, descargas CSV/JSON, móvil sin desbordamiento, Ultra y vistas de ambos puestos. `transformation/final/audit.json` registra las comprobaciones y errores.
- JSBSim vuelve a ejecutarse con su C172 civil como referencia independiente. **Esto no valida el avión del navegador**.

[Hoja comparativa de doce vistas](simulator/evidence/transformation/comparison.jpg). Las doce referencias y doce vistas evolucionadas se han inspeccionado en esta hoja: escritorio, tres cuartos, perfil, superior, cabina, tren, toberas, costa/mar, pista, atardecer y las dos interfaces móviles. Se han ampliado individualmente las vistas finales de tres cuartos, superior, cabina, tren, pista, móvil, piloto Ultra y ambos paneles de cabina. No todas las imágenes de referencia se han abierto por separado a resolución completa.

Las capturas Ultra adicionales 13–18 se revisan por separado. Las tomas dirigidas de aeródromo, costa y mar cercano y la comparación de rutas se guardan en `verified-render/`; son vistas de detalle del entorno y no se hacen pasar por pares idénticos antes/después. La revisión cercana reveló una tesela visible del mar, sustituida después por gradientes suaves sin repetición; `sea-check/` conserva la comprobación final de esa corrección. Los defectos localizados se conservan en la evidencia intermedia para hacer trazable la corrección.

## Publicación y paquete

La publicación utiliza GitHub Actions y rutas relativas bajo `/flight/`. Los recursos sin comprimir quedan como fuentes verificables en Git; Pages y el paquete incluyen las versiones comprimidas y ambos nativos descargables. Los recursos de ejecución, licencias y HDR son locales; el vuelo no depende de servicios externos. El checkpoint funcional y fuente del ZIP es `d02b68f25f784af32e34bae3ec4cf8f203643ded`. El paquete ocupa 78.954.478 bytes, contiene 46 archivos verificados y tiene SHA-256 `672ea86a201347e2ce72f9bf72b2ffdc8ad4d7695e9b043d6d5aea0cb503d817`. Se ha extraído, arrancado y probado en navegador con vuelo, pausa y ambos inspectores. La publicación Actions de ese mismo checkpoint terminó correctamente: [ejecución 43736343783](https://github.com/alvarodesigns34/flight/actions/runs/43736343783). La comprobación pública carga el vuelo en Ultra, abre el original íntegro y confirma el commit exacto, sin errores de JavaScript, shaders o HTTP. Los dos nativos descargados de Pages coinciden por SHA-256 con sus fuentes; los 22 archivos de ejecución públicos coinciden con los del ZIP. Registros en `PAGES_DEPLOYMENT.json` y `simulator/evidence/transformation/public-pages.json`. La PR queda abierta, sin fusión automática.

## Límites y prioridades siguientes

La envolvente y la mayor parte de toberas, tren y paneles conservan la reconstrucción artística inicial. Los indicadores de cabina permanecen decorativos, con leyendas repetidas; no se ha reconstruido una cabina histórica exacta. Persisten superficies proceduralmente simples, vegetación geométrica, cielo panorámico y limitaciones de reflejos/oclusiones de WebGL. El trabajo no acredita calidad cinematográfica o hiperrealismo.

Las prioridades útiles son una revisión artística manual de cabina y superficies exteriores con referencias fotográficas, atlas de desgaste/localización más finos, comprobación de mecanismos y colisiones visuales en todas las poses, mejor costa y vegetación próxima y ensayos de rendimiento en GPU de escritorio, Android e iOS. Los impactos extremos, los límites estructurales y una meteorología completa requieren trabajo adicional; no deben presentarse como validados.

## Fuentes y decisiones técnicas

- [Khronos: EXT_meshopt_compression](https://github.com/KhronosGroup/glTF/blob/main/extensions/2.0/Vendor/EXT_meshopt_compression/README.md): modos de atributos/índices y buffers de reserva. Se elige filtro NONE y comparación exacta; no cuantización.
- [Three.js: PMREMGenerator](https://threejs.org/docs/pages/PMREMGenerator.html): radiancia filtrada GGX por rugosidad. Se usa la versión fijada del proyecto; no se cambia de motor por disponibilidad de una API nueva.
- [Blender: Render Baking](https://docs.blender.org/manual/en/4.3/render/cycles/baking.html): horneado para material/oclusión. El proceso real usa Blender oficial 4.3.2, Cycles CPU y un nodo AO emitido, no una textura de sombra inventada.
- [JSBSim: marcos de referencia](https://jsbsim-team.github.io/jsbsim-reference-manual/user/concepts/frames-of-reference/) y [ecuaciones](https://jsbsim-team.github.io/jsbsim-reference-manual/formulation/equations-of-motion/): referencia general de dinámica; sin tablas o calibración de la aeronave militar.
- Los HDR y mapas fotográficos mantienen sus fuentes y licencia CC0 en `simulator/assets/environment/ATTRIBUTIONS.json`. Three.js y meshoptimizer conservan sus licencias MIT.

## Commits de implementación

- `832e1a9947a9fd3ced27a60857f2a0e3397a37a9`: evolución de geometría, render, entorno, controles, física y evidencias.
- `d02b68f25f784af32e34bae3ec4cf8f203643ded`: regresión y corrección del artefacto Pages; checkpoint común de web y paquete.
- La entrega de ZIP, verificación pública y documentación posterior se registra en los commits de la [PR #1](https://github.com/alvarodesigns34/flight/pull/1/commits); no cambia los archivos de ejecución de ese checkpoint.
