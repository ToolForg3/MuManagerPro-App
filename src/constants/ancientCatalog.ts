/**
 * MU Online Season 6 / Louis Update - Ancient Items Catalog & Helper Functions
 * Auto-generated from official server SetItemType.txt & SetItemOption.txt
 */

export interface AncientOptionDef {
  optId: number;
  optName: string;
  val: number;
}

export interface AncientSet {
  id: number;
  name: string;
  options: AncientOptionDef[];
  fullOptions: AncientOptionDef[];
}

export interface AncientItemMapping {
  section: number;
  type: number;
  statType: number;
  opt1: number;
  opt2: number;
  opt1Name: string | null;
  opt2Name: string | null;
}

export interface AncientOptionEntry {
  tier: number; // 1 or 2
  setId: number;
  name: string;
}

export interface AncientDecodedInfo {
  isAncient: boolean;
  tier: number;
  staminaBonus: number;
  setId: number;
  setName: string | null;
  set: AncientSet | null;
}

export const ANCIENT_SETS_CATALOG: Record<number, AncientSet> = {
  "1": {
    "id": 1,
    "name": "Warrior",
    "options": [
      {
        "optId": 0,
        "optName": "Fuerza",
        "val": 10
      },
      {
        "optId": 19,
        "optName": "Doble Daño Rate (%)",
        "val": 10
      },
      {
        "optId": 13,
        "optName": "AG Máximo",
        "val": 20
      },
      {
        "optId": 14,
        "optName": "Recuperación de AG",
        "val": 5
      },
      {
        "optId": 10,
        "optName": "Defensa",
        "val": 20
      },
      {
        "optId": 1,
        "optName": "Agilidad",
        "val": 10
      }
    ],
    "fullOptions": [
      {
        "optId": 15,
        "optName": "Daño Crítico Rate (%)",
        "val": 5
      },
      {
        "optId": 17,
        "optName": "Daño Excelente Rate (%)",
        "val": 5
      },
      {
        "optId": 0,
        "optName": "Fuerza",
        "val": 25
      }
    ]
  },
  "2": {
    "id": 2,
    "name": "Anonymous",
    "options": [
      {
        "optId": 11,
        "optName": "Vida Máxima",
        "val": 50
      },
      {
        "optId": 1,
        "optName": "Agilidad",
        "val": 50
      },
      {
        "optId": 22,
        "optName": "Daño Dos Manos",
        "val": 25
      }
    ],
    "fullOptions": [
      {
        "optId": 8,
        "optName": "Attack Success Rate",
        "val": 30
      }
    ]
  },
  "3": {
    "id": 3,
    "name": "Hyperion",
    "options": [
      {
        "optId": 2,
        "optName": "Energía",
        "val": 15
      },
      {
        "optId": 1,
        "optName": "Agilidad",
        "val": 15
      }
    ],
    "fullOptions": [
      {
        "optId": 19,
        "optName": "Doble Daño Rate (%)",
        "val": 20
      },
      {
        "optId": 12,
        "optName": "Mana Máximo",
        "val": 30
      }
    ]
  },
  "4": {
    "id": 4,
    "name": "Mist",
    "options": [
      {
        "optId": 3,
        "optName": "Vitalidad",
        "val": 20
      },
      {
        "optId": 19,
        "optName": "Doble Daño Rate (%)",
        "val": 30
      }
    ],
    "fullOptions": [
      {
        "optId": 20,
        "optName": "Ignorar Defensa Rate (%)",
        "val": 10
      },
      {
        "optId": 1,
        "optName": "Agilidad",
        "val": 20
      }
    ]
  },
  "5": {
    "id": 5,
    "name": "Eplete",
    "options": [
      {
        "optId": 19,
        "optName": "Doble Daño Rate (%)",
        "val": 15
      },
      {
        "optId": 9,
        "optName": "Defense Success Rate",
        "val": 50
      },
      {
        "optId": 7,
        "optName": "Daño Mágico / Skill",
        "val": 5
      },
      {
        "optId": 11,
        "optName": "Vida Máxima",
        "val": 50
      }
    ],
    "fullOptions": [
      {
        "optId": 13,
        "optName": "AG Máximo",
        "val": 30
      },
      {
        "optId": 15,
        "optName": "Daño Crítico Rate (%)",
        "val": 10
      },
      {
        "optId": 17,
        "optName": "Daño Excelente Rate (%)",
        "val": 10
      }
    ]
  },
  "6": {
    "id": 6,
    "name": "Berserker",
    "options": [
      {
        "optId": 6,
        "optName": "Daño Máximo",
        "val": 10
      },
      {
        "optId": 6,
        "optName": "Daño Máximo",
        "val": 20
      },
      {
        "optId": 6,
        "optName": "Daño Máximo",
        "val": 30
      },
      {
        "optId": 6,
        "optName": "Daño Máximo",
        "val": 40
      }
    ],
    "fullOptions": [
      {
        "optId": 19,
        "optName": "Doble Daño Rate (%)",
        "val": 40
      },
      {
        "optId": 0,
        "optName": "Fuerza",
        "val": 40
      }
    ]
  },
  "7": {
    "id": 7,
    "name": "Garuda",
    "options": [
      {
        "optId": 13,
        "optName": "AG Máximo",
        "val": 30
      },
      {
        "optId": 20,
        "optName": "Ignorar Defensa Rate (%)",
        "val": 5
      },
      {
        "optId": 2,
        "optName": "Energía",
        "val": 15
      },
      {
        "optId": 11,
        "optName": "Vida Máxima",
        "val": 50
      }
    ],
    "fullOptions": [
      {
        "optId": 19,
        "optName": "Doble Daño Rate (%)",
        "val": 25
      },
      {
        "optId": 7,
        "optName": "Daño Mágico / Skill",
        "val": 15
      }
    ]
  },
  "8": {
    "id": 8,
    "name": "Cloud",
    "options": [
      {
        "optId": 15,
        "optName": "Daño Crítico Rate (%)",
        "val": 20
      }
    ],
    "fullOptions": [
      {
        "optId": 16,
        "optName": "Daño Crítico",
        "val": 50
      }
    ]
  },
  "9": {
    "id": 9,
    "name": "Kantata",
    "options": [
      {
        "optId": 2,
        "optName": "Energía",
        "val": 15
      },
      {
        "optId": 3,
        "optName": "Vitalidad",
        "val": 30
      },
      {
        "optId": 7,
        "optName": "Daño Mágico / Skill",
        "val": 10
      },
      {
        "optId": 0,
        "optName": "Fuerza",
        "val": 15
      }
    ],
    "fullOptions": [
      {
        "optId": 19,
        "optName": "Doble Daño Rate (%)",
        "val": 25
      },
      {
        "optId": 17,
        "optName": "Daño Excelente Rate (%)",
        "val": 10
      },
      {
        "optId": 18,
        "optName": "Daño Excelente",
        "val": 20
      }
    ]
  },
  "10": {
    "id": 10,
    "name": "Rave",
    "options": [
      {
        "optId": 19,
        "optName": "Doble Daño Rate (%)",
        "val": 20
      },
      {
        "optId": 20,
        "optName": "Ignorar Defensa Rate (%)",
        "val": 10
      }
    ],
    "fullOptions": [
      {
        "optId": 23,
        "optName": "Opción 23",
        "val": 30
      },
      {
        "optId": 21,
        "optName": "Defensa con Escudo",
        "val": 5
      }
    ]
  },
  "11": {
    "id": 11,
    "name": "Hyon",
    "options": [
      {
        "optId": 10,
        "optName": "Defensa",
        "val": 25
      },
      {
        "optId": 20,
        "optName": "Ignorar Defensa Rate (%)",
        "val": 10
      },
      {
        "optId": 19,
        "optName": "Doble Daño Rate (%)",
        "val": 20
      }
    ],
    "fullOptions": [
      {
        "optId": 15,
        "optName": "Daño Crítico Rate (%)",
        "val": 15
      },
      {
        "optId": 17,
        "optName": "Daño Excelente Rate (%)",
        "val": 15
      },
      {
        "optId": 16,
        "optName": "Daño Crítico",
        "val": 20
      },
      {
        "optId": 18,
        "optName": "Daño Excelente",
        "val": 20
      }
    ]
  },
  "12": {
    "id": 12,
    "name": "Vicious",
    "options": [
      {
        "optId": 19,
        "optName": "Doble Daño Rate (%)",
        "val": 15
      },
      {
        "optId": 8,
        "optName": "Attack Success Rate",
        "val": 15
      },
      {
        "optId": 20,
        "optName": "Ignorar Defensa Rate (%)",
        "val": 10
      }
    ],
    "fullOptions": [
      {
        "optId": 5,
        "optName": "Daño Mínimo",
        "val": 20
      },
      {
        "optId": 6,
        "optName": "Daño Máximo",
        "val": 30
      },
      {
        "optId": 21,
        "optName": "Defensa con Escudo",
        "val": 5
      }
    ]
  },
  "13": {
    "id": 13,
    "name": "Apollo",
    "options": [
      {
        "optId": 2,
        "optName": "Energía",
        "val": 10
      },
      {
        "optId": 7,
        "optName": "Daño Mágico / Skill",
        "val": 5
      },
      {
        "optId": 19,
        "optName": "Doble Daño Rate (%)",
        "val": 10
      },
      {
        "optId": 12,
        "optName": "Mana Máximo",
        "val": 30
      },
      {
        "optId": 11,
        "optName": "Vida Máxima",
        "val": 30
      },
      {
        "optId": 13,
        "optName": "AG Máximo",
        "val": 20
      }
    ],
    "fullOptions": [
      {
        "optId": 15,
        "optName": "Daño Crítico Rate (%)",
        "val": 10
      },
      {
        "optId": 17,
        "optName": "Daño Excelente Rate (%)",
        "val": 10
      },
      {
        "optId": 2,
        "optName": "Energía",
        "val": 30
      }
    ]
  },
  "14": {
    "id": 14,
    "name": "Barnake",
    "options": [
      {
        "optId": 7,
        "optName": "Daño Mágico / Skill",
        "val": 10
      },
      {
        "optId": 2,
        "optName": "Energía",
        "val": 20
      }
    ],
    "fullOptions": [
      {
        "optId": 19,
        "optName": "Doble Daño Rate (%)",
        "val": 30
      },
      {
        "optId": 12,
        "optName": "Mana Máximo",
        "val": 100
      }
    ]
  },
  "15": {
    "id": 15,
    "name": "Evis",
    "options": [
      {
        "optId": 19,
        "optName": "Doble Daño Rate (%)",
        "val": 15
      },
      {
        "optId": 3,
        "optName": "Vitalidad",
        "val": 20
      },
      {
        "optId": 7,
        "optName": "Daño Mágico / Skill",
        "val": 10
      }
    ],
    "fullOptions": [
      {
        "optId": 20,
        "optName": "Ignorar Defensa Rate (%)",
        "val": 5
      },
      {
        "optId": 9,
        "optName": "Defense Success Rate",
        "val": 50
      },
      {
        "optId": 14,
        "optName": "Recuperación de AG",
        "val": 5
      }
    ]
  },
  "16": {
    "id": 16,
    "name": "Sylion",
    "options": [
      {
        "optId": 20,
        "optName": "Ignorar Defensa Rate (%)",
        "val": 5
      },
      {
        "optId": 15,
        "optName": "Daño Crítico Rate (%)",
        "val": 5
      },
      {
        "optId": 10,
        "optName": "Defensa",
        "val": 20
      }
    ],
    "fullOptions": [
      {
        "optId": 0,
        "optName": "Fuerza",
        "val": 50
      },
      {
        "optId": 1,
        "optName": "Agilidad",
        "val": 50
      },
      {
        "optId": 3,
        "optName": "Vitalidad",
        "val": 50
      },
      {
        "optId": 2,
        "optName": "Energía",
        "val": 50
      }
    ]
  },
  "17": {
    "id": 17,
    "name": "Heras",
    "options": [
      {
        "optId": 0,
        "optName": "Fuerza",
        "val": 15
      },
      {
        "optId": 7,
        "optName": "Daño Mágico / Skill",
        "val": 10
      },
      {
        "optId": 22,
        "optName": "Daño Dos Manos",
        "val": 5
      },
      {
        "optId": 2,
        "optName": "Energía",
        "val": 15
      },
      {
        "optId": 9,
        "optName": "Defense Success Rate",
        "val": 50
      }
    ],
    "fullOptions": [
      {
        "optId": 15,
        "optName": "Daño Crítico Rate (%)",
        "val": 10
      },
      {
        "optId": 17,
        "optName": "Daño Excelente Rate (%)",
        "val": 10
      },
      {
        "optId": 11,
        "optName": "Vida Máxima",
        "val": 50
      },
      {
        "optId": 12,
        "optName": "Mana Máximo",
        "val": 50
      }
    ]
  },
  "18": {
    "id": 18,
    "name": "Minet",
    "options": [
      {
        "optId": 2,
        "optName": "Energía",
        "val": 30
      },
      {
        "optId": 10,
        "optName": "Defensa",
        "val": 30
      }
    ],
    "fullOptions": [
      {
        "optId": 12,
        "optName": "Mana Máximo",
        "val": 100
      },
      {
        "optId": 19,
        "optName": "Doble Daño Rate (%)",
        "val": 15
      }
    ]
  },
  "19": {
    "id": 19,
    "name": "Anubis",
    "options": [
      {
        "optId": 20,
        "optName": "Ignorar Defensa Rate (%)",
        "val": 10
      },
      {
        "optId": 12,
        "optName": "Mana Máximo",
        "val": 50
      },
      {
        "optId": 7,
        "optName": "Daño Mágico / Skill",
        "val": 10
      }
    ],
    "fullOptions": [
      {
        "optId": 15,
        "optName": "Daño Crítico Rate (%)",
        "val": 15
      },
      {
        "optId": 17,
        "optName": "Daño Excelente Rate (%)",
        "val": 15
      },
      {
        "optId": 16,
        "optName": "Daño Crítico",
        "val": 20
      },
      {
        "optId": 18,
        "optName": "Daño Excelente",
        "val": 20
      }
    ]
  },
  "20": {
    "id": 20,
    "name": "Isis",
    "options": [
      {
        "optId": 19,
        "optName": "Doble Daño Rate (%)",
        "val": 10
      },
      {
        "optId": 20,
        "optName": "Ignorar Defensa Rate (%)",
        "val": 10
      },
      {
        "optId": 2,
        "optName": "Energía",
        "val": 30
      }
    ],
    "fullOptions": [
      {
        "optId": 7,
        "optName": "Daño Mágico / Skill",
        "val": 10
      },
      {
        "optId": 21,
        "optName": "Defensa con Escudo",
        "val": 5
      }
    ]
  },
  "21": {
    "id": 21,
    "name": "Ceto",
    "options": [
      {
        "optId": 1,
        "optName": "Agilidad",
        "val": 10
      },
      {
        "optId": 11,
        "optName": "Vida Máxima",
        "val": 50
      },
      {
        "optId": 10,
        "optName": "Defensa",
        "val": 20
      },
      {
        "optId": 22,
        "optName": "Daño Dos Manos",
        "val": 5
      },
      {
        "optId": 2,
        "optName": "Energía",
        "val": 10
      }
    ],
    "fullOptions": [
      {
        "optId": 11,
        "optName": "Vida Máxima",
        "val": 50
      },
      {
        "optId": 0,
        "optName": "Fuerza",
        "val": 20
      }
    ]
  },
  "22": {
    "id": 22,
    "name": "Drake",
    "options": [
      {
        "optId": 1,
        "optName": "Agilidad",
        "val": 20
      },
      {
        "optId": 8,
        "optName": "Attack Success Rate",
        "val": 25
      },
      {
        "optId": 20,
        "optName": "Ignorar Defensa Rate (%)",
        "val": 20
      }
    ],
    "fullOptions": [
      {
        "optId": 10,
        "optName": "Defensa",
        "val": 40
      },
      {
        "optId": 15,
        "optName": "Daño Crítico Rate (%)",
        "val": 10
      }
    ]
  },
  "23": {
    "id": 23,
    "name": "Gaia",
    "options": [
      {
        "optId": 19,
        "optName": "Doble Daño Rate (%)",
        "val": 10
      },
      {
        "optId": 12,
        "optName": "Mana Máximo",
        "val": 25
      },
      {
        "optId": 0,
        "optName": "Fuerza",
        "val": 10
      },
      {
        "optId": 20,
        "optName": "Ignorar Defensa Rate (%)",
        "val": 5
      }
    ],
    "fullOptions": [
      {
        "optId": 1,
        "optName": "Agilidad",
        "val": 30
      },
      {
        "optId": 17,
        "optName": "Daño Excelente Rate (%)",
        "val": 10
      },
      {
        "optId": 18,
        "optName": "Daño Excelente",
        "val": 10
      }
    ]
  },
  "24": {
    "id": 24,
    "name": "Fase",
    "options": [
      {
        "optId": 11,
        "optName": "Vida Máxima",
        "val": 100
      },
      {
        "optId": 12,
        "optName": "Mana Máximo",
        "val": 100
      }
    ],
    "fullOptions": [
      {
        "optId": 10,
        "optName": "Defensa",
        "val": 100
      }
    ]
  },
  "25": {
    "id": 25,
    "name": "Odin",
    "options": [
      {
        "optId": 2,
        "optName": "Energía",
        "val": 15
      },
      {
        "optId": 11,
        "optName": "Vida Máxima",
        "val": 50
      },
      {
        "optId": 9,
        "optName": "Defense Success Rate",
        "val": 50
      },
      {
        "optId": 1,
        "optName": "Agilidad",
        "val": 30
      }
    ],
    "fullOptions": [
      {
        "optId": 12,
        "optName": "Mana Máximo",
        "val": 50
      },
      {
        "optId": 21,
        "optName": "Defensa con Escudo",
        "val": 5
      },
      {
        "optId": 13,
        "optName": "AG Máximo",
        "val": 50
      }
    ]
  },
  "26": {
    "id": 26,
    "name": "Elvian",
    "options": [
      {
        "optId": 1,
        "optName": "Agilidad",
        "val": 30
      }
    ],
    "fullOptions": [
      {
        "optId": 21,
        "optName": "Defensa con Escudo",
        "val": 5
      }
    ]
  },
  "27": {
    "id": 27,
    "name": "Argo",
    "options": [
      {
        "optId": 6,
        "optName": "Daño Máximo",
        "val": 20
      },
      {
        "optId": 19,
        "optName": "Doble Daño Rate (%)",
        "val": 25
      }
    ],
    "fullOptions": [
      {
        "optId": 13,
        "optName": "AG Máximo",
        "val": 50
      },
      {
        "optId": 20,
        "optName": "Ignorar Defensa Rate (%)",
        "val": 5
      }
    ]
  },
  "28": {
    "id": 28,
    "name": "Karis",
    "options": [
      {
        "optId": 19,
        "optName": "Doble Daño Rate (%)",
        "val": 15
      },
      {
        "optId": 20,
        "optName": "Ignorar Defensa Rate (%)",
        "val": 10
      }
    ],
    "fullOptions": [
      {
        "optId": 15,
        "optName": "Daño Crítico Rate (%)",
        "val": 10
      },
      {
        "optId": 1,
        "optName": "Agilidad",
        "val": 40
      }
    ]
  },
  "29": {
    "id": 29,
    "name": "Gywen",
    "options": [
      {
        "optId": 1,
        "optName": "Agilidad",
        "val": 30
      },
      {
        "optId": 5,
        "optName": "Daño Mínimo",
        "val": 20
      },
      {
        "optId": 10,
        "optName": "Defensa",
        "val": 20
      },
      {
        "optId": 6,
        "optName": "Daño Máximo",
        "val": 20
      }
    ],
    "fullOptions": [
      {
        "optId": 15,
        "optName": "Daño Crítico Rate (%)",
        "val": 15
      },
      {
        "optId": 17,
        "optName": "Daño Excelente Rate (%)",
        "val": 15
      },
      {
        "optId": 16,
        "optName": "Daño Crítico",
        "val": 20
      },
      {
        "optId": 18,
        "optName": "Daño Excelente",
        "val": 20
      }
    ]
  },
  "30": {
    "id": 30,
    "name": "Aruan",
    "options": [
      {
        "optId": 8,
        "optName": "Attack Success Rate",
        "val": 10
      },
      {
        "optId": 20,
        "optName": "Ignorar Defensa Rate (%)",
        "val": 10
      },
      {
        "optId": 19,
        "optName": "Doble Daño Rate (%)",
        "val": 20
      }
    ],
    "fullOptions": [
      {
        "optId": 15,
        "optName": "Daño Crítico Rate (%)",
        "val": 15
      },
      {
        "optId": 17,
        "optName": "Daño Excelente Rate (%)",
        "val": 15
      },
      {
        "optId": 21,
        "optName": "Defensa con Escudo",
        "val": 5
      }
    ]
  },
  "31": {
    "id": 31,
    "name": "Gaion",
    "options": [
      {
        "optId": 21,
        "optName": "Defensa con Escudo",
        "val": 5
      },
      {
        "optId": 20,
        "optName": "Ignorar Defensa Rate (%)",
        "val": 15
      },
      {
        "optId": 19,
        "optName": "Doble Daño Rate (%)",
        "val": 15
      }
    ],
    "fullOptions": [
      {
        "optId": 17,
        "optName": "Daño Excelente Rate (%)",
        "val": 15
      },
      {
        "optId": 18,
        "optName": "Daño Excelente",
        "val": 30
      },
      {
        "optId": 7,
        "optName": "Daño Mágico / Skill",
        "val": 10
      },
      {
        "optId": 0,
        "optName": "Fuerza",
        "val": 30
      }
    ]
  },
  "32": {
    "id": 32,
    "name": "Muren",
    "options": [
      {
        "optId": 19,
        "optName": "Doble Daño Rate (%)",
        "val": 10
      },
      {
        "optId": 7,
        "optName": "Daño Mágico / Skill",
        "val": 10
      },
      {
        "optId": 20,
        "optName": "Ignorar Defensa Rate (%)",
        "val": 10
      }
    ],
    "fullOptions": [
      {
        "optId": 15,
        "optName": "Daño Crítico Rate (%)",
        "val": 15
      },
      {
        "optId": 17,
        "optName": "Daño Excelente Rate (%)",
        "val": 15
      },
      {
        "optId": 10,
        "optName": "Defensa",
        "val": 25
      },
      {
        "optId": 23,
        "optName": "Opción 23",
        "val": 20
      }
    ]
  },
  "33": {
    "id": 33,
    "name": "Agnis",
    "options": [
      {
        "optId": 20,
        "optName": "Ignorar Defensa Rate (%)",
        "val": 10
      },
      {
        "optId": 10,
        "optName": "Defensa",
        "val": 40
      },
      {
        "optId": 19,
        "optName": "Doble Daño Rate (%)",
        "val": 20
      }
    ],
    "fullOptions": [
      {
        "optId": 15,
        "optName": "Daño Crítico Rate (%)",
        "val": 15
      },
      {
        "optId": 17,
        "optName": "Daño Excelente Rate (%)",
        "val": 15
      },
      {
        "optId": 16,
        "optName": "Daño Crítico",
        "val": 20
      },
      {
        "optId": 18,
        "optName": "Daño Excelente",
        "val": 20
      }
    ]
  },
  "34": {
    "id": 34,
    "name": "Broy",
    "options": [
      {
        "optId": 8,
        "optName": "Attack Success Rate",
        "val": 20
      },
      {
        "optId": 19,
        "optName": "Doble Daño Rate (%)",
        "val": 20
      },
      {
        "optId": 2,
        "optName": "Energía",
        "val": 30
      }
    ],
    "fullOptions": [
      {
        "optId": 15,
        "optName": "Daño Crítico Rate (%)",
        "val": 15
      },
      {
        "optId": 17,
        "optName": "Daño Excelente Rate (%)",
        "val": 15
      },
      {
        "optId": 21,
        "optName": "Defensa con Escudo",
        "val": 5
      },
      {
        "optId": 4,
        "optName": "Comando",
        "val": 30
      }
    ]
  },
  "35": {
    "id": 35,
    "name": "Chrono",
    "options": [
      {
        "optId": 20,
        "optName": "Ignorar Defensa Rate (%)",
        "val": 20
      },
      {
        "optId": 10,
        "optName": "Defensa",
        "val": 60
      },
      {
        "optId": 19,
        "optName": "Doble Daño Rate (%)",
        "val": 30
      }
    ],
    "fullOptions": [
      {
        "optId": 15,
        "optName": "Daño Crítico Rate (%)",
        "val": 15
      },
      {
        "optId": 17,
        "optName": "Daño Excelente Rate (%)",
        "val": 15
      },
      {
        "optId": 16,
        "optName": "Daño Crítico",
        "val": 20
      },
      {
        "optId": 18,
        "optName": "Daño Excelente",
        "val": 20
      }
    ]
  },
  "36": {
    "id": 36,
    "name": "Sedemen",
    "options": [
      {
        "optId": 7,
        "optName": "Daño Mágico / Skill",
        "val": 15
      },
      {
        "optId": 19,
        "optName": "Doble Daño Rate (%)",
        "val": 25
      },
      {
        "optId": 2,
        "optName": "Energía",
        "val": 30
      }
    ],
    "fullOptions": [
      {
        "optId": 15,
        "optName": "Daño Crítico Rate (%)",
        "val": 15
      },
      {
        "optId": 17,
        "optName": "Daño Excelente Rate (%)",
        "val": 15
      },
      {
        "optId": 21,
        "optName": "Defensa con Escudo",
        "val": 5
      }
    ]
  },
  "37": {
    "id": 37,
    "name": "Vega",
    "options": [
      {
        "optId": 9,
        "optName": "Defense Success Rate",
        "val": 50
      },
      {
        "optId": 3,
        "optName": "Vitalidad",
        "val": 50
      },
      {
        "optId": 6,
        "optName": "Daño Máximo",
        "val": 30
      }
    ],
    "fullOptions": [
      {
        "optId": 17,
        "optName": "Daño Excelente Rate (%)",
        "val": 15
      },
      {
        "optId": 20,
        "optName": "Ignorar Defensa Rate (%)",
        "val": 5
      },
      {
        "optId": 21,
        "optName": "Defensa con Escudo",
        "val": 5
      }
    ]
  },
  "38": {
    "id": 38,
    "name": "Chamer",
    "options": [
      {
        "optId": 10,
        "optName": "Defensa",
        "val": 50
      },
      {
        "optId": 20,
        "optName": "Ignorar Defensa Rate (%)",
        "val": 5
      },
      {
        "optId": 8,
        "optName": "Attack Success Rate",
        "val": 30
      }
    ],
    "fullOptions": [
      {
        "optId": 16,
        "optName": "Daño Crítico",
        "val": 30
      },
      {
        "optId": 17,
        "optName": "Daño Excelente Rate (%)",
        "val": 15
      },
      {
        "optId": 19,
        "optName": "Doble Daño Rate (%)",
        "val": 30
      },
      {
        "optId": 18,
        "optName": "Daño Excelente",
        "val": 20
      }
    ]
  },
  "39": {
    "id": 39,
    "name": "Moros",
    "options": [
      {
        "optId": 11,
        "optName": "Vida Máxima",
        "val": 30
      },
      {
        "optId": 19,
        "optName": "Doble Daño Rate (%)",
        "val": 25
      },
      {
        "optId": 10,
        "optName": "Defensa",
        "val": 20
      },
      {
        "optId": 20,
        "optName": "Ignorar Defensa Rate (%)",
        "val": 10
      }
    ],
    "fullOptions": [
      {
        "optId": 15,
        "optName": "Daño Crítico Rate (%)",
        "val": 10
      },
      {
        "optId": 17,
        "optName": "Daño Excelente Rate (%)",
        "val": 10
      },
      {
        "optId": 16,
        "optName": "Daño Crítico",
        "val": 10
      },
      {
        "optId": 18,
        "optName": "Daño Excelente",
        "val": 10
      }
    ]
  },
  "40": {
    "id": 40,
    "name": "Dione",
    "options": [
      {
        "optId": 11,
        "optName": "Vida Máxima",
        "val": 30
      },
      {
        "optId": 19,
        "optName": "Doble Daño Rate (%)",
        "val": 25
      },
      {
        "optId": 10,
        "optName": "Defensa",
        "val": 20
      },
      {
        "optId": 20,
        "optName": "Ignorar Defensa Rate (%)",
        "val": 10
      }
    ],
    "fullOptions": [
      {
        "optId": 15,
        "optName": "Daño Crítico Rate (%)",
        "val": 10
      },
      {
        "optId": 17,
        "optName": "Daño Excelente Rate (%)",
        "val": 10
      },
      {
        "optId": 16,
        "optName": "Daño Crítico",
        "val": 10
      },
      {
        "optId": 18,
        "optName": "Daño Excelente",
        "val": 10
      }
    ]
  },
  "41": {
    "id": 41,
    "name": "Hades",
    "options": [
      {
        "optId": 11,
        "optName": "Vida Máxima",
        "val": 30
      },
      {
        "optId": 19,
        "optName": "Doble Daño Rate (%)",
        "val": 25
      },
      {
        "optId": 10,
        "optName": "Defensa",
        "val": 20
      },
      {
        "optId": 20,
        "optName": "Ignorar Defensa Rate (%)",
        "val": 10
      }
    ],
    "fullOptions": [
      {
        "optId": 15,
        "optName": "Daño Crítico Rate (%)",
        "val": 10
      },
      {
        "optId": 17,
        "optName": "Daño Excelente Rate (%)",
        "val": 10
      },
      {
        "optId": 16,
        "optName": "Daño Crítico",
        "val": 10
      },
      {
        "optId": 18,
        "optName": "Daño Excelente",
        "val": 10
      }
    ]
  },
  "42": {
    "id": 42,
    "name": "Ophion",
    "options": [
      {
        "optId": 11,
        "optName": "Vida Máxima",
        "val": 30
      },
      {
        "optId": 19,
        "optName": "Doble Daño Rate (%)",
        "val": 25
      },
      {
        "optId": 10,
        "optName": "Defensa",
        "val": 20
      },
      {
        "optId": 20,
        "optName": "Ignorar Defensa Rate (%)",
        "val": 10
      }
    ],
    "fullOptions": [
      {
        "optId": 15,
        "optName": "Daño Crítico Rate (%)",
        "val": 10
      },
      {
        "optId": 17,
        "optName": "Daño Excelente Rate (%)",
        "val": 10
      },
      {
        "optId": 16,
        "optName": "Daño Crítico",
        "val": 10
      },
      {
        "optId": 18,
        "optName": "Daño Excelente",
        "val": 10
      }
    ]
  },
  "43": {
    "id": 43,
    "name": "Meter",
    "options": [
      {
        "optId": 11,
        "optName": "Vida Máxima",
        "val": 50
      },
      {
        "optId": 10,
        "optName": "Defensa",
        "val": 40
      },
      {
        "optId": 20,
        "optName": "Ignorar Defensa Rate (%)",
        "val": 15
      },
      {
        "optId": 15,
        "optName": "Daño Crítico Rate (%)",
        "val": 15
      }
    ],
    "fullOptions": [
      {
        "optId": 17,
        "optName": "Daño Excelente Rate (%)",
        "val": 15
      },
      {
        "optId": 16,
        "optName": "Daño Crítico",
        "val": 20
      },
      {
        "optId": 18,
        "optName": "Daño Excelente",
        "val": 20
      },
      {
        "optId": 21,
        "optName": "Defensa con Escudo",
        "val": 5
      }
    ]
  },
  "44": {
    "id": 44,
    "name": "Hegaton",
    "options": [
      {
        "optId": 11,
        "optName": "Vida Máxima",
        "val": 50
      },
      {
        "optId": 10,
        "optName": "Defensa",
        "val": 40
      },
      {
        "optId": 20,
        "optName": "Ignorar Defensa Rate (%)",
        "val": 15
      },
      {
        "optId": 15,
        "optName": "Daño Crítico Rate (%)",
        "val": 15
      }
    ],
    "fullOptions": [
      {
        "optId": 17,
        "optName": "Daño Excelente Rate (%)",
        "val": 15
      },
      {
        "optId": 16,
        "optName": "Daño Crítico",
        "val": 20
      },
      {
        "optId": 18,
        "optName": "Daño Excelente",
        "val": 20
      },
      {
        "optId": 21,
        "optName": "Defensa con Escudo",
        "val": 5
      }
    ]
  },
  "45": {
    "id": 45,
    "name": "Castol",
    "options": [
      {
        "optId": 11,
        "optName": "Vida Máxima",
        "val": 50
      },
      {
        "optId": 10,
        "optName": "Defensa",
        "val": 40
      },
      {
        "optId": 20,
        "optName": "Ignorar Defensa Rate (%)",
        "val": 15
      },
      {
        "optId": 15,
        "optName": "Daño Crítico Rate (%)",
        "val": 15
      }
    ],
    "fullOptions": [
      {
        "optId": 17,
        "optName": "Daño Excelente Rate (%)",
        "val": 15
      },
      {
        "optId": 16,
        "optName": "Daño Crítico",
        "val": 20
      },
      {
        "optId": 18,
        "optName": "Daño Excelente",
        "val": 20
      },
      {
        "optId": 21,
        "optName": "Defensa con Escudo",
        "val": 5
      }
    ]
  },
  "46": {
    "id": 46,
    "name": "Taros",
    "options": [
      {
        "optId": 11,
        "optName": "Vida Máxima",
        "val": 50
      },
      {
        "optId": 10,
        "optName": "Defensa",
        "val": 40
      },
      {
        "optId": 20,
        "optName": "Ignorar Defensa Rate (%)",
        "val": 15
      },
      {
        "optId": 15,
        "optName": "Daño Crítico Rate (%)",
        "val": 15
      }
    ],
    "fullOptions": [
      {
        "optId": 17,
        "optName": "Daño Excelente Rate (%)",
        "val": 15
      },
      {
        "optId": 16,
        "optName": "Daño Crítico",
        "val": 20
      },
      {
        "optId": 18,
        "optName": "Daño Excelente",
        "val": 20
      },
      {
        "optId": 21,
        "optName": "Defensa con Escudo",
        "val": 5
      }
    ]
  },
  "47": {
    "id": 47,
    "name": "Nemesis",
    "options": [
      {
        "optId": 11,
        "optName": "Vida Máxima",
        "val": 50
      },
      {
        "optId": 10,
        "optName": "Defensa",
        "val": 40
      },
      {
        "optId": 20,
        "optName": "Ignorar Defensa Rate (%)",
        "val": 15
      },
      {
        "optId": 15,
        "optName": "Daño Crítico Rate (%)",
        "val": 15
      }
    ],
    "fullOptions": [
      {
        "optId": 17,
        "optName": "Daño Excelente Rate (%)",
        "val": 15
      },
      {
        "optId": 16,
        "optName": "Daño Crítico",
        "val": 20
      },
      {
        "optId": 18,
        "optName": "Daño Excelente",
        "val": 20
      },
      {
        "optId": 21,
        "optName": "Defensa con Escudo",
        "val": 5
      }
    ]
  },
  "48": {
    "id": 48,
    "name": "Amis",
    "options": [
      {
        "optId": 11,
        "optName": "Vida Máxima",
        "val": 50
      },
      {
        "optId": 10,
        "optName": "Defensa",
        "val": 40
      },
      {
        "optId": 20,
        "optName": "Ignorar Defensa Rate (%)",
        "val": 15
      }
    ],
    "fullOptions": [
      {
        "optId": 15,
        "optName": "Daño Crítico Rate (%)",
        "val": 15
      },
      {
        "optId": 17,
        "optName": "Daño Excelente Rate (%)",
        "val": 15
      },
      {
        "optId": 16,
        "optName": "Daño Crítico",
        "val": 20
      },
      {
        "optId": 18,
        "optName": "Daño Excelente",
        "val": 20
      },
      {
        "optId": 21,
        "optName": "Defensa con Escudo",
        "val": 5
      }
    ]
  },
  "49": {
    "id": 49,
    "name": "Trite",
    "options": [
      {
        "optId": 11,
        "optName": "Vida Máxima",
        "val": 50
      },
      {
        "optId": 10,
        "optName": "Defensa",
        "val": 40
      },
      {
        "optId": 20,
        "optName": "Ignorar Defensa Rate (%)",
        "val": 15
      }
    ],
    "fullOptions": [
      {
        "optId": 15,
        "optName": "Daño Crítico Rate (%)",
        "val": 15
      },
      {
        "optId": 17,
        "optName": "Daño Excelente Rate (%)",
        "val": 15
      },
      {
        "optId": 16,
        "optName": "Daño Crítico",
        "val": 20
      },
      {
        "optId": 18,
        "optName": "Daño Excelente",
        "val": 20
      },
      {
        "optId": 21,
        "optName": "Defensa con Escudo",
        "val": 5
      }
    ]
  }
};

