export interface MuSkillDefinition {
  id: number;
  name: string;
  nameEs: string;
  category: 'Físico' | 'Magia' | 'Buff' | 'Invocación' | 'Especial';
  races: string[]; // ['DK', 'DW', 'FE', 'MG', 'DL', 'SU', 'RF']
  icon: string; // MaterialCommunityIcons name
  description?: string;
}

// Catálogo completo y canónico de habilidades de Mu Online Season 6 (Louis Update 40 / Webzen)
// Ordenado rigurosamente por Clase / Raza e ID
export const MU_SKILLS: Record<number, MuSkillDefinition> = {
  // =========================================================================
  // 1. DARK KNIGHT / BLADE KNIGHT / BLADE MASTER (DK / BK / BM)
  // =========================================================================
  18: { id: 18, name: 'Defense', nameEs: 'Defensa con Escudo', category: 'Buff', races: ['DK', 'FE', 'MG'], icon: 'shield', description: 'Aumenta temporalmente la defensa del personaje.' },
  19: { id: 19, name: 'Falling Slash', nameEs: 'Corte Descendente', category: 'Físico', races: ['DK', 'MG'], icon: 'sword', description: 'Corte vertical de arma con gran impacto.' },
  20: { id: 20, name: 'Lunge', nameEs: 'Estocada Rápida', category: 'Físico', races: ['DK', 'MG'], icon: 'knife-military', description: 'Ataque punzante penetrante cuerpo a cuerpo.' },
  21: { id: 21, name: 'Uppercut', nameEs: 'Corte Ascendente', category: 'Físico', races: ['DK', 'MG'], icon: 'hand-back-right', description: 'Golpe cortante ascendente de abajo hacia arriba.' },
  22: { id: 22, name: 'Cyclone', nameEs: 'Ciclón', category: 'Físico', races: ['DK', 'MG'], icon: 'weather-tornado', description: 'Giro de arma cortante continuo en espiral.' },
  23: { id: 23, name: 'Slash', nameEs: 'Tajo Doble', category: 'Físico', races: ['DK', 'MG'], icon: 'sword-cross', description: 'Corte cruzado veloz con ambas manos.' },
  41: { id: 41, name: 'Twisting Slash', nameEs: 'Tajo Giratorio (Twisting Slash)', category: 'Físico', races: ['DK', 'MG'], icon: 'rotate-right', description: 'Giro de 360 grados continuo que impacta múltiples enemigos alrededor.' },
  42: { id: 42, name: 'Rageful Blow', nameEs: 'Golpe Furioso (Rageful Blow)', category: 'Físico', races: ['DK'], icon: 'image-filter-hdr', description: 'Impacta la espada en el suelo desatando ondas de choque expansivas.' },
  43: { id: 43, name: 'Death Stab', nameEs: 'Puñalada Mortal (Death Stab)', category: 'Físico', races: ['DK'], icon: 'lightning-bolt', description: 'Estocada frontal letal con alta concentración de daño crítico y elemental.' },
  44: { id: 44, name: 'Crescent Moon Slash', nameEs: 'Corte de Media Luna', category: 'Físico', races: ['DK'], icon: 'moon-waning-crescent', description: 'Corte en media luna veloz que desgarra al oponente a media distancia.' },
  48: { id: 48, name: 'Greater Fortitude', nameEs: 'Aura de Vida (Swell Life)', category: 'Buff', races: ['DK'], icon: 'heart-plus', description: 'Incrementa masivamente la vida máxima propia y de los aliados en grupo.' },
  111: { id: 111, name: 'Combo Skill', nameEs: 'Combo de Marlon (Combo Skill)', category: 'Especial', races: ['DK'], icon: 'fire-circle', description: 'Habilidad pasiva de combo que desata una explosión tras encadenar habilidades.' },
  232: { id: 232, name: 'Strike of Destruction', nameEs: 'Golpe de Destrucción (Destruction)', category: 'Físico', races: ['DK'], icon: 'skull-crossbones', description: 'Furia destructiva que hace caer espadas de energía del cielo sobre el objetivo.' },

  // =========================================================================
  // 2. DARK WIZARD / SOUL MASTER / GRAND MASTER (DW / SM / GM)
  // =========================================================================
  1: { id: 1, name: 'Poison', nameEs: 'Veneno', category: 'Magia', races: ['DW', 'MG'], icon: 'bottle-tonic-skull', description: 'Envenena a los enemigos causando daño continuo de salud.' },
  2: { id: 2, name: 'Meteorite', nameEs: 'Meteorito', category: 'Magia', races: ['DW', 'MG'], icon: 'meteor', description: 'Invoca un meteoro ígneo concentrado que cae sobre el objetivo.' },
  3: { id: 3, name: 'Lighting', nameEs: 'Rayo Eléctrico', category: 'Magia', races: ['DW', 'MG'], icon: 'flash', description: 'Descarga eléctrica que sacude y empuja al enemigo hacia atrás.' },
  4: { id: 4, name: 'Fire Ball', nameEs: 'Bola de Fuego', category: 'Magia', races: ['DW', 'MG'], icon: 'fire', description: 'Dispara una esfera ardiente veloz que estalla al contacto.' },
  5: { id: 5, name: 'Flame', nameEs: 'Columna de Llamas (Flame)', category: 'Magia', races: ['DW', 'MG'], icon: 'fire-alert', description: 'Pilar continuo de fuego abrasador en una posición fija.' },
  6: { id: 6, name: 'Teleport', nameEs: 'Teletransportación', category: 'Especial', races: ['DW'], icon: 'swap-horizontal-bold', description: 'Teletransporta al mago a otra posición visible en el mapa.' },
  7: { id: 7, name: 'Ice', nameEs: 'Hielo (Ice)', category: 'Magia', races: ['DW', 'MG'], icon: 'snowflake', description: 'Congela al objetivo reduciendo su velocidad de movimiento y ataque.' },
  8: { id: 8, name: 'Twister', nameEs: 'Tornado (Twister)', category: 'Magia', races: ['DW', 'MG'], icon: 'weather-windy', description: 'Desata un vórtice de viento cortante que azota a los objetivos.' },
  9: { id: 9, name: 'Evil Spirit', nameEs: 'Espíritus Malignos (Evil Spirit)', category: 'Magia', races: ['DW', 'MG'], icon: 'ghost', description: 'Invoca espíritus de sombras que atacan a todos los enemigos de la pantalla.' },
  10: { id: 10, name: 'Hellfire', nameEs: 'Fuego del Infierno (Hellfire)', category: 'Magia', races: ['DW', 'MG'], icon: 'fire-spread', description: 'Explosión de llamas en 360 grados concentrada desde el cuerpo del mago.' },
  11: { id: 11, name: 'Power Wave', nameEs: 'Ola de Poder', category: 'Magia', races: ['DW', 'MG'], icon: 'waves', description: 'Onda psíquica de choque lineal de medio alcance.' },
  12: { id: 12, name: 'Aqua Beam', nameEs: 'Rayo Acuático (Aqua Beam)', category: 'Magia', races: ['DW', 'MG'], icon: 'water', description: 'Potente chorro de energía líquida que penetra filas de enemigos.' },
  13: { id: 13, name: 'Cometfall', nameEs: 'Cometa Astral (Cometfall)', category: 'Magia', races: ['DW', 'MG'], icon: 'star-shooting', description: 'Lluvia celestial de cometas de alto impacto focalizado.' },
  14: { id: 14, name: 'Inferno', nameEs: 'Infierno (Inferno)', category: 'Magia', races: ['DW', 'MG'], icon: 'volcano', description: 'Anillo de llamaradas infernales alrededor del mago.' },
  15: { id: 15, name: 'Teleport Ally', nameEs: 'Teletransportar Aliado', category: 'Especial', races: ['DW'], icon: 'account-arrow-right', description: 'Trae de inmediato a un compañero de grupo a la ubicación del mago.' },
  16: { id: 16, name: 'Soul Barrier', nameEs: 'Escudo de Maná (Soul Barrier)', category: 'Buff', races: ['DW'], icon: 'shield-half-full', description: 'Absorbe un porcentaje del daño recibido drenando maná en lugar de vida.' },
  38: { id: 38, name: 'Decay', nameEs: 'Deterioro Tóxico (Decay)', category: 'Magia', races: ['DW', 'MG'], icon: 'skull', description: 'Nube tóxica corrosiva que corroe la resistencia de los enemigos en un área.' },
  39: { id: 39, name: 'Ice Storm', nameEs: 'Tormenta de Hielo (Ice Storm)', category: 'Magia', races: ['DW', 'MG'], icon: 'weather-snowy-heavy', description: 'Tormenta glacial masiva que causa gran daño de área y ralentización profunda.' },
  40: { id: 40, name: 'Nova', nameEs: 'Supernova (Nova)', category: 'Magia', races: ['DW'], icon: 'sun-compass', description: 'Concentración de poder arcano que culmina en una explosión monumental.' },
  233: { id: 233, name: 'Expansion of Wizardry', nameEs: 'Expansión Mágica (Wizardry)', category: 'Buff', races: ['DW'], icon: 'auto-fix', description: 'Incrementa el poder y la penetración del daño mágico del invocador.' },

  // =========================================================================
  // 3. FAIRY ELF / MUSE ELF / HIGH ELF (FE / ME / HE)
  // =========================================================================
  24: { id: 24, name: 'Triple Shot', nameEs: 'Disparo Triple (Triple Shot)', category: 'Físico', races: ['FE'], icon: 'bow-arrow', description: 'Dispara 3 flechas simultáneamente en abanico frontal.' },
  26: { id: 26, name: 'Heal', nameEs: 'Curación (Heal)', category: 'Buff', races: ['FE'], icon: 'heart-pulse', description: 'Restaura una gran cantidad de vida al objetivo seleccionado o a la elfa.' },
  27: { id: 27, name: 'Greater Defense', nameEs: 'Aura de Defensa (Greater Defense)', category: 'Buff', races: ['FE'], icon: 'shield-plus', description: 'Incrementa la defensa propia y la de los compañeros de grupo.' },
  28: { id: 28, name: 'Greater Damage', nameEs: 'Aura de Ataque (Greater Damage)', category: 'Buff', races: ['FE'], icon: 'sword-cross', description: 'Incrementa el poder ofensivo físico y mágico propio y de los aliados.' },
  30: { id: 30, name: 'Summon Goblin', nameEs: 'Invocar Goblin', category: 'Invocación', races: ['FE'], icon: 'paw', description: 'Invoca a un Goblin guerrero leal para apoyar en combate.' },
  31: { id: 31, name: 'Summon Stone Golem', nameEs: 'Invocar Golem de Piedra', category: 'Invocación', races: ['FE'], icon: 'diamond-stone', description: 'Invoca a un Golem resistente con alta defensa.' },
  32: { id: 32, name: 'Summon Assassin', nameEs: 'Invocar Asesino', category: 'Invocación', races: ['FE'], icon: 'ninja', description: 'Invoca a un ágil asesino combatiente de ataques veloces.' },
  33: { id: 33, name: 'Summon Elite Yeti', nameEs: 'Invocar Yeti Élite', category: 'Invocación', races: ['FE'], icon: 'snowflake', description: 'Invoca a un poderoso Yeti de hielo con daño contundente.' },
  34: { id: 34, name: 'Summon Dark Knight', nameEs: 'Invocar Caballero Oscuro', category: 'Invocación', races: ['FE'], icon: 'shield-account', description: 'Invoca a un caballero de armadura oscura como guardián.' },
  35: { id: 35, name: 'Summon Bali', nameEs: 'Invocar Bali', category: 'Invocación', races: ['FE'], icon: 'spider', description: 'Invoca a una criatura Bali de las profundidades.' },
  36: { id: 36, name: 'Summon Soldier', nameEs: 'Invocar Soldado Dorado', category: 'Invocación', races: ['FE'], icon: 'account-supervisor-circle', description: 'Invoca al soldado dorado de élite con gran poder ofensivo.' },
  51: { id: 51, name: 'Penetration', nameEs: 'Flecha de Penetración', category: 'Físico', races: ['FE'], icon: 'arrow-right-bold', description: 'Dispara una flecha mágica que atraviesa enemigos en línea recta.' },
  52: { id: 52, name: 'Ice Arrow', nameEs: 'Flecha de Hielo (Ice Arrow)', category: 'Físico', races: ['FE'], icon: 'snowflake-melt', description: 'Dispara una saeta helada que inmoviliza y congela por completo al rival.' },
  234: { id: 234, name: 'Recovery', nameEs: 'Recuperación de SD (Recovery)', category: 'Buff', races: ['FE'], icon: 'shield-sync', description: 'Restaura puntos del escudo de protección (Shield Gauge - SD).' },
  235: { id: 235, name: 'Multi-Shot', nameEs: 'Disparo Múltiple (Five Shot)', category: 'Físico', races: ['FE'], icon: 'ray-start-arrow', description: 'Dispara una ráfaga de 5 flechas en abanico cubriendo una gran zona.' },
  236: { id: 236, name: 'Infinity Arrow', nameEs: 'Flecha Infinita (Infinity Arrow)', category: 'Buff', races: ['FE'], icon: 'infinity', description: 'Otorga munición mágica infinita sin requerir carcaj de flechas o virotes.' },

  // =========================================================================
  // 4. MAGIC GLADIATOR / DUEL MASTER (MG / DM)
  // =========================================================================
  55: { id: 55, name: 'Fire Slash', nameEs: 'Corte de Fuego (Fire Slash)', category: 'Físico', races: ['MG'], icon: 'fire-hydrant', description: 'Corte rápido llameante que reduce drásticamente la defensa de la armadura enemiga.' },
  56: { id: 56, name: 'Power Slash', nameEs: 'Corte de Poder (Power Slash)', category: 'Físico', races: ['MG'], icon: 'lightning-bolt-circle', description: 'Dispara ondas de choque cortantes a distancia con espadas de dos manos.' },
  230: { id: 230, name: 'Gigantic Storm', nameEs: 'Tormenta Gigante (Gigantic Storm)', category: 'Magia', races: ['MG'], icon: 'weather-lightning-rainy', description: 'Invoca rayos celestiales masivos que diezman un radio completo de enemigos.' },
  237: { id: 237, name: 'Spiral Slash', nameEs: 'Tajo Espiral (Spiral Slash)', category: 'Físico', races: ['MG'], icon: 'flare', description: 'Giro veloz con espadas dobles que desgarra al contrincante.' },
  238: { id: 238, name: 'Flame Strike', nameEs: 'Golpe de Llama (Flame Strike)', category: 'Físico', races: ['MG'], icon: 'firework', description: 'Ataque flamígero a distancia con trayectoria de fuego explosivo.' },

  // =========================================================================
  // 5. DARK LORD / LORD EMPEROR (DL / LE)
  // =========================================================================
  60: { id: 60, name: 'Force', nameEs: 'Fuerza Espiritual (Force)', category: 'Magia', races: ['DL'], icon: 'radioactive', description: 'Disparo de energía sagrada pura concentrada del Dark Lord.' },
  61: { id: 61, name: 'Fireburst', nameEs: 'Ráfaga de Cadenas (Fireburst)', category: 'Magia', races: ['DL'], icon: 'fire-alert', description: 'Explosión de cadenas de fuego en múltiples objetivos simultáneos.' },
  62: { id: 62, name: 'Increase Critical Damage', nameEs: 'Aura de Daño Crítico (Critical)', category: 'Buff', races: ['DL'], icon: 'target', description: 'Incrementa enormemente el daño crítico y excelente propio y del clan.' },
  63: { id: 63, name: 'Electric Spike', nameEs: 'Púa Eléctrica (Electric Spike)', category: 'Magia', races: ['DL'], icon: 'flash-alert', description: 'Púas de energía eléctrica concentrada que castigan al adversario.' },
  64: { id: 64, name: 'Force Wave', nameEs: 'Ola de Fuerza (Force Wave)', category: 'Magia', races: ['DL'], icon: 'wave', description: 'Onda sagrada frontal que empuja y derriba enemigos.' },
  65: { id: 65, name: 'Summon', nameEs: 'Llamado de Grupo (Summon Party)', category: 'Especial', races: ['DL'], icon: 'account-group', description: 'Convoca instantáneamente a todos los miembros del grupo a la ubicación del DL.' },
  67: { id: 67, name: 'Earthquake', nameEs: 'Terremoto de Caballo (Earthquake)', category: 'Físico', races: ['DL'], icon: 'earth', description: 'Poderoso pisotón del Dark Horse que aturde y daña en área.' },
  68: { id: 68, name: 'Raven Attack', nameEs: 'Ataque de Cuervo (Dark Raven)', category: 'Especial', races: ['DL'], icon: 'bird', description: 'Ordena al Dark Raven sobrevolar y ejecutar ataques continuos.' },
  78: { id: 78, name: 'Fire Scream', nameEs: 'Grito de Fuego (Fire Scream)', category: 'Magia', races: ['DL'], icon: 'bullhorn', description: 'Tres ondas de fuego expansivas simultáneas con daño letal masivo.' },
  239: { id: 239, name: 'Iron Defense', nameEs: 'Defensa de Hierro (Iron Defense)', category: 'Buff', races: ['DL'], icon: 'shield-lock', description: 'Aumenta masivamente la defensa y la resistencia al daño a costa de movilidad.' },

  // =========================================================================
  // 6. SUMMONER / BLOODY SUMMONER / DIMENSION MASTER (SU / BS / DM)
  // =========================================================================
  214: { id: 214, name: 'Drain Life', nameEs: 'Drenar Vida (Drain Life)', category: 'Magia', races: ['SU'], icon: 'vampire', description: 'Drena salud al oponente y regenera la vida de la invocadora.' },
  215: { id: 215, name: 'Chain Lightning', nameEs: 'Cadena de Rayos (Chain Lightning)', category: 'Magia', races: ['SU'], icon: 'flash-outline', description: 'Descarga eléctrica que encadena y salta hasta 3 objetivos consecutivos.' },
  216: { id: 216, name: 'Electric Surge', nameEs: 'Sobrecarga Eléctrica (Electric Surge)', category: 'Magia', races: ['SU'], icon: 'lightning-bolt', description: 'Descarga penetrante concentrada en línea recta.' },
  217: { id: 217, name: 'Damage Reflection', nameEs: 'Reflejo de Daño (Reflect)', category: 'Buff', races: ['SU'], icon: 'mirror', description: 'Aura que refleja un porcentaje de todo el daño recibido de vuelta al agresor.' },
  218: { id: 218, name: 'Innovation', nameEs: 'Innovación / Quitar Defensa', category: 'Magia', races: ['SU'], icon: 'shield-alert', description: 'Debilita la armadura y la defensa física y mágica de los enemigos cercanos.' },
  219: { id: 219, name: 'Sleep', nameEs: 'Sueño Profundo (Sleep)', category: 'Magia', races: ['SU'], icon: 'bed', description: 'Duerme e inmoviliza a los enemigos en el área hasta recibir daño.' },
  221: { id: 221, name: 'Weakness', nameEs: 'Debilidad / Reducir Ataque', category: 'Magia', races: ['SU'], icon: 'sword-cross', description: 'Reduce considerablemente la potencia ofensiva del adversario.' },
  222: { id: 222, name: 'Lightning Shock', nameEs: 'Choque Eléctrico (Lightning Shock)', category: 'Magia', races: ['SU'], icon: 'flash', description: 'Tormenta de rayos omnidireccional expansiva con gran poder de destrucción.' },
  223: { id: 223, name: 'Blind', nameEs: 'Ceguera (Blind)', category: 'Magia', races: ['SU'], icon: 'eye-off', description: 'Ciega temporalmente al adversario reduciendo drásticamente su precisión de golpe.' },
  224: { id: 224, name: 'Pollute', nameEs: 'Polución Maldita (Pollute)', category: 'Magia', races: ['SU'], icon: 'biohazard', description: 'Contamina el suelo creando un foso de corrupción que desintegra a los enemigos.' },
  225: { id: 225, name: 'Berserker', nameEs: 'Furia Berserker (Berserker)', category: 'Buff', races: ['SU'], icon: 'emoticon-angry', description: 'Aumenta salvajemente el ataque mágico a costa de reducir la defensa personal.' },
  231: { id: 231, name: 'Requiem', nameEs: 'Réquiem del Libro Neil (Requiem)', category: 'Magia', races: ['SU'], icon: 'skull-outline', description: 'Invoca al espíritu guardián Neil para proyectar púas fantasmales letales.' },

  // =========================================================================
  // 7. RAGE FIGHTER / FIST MASTER (RF / FM)
  // =========================================================================
  260: { id: 260, name: 'Killing Blow', nameEs: 'Golpe Asesino (Killing Blow)', category: 'Físico', races: ['RF'], icon: 'hand-back-left', description: 'Puñetazo certero y veloz que aturde y desestabiliza al oponente.' },
  261: { id: 261, name: 'Beast Uppercut', nameEs: 'Gancho Bestial (Beast Uppercut)', category: 'Físico', races: ['RF'], icon: 'hand-back-right', description: 'Gancho ascendente demoledor con daño físico potenciado.' },
  262: { id: 262, name: 'Chain Drive', nameEs: 'Embate Continuo (Chain Drive)', category: 'Físico', races: ['RF'], icon: 'run-fast', description: 'Ráfaga ultrarrápida de golpes sucesivos que desgastan y ralentizan al rival.' },
  263: { id: 263, name: 'Dark Side', nameEs: 'Lado Oscuro (Dark Side)', category: 'Físico', races: ['RF'], icon: 'ghost', description: 'Crea clones de sombras que atacan velozmente a todos los enemigos de la pantalla.' },
  264: { id: 264, name: 'Dragon Roar', nameEs: 'Rugido del Dragón (Dragon Roar)', category: 'Físico', races: ['RF'], icon: 'bullhorn-variant', description: 'Onda sónica devastadora que golpea en un amplio radio circular.' },
  265: { id: 265, name: 'Dragon Slasher', nameEs: 'Corte del Dragón (Dragon Slasher)', category: 'Físico', races: ['RF'], icon: 'sword', description: 'Ataque pesado que anula las defensas de SD del rival en combate PvP.' },
  266: { id: 266, name: 'Ignore Defense', nameEs: 'Ignorar Defensa (Ignore Defense)', category: 'Buff', races: ['RF'], icon: 'shield-off', description: 'Otorga una probabilidad porcentual fija de ignorar la defensa enemiga.' },
  267: { id: 267, name: 'Increase Health', nameEs: 'Aumento de Salud (Fitness)', category: 'Buff', races: ['RF'], icon: 'heart-flash', description: 'Incrementa la vitalidad y la reserva máxima de salud propia y del grupo.' },
  268: { id: 268, name: 'Increase Block', nameEs: 'Aumento de Bloqueo (Defense Rate)', category: 'Buff', races: ['RF'], icon: 'shield-check', description: 'Incrementa la probabilidad de evadir y bloquear impactos enemigos.' },
  269: { id: 269, name: 'Phoenix Shot', nameEs: 'Disparo Fénix (Phoenix Shot)', category: 'Físico', races: ['RF'], icon: 'fire-circle', description: 'Dispara un proyectil de energía ígnea en forma de fénix hacia el objetivo.' },
};

