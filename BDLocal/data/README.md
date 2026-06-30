# BDLocal/data

Capa de datos internos de BDLocal.

Aquí se organizarán los módulos que limpian, validan, convierten, guardan y consultan datos locales.

Estructura prevista:

- normalizers/: limpieza y normalización de datos.
- repositories/: lectura y escritura en BDLocal.
- mappers/: conversión entre formatos externos y formato local.
- validators/: validaciones antes de guardar.

Regla: data no decide sincronización. Solo prepara y guarda datos locales.