export const ANCIENT_ITEMS_MAP: Record<string, AncientItemMapping> = {
  "0_2": {
    "section": 0,
    "type": 2,
    "statType": 0,
    "opt1": 21,
    "opt2": 0,
    "opt1Name": "Ceto",
    "opt2Name": null
  },
  "0_14": {
    "section": 0,
    "type": 14,
    "statType": 0,
    "opt1": 11,
    "opt2": 0,
    "opt1Name": "Hyon",
    "opt2Name": null
  },
  "0_32": {
    "section": 0,
    "type": 32,
    "statType": 0,
    "opt1": 37,
    "opt2": 38,
    "opt1Name": "Vega",
    "opt2Name": "Chamer"
  },
  "2_1": {
    "section": 2,
    "type": 1,
    "statType": 0,
    "opt1": 1,
    "opt2": 0,
    "opt1Name": "Warrior",
    "opt2Name": null
  },
  "4_5": {
    "section": 4,
    "type": 5,
    "statType": 1,
    "opt1": 29,
    "opt2": 0,
    "opt1Name": "Gywen",
    "opt2Name": null
  },
  "4_9": {
    "section": 4,
    "type": 9,
    "statType": 1,
    "opt1": 23,
    "opt2": 0,
    "opt1Name": "Gaia",
    "opt2Name": null
  },
  "5_0": {
    "section": 5,
    "type": 0,
    "statType": 2,
    "opt1": 13,
    "opt2": 0,
    "opt1Name": "Apollo",
    "opt2Name": null
  },
  "6_0": {
    "section": 6,
    "type": 0,
    "statType": 3,
    "opt1": 2,
    "opt2": 0,
    "opt1Name": "Anonymous",
    "opt2Name": null
  },
  "6_6": {
    "section": 6,
    "type": 6,
    "statType": 3,
    "opt1": 17,
    "opt2": 0,
    "opt1Name": "Heras",
    "opt2Name": null
  },
  "6_9": {
    "section": 6,
    "type": 9,
    "statType": 3,
    "opt1": 5,
    "opt2": 0,
    "opt1Name": "Eplete",
    "opt2Name": null
  },
  "7_0": {
    "section": 7,
    "type": 0,
    "statType": 3,
    "opt1": 4,
    "opt2": 0,
    "opt1Name": "Mist",
    "opt2Name": null
  },
  "7_1": {
    "section": 7,
    "type": 1,
    "statType": 3,
    "opt1": 11,
    "opt2": 12,
    "opt1Name": "Hyon",
    "opt2Name": "Vicious"
  },
  "7_2": {
    "section": 7,
    "type": 2,
    "statType": 3,
    "opt1": 13,
    "opt2": 14,
    "opt1Name": "Apollo",
    "opt2Name": "Barnake"
  },
  "7_3": {
    "section": 7,
    "type": 3,
    "statType": 3,
    "opt1": 19,
    "opt2": 20,
    "opt1Name": "Anubis",
    "opt2Name": "Isis"
  },
  "7_4": {
    "section": 7,
    "type": 4,
    "statType": 3,
    "opt1": 16,
    "opt2": 0,
    "opt1Name": "Sylion",
    "opt2Name": null
  },
  "7_5": {
    "section": 7,
    "type": 5,
    "statType": 3,
    "opt1": 1,
    "opt2": 2,
    "opt1Name": "Warrior",
    "opt2Name": "Anonymous"
  },
  "7_6": {
    "section": 7,
    "type": 6,
    "statType": 3,
    "opt1": 5,
    "opt2": 6,
    "opt1Name": "Eplete",
    "opt2Name": "Berserker"
  },
  "7_7": {
    "section": 7,
    "type": 7,
    "statType": 3,
    "opt1": 17,
    "opt2": 0,
    "opt1Name": "Heras",
    "opt2Name": null
  },
  "7_8": {
    "section": 7,
    "type": 8,
    "statType": 3,
    "opt1": 8,
    "opt2": 0,
    "opt1Name": "Cloud",
    "opt2Name": null
  },
  "7_9": {
    "section": 7,
    "type": 9,
    "statType": 3,
    "opt1": 10,
    "opt2": 0,
    "opt1Name": "Rave",
    "opt2Name": null
  },
  "7_10": {
    "section": 7,
    "type": 10,
    "statType": 3,
    "opt1": 21,
    "opt2": 22,
    "opt1Name": "Ceto",
    "opt2Name": "Drake"
  },
  "7_11": {
    "section": 7,
    "type": 11,
    "statType": 3,
    "opt1": 23,
    "opt2": 0,
    "opt1Name": "Gaia",
    "opt2Name": null
  },
  "7_12": {
    "section": 7,
    "type": 12,
    "statType": 3,
    "opt1": 25,
    "opt2": 0,
    "opt1Name": "Odin",
    "opt2Name": null
  },
  "7_14": {
    "section": 7,
    "type": 14,
    "statType": 3,
    "opt1": 0,
    "opt2": 30,
    "opt1Name": null,
    "opt2Name": "Aruan"
  },
  "7_26": {
    "section": 7,
    "type": 26,
    "statType": 3,
    "opt1": 33,
    "opt2": 0,
    "opt1Name": "Agnis",
    "opt2Name": null
  },
  "7_40": {
    "section": 7,
    "type": 40,
    "statType": 3,
    "opt1": 35,
    "opt2": 36,
    "opt1Name": "Chrono",
    "opt2Name": "Sedemen"
  },
  "7_59": {
    "section": 7,
    "type": 59,
    "statType": 3,
    "opt1": 37,
    "opt2": 0,
    "opt1Name": "Vega",
    "opt2Name": null
  },
  "7_62": {
    "section": 7,
    "type": 62,
    "statType": 3,
    "opt1": 39,
    "opt2": 0,
    "opt1Name": "Moros",
    "opt2Name": null
  },
  "7_63": {
    "section": 7,
    "type": 63,
    "statType": 3,
    "opt1": 40,
    "opt2": 0,
    "opt1Name": "Dione",
    "opt2Name": null
  },
  "7_64": {
    "section": 7,
    "type": 64,
    "statType": 3,
    "opt1": 41,
    "opt2": 0,
    "opt1Name": "Hades",
    "opt2Name": null
  },
  "7_65": {
    "section": 7,
    "type": 65,
    "statType": 3,
    "opt1": 42,
    "opt2": 0,
    "opt1Name": "Ophion",
    "opt2Name": null
  },
  "7_66": {
    "section": 7,
    "type": 66,
    "statType": 3,
    "opt1": 43,
    "opt2": 0,
    "opt1Name": "Meter",
    "opt2Name": null
  },
  "7_67": {
    "section": 7,
    "type": 67,
    "statType": 3,
    "opt1": 44,
    "opt2": 0,
    "opt1Name": "Hegaton",
    "opt2Name": null
  },
  "7_68": {
    "section": 7,
    "type": 68,
    "statType": 3,
    "opt1": 45,
    "opt2": 0,
    "opt1Name": "Castol",
    "opt2Name": null
  },
  "7_69": {
    "section": 7,
    "type": 69,
    "statType": 3,
    "opt1": 46,
    "opt2": 0,
    "opt1Name": "Taros",
    "opt2Name": null
  },
  "7_70": {
    "section": 7,
    "type": 70,
    "statType": 3,
    "opt1": 47,
    "opt2": 0,
    "opt1Name": "Nemesis",
    "opt2Name": null
  },
  "7_72": {
    "section": 7,
    "type": 72,
    "statType": 3,
    "opt1": 49,
    "opt2": 0,
    "opt1Name": "Trite",
    "opt2Name": null
  },
  "8_0": {
    "section": 8,
    "type": 0,
    "statType": 3,
    "opt1": 3,
    "opt2": 0,
    "opt1Name": "Hyperion",
    "opt2Name": null
  },
  "8_1": {
    "section": 8,
    "type": 1,
    "statType": 3,
    "opt1": 0,
    "opt2": 12,
    "opt1Name": null,
    "opt2Name": "Vicious"
  },
  "8_2": {
    "section": 8,
    "type": 2,
    "statType": 3,
    "opt1": 13,
    "opt2": 0,
    "opt1Name": "Apollo",
    "opt2Name": null
  },
  "8_3": {
    "section": 8,
    "type": 3,
    "statType": 3,
    "opt1": 19,
    "opt2": 20,
    "opt1Name": "Anubis",
    "opt2Name": "Isis"
  },
  "8_4": {
    "section": 8,
    "type": 4,
    "statType": 3,
    "opt1": 15,
    "opt2": 16,
    "opt1Name": "Evis",
    "opt2Name": "Sylion"
  },
  "8_5": {
    "section": 8,
    "type": 5,
    "statType": 3,
    "opt1": 1,
    "opt2": 0,
    "opt1Name": "Warrior",
    "opt2Name": null
  },
  "8_6": {
    "section": 8,
    "type": 6,
    "statType": 3,
    "opt1": 5,
    "opt2": 6,
    "opt1Name": "Eplete",
    "opt2Name": "Berserker"
  },
  "8_7": {
    "section": 8,
    "type": 7,
    "statType": 3,
    "opt1": 17,
    "opt2": 18,
    "opt1Name": "Heras",
    "opt2Name": "Minet"
  },
  "8_8": {
    "section": 8,
    "type": 8,
    "statType": 3,
    "opt1": 7,
    "opt2": 0,
    "opt1Name": "Garuda",
    "opt2Name": null
  },
  "8_9": {
    "section": 8,
    "type": 9,
    "statType": 3,
    "opt1": 9,
    "opt2": 10,
    "opt1Name": "Kantata",
    "opt2Name": "Rave"
  },
  "8_10": {
    "section": 8,
    "type": 10,
    "statType": 3,
    "opt1": 22,
    "opt2": 0,
    "opt1Name": "Drake",
    "opt2Name": null
  },
  "8_11": {
    "section": 8,
    "type": 11,
    "statType": 3,
    "opt1": 23,
    "opt2": 0,
    "opt1Name": "Gaia",
    "opt2Name": null
  },
  "8_12": {
    "section": 8,
    "type": 12,
    "statType": 3,
    "opt1": 25,
    "opt2": 0,
    "opt1Name": "Odin",
    "opt2Name": null
  },
  "8_13": {
    "section": 8,
    "type": 13,
    "statType": 3,
    "opt1": 27,
    "opt2": 0,
    "opt1Name": "Argo",
    "opt2Name": null
  },
  "8_14": {
    "section": 8,
    "type": 14,
    "statType": 3,
    "opt1": 29,
    "opt2": 30,
    "opt1Name": "Gywen",
    "opt2Name": "Aruan"
  },
  "8_15": {
    "section": 8,
    "type": 15,
    "statType": 3,
    "opt1": 31,
    "opt2": 32,
    "opt1Name": "Gaion",
    "opt2Name": "Muren"
  },
  "8_26": {
    "section": 8,
    "type": 26,
    "statType": 3,
    "opt1": 33,
    "opt2": 0,
    "opt1Name": "Agnis",
    "opt2Name": null
  },
  "8_40": {
    "section": 8,
    "type": 40,
    "statType": 3,
    "opt1": 0,
    "opt2": 36,
    "opt1Name": null,
    "opt2Name": "Sedemen"
  },
  "8_59": {
    "section": 8,
    "type": 59,
    "statType": 3,
    "opt1": 37,
    "opt2": 38,
    "opt1Name": "Vega",
    "opt2Name": "Chamer"
  },
  "8_62": {
    "section": 8,
    "type": 62,
    "statType": 3,
    "opt1": 39,
    "opt2": 0,
    "opt1Name": "Moros",
    "opt2Name": null
  },
  "8_63": {
    "section": 8,
    "type": 63,
    "statType": 3,
    "opt1": 40,
    "opt2": 0,
    "opt1Name": "Dione",
    "opt2Name": null
  },
  "8_64": {
    "section": 8,
    "type": 64,
    "statType": 3,
    "opt1": 41,
    "opt2": 0,
    "opt1Name": "Hades",
    "opt2Name": null
  },
  "8_65": {
    "section": 8,
    "type": 65,
    "statType": 3,
    "opt1": 42,
    "opt2": 0,
    "opt1Name": "Ophion",
    "opt2Name": null
  },
  "8_66": {
    "section": 8,
    "type": 66,
    "statType": 3,
    "opt1": 43,
    "opt2": 0,
    "opt1Name": "Meter",
    "opt2Name": null
  },
  "8_67": {
    "section": 8,
    "type": 67,
    "statType": 3,
    "opt1": 44,
    "opt2": 0,
    "opt1Name": "Hegaton",
    "opt2Name": null
  },
  "8_68": {
    "section": 8,
    "type": 68,
    "statType": 3,
    "opt1": 45,
    "opt2": 0,
    "opt1Name": "Castol",
    "opt2Name": null
  },
  "8_69": {
    "section": 8,
    "type": 69,
    "statType": 3,
    "opt1": 46,
    "opt2": 0,
    "opt1Name": "Taros",
    "opt2Name": null
  },
  "8_70": {
    "section": 8,
    "type": 70,
    "statType": 3,
    "opt1": 47,
    "opt2": 0,
    "opt1Name": "Nemesis",
    "opt2Name": null
  },
  "8_71": {
    "section": 8,
    "type": 71,
    "statType": 3,
    "opt1": 48,
    "opt2": 0,
    "opt1Name": "Amis",
    "opt2Name": null
  },
  "8_72": {
    "section": 8,
    "type": 72,
    "statType": 3,
    "opt1": 49,
    "opt2": 0,
    "opt1Name": "Trite",
    "opt2Name": null
  },
  "9_0": {
    "section": 9,
    "type": 0,
    "statType": 3,
    "opt1": 3,
    "opt2": 4,
    "opt1Name": "Hyperion",
    "opt2Name": "Mist"
  },
  "9_1": {
    "section": 9,
    "type": 1,
    "statType": 3,
    "opt1": 0,
    "opt2": 12,
    "opt1Name": null,
    "opt2Name": "Vicious"
  },
  "9_2": {
    "section": 9,
    "type": 2,
    "statType": 3,
    "opt1": 13,
    "opt2": 14,
    "opt1Name": "Apollo",
    "opt2Name": "Barnake"
  },
  "9_3": {
    "section": 9,
    "type": 3,
    "statType": 3,
    "opt1": 0,
    "opt2": 20,
    "opt1Name": null,
    "opt2Name": "Isis"
  },
  "9_4": {
    "section": 9,
    "type": 4,
    "statType": 3,
    "opt1": 15,
    "opt2": 0,
    "opt1Name": "Evis",
    "opt2Name": null
  },
  "9_5": {
    "section": 9,
    "type": 5,
    "statType": 3,
    "opt1": 1,
    "opt2": 2,
    "opt1Name": "Warrior",
    "opt2Name": "Anonymous"
  },
  "9_6": {
    "section": 9,
    "type": 6,
    "statType": 3,
    "opt1": 5,
    "opt2": 6,
    "opt1Name": "Eplete",
    "opt2Name": "Berserker"
  },
  "9_7": {
    "section": 9,
    "type": 7,
    "statType": 3,
    "opt1": 17,
    "opt2": 18,
    "opt1Name": "Heras",
    "opt2Name": "Minet"
  },
  "9_8": {
    "section": 9,
    "type": 8,
    "statType": 3,
    "opt1": 7,
    "opt2": 8,
    "opt1Name": "Garuda",
    "opt2Name": "Cloud"
  },
  "9_9": {
    "section": 9,
    "type": 9,
    "statType": 3,
    "opt1": 10,
    "opt2": 0,
    "opt1Name": "Rave",
    "opt2Name": null
  },
  "9_10": {
    "section": 9,
    "type": 10,
    "statType": 3,
    "opt1": 21,
    "opt2": 22,
    "opt1Name": "Ceto",
    "opt2Name": "Drake"
  },
  "9_11": {
    "section": 9,
    "type": 11,
    "statType": 3,
    "opt1": 23,
    "opt2": 24,
    "opt1Name": "Gaia",
    "opt2Name": "Fase"
  },
  "9_12": {
    "section": 9,
    "type": 12,
    "statType": 3,
    "opt1": 25,
    "opt2": 26,
    "opt1Name": "Odin",
    "opt2Name": "Elvian"
  },
  "9_13": {
    "section": 9,
    "type": 13,
    "statType": 3,
    "opt1": 27,
    "opt2": 28,
    "opt1Name": "Argo",
    "opt2Name": "Karis"
  },
  "9_14": {
    "section": 9,
    "type": 14,
    "statType": 3,
    "opt1": 0,
    "opt2": 30,
    "opt1Name": null,
    "opt2Name": "Aruan"
  },
  "9_15": {
    "section": 9,
    "type": 15,
    "statType": 3,
    "opt1": 31,
    "opt2": 32,
    "opt1Name": "Gaion",
    "opt2Name": "Muren"
  },
  "9_26": {
    "section": 9,
    "type": 26,
    "statType": 3,
    "opt1": 33,
    "opt2": 34,
    "opt1Name": "Agnis",
    "opt2Name": "Broy"
  },
  "9_40": {
    "section": 9,
    "type": 40,
    "statType": 3,
    "opt1": 35,
    "opt2": 0,
    "opt1Name": "Chrono",
    "opt2Name": null
  },
  "9_59": {
    "section": 9,
    "type": 59,
    "statType": 3,
    "opt1": 37,
    "opt2": 38,
    "opt1Name": "Vega",
    "opt2Name": "Chamer"
  },
  "9_62": {
    "section": 9,
    "type": 62,
    "statType": 3,
    "opt1": 39,
    "opt2": 0,
    "opt1Name": "Moros",
    "opt2Name": null
  },
  "9_63": {
    "section": 9,
    "type": 63,
    "statType": 3,
    "opt1": 40,
    "opt2": 0,
    "opt1Name": "Dione",
    "opt2Name": null
  },
  "9_64": {
    "section": 9,
    "type": 64,
    "statType": 3,
    "opt1": 41,
    "opt2": 0,
    "opt1Name": "Hades",
    "opt2Name": null
  },
  "9_65": {
    "section": 9,
    "type": 65,
    "statType": 3,
    "opt1": 42,
    "opt2": 0,
    "opt1Name": "Ophion",
    "opt2Name": null
  },
  "9_66": {
    "section": 9,
    "type": 66,
    "statType": 3,
    "opt1": 43,
    "opt2": 0,
    "opt1Name": "Meter",
    "opt2Name": null
  },
  "9_67": {
    "section": 9,
    "type": 67,
    "statType": 3,
    "opt1": 44,
    "opt2": 0,
    "opt1Name": "Hegaton",
    "opt2Name": null
  },
  "9_68": {
    "section": 9,
    "type": 68,
    "statType": 3,
    "opt1": 45,
    "opt2": 0,
    "opt1Name": "Castol",
    "opt2Name": null
  },
  "9_69": {
    "section": 9,
    "type": 69,
    "statType": 3,
    "opt1": 46,
    "opt2": 0,
    "opt1Name": "Taros",
    "opt2Name": null
  },
  "9_70": {
    "section": 9,
    "type": 70,
    "statType": 3,
    "opt1": 47,
    "opt2": 0,
    "opt1Name": "Nemesis",
    "opt2Name": null
  },
  "9_71": {
    "section": 9,
    "type": 71,
    "statType": 3,
    "opt1": 48,
    "opt2": 0,
    "opt1Name": "Amis",
    "opt2Name": null
  },
  "9_72": {
    "section": 9,
    "type": 72,
    "statType": 3,
    "opt1": 49,
    "opt2": 0,
    "opt1Name": "Trite",
    "opt2Name": null
  },
  "10_0": {
    "section": 10,
    "type": 0,
    "statType": 3,
    "opt1": 4,
    "opt2": 0,
    "opt1Name": "Mist",
    "opt2Name": null
  },
  "10_1": {
    "section": 10,
    "type": 1,
    "statType": 3,
    "opt1": 11,
    "opt2": 0,
    "opt1Name": "Hyon",
    "opt2Name": null
  },
  "10_2": {
    "section": 10,
    "type": 2,
    "statType": 3,
    "opt1": 13,
    "opt2": 0,
    "opt1Name": "Apollo",
    "opt2Name": null
  },
  "10_3": {
    "section": 10,
    "type": 3,
    "statType": 3,
    "opt1": 19,
    "opt2": 0,
    "opt1Name": "Anubis",
    "opt2Name": null
  },
  "10_4": {
    "section": 10,
    "type": 4,
    "statType": 3,
    "opt1": 16,
    "opt2": 0,
    "opt1Name": "Sylion",
    "opt2Name": null
  },
  "10_5": {
    "section": 10,
    "type": 5,
    "statType": 3,
    "opt1": 1,
    "opt2": 0,
    "opt1Name": "Warrior",
    "opt2Name": null
  },
  "10_6": {
    "section": 10,
    "type": 6,
    "statType": 3,
    "opt1": 6,
    "opt2": 0,
    "opt1Name": "Berserker",
    "opt2Name": null
  },
  "10_7": {
    "section": 10,
    "type": 7,
    "statType": 3,
    "opt1": 17,
    "opt2": 0,
    "opt1Name": "Heras",
    "opt2Name": null
  },
  "10_8": {
    "section": 10,
    "type": 8,
    "statType": 3,
    "opt1": 7,
    "opt2": 0,
    "opt1Name": "Garuda",
    "opt2Name": null
  },
  "10_9": {
    "section": 10,
    "type": 9,
    "statType": 3,
    "opt1": 9,
    "opt2": 0,
    "opt1Name": "Kantata",
    "opt2Name": null
  },
  "10_10": {
    "section": 10,
    "type": 10,
    "statType": 3,
    "opt1": 21,
    "opt2": 0,
    "opt1Name": "Ceto",
    "opt2Name": null
  },
  "10_11": {
    "section": 10,
    "type": 11,
    "statType": 3,
    "opt1": 23,
    "opt2": 24,
    "opt1Name": "Gaia",
    "opt2Name": "Fase"
  },
  "10_12": {
    "section": 10,
    "type": 12,
    "statType": 3,
    "opt1": 25,
    "opt2": 0,
    "opt1Name": "Odin",
    "opt2Name": null
  },
  "10_13": {
    "section": 10,
    "type": 13,
    "statType": 3,
    "opt1": 27,
    "opt2": 0,
    "opt1Name": "Argo",
    "opt2Name": null
  },
  "10_14": {
    "section": 10,
    "type": 14,
    "statType": 3,
    "opt1": 29,
    "opt2": 0,
    "opt1Name": "Gywen",
    "opt2Name": null
  },
  "10_15": {
    "section": 10,
    "type": 15,
    "statType": 3,
    "opt1": 0,
    "opt2": 32,
    "opt1Name": null,
    "opt2Name": "Muren"
  },
  "10_26": {
    "section": 10,
    "type": 26,
    "statType": 3,
    "opt1": 0,
    "opt2": 34,
    "opt1Name": null,
    "opt2Name": "Broy"
  },
  "10_40": {
    "section": 10,
    "type": 40,
    "statType": 3,
    "opt1": 35,
    "opt2": 36,
    "opt1Name": "Chrono",
    "opt2Name": "Sedemen"
  },
  "10_62": {
    "section": 10,
    "type": 62,
    "statType": 3,
    "opt1": 39,
    "opt2": 0,
    "opt1Name": "Moros",
    "opt2Name": null
  },
  "10_63": {
    "section": 10,
    "type": 63,
    "statType": 3,
    "opt1": 40,
    "opt2": 0,
    "opt1Name": "Dione",
    "opt2Name": null
  },
  "10_64": {
    "section": 10,
    "type": 64,
    "statType": 3,
    "opt1": 41,
    "opt2": 0,
    "opt1Name": "Hades",
    "opt2Name": null
  },
  "10_65": {
    "section": 10,
    "type": 65,
    "statType": 3,
    "opt1": 42,
    "opt2": 0,
    "opt1Name": "Ophion",
    "opt2Name": null
  },
  "10_66": {
    "section": 10,
    "type": 66,
    "statType": 3,
    "opt1": 43,
    "opt2": 0,
    "opt1Name": "Meter",
    "opt2Name": null
  },
  "10_67": {
    "section": 10,
    "type": 67,
    "statType": 3,
    "opt1": 44,
    "opt2": 0,
    "opt1Name": "Hegaton",
    "opt2Name": null
  },
  "10_68": {
    "section": 10,
    "type": 68,
    "statType": 3,
    "opt1": 45,
    "opt2": 0,
    "opt1Name": "Castol",
    "opt2Name": null
  },
  "10_69": {
    "section": 10,
    "type": 69,
    "statType": 3,
    "opt1": 46,
    "opt2": 0,
    "opt1Name": "Taros",
    "opt2Name": null
  },
  "10_70": {
    "section": 10,
    "type": 70,
    "statType": 3,
    "opt1": 47,
    "opt2": 0,
    "opt1Name": "Nemesis",
    "opt2Name": null
  },
  "10_71": {
    "section": 10,
    "type": 71,
    "statType": 3,
    "opt1": 48,
    "opt2": 0,
    "opt1Name": "Amis",
    "opt2Name": null
  },
  "11_0": {
    "section": 11,
    "type": 0,
    "statType": 3,
    "opt1": 3,
    "opt2": 0,
    "opt1Name": "Hyperion",
    "opt2Name": null
  },
  "11_1": {
    "section": 11,
    "type": 1,
    "statType": 3,
    "opt1": 11,
    "opt2": 0,
    "opt1Name": "Hyon",
    "opt2Name": null
  },
  "11_2": {
    "section": 11,
    "type": 2,
    "statType": 3,
    "opt1": 14,
    "opt2": 0,
    "opt1Name": "Barnake",
    "opt2Name": null
  },
  "11_3": {
    "section": 11,
    "type": 3,
    "statType": 3,
    "opt1": 0,
    "opt2": 20,
    "opt1Name": null,
    "opt2Name": "Isis"
  },
  "11_4": {
    "section": 11,
    "type": 4,
    "statType": 3,
    "opt1": 15,
    "opt2": 16,
    "opt1Name": "Evis",
    "opt2Name": "Sylion"
  },
  "11_5": {
    "section": 11,
    "type": 5,
    "statType": 3,
    "opt1": 1,
    "opt2": 2,
    "opt1Name": "Warrior",
    "opt2Name": "Anonymous"
  },
  "11_6": {
    "section": 11,
    "type": 6,
    "statType": 3,
    "opt1": 6,
    "opt2": 0,
    "opt1Name": "Berserker",
    "opt2Name": null
  },
  "11_7": {
    "section": 11,
    "type": 7,
    "statType": 3,
    "opt1": 17,
    "opt2": 18,
    "opt1Name": "Heras",
    "opt2Name": "Minet"
  },
  "11_8": {
    "section": 11,
    "type": 8,
    "statType": 3,
    "opt1": 7,
    "opt2": 0,
    "opt1Name": "Garuda",
    "opt2Name": null
  },
  "11_9": {
    "section": 11,
    "type": 9,
    "statType": 3,
    "opt1": 9,
    "opt2": 0,
    "opt1Name": "Kantata",
    "opt2Name": null
  },
  "11_10": {
    "section": 11,
    "type": 10,
    "statType": 3,
    "opt1": 21,
    "opt2": 22,
    "opt1Name": "Ceto",
    "opt2Name": "Drake"
  },
  "11_11": {
    "section": 11,
    "type": 11,
    "statType": 3,
    "opt1": 24,
    "opt2": 0,
    "opt1Name": "Fase",
    "opt2Name": null
  },
  "11_12": {
    "section": 11,
    "type": 12,
    "statType": 3,
    "opt1": 25,
    "opt2": 26,
    "opt1Name": "Odin",
    "opt2Name": "Elvian"
  },
  "11_14": {
    "section": 11,
    "type": 14,
    "statType": 3,
    "opt1": 29,
    "opt2": 30,
    "opt1Name": "Gywen",
    "opt2Name": "Aruan"
  },
  "11_15": {
    "section": 11,
    "type": 15,
    "statType": 3,
    "opt1": 31,
    "opt2": 0,
    "opt1Name": "Gaion",
    "opt2Name": null
  },
  "11_26": {
    "section": 11,
    "type": 26,
    "statType": 3,
    "opt1": 0,
    "opt2": 34,
    "opt1Name": null,
    "opt2Name": "Broy"
  },
  "11_40": {
    "section": 11,
    "type": 40,
    "statType": 3,
    "opt1": 0,
    "opt2": 36,
    "opt1Name": null,
    "opt2Name": "Sedemen"
  },
  "11_59": {
    "section": 11,
    "type": 59,
    "statType": 3,
    "opt1": 38,
    "opt2": 0,
    "opt1Name": "Chamer",
    "opt2Name": null
  },
  "11_62": {
    "section": 11,
    "type": 62,
    "statType": 3,
    "opt1": 39,
    "opt2": 0,
    "opt1Name": "Moros",
    "opt2Name": null
  },
  "11_63": {
    "section": 11,
    "type": 63,
    "statType": 3,
    "opt1": 40,
    "opt2": 0,
    "opt1Name": "Dione",
    "opt2Name": null
  },
  "11_64": {
    "section": 11,
    "type": 64,
    "statType": 3,
    "opt1": 41,
    "opt2": 0,
    "opt1Name": "Hades",
    "opt2Name": null
  },
  "11_65": {
    "section": 11,
    "type": 65,
    "statType": 3,
    "opt1": 42,
    "opt2": 0,
    "opt1Name": "Ophion",
    "opt2Name": null
  },
  "11_66": {
    "section": 11,
    "type": 66,
    "statType": 3,
    "opt1": 43,
    "opt2": 0,
    "opt1Name": "Meter",
    "opt2Name": null
  },
  "11_67": {
    "section": 11,
    "type": 67,
    "statType": 3,
    "opt1": 44,
    "opt2": 0,
    "opt1Name": "Hegaton",
    "opt2Name": null
  },
  "11_68": {
    "section": 11,
    "type": 68,
    "statType": 3,
    "opt1": 45,
    "opt2": 0,
    "opt1Name": "Castol",
    "opt2Name": null
  },
  "11_69": {
    "section": 11,
    "type": 69,
    "statType": 3,
    "opt1": 46,
    "opt2": 0,
    "opt1Name": "Taros",
    "opt2Name": null
  },
  "11_70": {
    "section": 11,
    "type": 70,
    "statType": 3,
    "opt1": 47,
    "opt2": 0,
    "opt1Name": "Nemesis",
    "opt2Name": null
  },
  "11_71": {
    "section": 11,
    "type": 71,
    "statType": 3,
    "opt1": 48,
    "opt2": 0,
    "opt1Name": "Amis",
    "opt2Name": null
  },
  "11_72": {
    "section": 11,
    "type": 72,
    "statType": 3,
    "opt1": 49,
    "opt2": 0,
    "opt1Name": "Trite",
    "opt2Name": null
  },
  "13_8": {
    "section": 13,
    "type": 8,
    "statType": 1,
    "opt1": 1,
    "opt2": 0,
    "opt1Name": "Warrior",
    "opt2Name": null
  },
  "13_9": {
    "section": 13,
    "type": 9,
    "statType": 3,
    "opt1": 9,
    "opt2": 33,
    "opt1Name": "Kantata",
    "opt2Name": "Agnis"
  },
  "13_12": {
    "section": 13,
    "type": 12,
    "statType": 2,
    "opt1": 5,
    "opt2": 0,
    "opt1Name": "Eplete",
    "opt2Name": null
  },
  "13_13": {
    "section": 13,
    "type": 13,
    "statType": 0,
    "opt1": 7,
    "opt2": 0,
    "opt1Name": "Garuda",
    "opt2Name": null
  },
  "13_21": {
    "section": 13,
    "type": 21,
    "statType": 2,
    "opt1": 19,
    "opt2": 32,
    "opt1Name": "Anubis",
    "opt2Name": "Muren"
  },
  "13_22": {
    "section": 13,
    "type": 22,
    "statType": 0,
    "opt1": 21,
    "opt2": 12,
    "opt1Name": "Ceto",
    "opt2Name": "Vicious"
  },
  "13_23": {
    "section": 13,
    "type": 23,
    "statType": 1,
    "opt1": 9,
    "opt2": 0,
    "opt1Name": "Kantata",
    "opt2Name": null
  },
  "13_24": {
    "section": 13,
    "type": 24,
    "statType": 2,
    "opt1": 13,
    "opt2": 35,
    "opt1Name": "Apollo",
    "opt2Name": "Chrono"
  },
  "13_25": {
    "section": 13,
    "type": 25,
    "statType": 0,
    "opt1": 13,
    "opt2": 34,
    "opt1Name": "Apollo",
    "opt2Name": "Broy"
  },
  "13_26": {
    "section": 13,
    "type": 26,
    "statType": 1,
    "opt1": 15,
    "opt2": 0,
    "opt1Name": "Evis",
    "opt2Name": null
  },
  "13_27": {
    "section": 13,
    "type": 27,
    "statType": 3,
    "opt1": 31,
    "opt2": 0,
    "opt1Name": "Gaion",
    "opt2Name": null
  },
  "13_28": {
    "section": 13,
    "type": 28,
    "statType": 1,
    "opt1": 29,
    "opt2": 0,
    "opt1Name": "Gywen",
    "opt2Name": null
  }
};

