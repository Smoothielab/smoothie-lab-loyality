# Google Wallet — Club Smoothie Lab

La tarjeta de Google Wallet se compone de dos recursos que se crean por la
API REST de Google Wallet (`walletobjects.googleapis.com`):

| Recurso | Qué es | Archivo de ejemplo |
|---|---|---|
| **LoyaltyClass** | La plantilla del programa: nombre, logo, colores, ubicaciones. Se crea una sola vez. | `loyaltyClass.json` |
| **LoyaltyObject** | La tarjeta de cada cliente: sus sellos, su código QR, su ID. Uno por miembro. | `loyaltyObject.example.json` |

El cliente la guarda con un enlace **"Save to Google Wallet"**:
`https://pay.google.com/gp/v/save/<JWT>`, que se firma con una service
account (ver `generate-jwt.py`).

## Pasos de producción

1. **Google Cloud:** crea un proyecto y habilita la **Google Wallet API**.
2. **Service account** en ese proyecto, con el rol **Wallet Object Issuer**.
   Descarga su JSON y guárdalo en el servidor (nunca en el repositorio).
3. **Google Pay & Wallet Console** (pay.google.com/business/console):
   crea tu **cuenta de emisor** con el perfil de negocio de Smoothie Lab.
4. **Modo demo:** al inicio la cuenta solo permite usuarios de prueba.
   Agrega correos de prueba (los del equipo) para validar el flujo.
5. **Crea la LoyaltyClass** con la API (o con el ejemplo de este repo) y
   **publica la clase**. Sin clase publicada, los clientes no pueden guardar
   la tarjeta.
6. **Pide acceso de publicación:** en la consola, completa el perfil de
   negocio y solicita la aprobación. Google revisa que exista al menos una
   clase publicada.
7. **Crea el LoyaltyObject por cliente** al registrarse, y genera su enlace
   de guardado con `generate-jwt.py` (o desde el servidor, ver `../server/`).
8. **Actualiza el objeto** cuando el cajero suma un sello (PATCH al objeto).
   Si quieres que al cliente le llegue notificación, usa un mensaje
   `TEXT_AND_NOTIFY` en la actualización.

## Notificaciones

- **Cercanía (geofence):** la clase lleva `merchantLocations` (la coordenada
  de Plaza Luna; hasta 10 por clase y 10 por objeto). **Google decide** la
  distancia, el momento y el texto de la notificación. No es configurable
  como en Apple.
- **Mensajes del negocio:** máximo **3 mensajes por pase cada 24 horas**.
  Pasarte de ese límite hace que Google no los entregue.
- **Requisitos del cliente:** debe tener activadas las notificaciones del
  pase y la ubicación precisa siempre activa; si no, no recibe los avisos
  de cercanía.

## Límites que debes conocer

- La clase empieza en `reviewStatus: underReview` hasta que Google la aprueba.
- Los mensajes `TEXT_AND_NOTIFY` no garantizan entrega inmediata: Google los
  puede agrupar o retrasar.
- Los datos del cliente (nombre, celular) los guarda tu servidor; Google solo
  recibe lo necesario para el pase (ID, sellos, nombre visible).
