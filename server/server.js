/**
 * server.js — Servidor de referencia del programa de lealtad Club Smoothie Lab.
 *
 * Cubre dos cosas:
 *  1. El PassKit Web Service v1 de Apple (para que el iPhone registre el
 *     dispositivo, descargue el pase actualizado y se dé de baja).
 *  2. Endpoints propios del negocio: registrar miembros, sumar sellos,
 *     canjear el premio y mandar notificaciones.
 *
 * ESTADO: referencia funcional con almacenamiento en memoria. Para producción
 * hay que cambiar el store por una base de datos (SQLite/Postgres), generar
 * el .pkpass firmado de verdad (ver assets/pass/README-pass.md) y conectar
 * APNs con la clave .p8. Los puntos marcados TODO lo indican.
 *
 * Uso:
 *   npm install
 *   cp .env.example .env   # y llena los valores reales
 *   npm start              # escucha en http://localhost:3000
 */

const express = require("express");
const fs = require("fs");
const path = require("path");
const wallet = require("./google-wallet");

const app = express();
app.use(express.json());

// CORS: la landing vive en GitHub Pages (otro origen) y llama a esta API.
app.use("/api", (req, res, next) => {
  res.set("Access-Control-Allow-Origin", "*");
  res.set("Access-Control-Allow-Headers", "Content-Type");
  res.set("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  if (req.method === "OPTIONS") return res.status(204).end();
  next();
});

const PORT = process.env.PORT || 3000;
const PASS_TYPE_ID = process.env.PASS_TYPE_IDENTIFIER || "pass.com.smoothielab.loyalty";
const STAMPS_FOR_REWARD = 8;

// ---------------------------------------------------------------------------
// Store en memoria (DEMO). En producción: base de datos.
// ---------------------------------------------------------------------------
const members = new Map(); // serialNumber -> { id, name, phone, stamps, redeemed, visits, lastVisit }
const registrations = new Map(); // serialNumber -> Set de { deviceLibraryIdentifier, pushToken }

// Miembros reales (las tarjetas de Google Wallet ya existen para estos IDs).
// SL-0001 Ricardo Darder (dueño) y SL-0002 Ricardo Jimenez se crearon el
// 19 nov 2026; SL-0003 Mariana Torres es la tarjeta de prueba con 7 sellos.
// Los clientes nuevos empiezan en SL-0004.
members.set("SL-0001", {
  id: "SL-0001", name: "Ricardo Darder", phone: "", stamps: 0, redeemed: 0, visits: 0,
  lastVisit: new Date().toISOString().slice(0, 10),
});
members.set("SL-0002", {
  id: "SL-0002", name: "Ricardo Jimenez", phone: "5532334567", stamps: 0, redeemed: 0, visits: 0,
  lastVisit: new Date().toISOString().slice(0, 10),
});
members.set("SL-0003", {
  id: "SL-0003", name: "Mariana Torres", phone: "", stamps: 7, redeemed: 0, visits: 0,
  lastVisit: new Date().toISOString().slice(0, 10),
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function nextMemberId() {
  const n = members.size + 1;
  return "SL-" + String(n).padStart(4, "0");
}

function buildPassJson(member) {
  // En producción: lee assets/pass/pass.json, sustituye los campos del
  // miembro (serialNumber, primaryFields[0].value, barcode.message, etc.)
  // y firma el ZIP .pkpass con el certificado Pass Type ID.
  const template = JSON.parse(
    fs.readFileSync(path.join(__dirname, "..", "assets", "pass", "pass.json"), "utf8")
  );
  template.serialNumber = member.id;
  template.barcode.message = member.id;
  template.storeCard.primaryFields[0].value = `${member.stamps} de ${STAMPS_FOR_REWARD} sellos`;
  template.storeCard.primaryFields[0].changeMessage = `¡Ya llevas %@ sellos!`;
  template.storeCard.secondaryFields[0].value = member.name;
  template.storeCard.auxiliaryFields[0].value = member.id;
  template.storeCard.headerFields[0].value = String(member.stamps);
  return template;
}

function pushToDevices(serialNumber) {
  // TODO PRODUCCIÓN: mandar un push APNs VACÍO a cada pushToken registrado
  // para este serialNumber. El iPhone, al recibirlo, pedirá el pase nuevo
  // (GET /v1/passes/...). Librería recomendada: @parse/node-apn con la
  // clave .p8 (APNS_KEY_ID, APNS_TEAM_ID, APNS_KEY_PATH en .env).
  // Sin el certificado .p8 esto no se puede enviar de verdad.
  const devices = registrations.get(serialNumber);
  if (!devices || devices.size === 0) {
    console.log(`[push] ${serialNumber}: sin dispositivos registrados, no hay a quién avisar.`);
    return { sent: 0 };
  }
  for (const d of devices) {
    console.log(`[push] ${serialNumber} -> dispositivo ${d.deviceLibraryIdentifier} (token ${String(d.pushToken).slice(0, 8)}…): push APNs vacío (TODO: conectar APNs real).`);
  }
  return { sent: devices.size };
}

// ---------------------------------------------------------------------------
// PassKit Web Service v1 (Apple)
// Documentación: developer.apple.com/documentation/walletpasses
// El iPhone manda: Authorization: ApplePass <authenticationToken>
// ---------------------------------------------------------------------------
function checkPassAuth(req, res, next) {
  // TODO PRODUCCIÓN: validar que el token corresponda al miembro
  // (cada pase lleva su authenticationToken único, guardado en la BD).
  const auth = req.headers.authorization || "";
  if (!auth.startsWith("ApplePass ")) {
    return res.status(401).json({ error: "Falta Authorization: ApplePass <token>" });
  }
  next();
}

// POST /v1/devices/:deviceLibraryIdentifier/registrations/:passTypeIdentifier/:serialNumber
// El iPhone registra su dispositivo cuando instala el pase.
app.post(
  "/v1/devices/:deviceLibraryIdentifier/registrations/:passTypeIdentifier/:serialNumber",
  checkPassAuth,
  (req, res) => {
    const { deviceLibraryIdentifier, passTypeIdentifier, serialNumber } = req.params;
    if (passTypeIdentifier !== PASS_TYPE_ID) return res.status(404).end();
    if (!members.has(serialNumber)) return res.status(404).end();
    const pushToken = req.body && req.body.pushToken;
    if (!registrations.has(serialNumber)) registrations.set(serialNumber, new Set());
    const set = registrations.get(serialNumber);
    // Si ya estaba registrado, es una actualización del pushToken.
    for (const d of set) {
      if (d.deviceLibraryIdentifier === deviceLibraryIdentifier) {
        set.delete(d);
        break;
      }
    }
    set.add({ deviceLibraryIdentifier, pushToken });
    console.log(`[registro] ${serialNumber} <- ${deviceLibraryIdentifier}`);
    return res.status(201).end();
  }
);

// GET /v1/devices/:deviceLibraryIdentifier/registrations/:passTypeIdentifier
// El iPhone pregunta qué pases cambiaron desde su última consulta.
app.get(
  "/v1/devices/:deviceLibraryIdentifier/registrations/:passTypeIdentifier",
  checkPassAuth,
  (req, res) => {
    const { deviceLibraryIdentifier, passTypeIdentifier } = req.params;
    if (passTypeIdentifier !== PASS_TYPE_ID) return res.status(404).end();
    const serials = [];
    for (const [serial, devices] of registrations) {
      for (const d of devices) {
        if (d.deviceLibraryIdentifier === deviceLibraryIdentifier) serials.push(serial);
      }
    }
    const lastUpdated = req.query.passesUpdatedSince;
    // TODO PRODUCCIÓN: filtrar por lastUpdated (solo pases modificados después).
    return res.json({ lastUpdated: new Date().toISOString(), serialNumbers: serials });
  }
);

// GET /v1/passes/:passTypeIdentifier/:serialNumber
// El iPhone descarga el pase actualizado (el .pkpass firmado).
app.get("/v1/passes/:passTypeIdentifier/:serialNumber", checkPassAuth, (req, res) => {
  const { passTypeIdentifier, serialNumber } = req.params;
  if (passTypeIdentifier !== PASS_TYPE_ID) return res.status(404).end();
  const member = members.get(serialNumber);
  if (!member) return res.status(404).end();
  // TODO PRODUCCIÓN: servir el .pkpass firmado (ZIP) con
  // Content-Type: application/vnd.apple.pkpass y el header Last-Modified.
  // En esta referencia devolvemos el pass.json para inspeccionarlo.
  res.set("Content-Type", "application/json");
  return res.json(buildPassJson(member));
});

// DELETE /v1/devices/:deviceLibraryIdentifier/registrations/:passTypeIdentifier/:serialNumber
// El iPhone se da de baja cuando el cliente borra el pase.
app.delete(
  "/v1/devices/:deviceLibraryIdentifier/registrations/:passTypeIdentifier/:serialNumber",
  checkPassAuth,
  (req, res) => {
    const { deviceLibraryIdentifier, passTypeIdentifier, serialNumber } = req.params;
    if (passTypeIdentifier !== PASS_TYPE_ID) return res.status(404).end();
    const set = registrations.get(serialNumber);
    if (set) {
      for (const d of set) {
        if (d.deviceLibraryIdentifier === deviceLibraryIdentifier) set.delete(d);
      }
    }
    console.log(`[baja] ${serialNumber} <- ${deviceLibraryIdentifier}`);
    return res.status(200).end();
  }
);

// POST /v1/log — El iPhone reporta errores del pase. Útil para depurar.
app.post("/v1/log", express.json({ type: "*/*" }), (req, res) => {
  console.log("[log del dispositivo]", JSON.stringify(req.body));
  return res.status(200).end();
});

// ---------------------------------------------------------------------------
// Endpoints propios del negocio
// ---------------------------------------------------------------------------

// GET /api/members — lista de miembros (para el panel admin).
app.get("/api/members", (req, res) => res.json([...members.values()]));

// POST /api/members { name, phone, birthdate } — registra un cliente,
// le asigna ID y le genera su enlace real de Google Wallet.
app.post("/api/members", (req, res) => {
  const { name, phone, birthdate } = req.body || {};
  if (!name || !phone) return res.status(400).json({ error: "Faltan name y phone." });
  const id = nextMemberId();
  const member = {
    id, name, phone, birthdate: birthdate || "", stamps: 0, redeemed: 0, visits: 1,
    lastVisit: new Date().toISOString().slice(0, 10),
  };
  members.set(id, member);
  const saveLink = wallet.createSaveLink(member);
  return res.status(201).json({
    ...member,
    saveLink,
    walletConfigured: wallet.isConfigured(),
    installUrl: `${process.env.INSTALL_DOMAIN || "https://lealtad.smoothielab.mx"}/instalar?miembro=${id}`,
  });
});

// GET /api/wallet/status — dice si el servidor puede emitir pases reales.
app.get("/api/wallet/status", (req, res) => res.json({
  configured: wallet.isConfigured(),
  issuerId: wallet.ISSUER_ID,
  classId: wallet.CLASS_ID,
}));

// GET /r/:memberId — enlace corto para el QR: redirige al Save link de Google Wallet.
app.get("/r/:memberId", (req, res) => {
  const member = members.get(req.params.memberId);
  if (!member) return res.status(404).json({ error: "Miembro no encontrado." });
  const saveLink = wallet.createSaveLink(member);
  if (!saveLink) return res.status(503).json({ error: "Google Wallet no configurado en este servidor." });
  return res.redirect(302, saveLink);
});

// POST /api/stamp { memberId } — suma 1 sello y actualiza el pase del cliente.
app.post("/api/stamp", async (req, res) => {
  const { memberId } = req.body || {};
  const member = members.get(memberId);
  if (!member) return res.status(404).json({ error: "Miembro no encontrado." });
  if (member.stamps >= STAMPS_FOR_REWARD) {
    return res.json({ ...member, rewardReady: true, message: "Ya tiene su premio listo para canjear." });
  }
  member.stamps += 1;
  member.visits += 1;
  member.lastVisit = new Date().toISOString().slice(0, 10);
  const rewardReady = member.stamps >= STAMPS_FOR_REWARD;
  // 1) Avisar al iPhone para que descargue el pase nuevo.
  const push = pushToDevices(member.id);
  // 2) Actualizar la tarjeta de Google Wallet (si el cliente ya la guardó;
  // si aún no, el PATCH da 404 y el siguiente enlace ya lleva el saldo nuevo).
  const walletUpdate = await wallet.patchStamps(member);
  return res.json({
    ...member,
    rewardReady,
    pushSent: push.sent,
    walletUpdated: walletUpdate.updated,
    message: rewardReady
      ? "¡Felicidades! Ya tienes tu smoothie gratis."
      : `¡Sello ${member.stamps} de ${STAMPS_FOR_REWARD}! Te faltan ${STAMPS_FOR_REWARD - member.stamps} para tu smoothie gratis.`,
  });
});

// POST /api/redeem { memberId } — canjea el smoothie gratis (sellos a cero).
app.post("/api/redeem", (req, res) => {
  const { memberId } = req.body || {};
  const member = members.get(memberId);
  if (!member) return res.status(404).json({ error: "Miembro no encontrado." });
  if (member.stamps < STAMPS_FOR_REWARD) {
    return res.status(400).json({ error: `Le faltan ${STAMPS_FOR_REWARD - member.stamps} sellos.` });
  }
  member.stamps = 0;
  member.redeemed += 1;
  pushToDevices(member.id);
  return res.json({ ...member, message: "Smoothie gratis canjeado. Sellos en cero." });
});

// POST /api/notify { target, title, message } — manda una notificación a los miembros.
// target: "all" | "almost" (a 1 sello) | "inactive" (sin visita en 7 días)
app.post("/api/notify", (req, res) => {
  const { target = "all", title, message } = req.body || {};
  if (!title || !message) return res.status(400).json({ error: "Faltan title y message." });
  let list = [...members.values()];
  if (target === "almost") list = list.filter((m) => m.stamps === STAMPS_FOR_REWARD - 1);
  if (target === "inactive") {
    const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString().slice(0, 10);
    list = list.filter((m) => m.lastVisit < weekAgo);
  }
  // TODO PRODUCCIÓN: por cada miembro, actualizar su pase (Apple: el texto
  // sale de changeMessage; Google: mensaje TEXT_AND_NOTIFY, máx. 3/24 h).
  // En esta referencia solo registramos el intento.
  console.log(`[notify] "${title}" -> ${list.length} miembros (${target}). TODO: envío APNs / Google Wallet real.`);
  return res.json({ sent: 0, queued: list.length, note: "STUB: conecta APNs y Google Wallet para enviar de verdad. Ver README-server.md." });
});

// GET / — salud del servidor.
app.get("/", (req, res) => res.json({ ok: true, service: "smoothie-lab-loyalty", members: members.size }));

app.listen(PORT, () => {
  console.log(`Club Smoothie Lab — servidor de referencia en http://localhost:${PORT}`);
  console.log(`PassKit Web Service: /v1/devices/... (Apple Wallet)`);
  console.log(`API del negocio: /api/members, /api/stamp, /api/redeem, /api/notify`);
});
