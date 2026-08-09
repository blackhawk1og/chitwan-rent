export const DEFAULT_FILTERS = {
  availableOnly: false,
  bhk: [], // array of ints; 5 represents "5+"
  rentMin: "",
  rentMax: "",
  area: "all",
  furnishing: null, // 'furnished' | 'unfurnished' | null
  gated: null, // 'gated' | 'not_gated' | null
  postedWithin: "all", // '7' | '30' | '90' | '180' | 'all'
  nearBusRoute: false,
};

export function buildFlatsQueryParams(filters) {
  const params = new URLSearchParams();
  if (filters.availableOnly) params.set("status", "available");
  if (filters.bhk?.length) params.set("bhk", filters.bhk.join(","));
  if (filters.rentMin) params.set("rent_min", filters.rentMin);
  if (filters.rentMax) params.set("rent_max", filters.rentMax);
  if (filters.area && filters.area !== "all") params.set("area", filters.area);
  if (filters.furnishing) params.set("furnishing", filters.furnishing);
  if (filters.gated) params.set("gated", filters.gated);
  if (filters.postedWithin && filters.postedWithin !== "all") {
    params.set("posted_within", filters.postedWithin);
  }
  if (filters.nearBusRoute) params.set("near_bus_route", "true");
  return params;
}

export function countActiveFilters(filters) {
  let count = 0;
  if (filters.availableOnly) count++;
  if (filters.bhk?.length) count++;
  if (filters.rentMin || filters.rentMax) count++;
  if (filters.area && filters.area !== "all") count++;
  if (filters.furnishing) count++;
  if (filters.gated) count++;
  if (filters.postedWithin && filters.postedWithin !== "all") count++;
  if (filters.nearBusRoute) count++;
  return count;
}
