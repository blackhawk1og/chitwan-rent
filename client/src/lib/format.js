export function formatRs(amount) {
  if (amount === null || amount === undefined) return "Rs. —";
  return `Rs. ${Number(amount).toLocaleString("en-IN")}`;
}

export function bhkLabel(bhk) {
  if (bhk === null || bhk === undefined) return "—";
  return bhk >= 5 ? "5+ BHK" : `${bhk}BHK`;
}
