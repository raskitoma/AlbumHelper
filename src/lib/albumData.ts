export interface SectionInfo {
  code: string;
  name: string;
  flag: string;
  type: "special" | "team" | "promo";
  group?: string; // Group A-L for teams
}

export const SECTIONS: SectionInfo[] = [
  // Specials
  { code: "FWC-S", name: "FWC - Specials", flag: "🏆", type: "special" },
  { code: "FWC-H", name: "FWC - Host Cities & Stadiums", flag: "🏟️", type: "special" },

  // Group A
  { code: "USA", name: "United States", flag: "🇺🇸", type: "team", group: "Grupo A" },
  { code: "CUW", name: "Curaçao", flag: "🇨🇼", type: "team", group: "Grupo A" },
  { code: "ALG", name: "Algeria", flag: "🇩🇿", type: "team", group: "Grupo A" },
  { code: "NOR", name: "Norway", flag: "🇳🇴", type: "team", group: "Grupo A" },

  // Group B
  { code: "MEX", name: "Mexico", flag: "🇲🇽", type: "team", group: "Grupo B" },
  { code: "HAI", name: "Haiti", flag: "🇭🇹", type: "team", group: "Grupo B" },
  { code: "CIV", name: "Ivory Coast", flag: "🇨🇮", type: "team", group: "Grupo B" },
  { code: "SWE", name: "Sweden", flag: "🇸🇪", type: "team", group: "Grupo B" },

  // Group C
  { code: "CAN", name: "Canada", flag: "🇨🇦", type: "team", group: "Grupo C" },
  { code: "PAN", name: "Panama", flag: "🇵🇦", type: "team", group: "Grupo C" },
  { code: "RSA", name: "South Africa", flag: "🇿🇦", type: "team", group: "Grupo C" },
  { code: "TUR", name: "Turkey", flag: "🇹🇷", type: "team", group: "Grupo C" },

  // Group D
  { code: "ARG", name: "Argentina", flag: "🇦🇷", type: "team", group: "Grupo D" },
  { code: "ECU", name: "Ecuador", flag: "🇪🇨", type: "team", group: "Grupo D" },
  { code: "CPV", name: "Cape Verde", flag: "🇨🇻", type: "team", group: "Grupo D" },
  { code: "NED", name: "Netherlands", flag: "🇳🇱", type: "team", group: "Grupo D" },

  // Group E
  { code: "BRA", name: "Brazil", flag: "🇧🇷", type: "team", group: "Grupo E" },
  { code: "PAR", name: "Paraguay", flag: "🇵🇾", type: "team", group: "Grupo E" },
  { code: "COD", name: "DR Congo", flag: "🇨🇩", type: "team", group: "Grupo E" },
  { code: "BEL", name: "Belgium", flag: "🇧🇪", type: "team", group: "Grupo E" },

  // Group F
  { code: "COL", name: "Colombia", flag: "🇨🇴", type: "team", group: "Grupo F" },
  { code: "URU", name: "Uruguay", flag: "🇺🇾", type: "team", group: "Grupo F" },
  { code: "EGY", name: "Egypt", flag: "🇪🇬", type: "team", group: "Grupo F" },
  { code: "CRO", name: "Croatia", flag: "🇭🇷", type: "team", group: "Grupo F" },

  // Group G
  { code: "JPN", name: "Japan", flag: "🇯🇵", type: "team", group: "Grupo G" },
  { code: "UZB", name: "Uzbekistan", flag: "🇺🇿", type: "team", group: "Grupo G" },
  { code: "SEN", name: "Senegal", flag: "🇸🇳", type: "team", group: "Grupo G" },
  { code: "FRA", name: "France", flag: "🇫🇷", type: "team", group: "Grupo G" },

  // Group H
  { code: "KOR", name: "South Korea", flag: "🇰🇷", type: "team", group: "Grupo H" },
  { code: "IRQ", name: "Iraq", flag: "🇮🇶", type: "team", group: "Grupo H" },
  { code: "TUN", name: "Tunisia", flag: "🇹🇳", type: "team", group: "Grupo H" },
  { code: "ENG", name: "England", flag: "🏴\u200d󠁧\u200d󠁢\u200d󠁥\u200d󠁮\u200d󠁧\u200d󠁿", type: "team", group: "Grupo H" },

  // Group I
  { code: "AUS", name: "Australia", flag: "🇦🇺", type: "team", group: "Grupo I" },
  { code: "JOR", name: "Jordan", flag: "🇯🇴", type: "team", group: "Grupo I" },
  { code: "GHA", name: "Ghana", flag: "🇬🇭", type: "team", group: "Grupo I" },
  { code: "ESP", name: "Spain", flag: "🇪🇸", type: "team", group: "Grupo I" },

  // Group J
  { code: "IRN", name: "Iran", flag: "🇮🇷", type: "team", group: "Grupo J" },
  { code: "QAT", name: "Qatar", flag: "🇶🇦", type: "team", group: "Grupo J" },
  { code: "MAR", name: "Morocco", flag: "🇲🇦", type: "team", group: "Grupo J" },
  { code: "POR", name: "Portugal", flag: "🇵🇹", type: "team", group: "Grupo J" },

  // Group K
  { code: "KSA", name: "Saudi Arabia", flag: "🇸🇦", type: "team", group: "Grupo K" },
  { code: "NZL", name: "New Zealand", flag: "🇳🇿", type: "team", group: "Grupo K" },
  { code: "GER", name: "Germany", flag: "🇩🇪", type: "team", group: "Grupo K" },
  { code: "SUI", name: "Switzerland", flag: "🇨🇭", type: "team", group: "Grupo K" },

  // Group L
  { code: "AUT", name: "Austria", flag: "🇦🇹", type: "team", group: "Grupo L" },
  { code: "BIH", name: "Bosnia & Herz.", flag: "🇧🇦", type: "team", group: "Grupo L" },
  { code: "CZE", name: "Czech Republic", flag: "🇨🇿", type: "team", group: "Grupo L" },
  { code: "SCO", name: "Scotland", flag: "🏴\u200d󠁧\u200d󠁢\u200d󠁢\u200d󠁴\u200d󠁿", type: "team", group: "Grupo L" },

  // Promos
  { code: "COKE", name: "Coca-Cola Specials", flag: "🥤", type: "promo" }
];

