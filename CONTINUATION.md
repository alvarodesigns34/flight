# Continuar Tomcat Flight & Archive 0.2

Repositorio: https://github.com/alvarodesigns34/flight · Rama: `codex/tomcat-flight-simulator` · PR abierta: https://github.com/alvarodesigns34/flight/pull/1.

Web: https://alvarodesigns34.github.io/flight/ · Inspector directo: https://alvarodesigns34.github.io/flight/#modelo.

Leer primero cualquier `AGENTS.md` aplicable, este documento y `VISUAL_UPGRADE.md`. Comprobar `git status` antes de cambiar de rama y conservar cambios existentes. No fusionar la PR automáticamente. Último commit: `git log -1 --format='%H %s'`; el ZIP registra su checkpoint exacto en `downloads/TOMCAT_FLIGHT_LAB.json` y su manifiesto interno.

## Estado actual

Hay dos modos: **vuelo** e **inspección del modelo original**. El inspector pausa el vuelo y conserva todas las piezas y triángulos evaluados de la entrega inicial, con normales de esquina. Incluye ocho cámaras, órbita/desplazamiento/zoom, exposición, giro, malla, cortes de cabina/estructura y vista limpia. La pose original es independiente de las alas, tren y mandos del vuelo.

Original: commit `a43319cc19591294c537d8e8064a71d0997f84dc`, maestro `PROJECT_TOMCAT/F14A_TOMCAT_MASTER.blend`, SHA-256 `72ee953fe589ae43a71eaf63225d689619acb43181011e107d341e7c454c33d0`. No se modifica. La copia descargable `simulator/assets/F14A_TOMCAT_ORIGINAL.blend` es idéntica. GLB actual: `assets/tomcat-original.glb`, **1.316.961 triángulos / 1.832 objetos fuente, sin decimación y sin objetos omitidos**. `assets/original-model.json` registra hashes y materiales. `assets/tomcat.glb` es el derivado reducido histórico de 0.1, no se usa en el visor actual ni se publica en el artefacto Pages nuevo.

La exportación conserva PBR base y transmisión; los procedurales Blender se adaptan a WebGL, sin equivalencia píxel a píxel con Cycles. No confundir geometría íntegra con certificación histórica. Persisten aproximaciones originales de cabina, tren, perfiles y estructura.

El vuelo incorpora mando virtual, guiñada y compensador en pantalla; atajos visibles; escenario costero a 115 m/s y 800 m; cielo/estudio HDR; materiales de terreno fotográficos; relieve, bosque, aeródromo y mar con reflexión en Ultra. Todos los recursos están incluidos localmente. Las atribuciones CC0 están en `assets/environment/ATTRIBUTIONS.json`.

La dinámica sigue siendo **genérica y educativa**. No son prestaciones del F-14A o TF30. No incorporar armas, sistemas tácticos, combate o calibración militar operativa. No afirmar fotorrealismo absoluto, exactitud histórica absoluta o calidad profesional sin validación suficiente.

`terrain.mjs` comparte la elevación entre representación y contacto. La pista sigue plana; el agua es contacto superficial simplificado, sin flotación, daños o impactos validados. Los controles actúan sobre las fuerzas y momentos, sin modificar directamente la trayectoria. El compensador es manual.

## Ejecutar

```sh
python3 simulator/serve.py --port 5173
# http://127.0.0.1:5173/
# Inspector: http://127.0.0.1:5173/#modelo
```

El bundle está incluido; para usarlo no hacen falta Blender, Node ni red. Desde el ZIP extraído: `python3 serve.py`; Windows: `py -3 serve.py`.

Desarrollo y comprobaciones:

```sh
npm ci
npm test
python3 -m unittest discover -s simulator/tests -p 'test_*.py'
npm run build
python3 PROJECT_TOMCAT/src/check_delivery.py
# Servidor activo y Chromium instalado:
node simulator/scripts/check_experience.mjs http://127.0.0.1:5173/ /tmp/tomcat-experience
```

