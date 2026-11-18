/**
 * config.js — UN solo lugar con las reglas del programa de lealtad.
 *
 * Tanto la landing (index.html) como el panel (admin/index.html) leen este
 * archivo. Cambia aquí un valor y se refleja en todo el sitio.
 *
 * TODO / REEMPLAZAR: webServiceURL e installDomain son placeholders.
 * Cuando el servidor esté en producción, pon aquí tu dominio real con HTTPS.
 */
const SMOOTHIE_CONFIG = {
  // Programa
  programName: "Club Smoothie Lab",
  tagline: "Sin azúcar. Con proteína. Con premio.",
  stampsForReward: 8,                 // sellos para ganar 1 smoothie gratis
  rewardDescription: "1 smoothie gratis",

  // Tienda (sucursal única, Plaza Luna, Zibatá, Querétaro)
  store: {
    name: "Smoothie Lab — Plaza Luna",
    address: "Plaza Luna, Zibatá, Querétaro",
    latitude: 20.62718,
    longitude: -100.45929,
    geofenceRadiusMeters: 200,          // igual que WonCards
    hours: "L–V 8:00–20:00 · S–D 9:00–17:00",
  },

  // Marca
  brand: {
    colors: {
      black: "#111111",
      green: "#0B3D2E",                 // verde profundo
      greenLight: "#1E6B4F",
      gold: "#E8A93D",                  // dorado / ámbar
      cream: "#FAF6EF",
    },
    font: "Montserrat",
    instagram: "https://www.instagram.com/smoothie_lab_",
    mapsUrl: "https://www.google.com/maps/search/?api=1&query=20.62718,-100.45929",
  },

  // Servidor de pases (producción) — PLACEHOLDERS, reemplazar al desplegar
  server: {
    webServiceURL: "https://lealtad.smoothielab.mx/api",  // TODO: dominio real con HTTPS
    installDomain: "https://lealtad.smoothielab.mx",      // TODO: dominio real
    passTypeIdentifier: "pass.com.smoothielab.loyalty",
  },

  // Google Wallet (producción) — PLACEHOLDERS, reemplazar al desplegar
  googleWallet: {
    issuerId: "REEMPLAZAR",            // TODO: issuer ID de Google Pay & Wallet Console
    classIdSuffix: "club-smoothie-lab",
  },

  // Textos de notificación (los que vería el cliente)
  notifications: {
    nearStore: "¡Estás en Smoothie Lab! Tu tarjeta está lista.",
    stampEarned: (stamps, total) =>
      `¡Sello ${stamps} de ${total}! Te faltan ${total - stamps} para tu smoothie gratis.`,
    rewardReady: "¡Felicidades! Ya tienes tu smoothie gratis. Pásalo a cobrar en caja.",
  },
};

// Hace la configuración disponible en el navegador y en Node (para pruebas).
if (typeof module !== "undefined" && module.exports) module.exports = SMOOTHIE_CONFIG;