export interface StickerCatalogSeed {
  code: string;
  sectionCode: string;
  number: number;
  name: string;
  position: string;
  imageUrl: string | null;
  isSpecial: boolean;
}

// Hand-curated star player lists for host nations and top favorites
const STAR_PLAYERS: Record<string, Record<number, { name: string; position: string; image: string }>> = {
  USA: {
    10: {
      name: "Christian Pulisic",
      position: "Forward",
      image: "https://upload.wikimedia.org/wikipedia/commons/e/ec/Christian_Pulisic_2024.jpg"
    },
    4: {
      name: "Tyler Adams",
      position: "Midfielder",
      image: "https://upload.wikimedia.org/wikipedia/commons/e/eb/Tyler_Adams_2022.jpg"
    }
  },
  MEX: {
    11: {
      name: "Santiago Giménez",
      position: "Forward",
      image: "https://upload.wikimedia.org/wikipedia/commons/a/ae/Santiago_Gim%C3%A9nez_2023.jpg"
    },
    1: {
      name: "Guillermo Ochoa",
      position: "Goalkeeper",
      image: "https://upload.wikimedia.org/wikipedia/commons/d/da/Guillermo_Ochoa_Russia_2018.jpg"
    },
    12: {
      name: "Edson Álvarez",
      position: "Midfielder",
      image: "https://upload.wikimedia.org/wikipedia/commons/4/41/Edson_%C3%81lvarez_2023.jpg"
    }
  },
  CAN: {
    19: {
      name: "Alphonso Davies",
      position: "Defender",
      image: "https://upload.wikimedia.org/wikipedia/commons/8/87/Alphonso_Davies_2021.jpg"
    },
    9: {
      name: "Jonathan David",
      position: "Forward",
      image: "https://upload.wikimedia.org/wikipedia/commons/8/8e/Jonathan_David_2022.jpg"
    }
  },
  ARG: {
    10: {
      name: "Lionel Messi",
      position: "Forward",
      image: "https://upload.wikimedia.org/wikipedia/commons/b/b4/Lionel-Messi-Argentina-2022-FIFA-World-Cup_%28cropped%29.jpg"
    },
    11: {
      name: "Ángel Di María",
      position: "Forward",
      image: "https://upload.wikimedia.org/wikipedia/commons/d/db/%C3%81ngel_Di_Mar%C3%ADa_2022.jpg"
    },
    20: {
      name: "Lautaro Martínez",
      position: "Forward",
      image: "https://upload.wikimedia.org/wikipedia/commons/a/a3/Lautaro_Mart%C3%ADnez_2022.jpg"
    }
  },
  BRA: {
    10: {
      name: "Neymar Jr",
      position: "Forward",
      image: "https://upload.wikimedia.org/wikipedia/commons/b/bc/Neymar_Jr_2021.jpg"
    },
    7: {
      name: "Vinícius Júnior",
      position: "Forward",
      image: "https://upload.wikimedia.org/wikipedia/commons/f/f3/Vinicius_Junior_2021.jpg"
    }
  },
  FRA: {
    10: {
      name: "Kylian Mbappé",
      position: "Forward",
      image: "https://upload.wikimedia.org/wikipedia/commons/5/57/Kylian_Mbapp%C3%A9_2022.jpg"
    },
    7: {
      name: "Antoine Griezmann",
      position: "Forward",
      image: "https://upload.wikimedia.org/wikipedia/commons/7/7b/Antoine_Griezmann_2022.jpg"
    }
  },
  POR: {
    7: {
      name: "Cristiano Ronaldo",
      position: "Forward",
      image: "https://upload.wikimedia.org/wikipedia/commons/d/d7/Cristiano_Ronaldo_playing_for_Al_Nassr_FC_against_Persepolis_FC_at_Azadi_Stadium_19_September_2023_%28cropped%29.jpg"
    }
  },
  ENG: {
    9: {
      name: "Harry Kane",
      position: "Forward",
      image: "https://upload.wikimedia.org/wikipedia/commons/c/ce/Harry_Kane_2022.jpg"
    },
    7: {
      name: "Jude Bellingham",
      position: "Midfielder",
      image: "https://upload.wikimedia.org/wikipedia/commons/f/fe/Jude_Bellingham_2024.jpg"
    }
  },
  NOR: {
    9: {
      name: "Erling Haaland",
      position: "Forward",
      image: "https://upload.wikimedia.org/wikipedia/commons/0/07/Erling_Haaland_2023.jpg"
    }
  }
};

