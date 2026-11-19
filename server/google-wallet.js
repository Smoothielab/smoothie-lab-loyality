/**
 * google-wallet.js — Conexión con Google Wallet (API REST + Save to Wallet).
 *
 * La clase 3388000000023246423.club-smoothie-lab ya existe y está aprobada
 * en Google Pay & Wallet Console.
 *
 * Flujo oficial de Google ("Save to Wallet" con JWT):
 *  - Al registrarse un cliente, el servidor arma su LoyaltyObject y firma
 *    un JWT RS256 con la service account. Ese JWT es el enlace
 *    https://pay.google.com/gp/v/save/<JWT> que instala la tarjeta.
 *  - El objeto NO se inserta antes por API: Google lo crea cuando el
 *    cliente guarda la tarjeta con el enlace.
 *  - Al sumar sellos, el servidor hace PATCH al objeto (si el cliente ya
 *    guardó la tarjeta; si todavía no, el PATCH da 404 y se ignora: el
 *    siguiente enlace que se genere ya lleva el saldo nuevo).
 *
 * La clave de la service account NUNCA va en el repo ni en el navegador.
 * Llega por GOOGLE_APPLICATION_CREDENTIALS (ruta a un archivo JSON, p. ej.
 * un secret file de Render) o GOOGLE_APPLICATION_CREDENTIALS_JSON
 * (el contenido del JSON en una variable de entorno).
 * Sin clave, el módulo queda deshabilitado y /api/members lo indica.
 */

const fs = require("fs");
const jwt = require("jsonwebtoken");
const { GoogleAuth } = require("google-auth-library");

const ISSUER_ID = process.env.GOOGLE_WALLET_ISSUER_ID || "3388000000023246423";
const CLASS_SUFFIX = "club-smoothie-lab";
const CLASS_ID = `${ISSUER_ID}.${CLASS_SUFFIX}`;
const WALLET_API = "https://walletobjects.googleapis.com/walletobjects/v1";
const SCOPES = ["https://www.googleapis.com/auth/wallet_object.issuer"];

function loadServiceAccount() {
  try {
    if (process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON) {
      return JSON.parse(process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON);
    }
    const path = process.env.GOOGLE_APPLICATION_CREDENTIALS;
    if (path && fs.existsSync(path)) {
      return JSON.parse(fs.readFileSync(path, "utf8"));
    }
  } catch (e) {
    console.error("[wallet] No se pudo leer la service account:", e.message);
  }
  return null;
}

const serviceAccount = loadServiceAccount();
let auth = null;
if (serviceAccount) {
  auth = new GoogleAuth({ credentials: serviceAccount, scopes: SCOPES });
}

function isConfigured() {
  return !!serviceAccount;
}

function buildLoyaltyObject(member) {
  return {
    id: `${ISSUER_ID}.${member.id}`,
    classId: CLASS_ID,
    state: "active",
    accountId: member.id,
    accountName: member.name,
    loyaltyPoints: {
      label: "sellos",
      balance: { int: String(member.stamps) },
    },
    secondaryLoyaltyPoints: {
      label: "smoothies gratis",
      balance: { int: member.stamps >= 8 ? "1" : "0" },
    },
    barcode: { type: "QR_CODE", value: member.id },
  };
}

function createSaveLink(member) {
  if (!serviceAccount) return null;
  const claims = {
    iss: serviceAccount.client_email,
    aud: "google",
    typ: "savetowallet",
    payload: { loyaltyObjects: [buildLoyaltyObject(member)] },
  };
  const token = jwt.sign(claims, serviceAccount.private_key, { algorithm: "RS256" });
  return `https://pay.google.com/gp/v/save/${token}`;
}

async function getAccessToken() {
  const client = await auth.getClient();
  const { token } = await client.getAccessToken();
  return token;
}

async function patchStamps(member) {
  if (!serviceAccount) return { updated: false, reason: "wallet-no-configurado" };
  const objectId = `${ISSUER_ID}.${member.id}`;
  try {
    const token = await getAccessToken();
    const res = await fetch(`${WALLET_API}/loyaltyObject/${objectId}`, {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        loyaltyPoints: {
          label: "sellos",
          balance: { int: String(member.stamps) },
        },
        secondaryLoyaltyPoints: {
          label: "smoothies gratis",
          balance: { int: member.stamps >= 8 ? "1" : "0" },
        },
      }),
    });
    if (res.status === 404) {
      // El cliente aún no guarda la tarjeta: no hay objeto que actualizar.
      return { updated: false, reason: "objeto-aun-no-guardado" };
    }
    if (!res.ok) {
      console.error("[wallet] PATCH sellos falló:", res.status, (await res.text()).slice(0, 300));
      return { updated: false, reason: `http-${res.status}` };
    }
    return { updated: true };
  } catch (e) {
    console.error("[wallet] PATCH sellos error:", e.message);
    return { updated: false, reason: "error-red" };
  }
}

module.exports = {
  ISSUER_ID,
  CLASS_ID,
  isConfigured,
  buildLoyaltyObject,
  createSaveLink,
  patchStamps,
};
