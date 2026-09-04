# Changelog

Todos los cambios notables de la app móvil/web se documentan en este archivo.

El formato sigue [Keep a Changelog](https://keepachangelog.com/es-ES/1.1.0/)
y el versionado sigue [SemVer](https://semver.org/lang/es/).

## [1.0.1] - 2026-09-04

### Corregido

- **Pago: 400 al registrar cualquier medio de pago.** La pantalla decidía entre
  `venuePaymentMethodId` y `paymentMethodType` con una expresión regular de UUID.
  Los ids que emite la sede no son UUID (`pm-pago-banesco-…`), así que caían en la
  rama equivocada y viajaban como tipo, superando el límite de 32 caracteres que
  la API impone sobre ese campo. Ahora la decisión es por procedencia: los tipos
  genéricos son un conjunto cerrado (`TRANSFER`, `CASH`) y todo lo demás es un id
  de la sede.
- **La pantalla de pago no mostraba ningún error.** `_continue()` usaba
  `try`/`finally` sin `catch`: la excepción subía sin que nadie la mostrara y el
  usuario solo veía apagarse el spinner. Ahora se muestra el mensaje del fallo.
