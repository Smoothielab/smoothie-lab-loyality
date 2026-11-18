# Cómo funciona el sistema propio de lealtad de Smoothie Lab

Explicación en lenguaje sencillo, sin tecnicismos innecesarios. Para el detalle
técnico, ver `assets/pass/README-pass.md`, `google-wallet/README-google.md` y
`server/README-server.md`.

## La idea en una frase

El cliente escanea un QR, la tarjeta se guarda en la wallet que ya trae su
celular (Apple Wallet en iPhone, Google Wallet en Android) y cada smoothie le
da un sello. Al juntar 8, el siguiente es gratis. Sin descargar ninguna app.

## WonCards vs. sistema propio

| | WonCards (actual) | Sistema propio (este proyecto) |
|---|---|---|
| **Costo mensual** | $399 MXN/mes (Básico: 1 promoción, 1 sucursal). Pro $599, Empresarial $749. Precios verificados en woncards.com en octubre de 2026. | $0 de suscripción. Costo fijo: Apple Developer $99 USD/año + hosting del servidor (desde ~$5 USD/mes). |
| **Dónde vive la tarjeta** | Apple Wallet y Google Wallet, sin app | Igual: Apple Wallet y Google Wallet, sin app |
| **Sellos y premio** | Lo configuras en su panel | 8 sellos = 1 smoothie gratis (configurable en `config.js`) |
| **Notificación al pasar cerca** | Sí, a 200 m de la tienda | Sí, a 200 m (configurable en `config.js`) |
| **Notificaciones push** | Incluidas, sin tope publicado | Apple: sin tope propio (push APNs). Google: máx. 3 mensajes por pase cada 24 h |
| **Reportes** | Estadísticas en su panel | Panel propio (`admin/`): tarjetas activas, sellos, canjes, visitas por día, top clientes |
| **Tus datos** | Viven en la plataforma de WonCards; los exportas cuando quieras | Viven en tu propio servidor: son 100% tuyos |
| **Promociones simultáneas** | 1 en el plan Básico (para más, sube de plan) | Sin límite: las que tú quieras |
| **Sucursales** | 1 en el plan Básico | Sin límite |
| **Qué tienes que hacer tú** | Nada técnico: te registras y usas su panel | Conseguir los certificados de Apple y Google (una vez) y mantener el servidor encendido |

**Ahorro estimado:** WonCards Básico cuesta $4,788 MXN al año. El sistema
propio cuesta ~$99 USD/año de Apple Developer (~$1,700 MXN) + hosting
(~$1,000–$2,000 MXN/año). Se paga solo en el primer año y después el ahorro
es mayor, además de no tener límite de promociones ni sucursales.

## Cómo funciona la geolocalización

### En iPhone (Apple Wallet)

La tarjeta (el pase) lleva guardadas hasta 10 coordenadas. La de Smoothie Lab
es Plaza Luna (20.62718, -100.45929) con un radio de 200 metros. Cuando el
iPhone detecta que el cliente está dentro de ese radio, el pase **aparece solo
en la pantalla de bloqueo** con el texto "¡Estás en Smoothie Lab! Tu tarjeta
está lista." No hay que enviar nada: lo hace el sistema operativo del teléfono.

### En Android (Google Wallet)

La tarjeta lleva las ubicaciones del negocio (`merchantLocations`, hasta 10 por
tarjeta). Cuando el cliente pasa cerca, Google Wallet le muestra la tarjeta.
La diferencia: **Google decide** la distancia exacta, el momento y el texto de
la notificación; tú no lo controlas como en Apple. Además, el cliente debe
tener activadas las notificaciones del pase y la ubicación precisa siempre
activa.

### En esta demo

La landing tiene una sección "¿Estoy cerca de Smoothie Lab?" que usa el GPS
de tu navegador y calcula la distancia con la fórmula haversine. Si estás a
menos de 200 m, te muestra cómo se vería la notificación en la pantalla de
bloqueo. Tu ubicación no se envía a ningún servidor: el cálculo se hace en tu
propio navegador.

## Cómo funcionan las notificaciones push

### Cuando el cliente gana un sello (Apple)

1. El cajero suma el sello en el panel.
2. El servidor genera el pase actualizado (con el sello nuevo).
3. El servidor manda un **push vacío** al iPhone del cliente (por APNs, el
   servicio de notificaciones de Apple).
4. El iPhone descarga el pase nuevo y muestra en la pantalla de bloqueo el
   texto que programaste, por ejemplo: "¡Ya llevas 6 sellos!"

El cliente no tiene que abrir nada: el aviso llega solo.

### Cuando el cliente gana un sello (Google)

El servidor actualiza la tarjeta del cliente en Google Wallet. Si la
actualización lleva un mensaje `TEXT_AND_NOTIFY`, al cliente le llega una
notificación. **Límite de Google: máximo 3 mensajes por tarjeta cada 24
horas.** Por eso los mensajes se usan para cosas que valen la pena (premio
listo, promo del día), no para cada sello.

### Cuando el negocio quiere avisar una promo

Desde el panel (`admin/`), en "Enviar notificación", escribes título y mensaje
y eliges a quién va (todos, los que están a 1 sello del premio, o los que no
vienen desde hace 7 días). En producción el servidor lo envía por Apple y
Google como se explica arriba. En la demo solo se muestra la vista previa.

## Qué reportes lleva el panel

El panel del negocio (`admin/index.html`) muestra:

- **Tarjetas activas:** cuántos miembros tiene el club.
- **Sellos del mes:** cuántos sellos se han dado.
- **Smoothies canjeados:** cuántos premios se han cobrado.
- **Visitas por día:** gráfica de los últimos 7 días.
- **Top clientes:** los que más visitan.
- **Tabla de miembros:** nombre, celular, sellos, visitas, canjes y última
  visita, con buscador.
- **Modo cajero:** busca al cliente por ID o nombre, suma 1 sello y ve la
  notificación que recibiría.

En producción estos reportes salen de la base de datos del servidor, no de
datos de ejemplo.