/**
 * Checks if a specific item (group, index) is eligible to be an Ancient item.
 */
export function isItemAncientEligible(group: number, index: number): boolean {
  const key = group + "_" + index;
  const item = ANCIENT_ITEMS_MAP[key];
  if (!item) return false;
  return (item.opt1 > 0 || item.opt2 > 0);
}

/**
 * Returns available Ancient set options for a specific item.
 * E.g. Dragon Helm (7, 1) -> [{ tier: 1, setId: 11, name: "Hyon" }, { tier: 2, setId: 12, name: "Vicious" }]
 * Dragon Armor (8, 1) -> [{ tier: 2, setId: 12, name: "Vicious" }]
 */
export function getAvailableAncientOptionsForItem(group: number, index: number): AncientOptionEntry[] {
  const key = group + "_" + index;
  const item = ANCIENT_ITEMS_MAP[key];
  if (!item) return [];

  const results: AncientOptionEntry[] = [];
  if (item.opt1 > 0 && item.opt1Name) {
    results.push({
      tier: 1,
      setId: item.opt1,
      name: item.opt1Name,
    });
  }
  if (item.opt2 > 0 && item.opt2Name) {
    results.push({
      tier: 2,
      setId: item.opt2,
      name: item.opt2Name,
    });
  }
  return results;
}

