// Trabajos y fallas frecuentes en un taller, para elegir rápido al armar la orden
// y al describir las fotos del problema. Es solo una ayuda: el texto se puede editar.

export const CATALOGO_FALLAS: { categoria: string; items: string[] }[] = [
  {
    categoria: "Service y mantenimiento",
    items: [
      "Cambio de aceite y filtro de aceite",
      "Cambio de filtro de aire",
      "Cambio de filtro de combustible",
      "Cambio de filtro de habitáculo",
      "Cambio de bujías",
      "Cambio de correa de distribución",
      "Kit de distribución con bomba de agua",
      "Cambio de correa de accesorios (poly-V)",
      "Cambio de líquido refrigerante",
      "Cambio de líquido de frenos",
      "Cambio de aceite de caja",
      "Service de 10.000 km",
      "Service de 20.000 km",
      "Service de 40.000 km",
      "Revisión general",
      "Limpieza de inyectores",
      "Limpieza de cuerpo de mariposa",
      "Lavado de motor",
    ],
  },
  {
    categoria: "Frenos",
    items: [
      "Cambio de pastillas delanteras",
      "Cambio de pastillas traseras",
      "Cambio de discos de freno",
      "Rectificado de discos",
      "Cambio de cintas / zapatas",
      "Cambio de campanas",
      "Cambio de bomba de freno",
      "Cambio de cilindro de rueda",
      "Cambio de flexibles de freno",
      "Purgado de frenos",
      "Ajuste de freno de mano",
      "Falla de sensor ABS",
      "Ruido al frenar",
      "Pedal de freno largo o esponjoso",
      "Vibración al frenar",
    ],
  },
  {
    categoria: "Suspensión y dirección",
    items: [
      "Cambio de amortiguadores delanteros",
      "Cambio de amortiguadores traseros",
      "Cambio de espirales",
      "Cambio de bujes de parrilla",
      "Cambio de parrilla",
      "Cambio de rótulas",
      "Cambio de extremos de dirección",
      "Cambio de bieletas",
      "Cambio de cazoletas",
      "Cambio de rulemán de rueda",
      "Reparación de cremallera",
      "Bomba de dirección hidráulica",
      "Cambio de fuelle de cremallera",
      "Ruido en el tren delantero",
      "Tira hacia un lado",
      "Vibra el volante",
      "Alineación y balanceo",
    ],
  },
  {
    categoria: "Motor",
    items: [
      "Pérdida de aceite",
      "Cambio de junta de tapa de cilindros",
      "Cambio de junta de tapa de válvulas",
      "Cambio de retenes",
      "Reparación de cárter",
      "Cambio de bomba de aceite",
      "Rectificación de motor",
      "Rectificado de tapa de cilindros",
      "Ajuste de válvulas",
      "Consume aceite",
      "Falla de encendido / tironea",
      "Pierde potencia",
      "Sale humo azul",
      "Sale humo blanco",
      "Sale humo negro",
      "Ruido de botadores",
      "Cambio de soportes de motor",
      "Cambio de junta de múltiple",
    ],
  },
  {
    categoria: "Refrigeración",
    items: [
      "Recalienta",
      "Cambio de bomba de agua",
      "Cambio de termostato",
      "Reparación o cambio de radiador",
      "Falla de electroventilador",
      "Cambio de mangueras de agua",
      "Cambio de tapa de radiador",
      "Pérdida de agua",
      "Falla de sensor de temperatura",
    ],
  },
  {
    categoria: "Encendido, combustible y GNC",
    items: [
      "No arranca",
      "Arranca y se para",
      "Cambio de bobina de encendido",
      "Cambio de cables de bujía",
      "Cambio de bomba de nafta",
      "Cambio de inyectores",
      "Falla de sensor MAP / MAF",
      "Cambio de sonda lambda",
      "Service de equipo de GNC",
      "Regulación de GNC",
      "Prueba hidráulica de tubo de GNC",
      "Renovación de oblea de GNC",
      "Falla de equipo de GNC",
    ],
  },
  {
    categoria: "Embrague, caja y transmisión",
    items: [
      "Cambio de kit de embrague",
      "Cambio de crapodina",
      "Cambio de volante bimasa",
      "Cambio de cable de embrague",
      "Cambio de bomba de embrague",
      "Ruido en la caja",
      "Saltan los cambios",
      "Cambio de sincronizados",
      "Cambio de homocinética",
      "Cambio de fuelle de homocinética",
      "Cambio de palier",
      "Reparación de diferencial",
      "Service de caja automática",
      "Falla de caja automática",
      "Cambio de crucetas / cardán",
    ],
  },
  {
    categoria: "Electricidad y electrónica",
    items: [
      "Cambio de batería",
      "Reparación o cambio de alternador",
      "Reparación o cambio de burro de arranque",
      "Cambio de lámparas",
      "Testigo de check engine encendido",
      "Escaneo de computadora",
      "Cortocircuito / falla de cableado",
      "Cambio de fusibles o relés",
      "Falla de levantavidrios",
      "Falla de cierre centralizado",
      "Falla de alarma",
      "Falla de bocina",
      "Falla de limpiaparabrisas",
      "Falla de sensores de estacionamiento",
      "Programación de llave / inmovilizador",
    ],
  },
  {
    categoria: "Aire acondicionado y calefacción",
    items: [
      "Carga de gas de aire acondicionado",
      "Cambio de compresor de aire acondicionado",
      "Pérdida en el circuito de aire acondicionado",
      "No funciona la calefacción",
      "Falla de forzador",
    ],
  },
  {
    categoria: "Escape",
    items: [
      "Cambio de silenciador",
      "Cambio de caño de escape",
      "Cambio de catalizador",
      "Cambio de junta de escape",
      "Ruido de escape",
      "Limpieza o cambio de filtro de partículas (DPF)",
    ],
  },
  {
    categoria: "Diésel y turbo",
    items: [
      "Reparación de inyectores diésel",
      "Reparación de bomba inyectora",
      "Reparación o cambio de turbo",
      "Pérdida en intercooler",
      "Cambio de bujías de precalentamiento",
      "Limpieza de válvula EGR",
      "Agua en el gasoil",
    ],
  },
  {
    categoria: "Cubiertas y ruedas",
    items: ["Cambio de cubiertas", "Reparación de pinchadura", "Cambio de válvulas", "Reparación de llanta", "Rotación de cubiertas"],
  },
  {
    categoria: "Carrocería e interior",
    items: [
      "Chapa y pintura",
      "Reparación de paragolpes",
      "Cambio de espejo",
      "Reparación de cerradura",
      "Cambio de parabrisas",
      "Pulido de ópticas",
      "Cambio de burletes",
      "Entra agua al habitáculo",
      "Reparación de tapizado",
    ],
  },
  {
    categoria: "Revisiones y trámites",
    items: ["Revisión pre-VTV", "Revisión pre-compra", "Diagnóstico general", "Presupuesto para seguro", "Auxilio / remolque"],
  },
  {
    categoria: "Raros",
    items: [
      "Ruido sin identificar",
      "Olor a quemado",
      "Olor a nafta",
      "Falla intermitente",
      "Auto inundado",
      "Roedores comieron cables",
      "Pérdida de llave",
      "Luz de testigo que no se apaga",
    ],
  },
];

/** Todas las opciones en una sola lista (para autocompletar). */
export const TODAS_LAS_FALLAS = CATALOGO_FALLAS.flatMap((c) => c.items);

/** Para buscar sin importar tildes ni mayúsculas. */
export function normalizarBusqueda(texto: string) {
  return texto.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();
}

/** Agrega un trabajo a la descripción, una línea por trabajo, sin repetirlo. */
export function agregarTrabajo(descripcion: string, trabajo: string) {
  const lineas = descripcion.split("\n").map((l) => l.replace(/^[•\-]\s*/, "").trim());
  if (lineas.includes(trabajo)) return descripcion;
  const base = descripcion.trimEnd();
  return base ? `${base}\n• ${trabajo}` : `• ${trabajo}`;
}
