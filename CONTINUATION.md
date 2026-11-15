# Continuar Tomcat Flight Lab

## Recuperación sin contexto previo

- Repositorio: https://github.com/alvarodesigns34/flight
- Rama de trabajo: `codex/tomcat-flight-simulator`.
- Checkpoint de código empaquetado y comprobado: **`e27f86591ecbb00930e1ddd2edceaccd087338a9`**.
- Base original preservada: `a43319cc19591294c537d8e8064a71d0997f84dc` (`main`).
- Último commit efectivo: ejecutar `git log -1 --format='%H %s'` en esta rama. La entrega se cierra con commits de implementación y paquete; el hash del checkpoint empaquetado queda en `downloads/TOMCAT_FLIGHT_LAB.json` y en `PACKAGE_MANIFEST.json` dentro del ZIP. No se escribe un hash autorreferente imposible en este archivo.
- Pull request abierta: **https://github.com/alvarodesigns34/flight/pull/1**. No fusionar automáticamente.
- Entrega publicada: commit `46b889f58d22e1c3e18480930e3cec164d31ae1d`, con CI `physics-and-assets` satisfactoria en push y PR. Los commits posteriores de este documento no cambian ese checkpoint ejecutable.

Clonar o recuperar y comprobar cambios locales **antes de cambiar de rama**. Si existen cambios no confirmados, conservarlos, sin reset, clean o sobrescrituras. Leer cualquier `AGENTS.md` nuevo, README y este documento. El repositorio no tenía `AGENTS.md` al empezar esta fase.

## Estado funcional

El simulador es una aplicación offline Three.js con física educativa genérica de seis grados de libertad en JavaScript independiente del render. Carga una copia glTF optimizada del maestro original, con colores históricos y pivotes visuales de alas/estabilizadores. Hay tres escenarios (crucero, configuración de aterrizaje nivelada, pista), teclado/gamepad/táctil, cámaras exterior/seguimiento/piloto, sonido sintetizado opcional y exportación de telemetría CSV. La cámara Piloto es vista frontal sin cabina funcional. El tren solo cambia visibilidad. Flaps y timón afectan a fuerzas sin animación detallada de esas mallas.

**Los coeficientes son genéricos estimados, no prestaciones del F-14A o TF30.** Mantenerlo explícito. No incorporar armas, sistemas tácticos, combate o calibración militar operativa. El objetivo continuable es un laboratorio educativo no bélico y una reconstrucción visual artística honesta. No afirmar realismo extraordinario o exactitud museística sin evidencia.

El maestro y el ZIP estático original se conservan sin modificación. SHA-256 del maestro: `72ee953fe589ae43a71eaf63225d689619acb43181011e107d341e7c454c33d0`. El glTF es una copia derivada; shaders procedurales reducidos a valores PBR, vidrio alpha y estructura interior expositiva omitida. `PROJECT_TOMCAT/DELIVERY_MANIFEST.json` conserva el registro histórico; los archivos de código modificados después no deben compararse como si fueran aquella entrega.

## Ejecutar y comprobar

Desde la raíz:

```sh
python3 simulator/serve.py --port 5173
# Navegador: http://127.0.0.1:5173
```

Desde el paquete extraído: `python3 serve.py`; Windows `py -3 serve.py`. El visor ya incluye el bundle y el avión. No requiere npm, Blender o red para jugar.

Desarrollo:

```sh
npm ci
npm test
python3 -m unittest discover -s simulator/tests -p 'test_*.py'
npm run build
npm run validate
python3 -m pip install Pillow==13.0.0
python3 PROJECT_TOMCAT/src/check_delivery.py
# Con el servidor activo y Chromium instalado:
node simulator/scripts/browser_check.mjs
```

`CHROMIUM_PATH` permite otro ejecutable Chromium. La prueba de UI bloquea la red externa y genera capturas. Su WebGL por software va lento en este entorno: esperar las condiciones, sin reducir la precisión de la física. No afirmar FPS universales. El escritorio compartido no pudo inicializarse por un fallo de sandbox; se recurrió a Playwright headless y se inspeccionaron sus imágenes reales.

Exportación 3D (usar distribución oficial Blender 4.3.2; la de sistema falló):

```sh
blender -b PROJECT_TOMCAT/F14A_TOMCAT_MASTER.blend -t 3 --python-exit-code 1 --python simulator/scripts/audit_blender.py
blender -b PROJECT_TOMCAT/F14A_TOMCAT_MASTER.blend -t 3 --python-exit-code 1 --python simulator/scripts/export_aircraft.py
npm run build
```

En el entorno inicial, el binario oficial quedó en `/tmp/blender-4.3.2-linux-x64/blender`; esa ruta temporal no se presupone en futuras máquinas. La exportación no guarda el maestro. No ejecutar la generación original directamente sobre el maestro para una prueba: usar carpeta temporal o `--output` y conservar los archivos existentes.

