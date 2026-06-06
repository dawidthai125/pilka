/** Active-state matching for dashboard sidebar links (pathname vs href). */
export function isDashboardNavItemActive(pathname: string, href: string): boolean {
  if (href === "/ai") {
    return pathname === "/ai" || pathname.startsWith("/ai/");
  }
  if (href === "/sponsors") {
    return pathname.startsWith("/sponsors") && !pathname.startsWith("/sponsors/portal");
  }
  if (href === "/finance") {
    return pathname.startsWith("/finance") && !pathname.startsWith("/finance/portal");
  }
  if (href === "/inventory") {
    return pathname.startsWith("/inventory") && !pathname.startsWith("/inventory/portal");
  }
  if (href === "/website") {
    return pathname.startsWith("/website");
  }
  if (href === "/integrations") {
    return pathname.startsWith("/integrations");
  }
  if (href === "/academy") {
    return pathname.startsWith("/academy");
  }
  if (href === "/video") {
    return pathname.startsWith("/video");
  }
  if (href === "/content") {
    return pathname.startsWith("/content");
  }
  if (href === "/league") {
    return pathname.startsWith("/league");
  }
  if (href === "/communication") {
    return pathname.startsWith("/communication");
  }
  if (href === "/attendance") {
    return pathname.startsWith("/attendance");
  }
  if (href === "/equipment") {
    return pathname.startsWith("/equipment") && !pathname.startsWith("/equipment/portal");
  }
  if (href === "/equipment/portal") {
    return pathname.startsWith("/equipment/portal");
  }
  if (href === "/injuries") {
    return pathname.startsWith("/injuries") && !pathname.startsWith("/injuries/portal");
  }
  if (href === "/injuries/portal") {
    return pathname.startsWith("/injuries/portal");
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}
