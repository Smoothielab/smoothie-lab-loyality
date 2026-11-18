# Checklist de puesta en producción

Pasos para pasar de esta demo al sistema real, en orden. Marca cada uno
cuando esté listo.

## 1. Apple Wallet

- [ ] Crear cuenta en **Apple Developer Program** ($99 USD/año) a nombre de
      Smoothie Lab.
- [ ] Crear el **Pass Type ID** `pass.com.smoothielab.loyalty` en el portal.
- [ ] Generar el **certificado** del Pass Type ID y exportarlo como `.p12`.
- [ ] Descargar el certificado **WWDR** vigente de Apple.
- [ ] Crear una **clave APNs (.p8)** para enviar los push (Keys en el portal).
- [ ] Anotar el **Team ID** y ponerlo en `assets/pass/pass.json`
      (`teamIdentifier`) y en el `.env` del servidor.
- [ ] Probar el pase firmado en un iPhone real antes de imprimir QRs.

## 2. Google Wallet

- [ ] Crear proyecto en **Google Cloud** y habilitar la **Google Wallet API**.
- [ ] Crear una **service account** con el rol **Wallet Object Issuer** y
      descargar su JSON (guardarlo solo en el servidor).
- [ ] Crear la **cuenta de emisor** en Google Pay & Wallet Console con el
      perfil de negocio de Smoothie Lab.
- [ ] Crear y publicar la **LoyaltyClass** (`google-wallet/loyaltyClass.json`).
- [ ] Agregar correos de prueba y validar el flujo en **modo demo**.
- [ ] Solicitar el **acceso de publicación** y esperar la aprobación de Google.

## 3. Dominio y servidor

- [ ] Comprar o usar un dominio (ej. `lealtad.smoothielab.mx`).
- [ ] Desplegar el servidor (`server/`) con **HTTPS** (obligatorio para Apple).
- [ ] Poner los valores reales en `config.js` (`webServiceURL`, `installDomain`)
      y en el `.env` del servidor.
- [ ] Cambiar el almacenamiento en memoria por una **base de datos**
      (SQLite para empezar, Postgres al crecer).
- [ ] Verificar que el servidor responde a los endpoints de Apple
      (`/v1/devices/...`, `/v1/passes/...`).
- [ ] Probar el flujo completo con un iPhone y un Android reales: registro →
      sello en caja → notificación → canje del premio.

## 4. Contenido y materiales

- [ ] Confirmar las reglas del programa: 8 sellos = 1 smoothie gratis
      (o el número que decidas en `config.js`).
- [ ] Imprimir el **QR del mostrador** apuntando a la URL de instalación
      (la landing de este proyecto).
- [ ] Revisar los textos de las notificaciones (cercanía, sello ganado,
      premio listo).
- [ ] Capacitar al equipo de caja en el **Modo cajero** del panel.

## 5. Migrar clientes de WonCards (sin perder sellos)

- [ ] **Exportar los datos** de WonCards: nombre, celular, sellos actuales y
      fecha de registro de cada cliente.
- [ ] **Importarlos** al servidor nuevo con sus sellos intactos.
- [ ] **Re-emitir las tarjetas**: cada cliente recibe su nuevo QR (por
      WhatsApp o en el mostrador) y agrega la tarjeta nueva a su wallet.
      La tarjeta de WonCards deja de usarse; para no confundir, avisa el
      cambio con una notificación de WonCards antes de cancelar el plan.
- [ ] **Verificar** que ningún cliente pierda sellos: compara el total de
      sellos antes y después de la migración.
- [ ] **Cancelar WonCards** solo cuando la migración esté verificada y los
      clientes ya tengan la tarjeta nueva.

## 6. Costos anuales estimados (producción)

| Concepto | Costo aprox. |
|---|---|
| Apple Developer Program | $99 USD/año (~$1,700 MXN) |
| Hosting del servidor (VPS básico) | ~$5–10 USD/mes (~$1,000–$2,000 MXN/año) |
| Dominio | ~$200–$300 MXN/año |
| Google Wallet | $0 (sin costo por emitir tarjetas) |
| **Total** | **~$3,000–$4,000 MXN/año** |

Comparado con WonCards Básico ($4,788 MXN/año) el ahorro es modesto el primer
año, pero el sistema propio no tiene límite de promociones ni de sucursales,
y los datos de tus clientes son 100% tuyos.

## Riesgos que hay que conocer

- **Apple puede rechazar el Pass Type ID** si el certificado no coincide con
  el `passTypeIdentifier` del pase. Revisa que sean exactamente iguales.
- **Google puede tardar días** en aprobar el acceso de publicación. Pídelo
  con tiempo, no el día del lanzamiento.
- **Sin HTTPS no funciona Apple Wallet**: es un requisito duro, no opcional.
- **Las notificaciones de Google son limitadas** (3 por pase cada 24 h) y
  Google controla el texto de cercanía.
