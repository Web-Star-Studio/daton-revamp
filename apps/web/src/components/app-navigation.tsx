"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { BranchesIcon, GridIcon, SettingsIcon } from "./app-icons";

type AppNavigationProps = {
  items: Array<{
    href: string;
    label: string;
  }>;
};

const iconByHref = {
  "/app": GridIcon,
  "/app/branches": BranchesIcon,
  "/app/settings/organization": SettingsIcon,
} as const;

export function AppNavigation({ items }: AppNavigationProps) {
  const pathname = usePathname();

  return (
    <nav aria-label="Ambiente" className="app-nav">
      {items.map((item) => {
        const isActive =
          pathname === item.href || (item.href !== "/app" && pathname.startsWith(`${item.href}/`));

        return (
          <Link
            aria-current={isActive ? "page" : undefined}
            className={`app-nav__link${isActive ? " app-nav__link--active" : ""}`}
            href={item.href}
            key={item.href}
          >
            <span className="app-nav__icon">
              {(() => {
                const Icon = iconByHref[item.href as keyof typeof iconByHref] ?? GridIcon;
                return <Icon />;
              })()}
            </span>
            <span className="app-nav__label">{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
