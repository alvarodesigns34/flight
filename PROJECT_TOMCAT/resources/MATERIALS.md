# Materiales y recursos

El avión utiliza materiales Principled BSDF de Blender: pintura gris gaviota y blanco cálido, radomo, antirreflejo, pintura negra y amarilla, aluminio, acero, cromo, metal térmicamente alterado, caucho, tejido, correas y vidrio.

La pintura conserva metalness = 0. Los metales desnudos usan valores metálicos altos, con roughness diferenciada. Los cromados se concentran en los amortiguadores; las superficies generales mantienen rugosidad moderada. La tobera separa pétalos y anillos con tonos gris, bronce y azulado discretos. La microtextura procedural tiene amplitud pequeña; no se añadió óxido ni suciedad aleatoria.

El vidrio de cubierta tiene IOR 1.45, transmisión completa y geometría con espesor. Las lentes instrumentales reducen la reflexión especular como interpretación de tratamiento antirreflejo, para facilitar lectura en la presentación.

No se han creado mapas 4K/8K ni UDIM. La microtextura usa coordenadas generadas y nodos independientes de la resolución de imagen; las inscripciones y marcas importantes son geometría. Esto evita imágenes externas, pero **no equivale** a una textura PBR artística 8K con desgaste pintado a mano. El proyecto no incluye una distribución UV lista para producción o un sistema de densidad de texel calibrado.

El desgaste implementado es discreto y limitado: cambios de acabado, microrelieve y diferenciación térmica. Faltan huellas de mantenimiento específicas del aparato, desconchados localizados y una campaña de texturización histórica por panel. Los materiales se deben evaluar con los renders de detalle, sin usar su número como indicador de exactitud.
