// Canonical Chitwan ward/tole/locality list — single source of truth shared
// by seed.js (random dummy-listing placement) and the /api/areas route
// (search typeahead + neighbourhood filter dropdown), so every seeded area
// name is always findable even before/without any flat actually posted
// there. Coordinates are approximate (dummy demo data), clustered around
// real Chitwan wards/municipalities.
export const AREAS = [
  { name: "Bharatpur-10", lat: 27.6633, lng: 84.4327, weight: 14 }, // Narayangarh / Bus Park — dense core
  { name: "Bharatpur-5", lat: 27.6469, lng: 84.4055, weight: 12 }, // Pulchowk
  { name: "Bharatpur-11", lat: 27.6395, lng: 84.4172, weight: 12 }, // Hospital Chowk
  { name: "Bharatpur-14", lat: 27.628, lng: 84.445, weight: 10 }, // Jugedi border
  { name: "Amarapuri", lat: 27.658, lng: 84.415, weight: 5 }, // Amarapuri Chowk, Bharatpur
  { name: "Ratnanagar", lat: 27.582, lng: 84.485, weight: 6 },
  { name: "Khairahani", lat: 27.61, lng: 84.34, weight: 6 },
  { name: "Jutpani", lat: 27.67, lng: 84.455, weight: 4 },
  { name: "Gitanagar", lat: 27.69, lng: 84.38, weight: 4 },
  { name: "Bagauda", lat: 27.695, lng: 84.45, weight: 3 },
  { name: "Kalika", lat: 27.56, lng: 84.25, weight: 2 },
  { name: "Rapti", lat: 27.63, lng: 84.28, weight: 2 },
  { name: "Shaktikhor", lat: 27.72, lng: 84.2, weight: 1 },
  { name: "Ichchhakamana", lat: 27.65, lng: 84.15, weight: 1 },
];
