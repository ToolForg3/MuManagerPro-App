/**
 * SISTEMA DE DISEÑO OFICIAL: STITCH APPROVED IRONFORGE
 * Tokens globales de diseño: Colores, Tipografías, Formas y Ergonomía (DESIGN.md).
 * Ningún componente o pantalla debe declarar colores sueltos.
 */

export const THEME = {
  colors: {
    // 1. Fondos y Superficies Stitch Ironforge
    deepForge: '#0D0E0D', // Recessed slots, input wells, modal shadow bands
    fondo: '#131413', // Charcoal Canvas: aplicación y viewport global
    fondoRadialTop: '#1B1C1B', // Iron Low
    superficie: '#1F201F', // Iron Panel: paneles principales y contenedores
    superficieFin: '#1B1C1B', // Iron Low: degradado secundario
    panelGradiente: ['#1F201F', '#1B1C1B'] as const,
    raisedIron: '#292A29', // Active headers, selected rows, raised controls
    brightSteel: '#393938', // Bevel highlights
    borde: '#4C463A', // Structural Outline: separadores, bordes inactivos
    bordeBrillante: '#E0C380', // Antique Gold: borde activo / foco
    casillaFondo: '#0D0E0D', // Deep Forge: slots, inputs, inventario

    // 2. Jerarquía de Acentos Stitch Ironforge
    oro: '#E0C380', // Antique Gold: acento visual único (títulos, foco, acciones primarias)
    oroClaro: '#EFD28D', // Gold Bright: variante accesible para textos y detalles finos
    oroOscuro: '#D2B674', // Gold Pressed: estado presionado / subdued
    oroGradiente: ['#EFD28D', '#E0C380', '#D2B674'] as const,
    brasa: '#E2703A', // Acción secundaria / inyección / alerta
    brasaGradiente: ['#FF884D', '#E2703A', '#B84514'] as const,
    dangerIron: '#7A2E28', // Danger Iron: controles destructivos y fallos críticos
    errorSurface: '#93000A', // Error Surface
    errorText: '#FFDAD6', // Error Text
    arcano: '#5B8DEF', // Datos / valores mágicos / sub-stats
    jade: '#3FCF8E', // Éxito / ZEN / "Online"
    amber: '#FFA87D', // Advertencias preventivas / Modo DEMO / licencias

    // 3. Tipografía (Alto Contraste WCAG AAA sobre fondo oscuro)
    texto: '#E4E2E0', // Ivory Text: texto principal y valores
    textoSecundario: '#CDC6B9', // Weathered Silver: etiquetas secundarias y detalles metálicos
    textoSecundarioLuminoso: '#E4E2E0', // Ivory Text de alta nitidez
    tituloTarjeta: '#E0C380', // Antique Gold: títulos de tarjetas y ventanas
    textoOscuro: '#0D0E0D', // Deep Forge: texto sobre superficies de acento

    // 4. Elementos y Remaches
    remache: '#E0C380', // Antique Gold
    remacheSombra: '#0D0E0D', // Deep Forge

    // --- Mapeo de retrocompatibilidad estricta para código existente ---
    background: '#131413',
    surface: '#1F201F',
    card: '#1F201F',
    cardElevated: '#292A29',
    border: '#4C463A',
    borderHighlight: '#E0C380',
    primaryOrange: '#E0C380',
    primaryOrangeHover: '#D2B674',
    accentGold: '#E0C380',
    accentGoldLight: '#EFD28D',
    accentGoldDark: '#D2B674',
    accentGoldMuted: '#4C463A',
    neonBlue: '#5B8DEF',
    neonBlueBright: '#5B8DEF',
    neonBlueGlow: 'rgba(91, 141, 239, 0.25)',
    accentBlue: '#5B8DEF',
    accentGreen: '#3FCF8E',
    accentGreenBright: '#3FCF8E',
    accentPurple: '#E0C380',
    dangerRed: '#7A2E28',
    textPrimary: '#E4E2E0',
    textSecondary: '#CDC6B9',
    textMuted: '#CDC6B9',
    textGold: '#EFD28D',
    textNeon: '#7CA8FF',
    textInverse: '#0D0E0D',

    // Atributos y C-Window
    statStrength: '#E2703A',
    statAgility: '#3FCF8E',
    statVitality: '#E0C380',
    statEnergy: '#5B8DEF',
    statCommand: '#E0C380',
    statZen: '#3FCF8E',
    statRuud: '#5B8DEF',

    // Rarezas
    itemNormal: '#E4E2E0',
    itemMagic: '#5B8DEF',
    itemExcellent: '#3FCF8E',
    itemAncient: '#5B8DEF',
    itemSocket: '#E0C380',
    itemHarmony: '#E0C380',
    item380: '#E2703A',
    itemPlus15: '#E0C380',

    // Celdas
    slotEmpty: '#0D0E0D',
    slotBorder: '#4C463A',
    slotBorderHighlight: '#E0C380',
    slotActive: '#1F201F',
    slotEquipped: '#1B1C1B',
    slotMovingTarget: 'rgba(224, 195, 128, 0.15)',
    slotMovingBorder: '#E0C380',
  },

  typography: {
    fontTitle: 'serif',
    fontBody: 'normal',
    fontMono: 'monospace',
    weightBold: '700' as const,
    weightSemiBold: '600' as const,
    weightMedium: '500' as const,
    weightRegular: '400' as const,
    trackingWide: 2,
  },

  shapes: {
    radioEsquina: 2, // 0-2 px rectangular gótico Stitch Ironforge
    bordeAncho: 1,
    remacheSize: 6,
    alturaMinima: 48, // 48 dp mínimo universal para cualquier control o campo
    alturaBotonPrincipal: 56, // 56 dp para botones principales a todo el ancho
    espaciadoBase: 14,
  },

  borderRadius: {
    sm: 2,
    md: 2,
    lg: 2,
    xl: 2,
    round: 2,
  },

  spacing: {
    xs: 4,
    sm: 8,
    md: 14,
    lg: 16,
    xl: 20,
    xxl: 24,
  },

  effects: {
    textShadow: {
      textShadowColor: 'rgba(0, 0, 0, 0.95)',
      textShadowOffset: { width: 0, height: 1 },
      textShadowRadius: 2,
    },
    textShadowHigh: {
      textShadowColor: 'rgba(0, 0, 0, 0.95)',
      textShadowOffset: { width: 1, height: 1 },
      textShadowRadius: 2,
    },
    textShadowSubtle: {
      textShadowColor: 'rgba(0, 0, 0, 0.85)',
      textShadowOffset: { width: 0, height: 1 },
      textShadowRadius: 1.5,
    },
  },
};

export type ThemeType = typeof THEME;
