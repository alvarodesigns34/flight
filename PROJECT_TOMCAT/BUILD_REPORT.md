# PROJECT TOMCAT — informe de construcción

## Estado real de entrega

Se ha construido y guardado **F14A_TOMCAT_MASTER.blend**, una reconstrucción artística estática de un F-14A temprano, con código regenerable y presentación de estudio. Está inspirado en BuNo 160391, VF-84, hacia 1978. No lleva armamento.

El proyecto es un modelo tridimensional real, no una imagen generada como sustituto ni un conjunto de instrucciones sin ejecutar. **No se acredita como reconstrucción museística exacta o activo cinematográfico terminado**: los componentes secundarios y muchos contornos siguen siendo interpretaciones visuales. Esas limitaciones son parte de la entrega, no medidas oficiales.

## Componentes implementados

- Fuselaje por secciones curvas interpoladas; morro, radomo, zona antirreflejo, abertura de cabina y coaming.
- Alas con espesor curvo, orígenes propios, pieles de flaps independientes, juntas y fijaciones; cubiertas de guante separadas y rigidizadores representativos.
- Dos derivas inclinadas, juntas de timón, dos estabilizadores horizontales y aletas ventrales. Las juntas de timón son detalles de superficie; no todas las superficies móviles son mallas volumétricas separadas.
- Admisiones de cuatro paredes, labios, divisores, techo interior, juntas y fondo profundo; no son agujeros vacíos.
- Dos puestos de cabina con asientos, cojines, arneses con espesor, hebillas, consolas, pedales y mandos decorativos. Instrumentos con carcasa, bisel, cara, graduaciones, aguja y lente; pantallas apagadas representativas. No existe lógica de instrumentos.
- Cubierta óptica con espesor, marcos, juntas, carriles y pequeños espejos. Corte estático sin vidrio para mostrar los dos puestos.
- Tren delantero doble y dos principales: neumáticos perfilados con surcos, llantas, tuercas, arandelas, discos decorativos, puntales, tramos cromados, collares, enlaces perforados, riostras, pasadores, líneas exteriores, puertas y pozos con nervios.
- Góndolas, cubiertas dorsales desmontables, toberas huecas con 24 pétalos exteriores por motor, anillos interiores, varillas exteriores y diferenciación térmica.
- Carcasas expositivas internas por tramos, bridas, fijaciones, aros, soportes y conducciones decorativas. No reproducen un TF30 funcional ni su fabricación.
- Marcas nacionales y VF-84 reconstruidas mediante mallas y tipografía; panelización representativa, registros, luces y pequeñas antenas.
- Estudio neutro con cuatro fuentes de área diseñadas para el avión, fondo sin HDRI y once cámaras estáticas.

## Estadísticas medidas del archivo

| Magnitud | Resultado |
|---|---:|
| Objetos del avión, incluidos curvas y textos | 1,832 |
| Vértices de malla base | 298,498 |
| Caras de malla base | 273,672 |
| Triángulos de mallas base | 548,152 |
| Triángulos evaluados, incluyendo curvas y modificadores | 1,316,961 |
| Materiales utilizados | 36 |
| Cámaras estáticas | 11 |
| Longitud medida entre sonda y pétalos | 19.100800 m |
| Envergadura medida del ala | 19.532600 m |
| Altura hasta extremo de deriva | 4.876800 m |

Las cifras se obtienen de `logs/validation.json`. No se utiliza el número de objetos o polígonos como prueba de fidelidad. Los grupos de fijaciones se agrupan en mallas; los objetos restantes tienen nombres y procedencia de componente.

## Organización, materiales y recursos

Diecisiete colecciones organizan fuselaje, alas, estabilizadores, admisiones, motores, cada puesto de cabina, cubierta, trenes, paneles desmontables, estructura expositiva, detalles, auxiliares, luces, cámaras y escenario. La raíz `F14A_STATIC_EXHIBIT_ROOT` permite trasladar el conjunto. Los pivotes de ala son convenciones de edición, no articulaciones operativas.

Materiales PBR nativos para pintura, metales, caucho, vidrio, plástico, tejidos y acabados térmicos. Microtextura y variación de acabado procedurales; inscripciones y emblemas geométricos. No se entregan texturas de avión 4K/8K, UDIM ni UV de producción. No hay archivos de imagen externos necesarios para abrir o renderizar el avión. `resources/MATERIALS.md` explica el alcance.