/**
 * Decodes Season 6 Louis Byte 8.
 * Bits 0-1: Tier (0 = None, 1 = Tier 1, 2 = Tier 2)
 * Bits 2-3: Stamina Bonus (1 = +5 Stamina, 2 = +10 Stamina)
 */
export function decodeAncientByte(byte8: number): { isAncient: boolean; tier: number; staminaBonus: number } {
  const tier = (byte8 || 0) & 0x03;
  if (tier === 0) {
    return { isAncient: false, tier: 0, staminaBonus: 0 };
  }
  const bonusBits = ((byte8 || 0) >> 2) & 0x03;
  let staminaBonus = 0;
  if (bonusBits === 1) staminaBonus = 5;
  else if (bonusBits === 2) staminaBonus = 10;
  return { isAncient: true, tier, staminaBonus };
}

/**
 * Encodes Season 6 Louis Byte 8.
 * @param tier 0 = Normal, 1 = Tier 1, 2 = Tier 2
 * @param staminaBonus 5 for +5 stamina (default), 10 for +10 stamina
 */
export function encodeAncientByte(tier: number, staminaBonus: number = 5): number {
  if (!tier || tier <= 0) return 0x00;
  const cleanTier = tier & 0x03;
  const bonusBits = staminaBonus === 10 ? 2 : 1;
  return cleanTier | (bonusBits << 2);
}