// Presets canónicos de Habilidades recomendadas por Raza
export const RACE_SKILL_PRESETS: Record<string, { label: string; code: string; color: string; icon: string; skillIds: number[] }> = {
  DK: {
    label: 'Dark Knight (BK / BM)',
    code: 'DK',
    color: '#FF5252',
    icon: 'sword',
    skillIds: [18, 19, 20, 21, 22, 23, 41, 42, 43, 44, 48, 111, 232],
  },
  DW: {
    label: 'Dark Wizard (SM / GM)',
    code: 'DW',
    color: '#5B8DEF',
    icon: 'magic-staff',
    skillIds: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 38, 39, 40, 233],
  },
  FE: {
    label: 'Fairy Elf (ME / HE)',
    code: 'FE',
    color: '#3FCF8E',
    icon: 'bow-arrow',
    skillIds: [24, 26, 27, 28, 30, 31, 32, 33, 34, 35, 36, 51, 52, 234, 235, 236],
  },
  MG: {
    label: 'Magic Gladiator (DM)',
    code: 'MG',
    color: '#FFA726',
    icon: 'lightning-bolt',
    skillIds: [18, 19, 20, 21, 22, 23, 41, 55, 56, 230, 237, 238, 1, 2, 3, 4, 5, 7, 8, 9, 10, 11, 12, 13, 14, 38, 39],
  },
  DL: {
    label: 'Dark Lord (LE)',
    code: 'DL',
    color: '#E8C86A',
    icon: 'shield-crown',
    skillIds: [60, 61, 62, 63, 64, 65, 67, 68, 78, 239],
  },
  SU: {
    label: 'Summoner (BS / DM)',
    code: 'SU',
    color: '#4DD0E1',
    icon: 'book-open-variant',
    skillIds: [214, 215, 216, 217, 218, 219, 221, 222, 223, 224, 225, 231],
  },
  RF: {
    label: 'Rage Fighter (FM)',
    code: 'RF',
    color: '#FF7043',
    icon: 'boxing-glove',
    skillIds: [260, 261, 262, 263, 264, 265, 266, 267, 268, 269],
  },
};

