import type { ClubTheme } from "@/lib/club/theme";
import { clubThemeToCssText } from "@/lib/club/theme";

export function ClubThemeStyles({ theme }: { theme: ClubTheme }) {
  return (
    <style
      dangerouslySetInnerHTML={{
        __html: `:root { ${clubThemeToCssText(theme)} }`,
      }}
    />
  );
}
