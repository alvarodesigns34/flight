# Modelo de vuelo — educativo, genérico, SI

La forma visible es el F-14A artístico del repositorio. **Los valores dinámicos que siguen no son datos oficiales del F-14, ni del TF30.** Son elecciones ilustrativas con confianza baja en su representación de cualquier aparato real. No se afirma fidelidad extraordinaria, certificación, entrenamiento de pilotos o capacidad profesional. El objetivo de este incremento es demostrar entradas → fuerzas/momentos → movimiento medible y reproducible.

## Estado y ecuaciones

Estado de 15 componentes: posición N/E/D (m), velocidad terrestre N/E/D (m/s), cuaternión cuerpo→NED (w,x,y,z), velocidades angulares p/q/r (rad/s), fracción de respuesta del motor y combustible (kg). Cuerpo: X delante, Y derecha, Z abajo. El centro del cuerpo es un CG genérico fijo, independiente del origen de la malla.

Se integra `m dv/dt = R F_cuerpo + gravedad + contacto`, `I dω/dt = M − ω×Iω` y `dq/dt = ½ q⊗(0,ω)`. La integración RK4 renormaliza el cuaternión cada paso. La velocidad relativa al viento se convierte al cuerpo para obtener α, β y presión dinámica. El arrastre se opone al vector de velocidad del aire; la sustentación es perpendicular a su proyección XZ. La fuerza lateral usa β. La gravedad actúa en +D.

El trim resuelve por bisección el equilibrio longitudinal de sustentación, arrastre y empuje inclinado, y anula el momento de cabeceo con elevador. No hay piloto automático ni correcciones ocultas de posición. El escenario llamado «configuración de aterrizaje» empieza **nivelado** a 450 m; no constituye una senda de aproximación validada.

## Registro de parámetros

Todos los valores de la tabla están en `simulator/src/parameters.mjs`, salvo las constantes atmosféricas y las funciones de interpolación de `physics.mjs`. **G** = elección genérica del simulador, no dato de una variante. Validez de G: demostraciones moderadas en 65–220 m/s, 0–6.000 m, cerca de vuelo simétrico; ese rango es una recomendación de uso, no una envolvente validada. Solo se han comprobado numéricamente los escenarios enumerados en el informe.

| Parámetro | Valor / unidades | Procedencia, confianza y alcance |
|---|---|---|
| Masa seca / combustible inicial | 18.000 / 4.000 kg | G, baja; no masas históricas. |
| Área / envergadura de referencia / cuerda | 50 m² / 16 m / 3 m | G, baja. Independientes de la envergadura visual documentada. |
| Inercias diagonales de referencia | 65.000, 150.000, 180.000 kg·m² a 22.000 kg | G, baja; se escalan con masa. Productos de inercia nulos. |
| Empuje máximo genérico combinado | 110.000 N al nivel del mar | G, baja; **no es una cifra TF30**. Multiplicador de densidad `(ρ/1,225)^0,7`, acotado a 1. |
| Respuesta temporal / consumo | 2 s / 0,000015 kg/(N·s) | G, baja. Primer orden; sin combustible no hay empuje. No hay postcombustión, temperatura ni fallos de motor. |
| g | 9,80665 m/s² | Gravedad convencional estándar; constante local. |
| CL base / pendiente / incremento saturado | 0,25 / 4,2 rad⁻¹ / 1,25 | G, baja. `CL0 + ΔCL tanh(CLα α/ΔCL)`. |
| Pérdida ilustrativa | mezcla desde \|α\|=0,35 a 0,70 rad hacia `1,1 sin(2α)` | G, baja; no reproduce pérdida real ni salida de pérdida. |
| CD base / inducido | 0,025 / 0,075·CL² | G, baja. Añade `0,8 sin²α + 0,35 β²`. |
| CYβ | −0,7 rad⁻¹ | G, baja; sin término de tasa lateral. |
| Cm0 / Cmα / Cmδe / Cmq | 0,04 / −0,65 / 0,6 / −8 | G, baja. Elevador normalizado ±1; amortiguación con `q c/(2V)`. |
| Clδa / Clp / Clβ | 0,12 / −0,6 / −0,08 | G, baja. Alerón normalizado ±1; amortiguación con `p b/(2V)`. |
| Cnβ / Cnδr / Cnr | 0,14 / 0,12 / −0,5 | G, baja. Timón normalizado ±1; amortiguación con `r b/(2V)`. |
| Geometría variable | pendiente CL hasta −30%; b hasta −35%; factor inducido hasta +50% | G, baja; interpolación lineal del control 0–1. Sin calendario automático ni inercia de alas variable. |
| Flaps / tren | ΔCL=0,35f; ΔCD=0,04f+0,025g | G, baja; sin momentos ni límites de actuador medidos. |
| Contactos, cuerpo | (5; 0; 2,2), (−1,4; −2,4; 2,2), (−1,4; 2,4; 2,2) m | G, baja; posiciones aproximadas, sin geometría de mecanismo. |
| Resorte / amortiguación por contacto | 1.000.000 N/m / 100.000 N·s/m | G, baja; suelo plano, no neumático deformable. |
| Fricción longitudinal / freno / lateral | μ=0,04+0,55·freno / μ lateral=0,65 | G, baja; fuerza `−N μ tanh(v/0,5 m/s)`. Sin giro de rueda, ABS ni dirección de morro. |
| Contacto de fuselaje | un punto (0,0,0,9) m al ocultar el tren | G, baja; evita atravesar el plano en contactos suaves. No es modelo de daños o colisiones. |
| Viento | NED uniforme; control E entre −15 y +15 m/s | G; determinista. Sin turbulencia, ráfagas ni topografía atmosférica. |

