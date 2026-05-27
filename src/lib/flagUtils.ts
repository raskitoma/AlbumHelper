export const DEFAULT_FIFA_ISO_MAP: Record<string, string> = {
  // Group A
  "USA": "us",
  "CUW": "cw",
  "ALG": "dz",
  "NOR": "no",

  // Group B
  "MEX": "mx",
  "HAI": "ht",
  "CIV": "ci",
  "SWE": "se",

  // Group C
  "CAN": "ca",
  "PAN": "pa",
  "RSA": "za",
  "TUR": "tr",

  // Group D
  "ARG": "ar",
  "ECU": "ec",
  "CPV": "cv",
  "NED": "nl",

  // Group E
  "BRA": "br",
  "PAR": "py",
  "COD": "cd",
  "BEL": "be",

  // Group F
  "COL": "co",
  "URU": "uy",
  "EGY": "eg",
  "CRO": "hr",

  // Group G
  "JPN": "jp",
  "UZB": "uz",
  "SEN": "sn",
  "FRA": "fr",

  // Group H
  "KOR": "kr",
  "IRQ": "iq",
  "TUN": "tn",
  "ENG": "gb-eng",

  // Group I
  "AUS": "au",
  "JOR": "jo",
  "GHA": "gh",
  "ESP": "es",

  // Group J
  "IRN": "ir",
  "QAT": "qa",
  "MAR": "ma",
  "POR": "pt",

  // Group K
  "KSA": "sa",
  "NZL": "nz",
  "GER": "de",
  "SUI": "ch",

  // Group L
  "AUT": "at",
  "BIH": "ba",
  "CZE": "cz",
  "SCO": "gb-sct"
};

/**
 * Returns the URL of the flag image using FlagCDN.
 * Falls back to null if no valid ISO mapping is provided.
 */
export function getFlagImgUrl(isoCode: string | null | undefined): string | null {
  if (!isoCode) return null;
  const cleanCode = isoCode.trim().toLowerCase();
  if (!cleanCode) return null;
  return `https://flagcdn.com/w40/${cleanCode}.png`;
}