// Regional name generators for generating remaining squad details
const NAMES_BY_REGION: Record<string, { first: string[]; last: string[] }> = {
  latam: {
    first: ["Lucas", "Mateo", "Santiago", "Matias", "Juan", "Luis", "Carlos", "Jose", "Diego", "Enzo", "Lautaro", "Julian", "Rodrigo", "Gabriel", "Tomas", "Franco", "Nicolas", "Sebastian", "Daniel", "Hugo"],
    last: ["Fernandez", "Rodriguez", "Gonzalez", "Martinez", "Gomez", "Diaz", "Alvarez", "Perez", "Romero", "Silva", "Sosa", "Torres", "Ramirez", "Medina", "Benitez", "Castro", "Ortiz", "Ruiz", "Morales", "Herrera"]
  },
  anglo: {
    first: ["James", "John", "Robert", "Michael", "William", "David", "Richard", "Joseph", "Thomas", "Charles", "Marcus", "Harry", "Jack", "Harry", "Declan", "Bukayo", "Jordan", "Mason", "John", "Kyle"],
    last: ["Smith", "Jones", "Taylor", "Brown", "Williams", "Wilson", "Johnson", "Davis", "Walker", "Stones", "Kane", "Pickford", "Rice", "Shaw", "Trippier", "Maguire", "Sterling", "Henderson", "Phillips", "Pope"]
  },
  euro: {
    first: ["Lukas", "Thomas", "Stefan", "Martin", "Andreas", "Christian", "Peter", "Jan", "Milan", "Luka", "Ivan", "Filip", "Dominik", "Mario", "Matej", "Nikola", "Josip", "Alexander", "David", "Erik"],
    last: ["Müller", "Schmidt", "Fischer", "Weber", "Meyer", "Wagner", "Becker", "Schulz", "Hoffmann", "Kovacic", "Modric", "Rakitic", "Perisic", "Brozovic", "Vida", "Lovren", "Vrsaljko", "Subasic", "Kalinic", "Livakovic"]
  },
  nordic: {
    first: ["Erling", "Martin", "Kristoffer", "Jonas", "Hakon", "Sander", "Alexander", "Mohamed", "Andreas", "Julian", "Marcus", "Emil", "Victor", "Robin", "Ludwig", "Albin", "Dejan", "Ken", "Filip", "Gustav"],
    last: ["Haaland", "Ødegaard", "Ajer", "Berge", "Sørloth", "Elyounoussi", "Meling", "Ryerson", "Nyland", "Lindelöf", "Olsen", "Augustinsson", "Ekdal", "Forsberg", "Kulusevski", "Quaison", "Isak", "Larsson", "Helander", "Krafth"]
  },
  african: {
    first: ["Moussa", "Cheikhou", "Idrissa", "Sadio", "Ismaïla", "Boulaye", "Kalidou", "Édouard", "Youssouf", "Amadou", "Seko", "Serge", "Franck", "Wilfried", "Nicolas", "Sofiane", "Riyad", "Islam", "Youcef", "Aissa"],
    last: ["Koulibaly", "Mendy", "Gueye", "Sarr", "Diallo", "Mané", "Dia", "Ciss", "Kouyaté", "Aurier", "Kessié", "Zaha", "Pépé", "Haller", "Sangaré", "Bailly", "Mahrez", "Slimani", "Bennacer", "Mandi"]
  },
  asia: {
    first: ["Wataru", "Daichi", "Junya", "Kaoru", "Takumi", "Kyogo", "Takefusa", "Maya", "Yuto", "Hiroki", "Min-jae", "Heung-min", "Gue-sung", "Jae-sung", "Woo-yeong", "Chang-hoon", "Young-gwon", "Jin-su", "Seung-gyu", "Hwang"],
    last: ["Endo", "Kamada", "Ito", "Mitoma", "Minamino", "Furuhashi", "Kubo", "Yoshida", "Nagatomo", "Sakai", "Kim", "Son", "Cho", "Lee", "Jung", "Kwon", "Hong", "Jo", "Gu", "Park"]
  },
  arabic: {
    first: ["Mohammed", "Salem", "Salman", "Yasser", "Abdulelah", "Feras", "Saud", "Abdulelah", "Sultan", "Ali", "Hassan", "Akram", "Almoez", "Karim", "Abdelkarim", "Bassam", "Rassim", "Youssef", "Sofiane", "Wahbi"],
    last: ["Al-Dawsari", "Al-Shahrani", "Al-Faraj", "Al-Malki", "Al-Brikan", "Abdulhamid", "Al-Amri", "Al-Ghanam", "Afif", "Ali", "Boudiaf", "Hassan", "Al-Haydos", "Khoukhi", "Al-Rawi", "Msakni", "Khazri", "Bronn", "Talbi", "Skhiri"]
  }
};

