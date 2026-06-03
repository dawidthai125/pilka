import { clubPublicPath } from "@/lib/tenant/club-public-routing";

export type PublicClubPaths = {
  home: string;
  aktualnosci: string;
  newsArticle: (slug: string) => string;
  druzyna: string;
  tabela: string;
  mecze: string;
  galeria: string;
  galleryAlbum: (slug: string) => string;
  kontakt: string;
  sponsorzy: string;
  kibic: string;
  akademia: string;
  path: (subpath: string) => string;
};

export function buildPublicClubPaths(clubSlug: string): PublicClubPaths {
  const root = clubPublicPath(clubSlug);
  return {
    home: root,
    aktualnosci: clubPublicPath(clubSlug, "/aktualnosci"),
    newsArticle: (slug: string) => clubPublicPath(clubSlug, `/aktualnosci/${slug}`),
    druzyna: clubPublicPath(clubSlug, "/druzyna"),
    tabela: clubPublicPath(clubSlug, "/tabela"),
    mecze: clubPublicPath(clubSlug, "/mecze"),
    galeria: clubPublicPath(clubSlug, "/galeria"),
    galleryAlbum: (slug: string) => clubPublicPath(clubSlug, `/galeria/${slug}`),
    kontakt: clubPublicPath(clubSlug, "/kontakt"),
    sponsorzy: clubPublicPath(clubSlug, "/sponsorzy"),
    kibic: clubPublicPath(clubSlug, "/kibic"),
    akademia: `${root}#akademia`,
    path: (subpath: string) => clubPublicPath(clubSlug, subpath),
  };
}

export function getPublicNavLinks(clubSlug: string) {
  const p = buildPublicClubPaths(clubSlug);
  return [
    { href: p.aktualnosci, label: "Aktualności" },
    { href: p.druzyna, label: "Kadra" },
    { href: p.akademia, label: "Akademia" },
    { href: p.mecze, label: "Mecze" },
    { href: p.galeria, label: "Galeria" },
    { href: p.kontakt, label: "Kontakt" },
  ] as const;
}