Ocho imágenes documentales se conservan con sus páginas de procedencia y atribuciones. La fotografía instrumental adicional consultada en el sitio de Bill Maloney no se redistribuye. Los renders no incorporan fotografías prestadas como textura de piel o panel instrumental.

## Validación ejecutada

- Construcción completa con Blender 4.3.2 y guardado comprimido.
- Envolvente general comparada con los tres valores adoptados: pasa con tolerancia de 1 mm.
- Simetría de conjuntos de vértices reflejados para alas, derivas, estabilizadores horizontales y pieles de góndola: pasa.
- Materiales ausentes: 0; objetos con caras degeneradas: 0; coordenadas no finitas: 0; mallas coincidentes duplicadas detectadas: 0.
- Soldadura de vértices coincidentes internos, retirada de vértices sueltos y recálculo de normales.
- Sin datos de animación en los objetos. Sin simulación, trayectorias ni controles de vuelo.
- Reapertura del master en proceso independiente: ejecutada, pasa.
- Regeneración aislada de cubierta en copia: ejecutada; conserva recuentos, envolvente y simetría.
- Encuadre de las seis cámaras generales comprobado por proyección de sus cajas de geometría.
- Separación lateral entre estabilizadores y pétalos de tobera: 0.0450 m en esta geometría; comprobación visual de la corrección posterior. Es una separación del modelo, no una dimensión histórica.
- Inclinación de ambas derivas comprobada sobre la malla: 5.000° / 5.000°, frente a 5° en la referencia bibliográfica secundaria.
- Lateralidad coherente con el morro hacia −Y: babor en +X, estribor en −X, luz roja a babor, verde a estribor y emblema sobre ala de babor. Comprobación automática de nombres, materiales y posición.

La auditoría detecta superficies abiertas intencionadas: pieles, marcas, conductos, cristales y paletas ornamentales. No se afirma que todo el conjunto sea un sólido cerrado imprimible. No se ha ejecutado una comprobación exhaustiva de intersecciones entre todas las piezas, ni una validación de topología para deformación o producción industrial.

## Ciclo de revisión visual

Se renderizaron e inspeccionaron versiones intermedias de la vista general, superior, cabina, tren delantero y estructura. Las revisiones incluyeron: posición longitudinal de alas respecto al dibujo de tres vistas; encuadre superior que recortaba los extremos; color de radomo; marcas nacionales y letras de cola; insignias sobre superficies curvas; cierre de huecos de coaming; abertura de pozos de tren; variedad de instrumentos; reflexión de lentes; enlaces perforados y detalles adicionales de tren. Una vista posterior reveló una intersección entre estabilizadores y bocas de tobera: se trasladaron las raíces al exterior de las góndolas y se verificó la corrección con otro render. La imagen rechazada se conserva en `checkpoints/review_renders/`. También se nivelaron las tres cámaras ortográficas de perfil/frontal/posterior.

La versión inicial se conserva en `checkpoints/01_initial_review.blend`. Los registros de revisión y de render permanecen en `logs/`. La inspección visual es artística y cualitativa; no equivale a una comparación fotogramétrica medida.

La inclinación de las derivas se corrigió después de contrastar una referencia bibliográfica: la estimación inicial excedía los 5° indicados para producción. Se corrigieron también sus marcas conformadas y se añadió una comprobación automática del ángulo. Los extremos planos de cilindros y lentes instrumentales conservan normales planas, sin heredar el sombreado curvo de las paredes.

Se corrigió la inversión inicial de los nombres Port/Starboard y de las luces de navegación. La convención final, con morro hacia −Y y Z arriba, sitúa babor en +X. Se trasladó el emblema superior al ala de babor y se cambió la cámara de perfil al lado correspondiente. Las imágenes finales se regeneraron después de esa corrección.

## Renders guardados

Cycles CPU, iluminación con áreas, AgX y OpenImageDenoise de la distribución oficial de Blender 4.3.2. La compilación del sistema carecía de OIDN y produjo un fallo documentado en el primer intento; se resolvió usando el binario oficial. Equipo: tres núcleos CPU y aproximadamente 9.7 GiB de RAM; sin GPU detectada.