/**
 * Obtener código de raza simple (DK, DW, FE, MG, DL, SU, RF) dado el Class ID de Mu Online
 */
export function getRaceCodeByClassId(classId: number): string {
  if (classId >= 0 && classId <= 3) return 'DW';
  if (classId >= 16 && classId <= 19) return 'DK';
  if (classId >= 32 && classId <= 35) return 'FE';
  if (classId >= 48 && classId <= 50) return 'MG';
  if (classId >= 64 && classId <= 66) return 'DL';
  if (classId >= 80 && classId <= 83) return 'SU';
  if (classId >= 96 && classId <= 98) return 'RF';
  return 'DK';
}

const RACE_ORDER = ['DK', 'DW', 'FE', 'MG', 'DL', 'SU', 'RF'];

/**
 * Obtener lista de todas las habilidades ordenadas por Clase y por ID
 */
export function getAllSkills(): MuSkillDefinition[] {
  return Object.values(MU_SKILLS).sort((a, b) => {
    const rA = a.races[0] || 'ZZ';
    const rB = b.races[0] || 'ZZ';
    const idxA = RACE_ORDER.indexOf(rA);
    const idxB = RACE_ORDER.indexOf(rB);
    const orderA = idxA === -1 ? 99 : idxA;
    const orderB = idxB === -1 ? 99 : idxB;
    if (orderA !== orderB) return orderA - orderB;
    return a.id - b.id;
  });
}

/**
 * Obtener definición de una habilidad por ID
 */
export function getSkillById(id: number): MuSkillDefinition | undefined {
  return MU_SKILLS[id];
}
