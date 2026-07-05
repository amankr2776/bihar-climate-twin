// 38 Bihar districts with approximate centroid coordinates and population.
// Used for the district-level choropleth and synthetic block subdivisions.
export type District = {
  id: string;
  name: string;
  lat: number;
  lng: number;
  population: number; // approx census 2011 (thousands)
  region: "north" | "south" | "central" | "east" | "west";
  kosiBasin: boolean;
};

export const DISTRICTS: District[] = [
  { id: "araria", name: "Araria", lat: 26.15, lng: 87.52, population: 2811, region: "north", kosiBasin: true },
  { id: "arwal", name: "Arwal", lat: 25.25, lng: 84.68, population: 700, region: "south", kosiBasin: false },
  { id: "aurangabad", name: "Aurangabad", lat: 24.75, lng: 84.37, population: 2540, region: "south", kosiBasin: false },
  { id: "banka", name: "Banka", lat: 24.88, lng: 86.92, population: 2034, region: "south", kosiBasin: false },
  { id: "begusarai", name: "Begusarai", lat: 25.42, lng: 86.13, population: 2970, region: "central", kosiBasin: false },
  { id: "bhagalpur", name: "Bhagalpur", lat: 25.24, lng: 86.98, population: 3037, region: "east", kosiBasin: true },
  { id: "bhojpur", name: "Bhojpur", lat: 25.55, lng: 84.53, population: 2728, region: "west", kosiBasin: false },
  { id: "buxar", name: "Buxar", lat: 25.57, lng: 83.98, population: 1706, region: "west", kosiBasin: false },
  { id: "darbhanga", name: "Darbhanga", lat: 26.15, lng: 85.9, population: 3937, region: "north", kosiBasin: true },
  { id: "east-champaran", name: "East Champaran", lat: 26.65, lng: 84.9, population: 5099, region: "north", kosiBasin: false },
  { id: "gaya", name: "Gaya", lat: 24.78, lng: 85.0, population: 4391, region: "south", kosiBasin: false },
  { id: "gopalganj", name: "Gopalganj", lat: 26.47, lng: 84.43, population: 2562, region: "north", kosiBasin: false },
  { id: "jamui", name: "Jamui", lat: 24.93, lng: 86.22, population: 1760, region: "south", kosiBasin: false },
  { id: "jehanabad", name: "Jehanabad", lat: 25.21, lng: 84.98, population: 1125, region: "south", kosiBasin: false },
  { id: "kaimur", name: "Kaimur", lat: 25.05, lng: 83.6, population: 1626, region: "west", kosiBasin: false },
  { id: "katihar", name: "Katihar", lat: 25.55, lng: 87.58, population: 3071, region: "east", kosiBasin: true },
  { id: "khagaria", name: "Khagaria", lat: 25.5, lng: 86.47, population: 1666, region: "central", kosiBasin: true },
  { id: "kishanganj", name: "Kishanganj", lat: 26.1, lng: 87.95, population: 1690, region: "north", kosiBasin: true },
  { id: "lakhisarai", name: "Lakhisarai", lat: 25.17, lng: 86.08, population: 1000, region: "central", kosiBasin: false },
  { id: "madhepura", name: "Madhepura", lat: 25.92, lng: 86.79, population: 2001, region: "north", kosiBasin: true },
  { id: "madhubani", name: "Madhubani", lat: 26.35, lng: 86.07, population: 4487, region: "north", kosiBasin: true },
  { id: "munger", name: "Munger", lat: 25.37, lng: 86.47, population: 1367, region: "central", kosiBasin: false },
  { id: "muzaffarpur", name: "Muzaffarpur", lat: 26.12, lng: 85.4, population: 4778, region: "north", kosiBasin: false },
  { id: "nalanda", name: "Nalanda", lat: 25.13, lng: 85.44, population: 2872, region: "central", kosiBasin: false },
  { id: "nawada", name: "Nawada", lat: 24.88, lng: 85.53, population: 2216, region: "south", kosiBasin: false },
  { id: "patna", name: "Patna", lat: 25.61, lng: 85.14, population: 5838, region: "central", kosiBasin: false },
  { id: "purnia", name: "Purnia", lat: 25.78, lng: 87.47, population: 3264, region: "east", kosiBasin: true },
  { id: "rohtas", name: "Rohtas", lat: 24.95, lng: 84.02, population: 2959, region: "west", kosiBasin: false },
  { id: "saharsa", name: "Saharsa", lat: 25.88, lng: 86.6, population: 1900, region: "north", kosiBasin: true },
  { id: "samastipur", name: "Samastipur", lat: 25.86, lng: 85.78, population: 4261, region: "central", kosiBasin: false },
  { id: "saran", name: "Saran", lat: 25.92, lng: 84.83, population: 3951, region: "west", kosiBasin: false },
  { id: "sheikhpura", name: "Sheikhpura", lat: 25.14, lng: 85.85, population: 636, region: "central", kosiBasin: false },
  { id: "sheohar", name: "Sheohar", lat: 26.52, lng: 85.29, population: 656, region: "north", kosiBasin: false },
  { id: "sitamarhi", name: "Sitamarhi", lat: 26.6, lng: 85.48, population: 3423, region: "north", kosiBasin: false },
  { id: "siwan", name: "Siwan", lat: 26.22, lng: 84.36, population: 3330, region: "north", kosiBasin: false },
  { id: "supaul", name: "Supaul", lat: 26.13, lng: 86.6, population: 2229, region: "north", kosiBasin: true },
  { id: "vaishali", name: "Vaishali", lat: 25.68, lng: 85.36, population: 3495, region: "central", kosiBasin: false },
  { id: "west-champaran", name: "West Champaran", lat: 26.9, lng: 84.4, population: 3935, region: "north", kosiBasin: false },
];

export const BIHAR_BOUNDS: [[number, number], [number, number]] = [
  [24.3, 83.3],
  [27.55, 88.3],
];
