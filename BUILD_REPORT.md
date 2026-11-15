# Construcción de la fase de simulación

Fecha: 15-11-2026. Rama: `codex/tomcat-flight-simulator`. Base remota auditada: `a43319cc19591294c537d8e8064a71d0997f84dc`.

Se clonó el repositorio y se comprobó `git ls-remote`; el árbol local inicial estaba limpio. No se encontraron `AGENTS.md`. Se leyeron los README y los informes de construcción, revisión e investigación. La API de GitHub declaró inicialmente tamaño 0, pero el clonado y el commit confirmaron el contenido real; no se trató ese metadato como prueba de ausencia.

Entorno: Linux, 9,7 GiB RAM, sin GPU utilizada, Python 3.12.14, Node 24.22.1. El archivo maestro abrió en Blender 4.3.2 y pasó la auditoría. Se descargó la distribución oficial 4.3.2 después de fallos de la compilación de sistema en la exportación. Esos fallos no afectaron al maestro. La reconstrucción completa en una carpeta temporal terminó en aproximadamente 7 s; el registro y las comparaciones están en `simulator/evidence/`.

Se añadieron el simulador local offline, módulo físico independiente, representación glTF derivada, controles, cámaras, sonido sintetizado opcional, telemetría CSV, pruebas físicas, regresiones de procedencia, verificaciones de navegador, integración civil opcional de JSBSim y CI de GitHub Actions. Los detalles están en `SIMULATION_DESIGN.md` y `VALIDATION_REPORT.md`.

La copia interactiva reduce aproximadamente 1,26 millones de triángulos evaluados a 255.000 antes de la triangulación/separación propia de glTF, agrupados en 60 mallas. Los shaders procedurales se simplifican a colores PBR base; esta diferencia se encontró inspeccionando capturas y se corrigió para evitar exportar en blanco la pintura de las derivas. Se corrigieron también el sentido visual de la geometría alar y la asociación de la insignia de babor a su ala móvil. La nueva representación permite articulación y vuelo educativo; el archivo de exposición original conserva sus límites y no se reescribe.

El paquete offline `downloads/TOMCAT_FLIGHT_LAB.zip` se construyó desde el checkpoint `e27f86591ecbb00930e1ddd2edceaccd087338a9`. Su manifiesto registra 21 archivos y hashes; extracción, arranque independiente y una prueba de inicio/pausa en Chromium pasaron. El ZIP está separado del paquete estático original.

Se corrigió la comprobación de procedencia de renders, que usaba mtimes no conservados por Git. Las nuevas comprobaciones usan hashes, y los futuros renders registran los hashes de imagen y maestro. `DELIVERY_MANIFEST.json` permanece como registro de la entrega estática original, no como manifiesto de los scripts modificados en esta fase. La salida actual se guarda aparte, en `PROJECT_TOMCAT/logs/delivery_check_current.json`. La restauración de visibilidad en render se protege con `finally`.

El simulador del navegador usa parámetros **genéricos e ilustrativos**. No se declara una dinámica histórica exacta del F-14A, motores TF30 funcionales ni fidelidad profesional. Se ha entregado un incremento funcional, medido y continuable. No se ha completado toda la reconstrucción histórica ni todo el modelo de vuelo descrito en el encargo.

## Continuación automática

Hora inicial comprobada: 15-11-2026 01:32:37 UTC = 02:32:37 CET, Europe/Madrid. Se intentó crear una única continuación para **15-11-2026 06:00 CET**, `exact_schedule`, en esa zona. La plataforma devolvió `too_many_active_automations`: 5 tareas activas, límite 5. No devolvió identificador y **no quedó programada**. Se comprobó que las tareas activas pertenecían a otros encargos; no se modificaron. El prompt y el resultado se conservan en `simulator/evidence/scheduling.json` y `CONTINUATION.md`. No hay cron, tarea de GitHub ni proceso local que sustituya una reanudación persistente del agente.

## Publicación web

GitHub Pages publica el runtime estático mediante `.github/workflows/pages.yml` en https://alvarodesigns34.github.io/flight/. El usuario permitió la rama del simulador en `github-pages`; el reintento 2 del workflow 43705184725 terminó correctamente. Se comprobó en Chromium la carga real del avión, inicio, pausa y configuración alar sin errores. Manifiesto y estado: `PAGES_DEPLOYMENT.json`.

## Flight & Archive 0.2

Se añadió un inspector independiente del modelo inicial y se sustituyó la malla de vuelo reducida por la exportación completa. `export_original.py` conserva 1.316.961 triángulos y 1.832 objetos fuente, normales de esquina y todos los interiores, sin decimación; se agrupa en 78 mallas para dibujar. Se exporta únicamente la escena activa, evitando duplicación de la escena fuente. GLB: 39.861.948 bytes. La copia descargable del Blender mantiene el hash inicial.

Se incorporaron HDRI y texturas CC0 locales de Poly Haven, costa y relieve de 40 km, bosque, aeródromo y mar con reflexión en Ultra. La elevación se comparte con el contacto físico. La interfaz añade dos pestañas, ocho cámaras de inspección, cortes, vista limpia, mando virtual, compensador y atajos visibles. El sonido es una síntesis original de motor y aire, sin grabaciones TF30. La vista estática se renderiza bajo demanda para reducir consumo.

Comprobaciones: 17 pruebas Node y 2 Python pasan; entrega estática original de 11 imágenes verificada; suite Chromium de escritorio/móvil pasa, incluyendo modelo íntegro, pausa del vuelo al inspeccionar, detalles de cabina/tren, controles, audio y Ultra. Se inspeccionaron capturas reales de los dos modos. `simulator/evidence/experience-02/` contiene resultados e imágenes. El alcance y las licencias están en `VISUAL_UPGRADE.md`. Los materiales siguen siendo una adaptación de Blender a WebGL, sin declaración de equivalencia píxel a píxel con Cycles.