La suite usa WebGL por software en Ligera para las pruebas generales, mantiene toda la geometría e incluye capturas Ultra. En este entorno sin GPU la compilación y algunas capturas son lentas. Esperar estados reales del DOM en vez de suponer tiempos fijos. `CHROMIUM_PATH` permite otro ejecutable. `check_pages.mjs` comprueba el sitio desplegado y su manifiesto, también aceptando una URL con `?quality=light` para hardware lento.

El render en pausa es por cambios de vista/configuración; no recalcular permanentemente una escena estática. En vuelo y giro automático continúa renderizando. Mantener la física fija a 120 Hz y su limitación de recuperación de cuadros; un equipo lento puede avanzar más despacio que el reloj real.

## Regenerar los recursos

Usar la distribución oficial de Blender 4.3.2. La compilación de sistema produjo fallos nativos en fases anteriores.

```sh
blender -b PROJECT_TOMCAT/F14A_TOMCAT_MASTER.blend -t 3 --python-exit-code 1 --python simulator/scripts/export_original.py
npm run build
```

El script exige el hash inicial, crea otra escena, conserva las normales y exporta solo la escena activa. Nunca guarda sobre el maestro. Si se cambia intencionadamente el original en otra fase, conservar primero el archivo fuente y no eliminar la comprobación de integridad como atajo. El script histórico `export_aircraft.py` queda para la exportación reducida de 0.1.

Para auditar el maestro: `blender -b PROJECT_TOMCAT/F14A_TOMCAT_MASTER.blend -t 3 --python-exit-code 1 --python simulator/scripts/audit_blender.py`. Las huellas de la regeneración original y la auditoría previa siguen en `simulator/evidence/`.

## Publicación y paquetes

`.github/workflows/pages.yml` publica cambios del simulador desde `main` o `codex/tomcat-flight-simulator`. El entorno `github-pages` admite ambas ramas: el usuario añadió la segunda después del rechazo inicial. Conservar las políticas. Pages utiliza un artefacto con el runtime, el Blender descargable y atribuciones; no incluye logs, fuentes Python o todo el repositorio. Comprobar siempre el estado real del despliegue y el `build-info.json` público.

Paquete offline: confirmar un checkpoint funcional y ejecutar `python3 simulator/scripts/package.py --ref HEAD`. Después verificar con `python3 simulator/scripts/check_package.py`. Confirmar el ZIP y su manifiesto aparte. El ZIP estático original `downloads/PROJECT_TOMCAT.zip` se conserva sin modificación. El paquete 0.1 histórico estaba basado en `e27f86591ecbb00930e1ddd2edceaccd087338a9`; el manifiesto del paquete actual es la referencia vigente.

## Continuar a partir de aquí

Prioridad: comprobar capturas y rendimiento de escritorio/móvil en hardware gráfico real y ajustar únicamente resolución/efectos cuando el usuario elija otro modo, sin decimar silenciosamente el inspector. Después mejorar representación de suspensión y despliegue visual del tren, manteniendo las coordenadas de contacto y las limitaciones artísticas explícitas. Una futura integración civil de JSBSim debe permanecer separada de entradas, representación y telemetría; el adaptador opcional `simulator/reference/jsbsim_reference.py` sigue siendo una prueba civil independiente.

Pendientes físicos: CG por distribución de combustible, inercias completas, compresibilidad, tablas experimentales, pérdida/resbalamiento fuera del régimen moderado, turbulencia y contacto severo. Pendientes visuales: exactitud local histórica, render procedimental idéntico a Cycles, mayor variedad de vegetación y meteorología volumétrica. El cielo actual es una captura HDR y la luz cálida es artística.

## Programación original de continuación

Se intentó una ejecución única para **15-11-2026 06:00 Europe/Madrid**, a partir del reloj inicial 02:32:37 CET. La plataforma devolvió `too_many_active_automations` (5/5): **no se creó**, no existe identificador. Se conservaron tareas de otros encargos. La evidencia original sigue en `simulator/evidence/scheduling.json`. No afirmar reanudación persistente ni crear recurrencias nuevas por iniciativa propia.