## Atmósfera y fuentes generales

Se usa una atmósfera seca estándar de dos capas: T0=288,15 K, p0=101.325 Pa, R=287,05287 J/(kg·K), gradiente −0,0065 K/m hasta 11.000 m; presión isoterma por encima, límite de cálculo 20.000 m. γ=1,4 para velocidad del sonido. La densidad se calcula con `p/(RT)`. Estas son constantes atmosféricas convencionales, no específicas de la aeronave. [NASA: atmósfera en unidades métricas](https://www1.grc.nasa.gov/beginners-guide-to-aeronautics/earth-atmosphere-equation-metric/) respalda la estructura por capas y la relación de estado; sus curvas redondeadas no son una transcripción exacta de nuestras constantes.

[NASA: ecuación de sustentación](https://www1.grc.nasa.gov/beginners-guide-to-aeronautics/lift-equation/) respalda `L = CL ρV²S/2` y la necesidad de obtener los coeficientes de evidencia experimental. **La fuente no respalda los coeficientes estimados de este proyecto.** Se verificaron las fuentes el 15-11-2026.

## Pendiente y límites

No hay tablas en Mach, compresibilidad, vuelos supersónicos validados, dinámica real del TF30, cambios de CG por distribución de combustible, productos de inercia, flexibilidad estructural, aerodinámica transitoria, mecanismos certificados o sistema hidráulico. La masa de combustible y la inercia escalar cambian; el CG permanece fijo. El acoplamiento de masa variable ignora la reacción del flujo de combustible, admisible como simplificación educativa declarada. Los contactos fuertes, grandes resbalamientos y vuelo invertido no están validados.

## Entorno y mandos en 0.2

El escenario adicional `coastal` empieza nivelado a 115 m/s y 800 m, sobre una costa ficticia, con posición N=−1.600 m/E=−9.200 m. No se cambian los parámetros aerodinámicos genéricos. Se añade compensador manual a la entrada del elevador y mando virtual; no hay asistencia oculta de trayectoria. El contacto usa `groundHeight(north,east)` compartido con el terreno visual, en lugar de cota cero universal. La pista continúa plana. La superficie de agua se aproxima con un plano de contacto a −16 m, sin flotación o impactos validados. La reacción del contacto sigue siendo vertical y aproximada; no acredita un modelo completo de rodadura sobre pendientes.
