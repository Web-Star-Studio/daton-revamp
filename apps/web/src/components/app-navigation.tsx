"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import {
  BranchesIcon,
  ChevronDownIcon,
  DashboardIcon,
  OrganizationIcon,
  SocialIcon,
} from "./app-icons";

type NavigationItem = {
  href?: string;
  label: string;
  icon: "dashboard" | "branches" | "organization" | "social";
  children?: Array<{
    href: string;
    label: string;
  }>;
};

type AppNavigationProps = {
  items: NavigationItem[];
};

const iconByName = {
  dashboard: DashboardIcon,
  branches: BranchesIcon,
  organization: OrganizationIcon,
  social: SocialIcon,
} as const;

export function AppNavigation({ items }: AppNavigationProps) {
  const pathname = usePathname();
  const [openSubmenu, setOpenSubmenu] = useState<string | null>(null);
  const navRef = useRef<HTMLElement>(null);

  useEffect(() => {
    if (!openSubmenu) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (navRef.current && !navRef.current.contains(e.target as Node)) {
        setOpenSubmenu(null);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [openSubmenu]);

  return (
    <nav aria-label="Ambiente" className="app-nav" ref={navRef}>
      {items.map((item) => {
        const Icon = iconByName[item.icon];
        const childIsActive = item.children?.some(
          (child) =>
            pathname === child.href || pathname.startsWith(`${child.href}/`),
        );

        if (item.children?.length) {
          const isOpen = openSubmenu === item.label;

          return (
            <div
              className={`app-nav__item${isOpen ? " app-nav__item--open" : ""}`}
              key={item.label}
            >
              <button
                aria-expanded={isOpen}
                aria-haspopup="menu"
                className={`app-nav__trigger${childIsActive ? " app-nav__trigger--active" : ""}`}
                onClick={() =>
                  setOpenSubmenu((current) =>
                    current === item.label ? null : item.label,
                  )
                }
                type="button"
              >
                <span className="app-nav__icon">
                  <Icon />
                </span>
                <span className="app-nav__label">{item.label}</span>
                <span className="app-nav__caret" aria-hidden="true">
                  <ChevronDownIcon />
                </span>
              </button>
              <div className="app-nav__submenu" role="menu">
                <p className="app-nav__submenu-label">{item.label}</p>
                {item.children.map((child) => {
                  const isChildActive =
                    pathname === child.href ||
                    pathname.startsWith(`${child.href}/`);

                  return (
                    <Link
                      aria-current={isChildActive ? "page" : undefined}
                      className={`app-nav__submenu-link${isChildActive ? " app-nav__submenu-link--active" : ""}`}
                      href={child.href}
                      key={child.href}
                    >
                      <span className="app-nav__submenu-icon">
                        <Icon />
                      </span>
                      <span>{child.label}</span>
                    </Link>
                  );
                })}
              </div>
            </div>
          );
        }

        const isActive =
          item.href &&
          (pathname === item.href ||
            (item.href !== "/app" && pathname.startsWith(`${item.href}/`)));

        return (
          <Link
            aria-current={isActive ? "page" : undefined}
            className={`app-nav__link${isActive ? " app-nav__link--active" : ""}`}
            href={item.href ?? "/app"}
            key={item.label}
          >
            <span className="app-nav__icon">
              <Icon />
            </span>
            <span className="app-nav__label">{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
