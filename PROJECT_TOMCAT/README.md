# PROJECT TOMCAT

Modelo estático editable de un F-14A, inspirado en BuNo 160391 / VF-84 / hacia 1978. Leer `RESEARCH_AND_REFERENCES.md` y `BUILD_REPORT.md` antes de atribuir precisión histórica a componentes locales.

## Abrir

Abrir `F14A_TOMCAT_MASTER.blend` con Blender 4.3.2 o posterior compatible. Unidades en metros. No requiere imágenes externas para renderizar el avión: los materiales son procedurales y las marcas son geometría/tipografía nativas.

La escena contiene 11 cámaras estáticas. Para los cortes expositivos, el renderizador oculta temporalmente el vidrio de la cubierta (cámara 07) o las cubiertas dorsales de los motores (cámara 10). El archivo principal conserva el avión cerrado. No hay animaciones.

Las cámaras de perfil, frontal y posterior están niveladas. En sus renders se oculta el suelo del estudio para evitar un borde de horizonte sobre la silueta; la geometría del avión permanece completa.

## Regenerar

```sh
/workspace/tools/blender-4.3.2-linux-x64/blender -b --factory-startup -t 3 --python-exit-code 1 --python src/build.py
```

El código resuelve los directorios desde la ubicación de `src/`, por lo que el proyecto se puede trasladar. Sustituir la ruta del ejecutable por la de una instalación oficial de Blender compatible.

Regenerar un componente conservando los demás:

```sh
/workspace/tools/blender-4.3.2-linux-x64/blender -b F14A_TOMCAT_MASTER.blend -t 3 --python-exit-code 1 --python src/build.py -- --only cockpit
```

Componentes: `fuselage`, `wings`, `stabilizers`, `intakes`, `cockpit`, `canopy`, `gear`, `engines`, `detail`, `studio`. Cada objeto registra `generated_component`; la sustitución se hace por ese atributo, incluso cuando varias piezas comparten colección. Si se cambian parámetros globales o materiales, regenerar el conjunto completo.

## Renderizar

```sh
/workspace/tools/blender-4.3.2-linux-x64/blender -b F14A_TOMCAT_MASTER.blend -t 3 --python-exit-code 1 --python src/render.py -- all 1600 64
```

Puede sustituirse `all` por uno o varios nombres de cámara separados por comas. Argumentos: cámara(s), anchura, muestras. La vista superior es cuadrada; las demás tienen relación 16:11. El script no crea fotogramas clave.

La instalación del sistema en este entorno tiene Cycles, pero carece de soporte OpenImageDenoise. Los renders entregados usan la distribución oficial de Blender 4.3.2. Si se usa una compilación sin ese soporte, añadir `--no-denoise` al final y aumentar las muestras según recursos.

## Archivos

- `src/`: módulos Python de generación, render y validación.
- `renders/`: vistas finales y hoja de contacto.
- `resources/references/`: imágenes documentales y atribuciones; no son dependencias de render.
- `resources/MATERIALS.md`: estrategia PBR y límites de texturización.
- `resources/MATERIAL_PALETTE.json`: valores y nodos de los materiales usados.
- `resources/COMPONENT_TRANSFORMS.json`: coordenadas de escena y matrices de componentes principales; no son medidas oficiales del avión.
- `logs/`: registros de construcción, medidas y renders.
- `checkpoints/`: versión anterior para recuperar el estado previo al refinamiento.

No hay instalación de paquetes Python obligatoria. El generador usa `bpy` y la biblioteca estándar de la distribución oficial de Blender. El descargador opcional de referencias usa `curl`. La hoja de contacto se crea con Pillow mediante el Python del sistema.
