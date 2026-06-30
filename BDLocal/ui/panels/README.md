# BDLocal/ui/panels

Paneles visuales internos de BL.

Cada panel debe renderizar una sola sección:

- estado general
- BL local
- Firebase
- Supabase
- Excel
- Google Sheets
- Ajustes
- Diagnóstico
- Cierre del día

Regla: un panel no sincroniza datos. Solo muestra información y llama servicios del motor cuando el usuario presiona una acción.
