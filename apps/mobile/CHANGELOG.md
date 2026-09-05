# Changelog

Todos los cambios notables de la app móvil/web se documentan en este archivo.

El formato sigue [Keep a Changelog](https://keepachangelog.com/es-ES/1.1.0/)
y el versionado sigue [SemVer](https://semver.org/lang/es/).

## [1.0.4] - 2026-09-04

### Corregido

- **El calendario del torneo sin generar quedaba fuera de alcance.** La rama
  vacía de la pestaña Calendario devolvía una columna sin scroll propio: en
  pantallas bajas el contador de participantes y el botón de generar
  calendario desbordaban y no había forma de llegar a ellos. El scroll va solo
  en esa rama; la de éxito ya es una lista y anidarla le deja la altura sin
  acotar.

### Interno

- **La suite de móvil vuelve a estar en verde (479/479).** Diez tests del flujo
  de torneo fallaban por un solo motivo: navegaban tocando la pestaña por su
  texto, y esa etiqueta se renombró dos veces en dos días sin que nadie
  actualizara los tests. El tap moría antes de probar nada, así que la gestión
  de invitados llevaba más de una semana sin cobertura real y detrás del primer
  fallo se habían acumulado tres renombres más. Las etiquetas pasan a ser una
  constante de la pantalla que los tests consumen, para que el próximo cambio
  de nombre los arrastre en vez de romperlos.

## [1.0.3] - 2026-09-04

### Corregido

- **Onboarding: "drive" aparecía elegido pero al continuar pedía elegirlo.**
  `SegmentedControl` caía al índice 0 cuando el valor activo no era ninguna de
  sus opciones, así que pintaba la primera como seleccionada. El lado de cancha
  arranca en `ANY`, que ese control no ofrece: la UI mostraba "Drive" marcado
  mientras la validación —y la API, que rechaza `ANY` en deportes de raqueta—
  seguían viendo que no había elección. Ahora el control no dibuja indicador
  cuando nada coincide, y el usuario ve lo que realmente tiene.
- **Beach tennis no se podía guardar.** `racketSportCodes` de la app listaba
  tres deportes y `RACKET_SPORT_CODES` de la API cuatro. Por esa diferencia la
  app nunca preguntaba el lado preferido para beach tennis y enviaba `ANY`, que
  la API rechaza con 400 para deportes de raqueta. Las dos listas vuelven a
  coincidir.

### Añadido

- **"Mis deportes" en Perfil.** El onboarding era de un solo tiro: quien elegía
  solo pádel no tenía forma de declarar su categoría de tenis después, y la API
  lo frenaba con `CATEGORIA_NO_COMPATIBLE` al crear o unirse a un partido de
  otro deporte. La nueva pantalla reusa la misma página del onboarding y
  precarga los perfiles guardados —obligatorio, porque el `PUT` reemplaza la
  lista completa de perfiles y categorías— junto con la mano dominante, que
  también se re-envía en cada guardado.

## [1.0.2] - 2026-09-04

### Cambiado

- **Los horarios pasados los decide ahora el servidor.** El cubit de reserva
  ocultaba los horarios de hoy comparándolos contra el reloj del dispositivo
  reetiquetado como UTC. Eso acierta solo si el usuario está en el mismo huso
  que la cancha: alguien en Madrid mirando una sede de Caracas veía como
  reservables horarios que ya habían pasado hacía medio día. El cliente ahora
  solo oculta los horarios que la API marcó con `reason: 'PAST'`.

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
