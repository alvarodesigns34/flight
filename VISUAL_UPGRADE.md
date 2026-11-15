# Flight & Archive 0.2 — modelo original, controles y representación

## Dos modos independientes

**Modelo original 3D**, accesible también mediante `#modelo`, pausa el vuelo y abre un estudio iluminado por HDR. Permite órbita completa, desplazamiento, acercamiento, ocho vistas (tres cuartos, perfil, frontal, superior, cabina, tren, toberas e inferior), giro automático, malla, control de exposición y cortes de cabina/estructura. «Vista limpia» oculta los paneles. Las piezas y posiciones del inspector corresponden a la pose del original; no hereda el barrido de alas, el tren o los mandos de vuelo.

**Simulación de vuelo** utiliza ahora también la geometría completa. Ofrece un escenario costero adicional, aeródromo detallado, terreno texturizado, vegetación agrupada, mar, cielo HDR y luz de día/atardecer. Mantiene la dinámica educativa genérica y la telemetría; no se han añadido capacidades tácticas ni datos de prestaciones reales del F-14.

## Qué conserva el modelo

Fuente: commit inicial `a43319cc19591294c537d8e8064a71d0997f84dc`, archivo `PROJECT_TOMCAT/F14A_TOMCAT_MASTER.blend`, SHA-256 `72ee953fe589ae43a71eaf63225d689619acb43181011e107d341e7c454c33d0`.

La nueva exportación conserva **1.832 objetos y 1.316.961 triángulos evaluados**, con **cero objetos omitidos y sin decimación**. Conserva normales de esquina, incluido el sombreado de extremos planos y piezas biseladas, y agrupa por material/conjunto en 78 mallas para reducir llamadas de dibujo sin eliminar geometría. Solo exporta la escena derivada activa, evitando duplicar en el GLB la escena Blender de partida. El GLB ocupa aproximadamente 38 MiB. `assets/original-model.json` registra conteos, hashes y valores de materiales.

La descarga «original .blend» es **idéntica byte a byte** al maestro de partida. Se sirve una copia en `simulator/assets/F14A_TOMCAT_ORIGINAL.blend`; el archivo maestro de trabajo continúa intacto.

Los materiales conservan los valores PBR de color, rugosidad, metal, IOR y transmisión. Ultra utiliza transmisión física del vidrio; las opciones de menor coste ajustan efectos y resolución. El ruido/ColorRamp/bump de Blender se adapta a WebGL; no se afirma identidad píxel a píxel con Cycles. Esta adaptación queda declarada en la información del visor. No se ha inventado una nueva certificación histórica de los perfiles, cabina, tren o estructura.

## Iluminación y paisaje

Se incluyen localmente HDRI 2K de estudio y cielo, y texturas fotográficas 2K con mapas de normal y rugosidad. Fuentes de Poly Haven, **CC0 1.0**, comprobadas el 15-11-2026:

- [Studio Small 09](https://polyhaven.com/a/studio_small_09), Sergej Majboroda.
- [Kloofendal 48d Partly Cloudy — Pure Sky](https://polyhaven.com/a/kloofendal_48d_partly_cloudy_puresky), Greg Zaal; edición del cielo por Jarod Guest.
- [Aerial Grass Rock](https://polyhaven.com/a/aerial_grass_rock), Rob Tuytel.
- [Rocky Terrain 02](https://polyhaven.com/a/rocky_terrain_02), Amal Kumar.

[Condiciones de licencia de Poly Haven](https://polyhaven.com/license). Los archivos y hashes se registran en `simulator/assets/environment/ATTRIBUTIONS.json`; las copias se entregan con el proyecto y el visor no necesita peticiones externas.

El terreno es un relieve procedural ficticio de 40 km por lado, con normales suaves, mezcla fotográfica de roca/pradera, costa, texturas a distintas escalas y variaciones de iluminación. No procede de un levantamiento geográfico real. La vegetación, edificios, pista y marcas son modelos procedurales propios. El agua en Ultra tiene animación y reflexión con reflectancia Fresnel aire/agua de aproximadamente 2,04% a incidencia normal; las normales periódicas evitan costuras de teselado. el cielo es una captura HDR, no una simulación meteorológica volumétrica. La luz cálida es un ajuste artístico de iluminación, no un cálculo astronómico de puesta de sol.

`terrain.mjs` comparte la elevación entre gráficos y contacto. El modelo físico ya no presupone que todo el terreno está a cota cero. Pista y entorno inmediato permanecen planos, conservando las pruebas de reposo y freno. El agua actúa como una superficie de contacto simplificada; no se simulan flotación, daños ni impactos severos.

## Mandos claros

Mando virtual arrastrable para cabeceo y alabeo, guiñada en pantalla, potencia con porcentaje y controles de compensación. Atajos visibles: flechas, A/D, W/S, Q/E, G, B, F, Espacio, C y R. Hay botón para centrar mandos, indicador de dispositivo y ayuda accesible. Después de usar un selector, hacer clic sobre la vista 3D devuelve el foco de pilotaje.

Los mandos momentáneos vuelven al centro; el compensador permanece. Los controles no alteran directamente la trayectoria. El escenario en pista comienza con freno activado. El indicador «sobre terreno» procede de la superficie compartida del paisaje, no de un instrumento de radar real.

## Calidad y rendimiento

Ultra activa sombras, vidrio físico y reflexiones del agua; Alta conserva geometría con efectos menos costosos; Ligera reduce resolución y efectos. **Ninguna opción simplifica la malla del inspector.** El primer acceso descarga más recursos que 0.1. Los equipos sin aceleración gráfica pueden renderizar muy despacio; los modos y «Vista limpia» permiten elegir carga y encuadre. No se declara fotorrealismo absoluto ni una tasa de FPS universal.

Las pruebas de integridad leen el GLB real para contar triángulos y atributos normales, y calculan el hash del Blender descargable. Otras pruebas verifican que el contacto sigue la elevación y que la pista continúa plana. La suite del navegador revisa pestañas, pausa al inspeccionar, cámaras de detalle, controles, móvil y modos de iluminación. Los resultados finales y capturas se registran en `VALIDATION_REPORT.md` y las evidencias de esta versión.
