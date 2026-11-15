# Tomcat Flight Lab 0.1

Simulador educativo local con el modelo artístico del repositorio. Dinámica genérica de seis grados de libertad; no prestaciones certificadas del F-14A o TF30. Sin armas, sistemas tácticos o combate.

## GitHub Pages

El repositorio incorpora `.github/workflows/pages.yml` para publicar el visor en https://alvarodesigns34.github.io/flight/. El build prepara solo `index.html`, CSS, bundle y recursos con `scripts/prepare_pages.py`. Las rutas relativas permiten servirlo bajo `/flight/`. El entorno `github-pages` debe permitir la rama del workflow. No hace falta Python para acceder a la versión web.

Comprobación del despliegue: `node simulator/scripts/check_pages.mjs https://alvarodesigns34.github.io/flight/ /tmp/tomcat-pages-check.json`, desde la raíz con las dependencias de desarrollo instaladas.

## Abrir

Requiere **Python 3.10+**, navegador moderno con **WebGL 2** y extracción completa del ZIP si usas el paquete descargable. No requiere Blender, Node, cuenta o conexión a internet para jugar.

Desde la carpeta que contiene `serve.py` (`simulator` en el repositorio o `TOMCAT_FLIGHT_LAB` en el ZIP):

```sh
python3 serve.py
```

Windows: `py -3 serve.py` o `START_WINDOWS.cmd`. macOS/Linux: `sh START_MAC_LINUX.sh`. Desde la raíz del repositorio también puedes usar `python3 simulator/serve.py`.

Abre **http://127.0.0.1:5173**. El servidor solo escucha en tu ordenador; Ctrl+C lo detiene. Si el puerto está ocupado: `python3 serve.py --port 5174`. No abras `index.html` directamente como `file://`: el cargador del modelo requiere HTTP local.

Selecciona un escenario y pulsa **Iniciar vuelo**. Arrastra y usa la rueda en Exterior. Las cámaras Seguimiento y Piloto siguen el avión. Piloto es una vista frontal, sin cabina funcional. La pausa conserva el estado; cambiar escenario o reiniciar lo restablece. Al ocultar la pestaña se pausa automáticamente.

| Acción | Entrada |
|---|---|
| Morro arriba / abajo | ↑ / ↓ |
| Alabeo izquierda / derecha | ← / → |
| Guiñada | A / D |
| Subir / bajar potencia | W / S |
| Pausa / reiniciar / cámara | Espacio / R / C |
| Alas, flaps, tren, freno, viento | Panel lateral |
| Gamepad | Ejes 0, 1, 2: alabeo, cabeceo, guiñada; zona muerta 0,09 |
| Táctil | Botones de dirección y panel |

Los mandos de teclado vuelven al trim inicial al soltar; cambiar configuración requiere pilotar para compensar. El freno empieza activado en el escenario de pista: desactívalo y aumenta la potencia para rodar. El contacto es aproximado y no hay sistema de daños. No hay asistencia oculta de actitud. Se recomienda mantenerse en el rango educativo indicado en el diálogo Acerca del modelo.

Telemetría CSV: tiempo simulado, estado SI, cuaternión, velocidades angulares, combustible, velocidad aire, α, carga aproximada, controles y viento. Se registran 10 muestras por segundo y se guardan las últimas 18.000. Descargar antes de reiniciar, porque reiniciar vacía el registro. La carga mostrada es sustentación más normal del suelo divididas por el peso; no es un acelerómetro real.

## Desarrollo y comprobaciones

Desde la raíz del repositorio, Node 22+:

```sh
npm ci
npm test
python3 -m unittest discover -s simulator/tests -p 'test_*.py'
npm run build
npm run validate
```

Prueba del visor: inicia el servidor y ejecuta `node simulator/scripts/browser_check.mjs`. Requiere Chromium (por defecto `/usr/bin/chromium`; alternativa con `CHROMIUM_PATH`). Esta prueba usa software WebGL para revisar controles y capturas, y bloquea peticiones externas.

Reconstruir el recurso 3D, con Blender oficial 4.3.2 y desde la raíz:

```sh
blender -b PROJECT_TOMCAT/F14A_TOMCAT_MASTER.blend -t 3 --python-exit-code 1 --python simulator/scripts/export_aircraft.py
```

La exportación crea una escena derivada y **no guarda sobre el maestro**. Se registran hashes en `evidence/export.json`. Los shaders procedurales se simplifican para glTF. La versión de sistema de Blender falló al exportar en este entorno; la distribución oficial 4.3.2 completó la operación.

Motor consolidado opcional: `python3 -m pip install -r simulator/reference/requirements.txt` y `python3 simulator/reference/jsbsim_reference.py`. Ejecuta JSBSim con el C172 civil incluido en su paquete. Es una prueba independiente, no el motor del visor ni una validación del F-14.

Si la imagen va lenta, reduce el tamaño de la ventana y usa aceleración gráfica del navegador. Las mediciones de este entorno sin GPU no predicen el rendimiento de tu equipo.
