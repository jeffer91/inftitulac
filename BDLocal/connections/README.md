# BDLocal/connections

Conectores externos independientes.

Cada base externa debe vivir en su propia carpeta y cumplir una interfaz común.

Conectores previstos:

- firebase/: nube principal.
- supabase/: nube secundaria automática para datos manuales/críticos.
- excel/: respaldo portable y cierre del día.
- google-sheets/: reportes y revisión visible.
- shared/: reglas comunes para todos los conectores.

Regla: ningún conector debe modificar pantallas directamente. Solo responde al motor de continuidad.
