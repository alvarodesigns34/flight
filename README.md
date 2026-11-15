# flight — Project Tomcat

Modelo 3D estático y editable de un **Grumman F-14A Tomcat**, inspirado en BuNo 160391 / VF-84 / hacia 1978. Incluye el archivo de Blender, código regenerable, materiales, referencias documentales y once renders.

![Vista de estudio del F-14A](PROJECT_TOMCAT/renders/01_FRONT_THREE_QUARTER.png)

## Descargar y ver el modelo

1. Descarga el [archivo principal de Blender](PROJECT_TOMCAT/F14A_TOMCAT_MASTER.blend?raw=true) o el [paquete completo ZIP](downloads/PROJECT_TOMCAT.zip?raw=true).
2. Abre el archivo `.blend` con **Blender 4.3 o posterior** mediante **Archivo → Abrir**.
3. Pulsa **0 del teclado numérico** para ver la cámara preparada. Gira con el botón central del ratón y acerca o aleja con la rueda.

El modelo ya está construido; no es necesario ejecutar el generador para verlo. GitHub ofrece la descarga del archivo Blender, sin un visor 3D integrado para este formato.

## Contenido

- [Modelo editable](PROJECT_TOMCAT/F14A_TOMCAT_MASTER.blend)
- [Código fuente y módulos](PROJECT_TOMCAT/src/)
- [Hoja de contacto de las once vistas](PROJECT_TOMCAT/renders/CONTACT_SHEET.jpg)
- [Investigación, medidas y referencias](PROJECT_TOMCAT/RESEARCH_AND_REFERENCES.md)
- [Informe de construcción y limitaciones](PROJECT_TOMCAT/BUILD_REPORT.md)
- [Revisión visual](PROJECT_TOMCAT/VISUAL_REVIEW.md)
- [Instrucciones completas de generación](PROJECT_TOMCAT/README.md)

## Regenerar y renderizar

Desde la raíz del repositorio, con Blender disponible en el PATH:

```sh
cd PROJECT_TOMCAT
blender -b --factory-startup -t 3 --python-exit-code 1 --python src/build.py
blender -b F14A_TOMCAT_MASTER.blend -t 3 --python-exit-code 1 --python src/render.py -- all 1600 64
```

La distribución oficial de Blender incluye OpenImageDenoise. Algunas compilaciones del sistema no lo incluyen; las instrucciones completas describen cómo renderizar en ese caso.

## Alcance y referencias

La envolvente general está ajustada a dimensiones publicadas. Cabina, tren, panelización e interiores contienen reconstrucciones aproximadas, documentadas en el informe. **No se acredita precisión museística exacta ni un activo cinematográfico terminado.** La escena es estática, sin armamento, simulación o sistemas operativos.

Las fotografías documentales conservan sus autores y licencias en [credits.json](PROJECT_TOMCAT/resources/references/credits.json) y en la [investigación](PROJECT_TOMCAT/RESEARCH_AND_REFERENCES.md). Las referencias no son dependencias externas para renderizar el avión.
