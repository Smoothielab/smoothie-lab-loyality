# Servidor — Club Smoothie Lab

Servidor de referencia en Node.js (Express) que implementa:

1. **PassKit Web Service v1 de Apple**: registro de dispositivos, consulta de
   pases actualizados, descarga del pase y baja. Sin esto, el iPhone no puede
   recibir las actualizaciones de sellos en su pase.
2. **API propia del negocio**: registrar miembros, sumar sellos, canjear el
   premio y mandar notificaciones.
3. **Google Wallet** (`google-wallet.js`): `POST /api/members` genera el
   enlace real "Save to Google Wallet" (JWT firmado con la service account),
   `POST /api/stamp` actualiza los sellos por PATCH y `GET /r/:memberId`
   redirige al enlace de guardado (URL corta para el QR). La clase
   `3388000000023246423.club-smoothie-lab` ya existe y está aprobada.

## Probar en local

```bash
cd server
npm install
GOOGLE_APPLICATION_CREDENTIALS=/ruta/a/service-account.json npm start
# El servidor escucha en http://localhost:3000
```

Sin la variable `GOOGLE_APPLICATION_CREDENTIALS` (o
`GOOGLE_APPLICATION_CREDENTIALS_JSON` con el contenido del JSON), el
servidor arranca igual pero `/api/members` devuelve `saveLink: null` y la
página muestra el aviso de demo.

Prueba los endpoints (en otra terminal):

```bash
# Registrar un miembro
curl -X POST localhost:3000/api/members -H 'Content-Type: application/json' \
  -d '{"name":"Mariana Torres","phone":"4421234567"}'

# Sumar 1 sello
curl -X POST localhost:3000/api/stamp -H 'Content-Type: application/json' \
  -d '{"memberId":"SL-0001"}'

# Ver el pass.json que recibiría el iPhone
curl localhost:3000/v1/passes/pass.com.smoothielab.loyalty/SL-0001 \
  -H 'Authorization: ApplePass TOKEN_DEMO'
```

> Nota: el servidor guarda todo en memoria; al reiniciar se pierden los datos.
> Es a propósito: es una referencia, no el sistema final.

## Qué falta para producción

| Necesidad | Dónde se consigue | Dónde va |
|---|---|---|
| Certificado **Pass Type ID** (.p12) | Apple Developer → Certificates | `PASS_CERT_PATH` en `.env` |
| Certificado **WWDR** (.pem) | Portal de Apple Developer | `WWDR_CERT_PATH` en `.env` |
| Clave **APNs .p8** | Apple Developer → Keys | `APNS_KEY_PATH` en `.env` |
| **Team ID** de Apple | Portal de Apple Developer | `APPLE_TEAM_ID` y `teamIdentifier` en `pass.json` |
| **Dominio + HTTPS** | Tu proveedor de hosting/dominio | `INSTALL_DOMAIN` y `webServiceURL` |
| **Service account de Google** | Google Cloud → IAM | `GOOGLE_APPLICATION_CREDENTIALS` |
| **Cuenta de emisor** de Google Wallet | Google Pay & Wallet Console | `GOOGLE_WALLET_ISSUER_ID` |
| Base de datos | SQLite para empezar, Postgres al crecer | Reemplazar el `Map` en `server.js` |

## Dónde desplegarlo

Cualquier lugar con Node.js y HTTPS: un VPS, Railway, Render, Fly.io o un
servidor propio. Requisitos duros:

- **HTTPS obligatorio**: Apple Wallet no acepta `webServiceURL` en HTTP.
- El dominio debe responder en el puerto 443 con un certificado válido.
- El servidor debe estar siempre encendido: es el que recibe los registros de
  los iPhones y manda los push.

## Cómo se conecta con el resto del proyecto

- La landing (`../index.html`) usa `config.js` para la URL de instalación; en
  producción esa URL apunta a este servidor.
- El panel (`../admin/index.html`) en la demo usa datos locales; en
  producción llamaría a `/api/members` y `/api/stamp` de este servidor.
- El pase de Apple (`../assets/pass/pass.json`) lleva el `webServiceURL` de
  este servidor.
- Google Wallet (`../google-wallet/`) se alimenta desde `/api/members` y
  `/api/stamp` (crear y actualizar el LoyaltyObject por cliente).
