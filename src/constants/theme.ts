/**
 * SISTEMA DE DISEÑO OFICIAL MU ONLINE CLÁSICO CON CONTROLES TÁCTILES MODERNOS
 * Tokens globales de diseño: Colores, Tipografías, Formas y Ergonomía.
 * Ningún componente o pantalla debe declarar colores sueltos.
 */

export const THEME = {
  colors: {
    // 1. Fondos y Superficies de Piedra MU
    fondo: '#191512', // Piedra negra
    fondoRadialTop: '#3A2E22', // Radial superior al 50%
    superficie: '#2B2521', // Panel inicio degradado
    superficieFin: '#1A1613', // Panel fin degradado
    panelGradiente: ['#2B2521', '#1A1613'] as const,
    borde: '#6B5533', // Grabado dorado tenue
    bordeBrillante: '#A8894D', // Borde activo
    casillaFondo: '#100D0B', // Fondo casi negro para slots e inputs

    // 2. Jerarquía de Acentos Clásicos
    oro: '#B58F3C', // Oro primario
    oroClaro: '#E8C86A', // Oro resplandor
    oroOscuro: '#7A5E22', // Oro profundo
    oroGradiente: ['#E8C86A', '#B58F3C', '#7A5E22'] as const,
    brasa: '#E2703A', // Acción secundaria / peligro / inyección
    brasaGradiente: ['#FF884D', '#E2703A', '#B84514'] as const,
    arcano: '#5B8DEF', // Datos / valores mágicos / sub-stats
    jade: '#3FCF8E', // Éxito / ZEN / "Online"

    // 3. Tipografía (Alto Contraste WCAG AAA sobre fondo oscuro)
    texto: '#FAF6EE', // Texto principal claro de alto contraste (blanco pergamino luminoso)
    textoSecundario: '#C8BEAF', // Texto secundario de alta legibilidad (marfil cálido)
    textoOscuro: '#100D0B', // Texto sobre oro brillante

    // 4. Elementos y Remaches
    remache: '#B58F3C',
    remacheSombra: '#0A0807',

    // --- Mapeo de retrocompatibilidad estricta para código existente ---
    background: '#191512',
    surface: '#2B2521',
    card: '#241E1A',
    cardElevated: '#2B2521',
    border: '#6B5533',
    borderHighlight: '#B58F3C',
    primaryOrange: '#B58F3C',
    primaryOrangeHover: '#7A5E22',
    accentGold: '#E8C86A',
    accentGoldLight: '#E8C86A',
    accentGoldDark: '#7A5E22',
    accentGoldMuted: '#6B5533',
    neonBlue: '#5B8DEF',
    neonBlueBright: '#5B8DEF',
    neonBlueGlow: 'rgba(91, 141, 239, 0.25)',
    accentBlue: '#5B8DEF',
    accentGreen: '#3FCF8E',
    accentGreenBright: '#3FCF8E',
    accentPurple: '#E8C86A', // Purgado morado -> Oro Season 6
    dangerRed: '#E2703A',
    textPrimary: '#FAF6EE',
    textSecondary: '#C8BEAF',
    textMuted: '#B8AEA0',
    textGold: '#F0D27A',
    textNeon: '#7CA8FF',
    textInverse: '#100D0B',

    // Atributos y C-Window
    statStrength: '#E2703A',
    statAgility: '#3FCF8E',
    statVitality: '#E8C86A',
    statEnergy: '#5B8DEF',
    statCommand: '#E8C86A',
    statZen: '#3FCF8E',
    statRuud: '#5B8DEF',

    // Rarezas
    itemNormal: '#FAF6EE',
    itemMagic: '#5B8DEF',
    itemExcellent: '#3FCF8E',
    itemAncient: '#5B8DEF',
    itemSocket: '#E8C86A',
    itemHarmony: '#E8C86A',
    item380: '#E2703A',
    itemPlus15: '#E8C86A',

    // Celdas
    slotEmpty: '#100D0B',
    slotBorder: '#6B5533',
    slotBorderHighlight: '#E8C86A',
    slotActive: '#2B2521',
    slotEquipped: '#1A1613',
    slotMovingTarget: 'rgba(232, 200, 106, 0.15)',
    slotMovingBorder: '#E8C86A',
  },

  typography: {
    fontTitle: 'serif',
    fontBody: 'normal',
    fontMono: 'monospace',
    weightBold: '700' as const,
    weightSemiBold: '600' as const,
    weightMedium: '500' as const,
    weightRegular: '400' as const,
    trackingWide: 2, // 0.15em aproximado
  },

  shapes: {
    radioEsquina: 6, // 6 px estricto (nada redondeado tipo Material)
    bordeAncho: 1, // 1 px
    remacheSize: 6, // 6 px remaches
    alturaMinima: 44, // 44 dp mínimo para cualquier control o campo
    alturaBotonPrincipal: 56, // 56 dp para botones principales a todo el ancho
    espaciadoBase: 14, // 12-16 dp entre tarjetas
  },

  borderRadius: {
    sm: 6,
    md: 6,
    lg: 6,
    xl: 6,
    round: 6,
  },

  spacing: {
    xs: 4,
    sm: 8,
    md: 14,
    lg: 16,
    xl: 20,
    xxl: 24,
  },
};

export type ThemeType = typeof THEME;
