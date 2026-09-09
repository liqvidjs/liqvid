import * as stylex from "@stylexjs/stylex";
import Image from "next/image";

import { breakpoints, colors, spacing } from "#_/design/tokens.stylex.js";
import {
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuPopup,
  NavigationMenuPortal,
  NavigationMenuPositioner,
  NavigationMenuRoot,
  NavigationMenuTrigger,
  NavigationMenuViewport,
} from "#_/ui/NavigationMenu.js";
import { getTranslations } from "#_/utils/i18n.mjs";

import logo from "../../logo.png";

import type TranslationsJson from "./.translations/en.json";

type T = typeof TranslationsJson;

const styles = stylex.create({
  img: {
    height: 64,
    scale: {
      ":hover": 1.05,
      default: 1,
    },
    transition: "scale 200ms ease-in-out",
    width: 64,
  },
  link: {
    backgroundColor: colors.transparent,
  },
  list: {
    translate: {
      default: null,
      [breakpoints.desktop]: `0 ${spacing.lg}`,
    },
  },
  logo: {
    borderStyle: "none",
    cursor: "pointer",
    left: spacing.control,
    position: {
      default: null,
      [breakpoints.desktop]: "fixed",
    },
    top: spacing.control,
  },
});

export async function FloatingNav() {
  const t: T = await getTranslations<T>(import.meta.url);

  return (
    <NavigationMenuRoot>
      <NavigationMenuList>
        <NavigationMenuItem value="main">
          <NavigationMenuTrigger style={styles.logo}>
            <NavigationMenuLink href="." style={styles.link} title={t.docs}>
              <Image alt="" src={logo} {...stylex.props(styles.img)} />
            </NavigationMenuLink>
          </NavigationMenuTrigger>
          <NavigationMenuContent keepMounted style={styles.list}>
            <ul>
              <li>
                <NavigationMenuLink href="https://liqvidjs.org/docs/">
                  {t.docs}
                </NavigationMenuLink>
              </li>
              <li>
                <NavigationMenuLink href="https://liqvid.studio">
                  {t.studio}
                </NavigationMenuLink>
              </li>
            </ul>
          </NavigationMenuContent>
        </NavigationMenuItem>
      </NavigationMenuList>
      <NavigationMenuPortal>
        <NavigationMenuPositioner
          align="start"
          alignOffset={0}
          // collisionAvoidance={{ side: "none" }}
          // collisionPadding={{ bottom: 5, left: 20, right: 20, top: 5 }}
          side="bottom"
          sideOffset={0}
        >
          <NavigationMenuPopup>
            <NavigationMenuViewport />
          </NavigationMenuPopup>
        </NavigationMenuPositioner>
      </NavigationMenuPortal>
    </NavigationMenuRoot>
  );
}
