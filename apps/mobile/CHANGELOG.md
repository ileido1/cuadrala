# Changelog

Todos los cambios notables de la app móvil/web se documentan en este archivo.

El formato sigue [Keep a Changelog](https://keepachangelog.com/es-ES/1.1.0/)
y el versionado sigue [SemVer](https://semver.org/lang/es/).

## [1.1.0] - 2026-09-07

### Agregado

- **La tarjeta del listado de torneos responde "¿puedo entrar?".** Rediseño del
  handoff: pill de estado, categoría, nombre, cuándo, dónde, ocupación
  (`11/16 inscriptos` con barra) y precio por jugador.

  Consume los campos nuevos de la API 1.3.0 (`venueName`, `inscriptionPrice`,
  `maxSlots`, `registrationClosesAt`). Lo que el organizador no declaró **no se
  inventa**: la fila desaparece en vez de mostrarse vacía. Un precio `0`
  declarado dice **Gratis**, que no es lo mismo que un precio ausente.

  El importe en Bs queda fuera a propósito: la conversión necesita la tasa real
  y `DualPrice` es presentacional.

### Corregido

- **El listado de torneos mostraba el estado en crudo.** La tarjeta traducía
  `REGISTRATION_OPEN`, `REGISTRATION_CLOSED` y `FINISHED`, estados de un modelo
  anterior que ya no existen: los reales (`OPEN`, `COMPLETED`) caían en el
  `default` y al usuario le aparecía el valor del enum en gris.

  El arreglo de la v1.0.8 se había hecho sólo en `tournament_status_view.dart`,
  que alimenta el detalle, y nunca llegó a la tarjeta. Ahora las dos pantallas
  usan el mismo traductor a través del nuevo `TournamentStatusPill`.

## [1.0.10] - 2026-09-05

### Corregido

- **La pestaña Calendario del torneo mostraba vacío siempre.** La app esperaba
  el cuadro armado y la API devolvía la estructura cruda del formato, sin
  nombres ni horarios. No fallaba: mostraba el estado vacío como si el
  calendario no existiera. Ahora se ve quién juega contra quién, cuándo y en qué
  cancha.

## [1.0.9] - 2026-09-05

### Añadido

- **Confirmar a todos los inscriptos de una vez.** Con dieciséis anotados,
  confirmar de a uno son dieciséis toques, y saltearse a alguien lo dejaba
  afuera del cuadro sin que nadie se enterara.
- **Aviso antes de generar el calendario.** Si quedan inscripciones sin
  confirmar o jugadores sin pareja, ahora se dice antes de tocar el botón y con
  el número exacto — no después, en forma de error.

## [1.0.8] - 2026-09-05

### Añadido

- **Ya podés ver cuándo y dónde jugás.** Cada partido tuyo del torneo muestra
  día, hora, cancha, tu compañero y contra quién jugás — antes todos los
  partidos heredaban la hora de inicio del torneo y ninguno tenía cancha, así
  que el dato directamente no existía.
- **Podés decir si te sirve el horario.** Cuando el partido ya tiene cancha
  apartada, aparecen "Me sirve" y "No puedo". Si aceptan todos, la cancha queda
  reservada en firme; si alguien no puede, se libera y el organizador lo
  reubica.

## [1.0.7] - 2026-09-05

### Añadido

- **Torneos de pádel en duplas fijas.** Te inscribís solo, como en cualquier
  torneo, y el organizador arma las parejas desde la pestaña de registrados.
  Cada dupla se ve en una fila —cuatro nombres sueltos no dicen quién juega con
  quién— y abajo queda la lista de quienes todavía esperan compañero, con el
  número a la vista: una inscripción sin dupla frena la generación del cuadro.
  En torneos individuales la pantalla no cambia.
- **El organizador puede cerrar el horario de un partido sin esperar a los
  jugadores.** En americano y en los formatos que juegan una ronda entera a la
  vez, es el organizador quien lleva el proceso.

## [1.0.6] - 2026-09-05

### Añadido

- **El torneo ahora avisa.** Antes no emitía ninguna notificación: te anotabas y
  quedabas pendiente sin saberlo, el organizador te confirmaba en silencio, el
  calendario salía en silencio y el torneo arrancaba en silencio — y el
  organizador tampoco se enteraba de que tenía una inscripción esperando. Se
  suman cuatro avisos: inscripción recibida, inscripción confirmada, calendario
  publicado y torneo iniciado.

### Corregido

- **Una partida cancelada llevaba a distinto lado según cómo llegara el aviso.**
  Con la app abierta abría el detalle de la partida; si llegaba como
  notificación del sistema, caía en el listado de avisos. Eran dos copias del
  mismo código que se habían separado. Ahora la decisión es una sola.

## [1.0.5] - 2026-09-05

### Cambiado

- **Ahora te podés anotar a un torneo publicado.** La autoinscripción solo se
  admitía mientras el torneo estaba en "Borrador"; al publicarlo pasaba a
  "OPEN" y el jugador recibía un error, aunque el organizador sí podía seguir
  invitando gente. El estado que se lee como "abierto, anotate" era justo donde
  la puerta pública estaba cerrada. La ventana de inscripción ahora es la misma
  para las cuatro acciones sobre el plantel.

### Corregido

- **El botón de inscripción ofrecía una acción imposible.** No miraba el estado
  del torneo: se mostraba siempre, y con el torneo en curso la API respondía
  con un error que aparecía en rojo al lado del botón. Ahora aparece solo
  cuando se puede entrar, y si no, explica por qué.
- **Los estados del torneo se mostraban sin traducir.** La pantalla traducía
  tres estados que ya no existen en la API, así que los reales —"OPEN",
  "COMPLETED"— llegaban crudos al usuario.
- **No se distinguía estar anotado de estar aceptado.** El único texto era
  "Cancelar inscripción", así que quien esperaba la aprobación del organizador
  no tenía forma de saberlo — y el cuadro se arma solo con los confirmados.

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
