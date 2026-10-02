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
  3: { id: 3, name: 'Lightning', nameEs: 'Rayo Eléctrico (Lightning)', category: 'Magia', races: ['DW', 'MG'], icon: 'flash', description: 'Descarga eléctrica que sacude y empuja al enemigo hacia atrás.' },
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
  69: { id: 69, name: 'Swell Mana', nameEs: 'Aumento de Maná (Swell Mana)', category: 'Buff', races: ['DW', 'MG'], icon: 'water-plus', description: 'Incrementa temporalmente el maná máximo propio y de los aliados en grupo.' },
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
  51: { id: 51, name: 'Ice Arrow', nameEs: 'Flecha de Hielo (Ice Arrow)', category: 'Físico', races: ['FE'], icon: 'snowflake-melt', description: 'Dispara una saeta helada que inmoviliza y congela por completo al rival.' },
  52: { id: 52, name: 'Penetration', nameEs: 'Flecha de Penetración', category: 'Físico', races: ['FE'], icon: 'arrow-right-bold', description: 'Dispara una flecha mágica que atraviesa enemigos en línea recta.' },
  77: { id: 77, name: 'Infinity Arrow', nameEs: 'Flecha Infinita (Infinity Arrow)', category: 'Buff', races: ['FE'], icon: 'infinity', description: 'Otorga munición mágica infinita sin requerir carcaj de flechas o virotes.' },
  234: { id: 234, name: 'Recovery', nameEs: 'Recuperación de SD (Recovery)', category: 'Buff', races: ['FE'], icon: 'shield-sync', description: 'Restaura puntos del escudo de protección (Shield Gauge - SD).' },
  235: { id: 235, name: 'Multi-Shot', nameEs: 'Disparo Múltiple (Five Shot)', category: 'Físico', races: ['FE'], icon: 'ray-start-arrow', description: 'Dispara una ráfaga de 5 flechas en abanico cubriendo una gran zona.' },

  // =========================================================================
  // 4. MAGIC GLADIATOR / DUEL MASTER (MG / DM)
  // =========================================================================
  55: { id: 55, name: 'Fire Slash', nameEs: 'Corte de Fuego (Fire Slash)', category: 'Físico', races: ['MG'], icon: 'fire-hydrant', description: 'Corte rápido llameante que reduce drásticamente la defensa de la armadura enemiga.' },
  56: { id: 56, name: 'Power Slash', nameEs: 'Corte de Poder (Power Slash)', category: 'Físico', races: ['MG'], icon: 'lightning-bolt-circle', description: 'Dispara ondas de choque cortantes a distancia con espadas de dos manos.' },
  57: { id: 57, name: 'Spiral Slash', nameEs: 'Tajo Espiral (Spiral Slash)', category: 'Físico', races: ['MG'], icon: 'flare', description: 'Giro veloz con espadas dobles que desgarra al contrincante.' },
  236: { id: 236, name: 'Flame Strike', nameEs: 'Golpe de Llama (Flame Strike)', category: 'Físico', races: ['MG'], icon: 'firework', description: 'Ataque flamígero a distancia con trayectoria de fuego explosivo.' },
  237: { id: 237, name: 'Gigantic Storm', nameEs: 'Tormenta Gigante (Gigantic Storm)', category: 'Magia', races: ['MG'], icon: 'weather-lightning-rainy', description: 'Invoca rayos celestiales masivos que diezman un radio completo de enemigos.' },

  // =========================================================================
  // 5. DARK LORD / LORD EMPEROR (DL / LE)
  // =========================================================================
  60: { id: 60, name: 'Force', nameEs: 'Fuerza Espiritual (Force)', category: 'Magia', races: ['DL'], icon: 'radioactive', description: 'Disparo de energía sagrada pura concentrada del Dark Lord.' },
  61: { id: 61, name: 'Fire Burst', nameEs: 'Ráfaga de Cadenas (Fire Burst)', category: 'Magia', races: ['DL'], icon: 'fire-alert', description: 'Explosión de cadenas de fuego en múltiples objetivos simultáneos.' },
  62: { id: 62, name: 'Earthshake', nameEs: 'Pisotón de Caballo (Earthshake)', category: 'Físico', races: ['DL'], icon: 'earth', description: 'Poderoso pisotón del Dark Horse que aturde y daña en área.' },
  63: { id: 63, name: 'Summon', nameEs: 'Llamado de Grupo (Summon Party)', category: 'Especial', races: ['DL'], icon: 'account-group', description: 'Convoca instantáneamente a todos los miembros del grupo a la ubicación del DL.' },
  64: { id: 64, name: 'Increase Critical Damage', nameEs: 'Aura de Daño Crítico (Critical)', category: 'Buff', races: ['DL'], icon: 'target', description: 'Incrementa enormemente el daño crítico y excelente propio y del clan.' },
  65: { id: 65, name: 'Electric Spike', nameEs: 'Púa Eléctrica (Electric Spike)', category: 'Magia', races: ['DL'], icon: 'flash-alert', description: 'Púas de energía eléctrica concentrada que castigan al adversario.' },
  66: { id: 66, name: 'Force Wave', nameEs: 'Ola de Fuerza (Force Wave)', category: 'Magia', races: ['DL'], icon: 'wave', description: 'Onda sagrada frontal que empuja y derriba enemigos.' },
  78: { id: 78, name: 'Fire Scream', nameEs: 'Grito de Fuego (Fire Scream)', category: 'Magia', races: ['DL'], icon: 'bullhorn', description: 'Tres ondas de fuego expansivas simultáneas con daño letal masivo.' },
  238: { id: 238, name: 'Chaotic Diseier', nameEs: 'Deseo Caótico (Chaotic Diseier)', category: 'Magia', races: ['DL'], icon: 'ghost', description: 'Invoca espíritus sombríos de alta concentración para atacar al objetivo.' },

  // =========================================================================
  // 6. SUMMONER / BLOODY SUMMONER / DIMENSION MASTER (SU / BS / DM)
  // =========================================================================
  214: { id: 214, name: 'Drain Life', nameEs: 'Drenar Vida (Drain Life)', category: 'Magia', races: ['SU'], icon: 'vampire', description: 'Drena salud al oponente y regenera la vida de la invocadora.' },
  215: { id: 215, name: 'Chain Lightning', nameEs: 'Cadena de Rayos (Chain Lightning)', category: 'Magia', races: ['SU'], icon: 'flash-outline', description: 'Descarga eléctrica que encadena y salta hasta 3 objetivos consecutivos.' },
  217: { id: 217, name: 'Damage Reflection', nameEs: 'Reflejo de Daño (Reflect)', category: 'Buff', races: ['SU'], icon: 'mirror', description: 'Aura que refleja un porcentaje de todo el daño recibido de vuelta al agresor.' },
  218: { id: 218, name: 'Berserker', nameEs: 'Furia Berserker (Berserker)', category: 'Buff', races: ['SU'], icon: 'emoticon-angry', description: 'Aumenta salvajemente el ataque mágico a costa de reducir la defensa personal.' },
  219: { id: 219, name: 'Sleep', nameEs: 'Sueño Profundo (Sleep)', category: 'Magia', races: ['SU'], icon: 'bed', description: 'Duerme e inmoviliza a los enemigos en el área hasta recibir daño.' },
  221: { id: 221, name: 'Weakness', nameEs: 'Debilidad / Reducir Ataque', category: 'Magia', races: ['SU'], icon: 'sword-cross', description: 'Reduce considerablemente la potencia ofensiva del adversario.' },
  222: { id: 222, name: 'Innovation', nameEs: 'Innovación / Quitar Defensa', category: 'Magia', races: ['SU'], icon: 'shield-alert', description: 'Debilita la armadura y la defensa física y mágica de los enemigos cercanos.' },
  223: { id: 223, name: 'Explosion', nameEs: 'Explosión de Sahamutt (Explosion)', category: 'Magia', races: ['SU'], icon: 'fire-spread', description: 'Explosión de fuego primordial desatada del Libro de Sahamutt.' },
  224: { id: 224, name: 'Requiem', nameEs: 'Réquiem de Neil (Requiem)', category: 'Magia', races: ['SU'], icon: 'skull-outline', description: 'Invoca al espíritu guardián Neil para proyectar púas fantasmales letales.' },
  225: { id: 225, name: 'Pollution', nameEs: 'Polución de Ghost Phantom', category: 'Magia', races: ['SU'], icon: 'biohazard', description: 'Contamina el suelo creando un foso de corrupción que desintegra a los enemigos.' },
  230: { id: 230, name: 'Lightning Shock', nameEs: 'Choque Eléctrico (Lightning Shock)', category: 'Magia', races: ['SU'], icon: 'flash', description: 'Tormenta de rayos omnidireccional expansiva con gran poder de destrucción.' },

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
  269: { id: 269, name: 'Charge', nameEs: 'Carga Ofensiva (Charge)', category: 'Físico', races: ['RF'], icon: 'run-fast', description: 'Embestida rápida hacia adelante que desestabiliza las defensas del enemigo.' },
  270: { id: 270, name: 'Phoenix Shot', nameEs: 'Disparo Fénix (Phoenix Shot)', category: 'Físico', races: ['RF'], icon: 'fire-circle', description: 'Dispara un proyectil de energía ígnea en forma de fénix hacia el objetivo.' },

  // =========================================================================
  // 8. ESPECIALES / MASCOTAS / FENRIR
  // =========================================================================
  76: { id: 76, name: 'Plasma Storm', nameEs: 'Tormenta de Plasma (Fenrir)', category: 'Especial', races: ['DK', 'DW', 'FE', 'MG', 'DL', 'SU', 'RF'], icon: 'lightning-bolt-circle', description: 'Descarga masiva de plasma concentrado desatada al montar la bestia mítica Fenrir.' },

  // =========================================================================
  // 9. MASTER SKILL TREE (ÁRBOL DE HABILIDADES MAESTRAS - SEASON 6)
  // =========================================================================
  // --- Activas y Refuerzos de Blade Master (DK) ---
  326: { id: 326, name: 'Cyclone Strengthener', nameEs: 'Refuerzo de Ciclón (Cyclone [Master])', category: 'Físico', races: ['DK', 'MG'], icon: 'weather-tornado', description: 'Incrementa el daño del golpe de Ciclón.' },
  327: { id: 327, name: 'Slash Strengthener', nameEs: 'Refuerzo de Tajo Doble (Slash [Master])', category: 'Físico', races: ['DK', 'MG'], icon: 'sword-cross', description: 'Incrementa el daño del corte cruzado de Tajo Doble.' },
  328: { id: 328, name: 'Falling Slash Strengthener', nameEs: 'Refuerzo de Corte Descendente (Falling Slash [Master])', category: 'Físico', races: ['DK', 'MG'], icon: 'sword', description: 'Incrementa el daño del Corte Descendente.' },
  329: { id: 329, name: 'Lunge Strengthener', nameEs: 'Refuerzo de Estocada (Lunge [Master])', category: 'Físico', races: ['DK', 'MG'], icon: 'knife-military', description: 'Incrementa la penetración y daño de la Estocada.' },
  330: { id: 330, name: 'Twisting Slash Strengthener', nameEs: 'Refuerzo de Tajo Giratorio (Twisting [Master])', category: 'Físico', races: ['DK', 'MG'], icon: 'rotate-right', description: 'Incrementa drásticamente el daño del Tajo Giratorio.' },
  331: { id: 331, name: 'Rageful Blow Strengthener', nameEs: 'Refuerzo de Golpe Furioso (Rageful [Master])', category: 'Físico', races: ['DK'], icon: 'image-filter-hdr', description: 'Incrementa el daño de las ondas sísmicas del Golpe Furioso.' },
  332: { id: 332, name: 'Twisting Slash Mastery', nameEs: 'Maestría de Tajo Giratorio (Twisting Mastery)', category: 'Físico', races: ['DK', 'MG'], icon: 'rotate-right', description: 'Probabilidad de empujar hacia atrás a los enemigos alcanzados por el Tajo Giratorio.' },
  333: { id: 333, name: 'Rageful Blow Mastery', nameEs: 'Maestría de Golpe Furioso (Rageful Mastery)', category: 'Físico', races: ['DK'], icon: 'image-filter-hdr', description: 'Probabilidad de desgastar la durabilidad de las piezas de armadura del adversario.' },
  336: { id: 336, name: 'Death Stab Strengthener', nameEs: 'Refuerzo de Puñalada Mortal (Death Stab [Master])', category: 'Físico', races: ['DK'], icon: 'lightning-bolt', description: 'Incrementa masivamente el daño letal de la Puñalada Mortal.' },
  337: { id: 337, name: 'Strike of Destruction Strengthener', nameEs: 'Refuerzo de Golpe de Destrucción (Destruction [Master])', category: 'Físico', races: ['DK'], icon: 'skull-crossbones', description: 'Incrementa la potencia destructiva de las espadas de energía del cielo.' },
  339: { id: 339, name: 'Death Stab Proficiency', nameEs: 'Destreza de Puñalada Mortal (Proficiency)', category: 'Físico', races: ['DK'], icon: 'lightning-bolt', description: 'Añade daño residual constante por segundo basado en la fuerza del Blade Master.' },
  340: { id: 340, name: 'Strike of Destruction Proficiency', nameEs: 'Destreza de Golpe de Destrucción (Proficiency)', category: 'Físico', races: ['DK'], icon: 'skull-crossbones', description: 'Probabilidad de inmovilizar a las víctimas del Golpe de Destrucción.' },
  342: { id: 342, name: 'Death Stab Mastery', nameEs: 'Maestría de Puñalada Mortal (Mastery)', category: 'Físico', races: ['DK'], icon: 'lightning-bolt', description: 'Probabilidad de aturdir (stun) al objetivo durante 2 segundos.' },
  343: { id: 343, name: 'Strike of Destruction Mastery', nameEs: 'Maestría de Golpe de Destrucción (Mastery)', category: 'Físico', races: ['DK'], icon: 'skull-crossbones', description: 'Probabilidad de ralentizar la velocidad de movimiento de los enemigos.' },
  344: { id: 344, name: 'Fire Slash (Master)', nameEs: 'Corte de Fuego Maestro (Fire Slash [Master])', category: 'Físico', races: ['DK', 'MG'], icon: 'fire-spread', description: 'Habilidad aprendida del árbol maestro. Ataque ígneo cortante apto para combos.' },
  345: { id: 345, name: 'Combo Skill Strengthener', nameEs: 'Refuerzo de Combo de Marlon (Combo [Master])', category: 'Especial', races: ['DK'], icon: 'fire-circle', description: 'Incrementa porcentualmente el daño demoledor de la explosión de combo.' },
  346: { id: 346, name: 'Sword Slash / Blood Storm', nameEs: 'Tormenta de Espadas / Corte Sangriento (Sword Slash)', category: 'Físico', races: ['DK'], icon: 'sword-cross', description: 'Habilidad activa maestra de Blade Master aprendida del Árbol de Habilidades. Cortes cortantes en área aptos para encadenar combos letales.' },
  347: { id: 347, name: 'PvP Attack Rate Increase', nameEs: 'Aumento de Éxito de Ataque PvP (Master)', category: 'Buff', races: ['DK'], icon: 'target', description: 'Incrementa la tasa de éxito de ataque en combates contra otros jugadores.' },
  348: { id: 348, name: 'Two-Handed Sword Strengthener', nameEs: 'Maestría de Espada a Dos Manos (Two-Handed Sword [Master])', category: 'Físico', races: ['DK'], icon: 'sword', description: 'Incrementa sustancialmente el poder de ataque físico al empuñar espadas de dos manos.' },
  349: { id: 349, name: 'One-Handed Sword Strengthener', nameEs: 'Maestría de Espada de Una Mano (One-Handed Sword [Master])', category: 'Físico', races: ['DK'], icon: 'sword', description: 'Incrementa el poder de ataque físico al equipar una espada de una mano.' },
  350: { id: 350, name: 'Mace Strengthener', nameEs: 'Refuerzo de Maza (Mace Strengthener [Master])', category: 'Físico', races: ['DK'], icon: 'hammer', description: 'Incrementa el daño contundente al empuñar mazas.' },
  351: { id: 351, name: 'Spear Strengthener', nameEs: 'Refuerzo de Lanza (Spear Strengthener [Master])', category: 'Físico', races: ['DK'], icon: 'knife-military', description: 'Incrementa el poder de ataque físico y penetración al empuñar lanzas y alabardas.' },
  352: { id: 352, name: 'Two-Handed Sword Mastery', nameEs: 'Maestría Avanzada Espada Dos Manos', category: 'Físico', races: ['DK'], icon: 'sword', description: 'Bono de poder de ataque adicional en combates PvP.' },
  353: { id: 353, name: 'One-Handed Sword Mastery', nameEs: 'Velocidad Espada Una Mano (Mastery)', category: 'Físico', races: ['DK'], icon: 'sword', description: 'Incrementa la velocidad de ataque al blandir espadas de una mano.' },
  354: { id: 354, name: 'Mace Mastery', nameEs: 'Aturdimiento con Maza (Mace Mastery)', category: 'Físico', races: ['DK'], icon: 'hammer', description: 'Probabilidad de aturdir al enemigo por 2 segundos al golpear con maza.' },
  355: { id: 355, name: 'Spear Mastery', nameEs: 'Doble Daño con Lanza (Spear Mastery)', category: 'Físico', races: ['DK'], icon: 'knife-military', description: 'Incrementa la tasa de golpe de doble daño al blandir lanzas.' },
  356: { id: 356, name: 'Swell Life Strengthener', nameEs: 'Refuerzo de Aura de Vida (Swell Life [Master])', category: 'Buff', races: ['DK'], icon: 'heart-plus', description: 'Aumenta aún más el bono de vida máxima que otorga el Aura de Vida.' },
  360: { id: 360, name: 'Swell Life Proficiency', nameEs: 'Destreza de Aura de Vida (Mana Bonus)', category: 'Buff', races: ['DK'], icon: 'water-plus', description: 'El Aura de Vida ahora también incrementa el Maná máximo de los aliados.' },
  363: { id: 363, name: 'Swell Life Mastery', nameEs: 'Maestría de Aura de Vida (AG Bonus)', category: 'Buff', races: ['DK'], icon: 'lightning-bolt', description: 'El Aura de Vida incrementa adicionalmente el AG máximo del grupo.' },

  // --- Habilidades Pasivas Comunes del Árbol Maestro ---
  300: { id: 300, name: 'Durability Reduction 1', nameEs: 'Reducción de Desgaste I (Armas y Armaduras)', category: 'Buff', races: ['DK', 'DW', 'FE', 'MG', 'DL', 'SU', 'RF'], icon: 'shield-check', description: 'Disminuye la velocidad de desgaste de armas y armaduras equipadas.' },
  301: { id: 301, name: 'PvP Defense Rate Increase', nameEs: 'Aumento de Defensa PvP (Master)', category: 'Buff', races: ['DK', 'DW', 'FE', 'MG', 'DL', 'SU', 'RF'], icon: 'shield', description: 'Incrementa la tasa de defensa en combate contra otros jugadores.' },
  302: { id: 302, name: 'Maximum SD Increase', nameEs: 'Aumento de SD Máximo (Master)', category: 'Buff', races: ['DK', 'DW', 'FE', 'MG', 'DL', 'SU', 'RF'], icon: 'shield-sun', description: 'Incrementa la reserva de escudo protector (SD) máximo del personaje.' },
  303: { id: 303, name: 'Automatic Mana Recovery', nameEs: 'Regeneración Automática de Maná', category: 'Buff', races: ['DK', 'DW', 'FE', 'MG', 'DL', 'SU', 'RF'], icon: 'water', description: 'Aumenta la tasa de regeneración pasiva continua de maná.' },
  304: { id: 304, name: 'Poison Resistance', nameEs: 'Resistencia a Veneno (Master)', category: 'Buff', races: ['DK', 'DW', 'FE', 'MG', 'DL', 'SU', 'RF'], icon: 'bottle-tonic-skull', description: 'Incrementa la resistencia porcentual frente a ataques venenosos.' },
  305: { id: 305, name: 'Durability Reduction 2', nameEs: 'Reducción de Desgaste II (Accesorios)', category: 'Buff', races: ['DK', 'DW', 'FE', 'MG', 'DL', 'SU', 'RF'], icon: 'shield-check', description: 'Disminuye la velocidad de desgaste de anillos y colgantes equipados.' },
  306: { id: 306, name: 'SD Recovery Speed Increase', nameEs: 'Velocidad de Recuperación de SD', category: 'Buff', races: ['DK', 'DW', 'FE', 'MG', 'DL', 'SU', 'RF'], icon: 'shield-refresh', description: 'Incrementa la velocidad de recuperación automática del escudo SD.' },
  307: { id: 307, name: 'Automatic HP Recovery', nameEs: 'Recuperación Automática de Vida (HP)', category: 'Buff', races: ['DK', 'DW', 'FE', 'MG', 'DL', 'SU', 'RF'], icon: 'heart-pulse', description: 'Aumenta la tasa de regeneración pasiva continua de salud del personaje.' },
  308: { id: 308, name: 'Lightning Resistance', nameEs: 'Resistencia al Rayo (Master)', category: 'Buff', races: ['DK', 'DW', 'FE', 'MG', 'DL', 'SU', 'RF'], icon: 'flash', description: 'Incrementa la resistencia defensiva contra ataques de rayo y electricidad.' },
  309: { id: 309, name: 'Defense Increase', nameEs: 'Aumento de Defensa Base (Master)', category: 'Buff', races: ['DK', 'DW', 'FE', 'MG', 'DL', 'SU', 'RF'], icon: 'shield-plus', description: 'Incrementa de manera permanente los puntos de defensa física del personaje.' },
  310: { id: 310, name: 'Automatic AG Recovery', nameEs: 'Recuperación Automática de AG', category: 'Buff', races: ['DK', 'DW', 'FE', 'MG', 'DL', 'SU', 'RF'], icon: 'lightning-bolt', description: 'Acelera la recuperación del indicador de AG para usar habilidades continuas.' },
  311: { id: 311, name: 'Ice Resistance', nameEs: 'Resistencia al Hielo (Master)', category: 'Buff', races: ['DK', 'DW', 'FE', 'MG', 'DL', 'SU', 'RF'], icon: 'snowflake', description: 'Incrementa la resistencia defensiva contra ataques de congelación y hielo.' },
  312: { id: 312, name: 'Durability Reduction 3', nameEs: 'Reducción de Desgaste III (Mascotas)', category: 'Buff', races: ['DK', 'DW', 'FE', 'MG', 'DL', 'SU', 'RF'], icon: 'shield-check', description: 'Reduce la pérdida de durabilidad de Satan, Angel, Dinorant y Fenrir.' },
  313: { id: 313, name: 'Defense Success Rate Increase', nameEs: 'Éxito de Bloqueo / Defensa (Master)', category: 'Buff', races: ['DK', 'DW', 'FE', 'MG', 'DL', 'SU', 'RF'], icon: 'shield-check', description: 'Incrementa la probabilidad de bloquear y anular impactos enemigos.' },
  315: { id: 315, name: 'Set Defense Increase', nameEs: 'Defensa de Set Completo (Master)', category: 'Buff', races: ['DK', 'DW', 'FE', 'MG', 'DL', 'SU', 'RF'], icon: 'shield-account', description: 'Otorga una bonificación de defensa al llevar las 5 piezas del set equipadas.' },
  316: { id: 316, name: 'Damage Return', nameEs: 'Retorno de Daño / Contraataque', category: 'Buff', races: ['DK', 'DW', 'FE', 'MG', 'DL', 'SU', 'RF'], icon: 'mirror', description: 'Probabilidad de devolver parte del daño recibido directamente al atacante.' },
  317: { id: 317, name: 'Energy Increase', nameEs: 'Aumento de Energía Base (Master)', category: 'Buff', races: ['DK', 'DW', 'FE', 'MG', 'DL', 'SU', 'RF'], icon: 'fire', description: 'Incrementa permanentemente los puntos de Energía del personaje.' },
  318: { id: 318, name: 'Stamina Increase', nameEs: 'Aumento de Vitalidad (Master)', category: 'Buff', races: ['DK', 'DW', 'FE', 'MG', 'DL', 'SU', 'RF'], icon: 'heart', description: 'Incrementa permanentemente los puntos de Vitalidad (Stamina) del personaje.' },
  319: { id: 319, name: 'Agility Increase', nameEs: 'Aumento de Agilidad Base (Master)', category: 'Buff', races: ['DK', 'DW', 'FE', 'MG', 'DL', 'SU', 'RF'], icon: 'run-fast', description: 'Incrementa permanentemente los puntos de Agilidad del personaje.' },
  320: { id: 320, name: 'Strength Increase', nameEs: 'Aumento de Fuerza Base (Master)', category: 'Buff', races: ['DK', 'DW', 'FE', 'MG', 'DL', 'SU', 'RF'], icon: 'arm-flex', description: 'Incrementa permanentemente los puntos de Fuerza del personaje.' },
  322: { id: 322, name: 'Wing Defense Strengthener', nameEs: 'Refuerzo de Defensa con Alas (Master)', category: 'Buff', races: ['DK', 'DW', 'FE', 'MG', 'DL', 'SU', 'RF'], icon: 'feather', description: 'Incrementa la absorción y defensa mientras se tienen equipadas alas de 3er nivel.' },
  324: { id: 324, name: 'Wing Attack Strengthener', nameEs: 'Refuerzo de Ataque con Alas (Master)', category: 'Buff', races: ['DK', 'DW', 'FE', 'MG', 'DL', 'SU', 'RF'], icon: 'feather', description: 'Incrementa el poder ofensivo mientras se tienen equipadas alas de 3er nivel.' },
  325: { id: 325, name: 'Attack Success Rate Increase', nameEs: 'Éxito de Ataque (Attack Success Rate)', category: 'Buff', races: ['DK', 'DW', 'FE', 'MG', 'DL', 'SU', 'RF'], icon: 'target', description: 'Incrementa la probabilidad de asestar impactos certeros a los objetivos.' },
  334: { id: 334, name: 'Maximum HP Increase', nameEs: 'Aumento de Vida Máxima (HP [Master])', category: 'Buff', races: ['DK', 'DW', 'FE', 'MG', 'DL', 'SU', 'RF'], icon: 'heart-plus', description: 'Incrementa de forma masiva los puntos de vida máxima del personaje.' },
  335: { id: 335, name: 'Weapon Mastery', nameEs: 'Maestría General de Armas (Master)', category: 'Buff', races: ['DK', 'DW', 'FE', 'MG', 'DL', 'SU', 'RF'], icon: 'sword-cross', description: 'Incrementa el poder de ataque físico general con cualquier arma equipada.' },
  338: { id: 338, name: 'Maximum Mana Increase', nameEs: 'Aumento de Maná Máximo (Master)', category: 'Buff', races: ['DK', 'DW', 'FE', 'MG', 'DL', 'SU', 'RF'], icon: 'water-plus', description: 'Incrementa la reserva total de maná del personaje.' },
  341: { id: 341, name: 'Maximum AG Increase', nameEs: 'Aumento de AG Máximo (Master)', category: 'Buff', races: ['DK', 'DW', 'FE', 'MG', 'DL', 'SU', 'RF'], icon: 'lightning-bolt', description: 'Incrementa el aguante de energía (AG) para encadenar habilidades sin parar.' },
  358: { id: 358, name: 'Monster Attack SD Recovery', nameEs: 'Recuperación de SD por Muerte de Monstruo', category: 'Buff', races: ['DK', 'DW', 'FE', 'MG', 'DL', 'SU', 'RF'], icon: 'shield-refresh', description: 'Restaura una porción de escudo SD al eliminar un monstruo enemigo.' },
  359: { id: 359, name: 'Monster Attack Life Recovery', nameEs: 'Recuperación de Vida por Muerte de Monstruo', category: 'Buff', races: ['DK', 'DW', 'FE', 'MG', 'DL', 'SU', 'RF'], icon: 'heart-plus', description: 'Restaura una porción de vida máxima al matar monstruos.' },
  361: { id: 361, name: 'Minimum Attack Power Increase', nameEs: 'Aumento de Ataque Mínimo (Master)', category: 'Buff', races: ['DK', 'DW', 'FE', 'MG', 'DL', 'SU', 'RF'], icon: 'sword', description: 'Eleva el piso mínimo de daño para garantizar impactos devastadores continuos.' },
  362: { id: 362, name: 'Monster Attack Mana Recovery', nameEs: 'Recuperación de Maná por Monstruo', category: 'Buff', races: ['DK', 'DW', 'FE', 'MG', 'DL', 'SU', 'RF'], icon: 'water', description: 'Recupera maná automáticamente al aniquilar enemigos.' },
  364: { id: 364, name: 'Maximum Attack Power Increase', nameEs: 'Aumento de Ataque Máximo (Master)', category: 'Buff', races: ['DK', 'DW', 'FE', 'MG', 'DL', 'SU', 'RF'], icon: 'sword', description: 'Eleva el techo máximo de daño físico alcanzable por el personaje.' },
  366: { id: 366, name: 'Critical Damage Rate Increase', nameEs: 'Probabilidad de Daño Crítico (Master)', category: 'Buff', races: ['DK', 'DW', 'FE', 'MG', 'DL', 'SU', 'RF'], icon: 'lightning-bolt', description: 'Incrementa el porcentaje de asestar golpes críticos con daño azul.' },
  367: { id: 367, name: 'Full Mana Recovery', nameEs: 'Recuperación Total de Maná (Master)', category: 'Buff', races: ['DK', 'DW', 'FE', 'MG', 'DL', 'SU', 'RF'], icon: 'water-plus', description: 'Probabilidad de restaurar el 100% del maná inmediatamente al recibir daño.' },
  368: { id: 368, name: 'Full HP Recovery', nameEs: 'Recuperación Total de Vida (Master)', category: 'Buff', races: ['DK', 'DW', 'FE', 'MG', 'DL', 'SU', 'RF'], icon: 'heart-plus', description: 'Probabilidad de restaurar el 100% de la vida al recibir daño.' },
  369: { id: 369, name: 'Excellent Damage Rate Increase', nameEs: 'Probabilidad de Daño Excelente (Master)', category: 'Buff', races: ['DK', 'DW', 'FE', 'MG', 'DL', 'SU', 'RF'], icon: 'sparkles', description: 'Incrementa el porcentaje de conectar impactos excelentes con daño verde.' },
  370: { id: 370, name: 'Double Damage Rate Increase', nameEs: 'Probabilidad de Doble Daño (Master)', category: 'Buff', races: ['DK', 'DW', 'FE', 'MG', 'DL', 'SU', 'RF'], icon: 'numeric-2-box-multiple', description: 'Probabilidad de duplicar instantáneamente el daño total de cualquier ataque.' },

  // =========================================================================
  // 10. MAPEO DE IDS COMPUESTOS DEL ÁRBOL MAESTRO (SEASON 6 MAGICLIST)
  // Permite que la app reconozca de inmediato los IDs hexadecimales generados
  // cuando los personajes tienen puntos asignados al Master Skill Tree
  // =========================================================================
  4678: { id: 4678, name: 'Sword Slash / Blood Storm [Nv. 18]', nameEs: 'Tormenta de Espadas / Corte Sangriento (Sword Slash [Nv. 18])', category: 'Físico', races: ['DK'], icon: 'sword-cross', description: 'Habilidad activa maestra de Blade Master aprendida del Árbol de Habilidades (Nivel 18/20). Desata ráfagas de cortes de viento cortante de gran daño para combos.' },
  4684: { id: 4684, name: 'Plasma Storm / Recovery [Nv. 18]', nameEs: 'Tormenta de Plasma / Recuperación (Master [Nv. 18])', category: 'Especial', races: ['DK', 'DW', 'FE', 'MG', 'DL', 'SU', 'RF'], icon: 'lightning-bolt-circle', description: 'Habilidad especial maestra potenciada en el Árbol de Habilidades (Nivel 18/20).' },
  1613: { id: 1613, name: 'Two-Handed Sword Strengthener [Nv. 6]', nameEs: 'Maestría de Espada a Dos Manos (Two-Handed [Nv. 6])', category: 'Físico', races: ['DK'], icon: 'sword', description: 'Incrementa sustancialmente el poder de ataque físico al empuñar espadas de dos manos (Nivel 6/20 en el Árbol de Habilidades).' },
  4688: { id: 4688, name: 'Spear Strengthener [Nv. 18]', nameEs: 'Refuerzo de Lanza (Spear Strengthener [Nv. 18])', category: 'Físico', races: ['DK'], icon: 'knife-military', description: 'Incrementa el poder de ataque físico y penetración al empuñar lanzas y alabardas (Nivel 18/20 en el Árbol de Habilidades).' },
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
    skillIds: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 38, 39, 40, 69, 233],
  },
  FE: {
    label: 'Fairy Elf (ME / HE)',
    code: 'FE',
    color: '#3FCF8E',
    icon: 'bow-arrow',
    skillIds: [24, 26, 27, 28, 30, 31, 32, 33, 34, 35, 36, 51, 52, 77, 234, 235],
  },
  MG: {
    label: 'Magic Gladiator (DM)',
    code: 'MG',
    color: '#FFA726',
    icon: 'lightning-bolt',
    skillIds: [18, 19, 20, 21, 22, 23, 41, 55, 56, 57, 236, 237, 1, 2, 3, 4, 5, 7, 8, 9, 10, 11, 12, 13, 14, 38, 39, 69],
  },
  DL: {
    label: 'Dark Lord (LE)',
    code: 'DL',
    color: '#E0C380',
    icon: 'shield-crown',
    skillIds: [60, 61, 62, 63, 64, 65, 66, 78, 238],
  },
  SU: {
    label: 'Summoner (BS / DM)',
    code: 'SU',
    color: '#4DD0E1',
    icon: 'book-open-variant',
    skillIds: [214, 215, 217, 218, 219, 221, 222, 223, 224, 225, 230],
  },
  RF: {
    label: 'Rage Fighter (FM)',
    code: 'RF',
    color: '#FF7043',
    icon: 'boxing-glove',
    skillIds: [260, 261, 262, 263, 264, 265, 266, 267, 268, 269, 270],
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
