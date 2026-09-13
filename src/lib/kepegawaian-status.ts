export type KepegawaianStatus = "CPNS" | "PNS" | "PPPK" | "Non-ASN";

export function kepegawaianStatus(
  jenis: "asn" | "non_asn" | null | undefined,
  kedudukanHukum: string | null | undefined,
): KepegawaianStatus {
  if (jenis === "non_asn") return "Non-ASN";
  const text = (kedudukanHukum || "").toLowerCase();
  if (text.includes("cpns")) return "CPNS";
  if (text.includes("pppk") || text.includes("perjanjian kerja")) return "PPPK";
  return "PNS";
}
