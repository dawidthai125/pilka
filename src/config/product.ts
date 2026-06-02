/** Football Club OS — produkt i autor systemu (SaaS multi-club). */
export const productConfig = {
  name: "Football Club OS",
  shortName: "FC OS",
  author: "Dawid Thai Thanh",
} as const;

export function formatProductAttribution(): string {
  return `${productConfig.name} · ${productConfig.author}`;
}

export function formatPublicSiteFooter(clubName: string, year = new Date().getFullYear()): string {
  return `© ${year} ${clubName} · ${formatProductAttribution()}`;
}
