# Pase de Apple Wallet (.pkpass) — Smoothie Lab

El pase de Apple Wallet es un archivo **`.pkpass`**: un ZIP firmado que contiene
`pass.json` (este directorio), las imágenes y un `manifest.json` con los hashes
SHA-1 de cada archivo, más una firma PKCS#7 (Detached) generada con tu
certificado **Pass Type ID**.

## Archivos de este directorio

| Archivo | Para qué sirve |
|---|---|
| `pass.json` | Plantilla real del pase (storeCard). Cambia `teamIdentifier`, `authenticationToken` y los datos del miembro por cada cliente. |
| `images/icon.png`, `icon@2x.png`, `icon@3x.png` | Rayo dorado (29, 58 y 87 px). |
| `images/logo.png`, `logo@2x.png` | Texto "SMOOTHIE LAB" en blanco (160 y 320 px de ancho). |
| `images/strip.png`, `strip@2x.png` | Franja del pase (375x98 y 750x196). |

Las imágenes se generaron a partir del logo real de Smoothie Lab. Si cambias el
logo, vuelve a generarlas manteniendo estos tamaños y nombres.

## Qué necesitas en producción

1. **Apple Developer Program** ($99 USD/año) con la cuenta de Smoothie Lab.
2. Un **Pass Type ID** creado en el portal de desarrolladores, por ejemplo
   `pass.com.smoothielab.loyalty` (el mismo que lleva `pass.json`).
3. El **certificado** del Pass Type ID exportado como `.p12` (con su contraseña).
4. El **certificado WWDR** de Apple (Apple Worldwide Developer Relations),
   descargable del portal.
5. Un servidor con **HTTPS** que responda al `webServiceURL` del pase
   (ver `../../server/`).

## Cómo firmar el .pkpass (manual, con openssl)

```bash
# 1. Arma el directorio del pase
mkdir -p build/SL-0001.pkpass
cp pass.json build/SL-0001.pkpass/
cp -r images/* build/SL-0001.pkpass/   # icon.png, logo.png, strip.png...

# 2. Genera manifest.json con los SHA-1 de cada archivo (excepto manifest y signature)
python3 - <<'EOF'
import hashlib, json, os
d = "build/SL-0001.pkpass"
manifest = {}
for name in sorted(os.listdir(d)):
    if name in ("manifest.json", "signature"):
        continue
    with open(os.path.join(d, name), "rb") as f:
        manifest[name] = hashlib.sha1(f.read()).hexdigest()
with open(os.path.join(d, "manifest.json"), "w") as f:
    json.dump(manifest, f)
EOF

# 3. Firma el manifest con tu certificado Pass Type ID (PKCS#7 detached, DER)
openssl smime -binary -sign \
  -certfile WWDR.pem \
  -signer pass-cert.pem -inkey pass-key.pem \
  -in build/SL-0001.pkpass/manifest.json \
  -out build/SL-0001.pkpass/signature -outform DER

# 4. Empaqueta el ZIP (sin comprimir carpetas extra)
cd build && zip -r SL-0001.pkpass SL-0001.pkpass -x "*.DS_Store"
```

## Forma recomendada: hacerlo en el servidor

No firmes pases a mano para cada cliente. El servidor (`../../server/`) genera
el `.pkpass` al momento del registro usando una librería:

- **Node.js:** [`pass-js`](https://www.npmjs.com/package/pass-js) o `passkit-generator`.
- **Python:** `wallet-py` (o el mismo flujo openssl desde el servidor).

El flujo es: cliente se registra → servidor crea su `pass.json` con su ID y sus
sellos → firma el ZIP → lo sirve en `https://tu-dominio/pases/SL-0001.pkpass`
con el MIME `application/vnd.apple.pkpass`. El iPhone lo abre y lo agrega a Wallet.

## Cómo se actualiza el pase cuando el cliente gana un sello

1. El iPhone, al instalar el pase, **registra el dispositivo** en tu servidor
   (`POST /v1/devices/.../registrations/...`, ver `server/server.js`).
2. Cuando el cajero suma un sello, el servidor genera el pase nuevo y manda un
   **push APNs vacío** al dispositivo registrado.
3. El iPhone descarga el pase actualizado y muestra en la pantalla de bloqueo el
   texto de `changeMessage` (por ejemplo: "¡Ya llevas 6 sellos!").

## Notificaciones de cercanía (geofence)

El pase lleva `locations` (la coordenada de Plaza Luna) y `maxDistance: 200`.
Cuando el cliente está a menos de 200 m, iOS muestra el pase en la pantalla de
bloqueo con el `relevantText`: "¡Estás en Smoothie Lab! Tu tarjeta está lista."
No necesitas enviar nada: lo dispara el sistema operativo.

## Errores comunes

- **El pase no se instala:** casi siempre es `teamIdentifier` o el certificado
  incorrecto, o el ZIP con una carpeta extra dentro. El ZIP debe contener los
  archivos en la raíz.
- **No llegan las actualizaciones:** revisa que `webServiceURL` use HTTPS y que
  el servidor responda al registro del dispositivo; sin registro no hay push.
- **La firma no valida:** el certificado WWDR debe ser el vigente; si Apple lo
  renueva, vuelve a descargar `WWDR.pem`.
