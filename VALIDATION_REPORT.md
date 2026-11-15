# Validación — incremento 0.1

Fecha: 15-11-2026. Los resultados numéricos y las capturas se conservan en `simulator/evidence/`. Las comprobaciones de este informe corresponden a comportamiento **educativo genérico**, no a validación de prestaciones del F-14A.

## Auditoría del repositorio y del Blender

| Impacto | Hallazgo y resultado |
|---|---|
| Alto, corregido | `check_delivery.py` infería procedencia de renders a partir de fechas de archivo. Git no conserva esas fechas. Se sustituyó por asociación mediante SHA-256 del maestro y la imagen: registros nuevos o manifiesto archivado. Dos tests demuestran rechazo de manipulación incluso con fecha futura y aceptación de contenido intacto con fecha antigua. |
| Alto para el visor, corregido | Los nodos procedurales de Blender no se convertían bien a glTF y la pintura oscura se exportaba blanca. Se inspeccionaron capturas y se exportan ahora los valores PBR base explícitos; las derivas VF-84 conservan negro, amarillo y marcas. |
| Medio, corregido | La conversión inicial de ejes hacía barrer las alas visualmente hacia delante. Se corrigió el signo de los dos pivotes y la insignia de babor acompaña su ala. El rig sigue siendo artístico. |
| Medio, corregido | Error de render podía dejar ocultas piezas de cortes expositivos. Se restauran con `finally`. |
| Medio, resuelto con herramienta alternativa | La compilación de sistema de Blender terminó con fallos nativos al preparar la exportación. La distribución oficial 4.3.2 completó exportación y regeneración. No se afirma que el origen del fallo nativo haya quedado diagnosticado. |
| Pendiente | Exactitud de cada sección, panel, cabina, tren, ruta interna o unión. Los controles técnicos no equivalen a reconstrucción museística ni revisión exhaustiva de intersecciones. |

El maestro abrió y pasó: **1.832 objetos de aeronave**, 298.498 vértices de malla, 273.672 caras base, 36 materiales y 11 cámaras. Las medidas verificadas son longitud 19,1008 m, envergadura 19,5326 m y altura de deriva 4,8768 m. Simetría principal, lateralidad de babor/estribor y luces, inclinación de derivas, materiales, degenerados y números finitos: pasan. No hay imágenes externas sin empaquetar ni animación en el maestro original.

Se regeneró todo el proyecto en una carpeta temporal con el código fuente. Las métricas estructurales coincidieron. Además, se compararon las huellas de **1.833 objetos renderizables, incluido el suelo**: no hay nombres faltantes ni huellas distintas. El alcance de esa huella es el de `snapshot_scene.py`: transformaciones, vértices, tamaños de cara, flags de suavizado, materiales por nombre, textos y curvas. No demuestra equivalencia de todos los nodos de shader, normales personalizadas o conectividad completa. El `.blend` no tiene que ser idéntico byte a byte para reproducir estas métricas.

Se comprobaron las once imágenes originales con hashes y dimensiones. Se conserva su diferencia cosmética conocida de dos pequeñas inscripciones de puertas, según el informe histórico. No se regeneraron las once imágenes en esta fase. El hash del maestro original sigue siendo `72ee953fe589ae43a71eaf63225d689619acb43181011e107d341e7c454c33d0`.

## Física: pruebas reproducibles

`npm test`: **12/12** pasan. `python3 -m unittest discover -s simulator/tests -p 'test_*.py'`: **2/2** pasan.

