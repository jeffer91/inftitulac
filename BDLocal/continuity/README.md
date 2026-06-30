# BDLocal/continuity

Motor automático de continuidad.

Objetivo:

- detectar si Firebase, Supabase, Excel o Google Sheets están funcionando
- decidir la ruta de protección de datos
- saltar automáticamente a Supabase si Firebase falla
- activar respaldo local/Excel si las nubes fallan
- registrar eventos de cambios manuales
- evitar pérdida de datos críticos
- mostrar avisos solo cuando cambia el estado general

Regla central:

BL guarda siempre primero. SyncGuardian decide la ruta externa de protección.