/**
 * Retrieves ancient set definition by its ID.
 */
export function getAncientSet(setId: number): AncientSet | null {
  return ANCIENT_SETS_CATALOG[setId] || null;
}

/**
 * Full resolution of ancient information for an item and its byte8 value.
 */
export function getAncientInfo(group: number, index: number, byte8: number): AncientDecodedInfo {
  const decoded = decodeAncientByte(byte8);
  if (!decoded.isAncient) {
    return {
      isAncient: false,
      tier: 0,
      staminaBonus: 0,
      setId: 0,
      setName: null,
      set: null
    };
  }

  const key = group + "_" + index;
  const mapping = ANCIENT_ITEMS_MAP[key];
  let setId = 0;
  let setName: string | null = null;

  if (mapping) {
    if (decoded.tier === 1 && mapping.opt1 > 0) {
      setId = mapping.opt1;
      setName = mapping.opt1Name;
    } else if (decoded.tier === 2 && mapping.opt2 > 0) {
      setId = mapping.opt2;
      setName = mapping.opt2Name;
    }
  }

  const set = setId > 0 ? getAncientSet(setId) : null;
  return {
    isAncient: true,
    tier: decoded.tier,
    staminaBonus: decoded.staminaBonus,
    setId,
    setName,
    set,
  };
}

/**
 * Resolves item name with ancient prefix.
 * E.g. "Dragon Helm" -> "Hyon Dragon Helm"
 */
export function resolveAncientItemName(group: number, index: number, byte8: number, baseName: string): string {
  const info = getAncientInfo(group, index, byte8);
  if (!info.isAncient || !info.setName) {
    return baseName;
  }
  const prefix = info.setName.trim();
  if (baseName.toLowerCase().startsWith(prefix.toLowerCase())) {
    return baseName;
  }
  return prefix + " " + baseName;
}