Referencia JSBSim civil opcional: `python3 -m pip install -r simulator/reference/requirements.txt` y `python3 simulator/reference/jsbsim_reference.py`. Ese adaptador prueba su C172 civil; no impulsa el navegador ni valida nuestro avión. Arquitectura y alternativas documentadas en `SIMULATION_DESIGN.md`.

Empaquetar solo desde un checkpoint confirmado: `python3 simulator/scripts/package.py --ref HEAD`. El ZIP registra el SHA fuente y hashes por archivo. Confirmar por separado el paquete y sus metadatos, y comprobar extracción y arranque. No modificar el ZIP histórico `PROJECT_TOMCAT.zip`.

## Evidencia disponible

- 12 pruebas físicas Node y 2 regresiones Python; resultados en `VALIDATION_REPORT.md`.
- Tres escenarios de 60 s con CSV y `simulator/evidence/validation.json`.
- Crucero: deriva de altitud máxima aproximadamente 0,777 m; velocidad 0,043 m/s en 60 s con combustible variable. No validación del F-14.
- Auditoría Blender original aprobada, regeneración estructural coincidente y 1.833 huellas de objetos coincidentes bajo el alcance de `snapshot_scene.py`.
- Once imágenes originales verificadas por hashes y dimensiones; diferencia cosmética previa conservada y documentada.
- `export.json`, capturas y `browser_check.json`: datos de la copia interactiva y pruebas reales de UI. Revisar la última ejecución, no inferir éxito de la mera existencia de una captura antigua.
- JSBSim 1.2.3: trim inicial y ejecución civil de 10 s, datos finitos, sin equivalencia proclamada con el modelo genérico.

## Siguiente tarea concreta

Ampliar la validación educativa del contacto y rodaje: registrar una maniobra reproducible de rodaje a baja velocidad con frenada, cuantificar compresión y deslizamiento, y ajustar el rig visual para que la suspensión coincida con los puntos físicos. Mantener parámetros genéricos explícitos. Después separar una interfaz de motor para que una dinámica civil de JSBSim pueda sustituir el módulo del navegador sin acoplar entradas, render ni telemetría.

Problemas abiertos: no hay cambio de CG con distribución de combustible; inercias aproximadas; sin compresibilidad, mapas aerodinámicos medidos, turbulencia, dinámica real TF30, articulación de todos los controles o contacto severo validado. La fidelidad histórica de secciones, cabina, tren y panelización continúa limitada por las referencias originales. No tratar la exactitud de la envolvente como prueba de exactitud de todos los contornos.

## Despertador solicitado: NO CREADO

- Reloj inicial comprobado: **15-11-2026 01:32:37 UTC / 02:32:37 CET**.
- Próxima hora solicitada en ese momento: **15-11-2026 06:00 CET, Europe/Madrid**, equivalente a 05:00 UTC.
- Se invocó la automatización persistente de la plataforma con VEVENT único y `exact_schedule`.
- Resultado: **`too_many_active_automations`**, 5 tareas activas sobre límite 5.
- Identificador: **ninguno**, la creación falló. Estado activado: **no**.
- Las tareas activas eran de otros encargos y se conservaron. No se desactivó ninguna ni se usó cron o GitHub Actions como falsa reanudación del agente.
- Prompt, hora, zona y error: `simulator/evidence/scheduling.json`.

Si una ejecución llega a reanudarse por una acción posterior autorizada, leer primero este documento, conservar cambios y continuar el incremento concreto anterior. No crear recurrencias adicionales por iniciativa propia. Una programación válida tampoco elimina cuotas o dependencia de disponibilidad de la plataforma.

## Publicación GitHub Pages — nueva fase

El usuario configuró Pages → Source → GitHub Actions. La API confirma `build_type=workflow`, URL `https://alvarodesigns34.github.io/flight/`. Se añadió `.github/workflows/pages.yml`: build independiente, tests, bundle, preparación estática, artefacto Pages y deploy con permisos OIDC mínimos. `prepare_pages.py` publica solo los seis archivos de runtime y un manifiesto de commit/hashes; no incluye el maestro, fuentes Python ni informes. `check_pages.mjs` valida el mismo contenido servido en un subdirectorio `/flight/`.

La configuración inicial de `github-pages` solo admite la rama `main`. La PR continúa abierta y el simulador está en `codex/tomcat-flight-simulator`. La integración devuelve HTTP 403 `Resource not accessible by integration` al intentar añadir esta rama a la lista de permitidas. No se quitaron las restricciones ni se fusionó la PR. Para desplegar desde esta rama hace falta permitirla en Settings → Environments → github-pages → Deployment branches and tags. Cuando esté permitida, volver a ejecutar el job o el workflow Pages y verificar la URL con `check_pages.mjs`. No afirmar publicación completa hasta observar el deploy y la carga real.
