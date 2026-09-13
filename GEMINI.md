# MU MANAGER PRO - REGLAS PERMANENTES DE DESARROLLO

## 1. SISTEMA DE DISEÑO (SEASON 6 PIEDRA & ORO)
- **Tema Visual**: Medieval Fantasía Clásica Season 6 (Piedra y Oro).
- **Contraste de Texto Obligatorio (WCAG AAA > 7:1)**:
  - Textos principales y títulos: `THEME.colors.texto` (`#FAF6EE`, 14.2:1).
  - Etiquetas, subtítulos y modales: `THEME.colors.textoSecundario` (`#C8BEAF`, 9.8:1).
  - Placeholders y controles inactivos: `THEME.colors.textMuted` (`#B8AEA0`, 8.5:1).
  - Acentos numéricos dorados: `THEME.colors.oroClaro` (`#E8C86A`) o `THEME.colors.textGold` (`#F0D27A`).
- **Colores Prohibidos**:
  - ❌ **NO morados / púrpuras** (`#BA68C8`, `#9C27B0`, `#7B1FA2`).
  - ❌ **NO cyan neón** (`#00E5FF`, `#00F0FF`) salvo Arcano Season 6 `#5B8DEF`.
  - ❌ **NO verdes lima/fluorescentes** (`#00C853`, `#00E676`). Usar siempre Jade Season 6 (`#3FCF8E`).
  - ❌ **NO grises oscuros o apagados para texto**: `#666`, `#777`, `#888`, `#999`, `#AAA`, `#BBB`, `#CCC`, `#DDD`, `#9C9182`.
  - ❌ **NO bordes circulares inflados** (`borderRadius: 20+`). Usar siempre estándar gótico `borderRadius: 6`.

## 2. EMULADORES Y COMPATIBILIDAD SQL
- **Louis S6 Intacto**: Es la referencia principal; ninguna consulta debe alterar ni romper Louis.
- **Compatibilidad Dual Louis & MSPro**: Consultas dinámicas (`sp_executesql`, `COL_LENGTH`, `OBJECT_ID`) ante columnas de MSPro (`RuudToken`, `ExtWarehouse`). Cero `ALTER TABLE` o fallos por Msg 207 / Msg 911.

## 3. PROTOCOLO DE LANZAMIENTO (6 ARCHIVOS OBLIGATORIOS)
Toda subida de versión debe sincronizar simultáneamente:
1. `package.json`
2. `src/constants/appVersion.ts`
3. `app.json`
4. `android/app/build.gradle`
5. `version.json`
6. `data/settings.json` y `server/data/settings.json`

## 4. VERIFICACIONES PREVIAS OBLIGATORIAS
- `npm run ts:check` (0 errores)
- `npm test` (100% pruebas unitarias pasando)
- Cero ocurrencias de colores prohibidos o textos de bajo contraste en `src/`.