const TEAM_REGIONS: Record<string, string> = {
  USA: "anglo", CAN: "anglo", ENG: "anglo", SCO: "anglo", NZL: "anglo", AUS: "anglo",
  MEX: "latam", ARG: "latam", BRA: "latam", COL: "latam", URU: "latam", ECU: "latam", PAR: "latam", PAN: "latam", HAI: "latam", CUW: "latam",
  ESP: "latam", POR: "latam", // Spanish / Portuguese names match latam well
  GER: "euro", AUT: "euro", SUI: "euro", BEL: "euro", NED: "euro", FRA: "euro", ITA: "euro",
  CRO: "euro", BIH: "euro", CZE: "euro", TUR: "euro", SWE: "nordic", NOR: "nordic",
  SEN: "african", CIV: "african", GHA: "african", COD: "african", RSA: "african", CPV: "african", ALG: "african",
  JPN: "asia", KOR: "asia", UZB: "asia",
  KSA: "arabic", IRQ: "arabic", JOR: "arabic", IRN: "arabic", QAT: "arabic", TUN: "arabic", MAR: "arabic", EGY: "arabic"
};

export function generateStickerCatalog(): StickerCatalogSeed[] {
  const catalog: StickerCatalogSeed[] = [];

  // 1. FWC Specials (1-5)
  const fwcSpecials = [
    "Escudo Holográfico Oficial",
    "Trofeo de la Copa Mundial FIFA 2026",
    "Mascota Oficial",
    "Balón Oficial del Torneo",
    "Lema del Torneo - We Are 26"
  ];
  fwcSpecials.forEach((name, i) => {
    catalog.push({
      code: `FWC ${i + 1}`,
      sectionCode: "FWC-S",
      number: i + 1,
      name,
      position: "Special Badge",
      imageUrl: null,
      isSpecial: true
    });
  });

  // 2. FWC Host Cities & Stadiums (6-20)
  const stadiums = [
    "Estadio Azteca (CDMX, México)",
    "MetLife Stadium (New York/New Jersey, USA)",
    "BC Place (Vancouver, Canada)",
    "SoFi Stadium (Los Angeles, USA)",
    "Estadio BBVA (Monterrey, México)",
    "Mercedes-Benz Stadium (Atlanta, USA)",
    "Hard Rock Stadium (Miami, USA)",
    "Gillette Stadium (Boston, USA)",
    "Lincoln Financial Field (Philadelphia, USA)",
    "Lumen Field (Seattle, USA)",
    "Levi's Stadium (San Francisco, USA)",
    "AT&T Stadium (Dallas, USA)",
    "Arrowhead Stadium (Kansas City, USA)",
    "NRG Stadium (Houston, USA)",
    "BMO Field (Toronto, Canada)"
  ];
  stadiums.forEach((name, i) => {
    catalog.push({
      code: `FWC ${i + 6}`,
      sectionCode: "FWC-H",
      number: i + 6,
      name,
      position: "Stadium",
      imageUrl: null,
      isSpecial: true
    });
  });

  // 3. 48 National Teams (20 stickers each)
  const teamSections = SECTIONS.filter(s => s.type === "team");
  teamSections.forEach(team => {
    // Sticker 1: Team Crest/Badge (Special)
    catalog.push({
      code: `${team.code} 1`,
      sectionCode: team.code,
      number: 1,
      name: `Escudo de ${team.name}`,
      position: "Badge",
      imageUrl: null,
      isSpecial: true
    });

    // Sticker 2: Team Photo (Regular)
    catalog.push({
      code: `${team.code} 2`,
      sectionCode: team.code,
      number: 2,
      name: `Foto de Equipo - ${team.name}`,
      position: "Team Photo",
      imageUrl: null,
      isSpecial: false
    });

    // Stickers 3-20: Players (18 total)
    const region = TEAM_REGIONS[team.code] || "latam";
    const lists = NAMES_BY_REGION[region];

    for (let num = 3; num <= 20; num++) {
      let pName = "";
      let pPos = "";
      let pImg: string | null = null;

      // Check if we have a curated star player override
      if (STAR_PLAYERS[team.code] && STAR_PLAYERS[team.code][num]) {
        const star = STAR_PLAYERS[team.code][num];
        pName = star.name;
        pPos = star.position;
        pImg = star.image;
      } else {
        // Determine position based on sticker number range
        // 3-4 Goalkeepers, 5-10 Defenders, 11-15 Midfielders, 16-20 Forwards
        if (num <= 4) {
          pPos = "Goalkeeper";
        } else if (num <= 10) {
          pPos = "Defender";
        } else if (num <= 15) {
          pPos = "Midfielder";
        } else {
          pPos = "Forward";
        }

        // Generate semi-random deterministic name based on team code & sticker number
        const hash1 = (team.code.charCodeAt(0) + team.code.charCodeAt(1) + team.code.charCodeAt(2) + num) % lists.first.length;
        const hash2 = (team.code.charCodeAt(0) * num + team.code.charCodeAt(2)) % lists.last.length;
        
        const initial = lists.first[hash1].substring(0, 1);
        pName = `${initial}. ${lists.last[hash2]}`;
      }

      catalog.push({
        code: `${team.code} ${num}`,
        sectionCode: team.code,
        number: num,
        name: pName,
        position: pPos,
        imageUrl: pImg,
        isSpecial: false
      });
    }
  });

  // 4. Coca-Cola Promos (1-12)
  for (let i = 1; i <= 12; i++) {
    catalog.push({
      code: `C${i}`,
      sectionCode: "COKE",
      number: i,
      name: `Coca-Cola Promo C${i}`,
      position: "Coca-Cola Special",
      imageUrl: null,
      isSpecial: true
    });
  }

  return catalog;
}
