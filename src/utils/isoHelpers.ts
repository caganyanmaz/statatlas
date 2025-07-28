import {iso31661} from 'iso-3166'
// Map of former country ISO3 codes to their successors
const formerCountryMap: Record<string, string[]> = {
  SUN: ["RUS", "UKR", "BLR", "LVA", "LTU", "EST", "MDA", "GEO", "ARM", "AZE", "KAZ", "KGZ", "TJK", "TKM", "UZB"],
  YUG: ["SRB", "HRV", "SVN", "MKD", "BIH", "MNE", "KOS"],
  CSK: ["CZE", "SVK"],
  // Add others if needed
};

// Breakup years of these former countries
const breakupYears: Record<string, number> = {
  SUN: 1991,
  YUG: 1992,
  CSK: 1993,
};

export function getInterpolatedValue(
  countryCode: string,
  dataMap: Record<string, number> // your year-specific country data values
) {
    if (countryCode in dataMap)
        return dataMap[countryCode];
    for (const [formerCode, successors] of Object.entries(formerCountryMap)) {
        if (successors.includes(countryCode)) {
            return dataMap[formerCode];
        }
    }
    return null;
}


const countryIdToCodeLookup = Array()

export function countryIdToCode(id: string) {
    return countryIdToCodeLookup[Number(id)]
}


function init() {
    for (const country of iso31661) {
        countryIdToCodeLookup[Number(country.numeric)] = country.alpha3;
    }
}


init();