| Cámara | Anchura | Muestras máximas | Tiempo registrado | Presentación |
|---|---:|---:|---:|---|
| 01_FRONT_THREE_QUARTER | 1800 px | 48 | 188.5 s | Avión completo / detalle exterior |
| 02_REAR_THREE_QUARTER | 1400 px | 40 | 95.8 s | Avión completo / detalle exterior |
| 03_PORT_PROFILE | 1280 px | 24 | 18.8 s | Avión completo / detalle exterior |
| 04_TOP | 1280 px | 24 | 76.0 s | Avión completo / detalle exterior |
| 05_FRONT | 1280 px | 24 | 16.9 s | Avión completo / detalle exterior |
| 06_REAR | 1280 px | 24 | 16.1 s | Avión completo / detalle exterior |
| 07_COCKPIT_CUTAWAY | 1400 px | 40 | 106.6 s | Corte estático documentado |
| 08_NOSE_LANDING_GEAR | 1400 px | 40 | 136.4 s | Avión completo / detalle exterior |
| 09_TF30_EXHAUSTS | 1400 px | 40 | 136.1 s | Avión completo / detalle exterior |
| 10_STRUCTURE_CUTAWAY | 1400 px | 40 | 136.5 s | Corte estático documentado |
| 11_MAIN_LANDING_GEAR | 1400 px | 40 | 171.9 s | Avión completo / detalle exterior |

Las imágenes 07 y 10 son cortes expositivos: se oculta temporalmente el vidrio o las cubiertas dorsales, respectivamente. Se restaura la visibilidad al terminar cada render. El archivo principal conserva el avión cerrado. No son animaciones.

En las vistas ortográficas de perfil, frontal y posterior se oculta únicamente el suelo del escenario para evitar un horizonte que interfiera con la lectura de la silueta.

Después de la revisión conjunta se alinearon las dos pequeñas inscripciones «210» de las puertas del tren principal con sus superficies inclinadas. Se repitió la imagen 11 con el master corregido. Una comparación de huellas de los objetos antes/después confirmó que solo cambiaron las transformaciones de esos dos textos (`logs/label_adjustment.json`). Las otras diez vistas conservan la alineación previa de esas pequeñas inscripciones; el resto de sus objetos renderizables no cambió. Se documenta esta diferencia cosmética en lugar de declarar todas las imágenes idénticas a la última revisión del archivo.

## Diferencias y trabajo pendiente

1. La envolvente está restringida a dimensiones publicadas; las secciones del fuselaje y el perfil de ala son esculpidos paramétricos estimados. Falta un conjunto calibrado de vistas y una comparación cuantitativa de contornos.
2. La disposición instrumental, geometría de asientos, horquillas, riostras y llantas son representaciones. No se verificó cada pieza del ejemplar de 1978. Los pequeños textos de servicio son genéricos; no son una transcripción de un manual o de cada rótulo histórico.
3. La panelización y sus remaches siguen componentes y juntas estimadas; no constituyen un mapa certificado del revestimiento. Algunos elementos de superficie son curvas finas superpuestas en lugar de surcos tallados.
4. Las carcasas TF30 internas son expositivas y simplificadas. No se validaron cuadernas, accesorios, etapas, recorridos de conductos ni arquitectura interna real.
5. Las intersecciones de pieles de guantes, góndolas y fuselaje son uniones de ensamblaje visual, sin retopología unificada. Son menos adecuadas para cortes arbitrarios y primeros planos extremos que una reconstrucción manual revisada con escaneo.
6. Las superficies móviles no tienen una descomposición completa de mecanismos ni todas sus piezas separadas. Hay pivotes de exhibición y pieles independientes, sin rig, automatización o dinámica.
7. El desgaste es limitado. Falta pintura manual por panel, suciedad de mantenimiento específica, acabados históricos colorimétricamente calibrados y un flujo UV/UDIM para producción.
8. No se declara que el resultado alcance el estándar extraordinario de precisión museística solicitado. Se entrega el trabajo real ejecutado, con su alcance demostrado, fuentes y arquitectura para continuar refinándolo.

Para continuar, la mayor mejora vendría de referencias calibradas del mismo aparato y fecha, seguida por retopología de las uniones principales, reconstrucción manual documentada de cabina/tren y texturización histórica localizada. Ninguna de esas tareas se considera ya realizada.
