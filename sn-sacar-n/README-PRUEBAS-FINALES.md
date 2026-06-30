# Sacar N - Pruebas finales

Este archivo resume la prueba manual final del modulo Sacar N.

## Flujo completo

1. Ejecutar `npm start`.
2. Abrir el modulo `Sacar N` desde el menu de Requisitos.
3. Seleccionar periodo, carrera o modalidad si aplica.
4. Presionar `Cargar estudiantes`.
5. Presionar `Abrir SISACAD`.
6. Iniciar sesion manualmente si SISACAD lo solicita.
7. Presionar `Ir a Registro Notas Proyecto`.
8. Presionar `Prueba visible`.
9. Confirmar que los primeros estudiantes se lean correctamente.
10. Presionar `Continuar automatico`.
11. Probar `Pausar` y luego `Continuar`.
12. Revisar `Resumen final` y `Ver novedades`.
13. Presionar `Exportar Excel`.
14. Confirmar que el archivo tenga las hojas `Notas Proyecto` y `Errores`.

## Resultado esperado

- La app no debe modificar notas en SISACAD.
- La app no debe presionar guardar, grabar, editar, aprobar o eliminar.
- Los estudiantes procesados no deben repetirse al continuar.
- Los estudiantes con novedades deben quedar para revision manual.
- El Excel debe descargarse con las columnas de notas y errores.

## Diagnostico tecnico

Al abrir Sacar N, se ejecuta `SNFinalCheck.run()` y el resultado queda disponible en la consola como:

```js
window.SN_FINAL_CHECK
```

Si `ok` es `true`, las dependencias principales de pantalla estan cargadas.

## Nota

La prueba real con SISACAD debe hacerse localmente en Electron porque depende de sesion autorizada, pantalla visible y datos reales de SISACAD.
