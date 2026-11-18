# Club Smoothie Lab — Tarjeta de lealtad digital

Sistema propio de tarjeta de lealtad para **Smoothie Lab** (Plaza Luna,
Zibatá, Querétaro) que reemplaza a WonCards. La tarjeta vive en **Apple
Wallet** (iPhone) y **Google Wallet** (Android), sin que el cliente descargue
ninguna app.

**Programa:** 1 sello por smoothie comprado · **8 sellos = 1 smoothie gratis.**
**Geofence:** notificación cuando el cliente está a menos de **200 m** de la
tienda.

> ⚠️ **Esto es una demo completa y funcional en local, no el sistema en
> producción.** Los pases reales necesitan certificados de Apple y Google
> (ver `docs/PRODUCCION.md`). En la demo, los botones de wallet muestran el
> aviso honesto y descargan/muestran los archivos de ejemplo.

## Estructura

```
smoothie-lab-loyalty/
├── index.html                  Landing del cliente (registro, QR, tarjeta)
├── config.js                   TODAS las reglas configurables en un solo lugar
├── admin/
│   └── index.html              Panel del negocio (reportes, modo cajero, notificaciones)
├── assets/
│   └── pass/
│       ├── pass.json           Plantilla real del pase de Apple (storeCard)
│       ├── README-pass.md      Cómo firmar el .pkpass en producción
│       └── images/             icon, logo y strip generados del logo real
│                               (7 PNG; se suben por la web de GitHub, ver nota abajo)
├── google-wallet/
│   ├── loyaltyClass.json       Plantilla del programa (LoyaltyClass)
│   ├── loyaltyObject.example.json  Tarjeta de ejemplo de un miembro
│   ├── generate-jwt.py         Genera el enlace "Save to Google Wallet"
│   └── README-google.md        Pasos de producción de Google Wallet
├── server/
│   ├── server.js               Servidor de referencia (PassKit Web Service + API)
│   ├── package.json
│   ├── .env.example            Variables que necesita el servidor
│   └── README-server.md
├── data/
│   └── demo-members.json       12 miembros de ejemplo para el panel
├── docs/
│   ├── COMO-FUNCIONA.md        Explicación sencilla + WonCards vs. propio
│   └── PRODUCCION.md           Checklist de puesta en producción
└── .nojekyll                   Para publicar en GitHub Pages
```

## Probarlo en local

```bash
cd smoothie-lab-loyalty
python3 -m http.server 8000
```

Abre en el navegador:

- **Landing del cliente:** http://localhost:8000/
- **Panel del negocio:** http://localhost:8000/admin/

También puedes abrir `index.html` directamente con doble clic, pero el panel
necesita el servidor local para cargar `data/demo-members.json` (por la
política CORS de los navegadores).

### Qué probar en la demo

1. **Registro:** pon tu nombre y celular → recibes tu ID de miembro (SL-XXXX)
   y tu QR único. La tarjeta de arriba se actualiza con tus datos.
2. **Tarjeta interactiva:** usa "Probar: +1 sello" y mira cómo avanzan las 8
   casillas y la barra de progreso.
3. **Botones de wallet:** "Añadir a Apple Wallet" descarga el `pass.json` de
   ejemplo; "Añadir a Google Wallet" muestra el enlace JWT de ejemplo. Ambos
   explican qué falta para el pase real.
4. **Geolocalización (interna):** la geocerca de 200 m vive solo en el pase
   (`locations` + `maxDistance` en `assets/pass/pass.json`); la landing ya no
   muestra nada de ubicación al cliente.
5. **Panel admin:** revisa las estadísticas, la gráfica de visitas, el top de
   clientes y la tabla de miembros con buscador.
6. **Modo cajero:** escribe `SL-0001` (o escanea su QR con la cámara) y suma 1
   sello: verás la tarjeta actualizada y el mensaje de la visita, editable
   antes de enviar. Si llega a 8 sellos, aparece "Canjear smoothie gratis".
   **Cumpleaños:** el panel muestra los cumpleaños de hoy y de los próximos 7
   días (Mariana Torres cumple hoy, 18 nov) y la promo editable.
   **Plantillas:** edita los mensajes de visita y de cumpleaños; se guardan en
   el navegador.
7. **Enviar notificación:** escribe título y mensaje y mira la vista previa en
   el mockup de teléfono, con la explicación del flujo real en Apple y Google.

## Publicarlo en GitHub Pages

```bash
git init
git add .
git commit -m "Club Smoothie Lab: tarjeta de lealtad digital"
git remote add origin https://github.com/Smoothielab/smoothie-lab-loyality.git
git push -u origin main
```

Luego en GitHub: **Settings → Pages → Deploy from a branch → main → /(root)**.
El sitio quedará en `https://smoothielab.github.io/smoothie-lab-loyality/`.

> Las imágenes del pase (icon, logo, strip — 7 PNG en `assets/pass/images/`)
> son archivos binarios y la API de GitHub no permite subirlos desde Muse:
> súbelos desde la web de GitHub (arrastrar y soltar) con el ZIP que te pasé
> en el chat. Sin esos PNG, la landing muestra el ícono roto. El logo
> original en JPG queda fuera del repo; no lo usa ninguna página del sitio.

> El archivo `.nojekyll` ya está incluido para que GitHub Pages sirva los
> archivos tal cual (sin procesarlos con Jekyll).

## WonCards vs. sistema propio

| | WonCards (actual) | Sistema propio |
|---|---|---|
| Costo mensual | $399 MXN/mes (Básico, 1 promo, 1 sucursal) | $0 de suscripción |
| Costo anual aprox. | $4,788 MXN | ~$3,000–$4,000 MXN (Apple $99 USD/año + hosting + dominio) |
| Tarjeta | Apple Wallet y Google Wallet, sin app | Igual |
| Notificación a 200 m | Sí | Sí |
| Promociones simultáneas | 1 (Básico) | Sin límite |
| Sucursales | 1 (Básico) | Sin límite |
| Datos de clientes | En la plataforma de WonCards | 100% tuyos, en tu servidor |
| Notificaciones push | Incluidas | Apple: sin tope · Google: máx. 3 por pase cada 24 h |

Detalle completo en `docs/COMO-FUNCIONA.md`. Checklist de producción en
`docs/PRODUCCION.md`.

## Cómo se ve la tarjeta en cada wallet

- **Apple Wallet:** archivo `.pkpass` firmado (ver `assets/pass/`). El iPhone
  registra el dispositivo en tu servidor y recibe un push APNs vacío cuando
  cambia el pase; el texto de la notificación sale de `changeMessage`.
- **Google Wallet:** `LoyaltyClass` (plantilla) + `LoyaltyObject` por cliente
  (ver `google-wallet/`). Se distribuye con el enlace "Save to Google Wallet"
  (JWT RS256 firmado con una service account).

## Seguridad

**No hay ninguna credencial, llave o secreto real en este repositorio.**
Todo lo sensible va como placeholder marcado `TODO` / `REEMPLAZAR`:
`teamIdentifier`, `authenticationToken`, issuer ID de Google, rutas de
certificados y claves. Los secretos reales van en el servidor, fuera del
repositorio, con permisos restringidos.
