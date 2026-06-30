# Prompt técnico de BL

Este archivo explica a ChatGPT cómo trabajar con el módulo BL.

Reglas principales:

1. BL / BDLocal es la base principal de trabajo diario.
2. Firebase es la nube principal, pero no debe bloquear el trabajo si falla.
3. Supabase debe actuar como nube secundaria automática para datos manuales y críticos.
4. Excel debe usarse como respaldo portable y cierre del día.
5. Google Sheets debe usarse como reporte visible y revisión, no como base principal.
6. Las pantallas deben leer desde BDLocal, no directamente desde las nubes.
7. La UI muestra estado; el motor de continuidad decide la ruta.
8. Ningún dato manual o crítico debe sobrescribirse sin historial.
9. No mover archivos antiguos sin dejar compatibilidad.
10. Programar por bloques pequeños y verificables.

Prioridad de datos:

- Recuperable: viene del Excel y se puede reconstruir.
- Manual: lo ingresa Jeff o coordinación.
- Crítico: notas, títulos, decisiones finales, historial de aprobación.

Regla de seguridad:

Todo cambio manual debe guardarse primero en BDLocal, crear evento de continuidad y luego intentar sincronización externa.