| Comprobación | Evidencia y alcance |
|---|---|
| Unidades y ejes | Densidad al nivel del mar aproximadamente 1,225 kg/m³; continuidad de atmósfera en 11 km; cuaterniones verifican signos de cabeceo, alabeo y rumbo en NED. |
| Equilibrio | Trim en tres combinaciones de velocidad/altitud/configuración. Residuo inicial de fuerza del caso base: 0 N a precisión registrada; momento aproximadamente 1,6×10⁻¹¹ N·m. |
| Vuelo nivelado | 60 s, 120 m/s, 1.500 m: cambio máximo de altitud 0,777 m y de velocidad 0,043 m/s, con consumo. |
| Configuración de aterrizaje | 60 s, 90 m/s, 450 m, tren y flaps: cambio máximo de altitud 1,024 m y velocidad 0,055 m/s. **Es vuelo nivelado con configuración**, no un aterrizaje validado. |
| Energía y motor | Más potencia da mayor energía específica que ralentí; respuesta temporal gradual; consumo positivo y combustible no negativo. No es una prueba completa de conservación en todas las configuraciones. |
| Mandos | Elevador, alerón y timón positivos generan las aceleraciones angulares documentadas. |
| Viento y configuración | Viento de cola cambia velocidad del aire; viento lateral cambia β; tren/flaps aumentan arrastre y geometría alar modifica coeficientes estimados. |
| Convergencia RK4 | Error combinado de posición/velocidad a 2 s frente a 480 Hz: 1,78×10⁻⁸ a 60 Hz y 1,12×10⁻⁹ a 120 Hz. Norma numérica de componentes en SI, no una única unidad física. |
| Frecuencia gráfica | Estados iguales dentro de 10⁻⁸ de norma numérica a 30, 60 y 144 FPS sintéticos. Se comprueba el límite de recuperación tras un cuadro de 5 s. |
| Contacto y freno | Reposo en suelo plano se asienta y la frenada reduce energía cinética. Sin validación de impactos fuertes, derrape o neumáticos reales. |
| Casos límite | Velocidad cero, combustible agotado, inputs no finitos y petición de trim fuera de rango. |

`npm run validate` guarda tres CSV de 60 s y `validation.json`, que contienen el estado completo, controles y viento. No hay comparación numérica con curvas de prestaciones públicas del F-14: los coeficientes genéricos no permiten sostener esa comparación.

## Visor y ejecución

La prueba `browser_check.mjs` ejecuta Chromium headless con WebGL por software y bloquea toda petición externa. Se han verificado carga offline, geometría real, inicio/pausa, respuesta de cabeceo, cambio de alas, tres cámaras, escenario de pista, CSV, diálogo informativo y disposición móvil de 390 px. El registro exacto de la última ejecución está en `browser_check.json`, con errores y peticiones externas.

Se inspeccionaron capturas reales de escritorio, alas barridas, pista y móvil. Se corrigieron colores, encuadre móvil y precisión de profundidad del paisaje a partir de esa revisión. El navegador compartido de Cloud Desktop no pudo inicializarse por un error de su sandbox; se utilizó la alternativa reproducible de Playwright/Chromium. La prueba no acredita funcionamiento del mando físico ni de todos los navegadores, ni una escucha humana de calidad sonora.

En esta máquina sin GPU, el rasterizador por software puede reducir el render a unos pocos FPS. La física conserva su paso fijo y limita la recuperación, por lo que el tiempo simulado puede avanzar más despacio que el reloj real. No se declara un rendimiento de 60 FPS universal. El recurso glTF tiene unos 23,6 MB sin comprimir; el ZIP comprime esa copia.

`npm audit --omit=dev`: **0 vulnerabilidades detectadas** en el momento de la revisión. Eso no sustituye una auditoría exhaustiva de seguridad. El servidor local usa solo la biblioteca estándar de Python, escucha en `127.0.0.1` y sirve exclusivamente la carpeta del simulador.

## Motor consolidado evaluado

JSBSim 1.2.3 instalado y ejecutado 10 s a 120 Hz con su C172 civil. Trim inicial satisfactorio y muestras finitas. Los resultados muestran evolución libre después del trim; no se interpreta como vuelo perfectamente nivelado ni como validación cruzada del modelo del navegador. El adaptador exporta a SI para facilitar una futura integración. Datos y resultados: `jsbsim_reference.json` y `jsbsim_civil_reference.csv`.

## Pendiente

Dinámica histórica verificable, afinamiento de contactos y aterrizajes, pruebas de perturbaciones más largas, variación de CG, animación coherente de todos los controles, pérdida y resbalamiento fuera del régimen moderado, dispositivos de entrada físicos, texturización detallada y calibración multivista del modelo. Las limitaciones concretas del motor actual están en `FLIGHT_MODEL.md`. La continuidad automática a las 06:00 **no quedó creada** por el límite de 5 tareas activas.
