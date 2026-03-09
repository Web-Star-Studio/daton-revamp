import type { SVGProps } from "react";

type IconProps = SVGProps<SVGSVGElement>;

function joinClasses(...values: Array<string | undefined>) {
  return values.filter(Boolean).join(" ");
}

function Svg({ children, className, ...props }: IconProps) {
  return (
    <svg
      aria-hidden="true"
      className={joinClasses("app-symbol-icon", className)}
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={1.7}
      viewBox="0 0 24 24"
      {...props}
    >
      {children}
    </svg>
  );
}

export function MaterialIcon({
  icon,
  ...props
}: IconProps & {
  icon: string;
}) {
  switch (icon) {
    case "space_dashboard":
      return (
        <Svg {...props}>
          <rect x="3.5" y="3.5" width="7" height="7" rx="1.6" />
          <rect x="13.5" y="3.5" width="7" height="7" rx="1.6" />
          <rect x="3.5" y="13.5" width="7" height="7" rx="1.6" />
          <rect x="13.5" y="13.5" width="7" height="7" rx="1.6" />
        </Svg>
      );
    case "store":
      return (
        <Svg {...props}>
          <path d="M4.5 9.5h15" />
          <path d="M6 9.5V18.5H18V9.5" />
          <path d="M5.5 9.5L7 5.5h10l1.5 4" />
          <path d="M10 13h4" />
        </Svg>
      );
    case "account_tree":
      return (
        <Svg {...props}>
          <circle cx="6" cy="6" r="2" />
          <circle cx="18" cy="6" r="2" />
          <circle cx="12" cy="18" r="2" />
          <path d="M8 6h8" />
          <path d="M12 8v6" />
          <path d="M12 14h0" />
        </Svg>
      );
    case "groups":
      return (
        <Svg {...props}>
          <circle cx="9" cy="9" r="3" />
          <circle cx="17" cy="10.5" r="2.5" />
          <path d="M4.8 18.3c.8-2.2 2.8-3.5 5.7-3.5s4.9 1.3 5.7 3.5" />
          <path d="M15.7 17.7c.5-1.3 1.7-2 3.5-2" />
        </Svg>
      );
    case "apartment":
      return (
        <Svg {...props}>
          <path d="M4.5 19.5h15" />
          <path d="M6.5 19.5v-11h11v11" />
          <path d="M9 11.5h2" />
          <path d="M13 11.5h2" />
          <path d="M9 14.5h2" />
          <path d="M13 14.5h2" />
          <path d="M10.5 19.5v-2.8h3v2.8" />
          <path d="M8 8.5V5.5h8v3" />
        </Svg>
      );
    case "notifications":
      return (
        <Svg {...props}>
          <path d="M6.5 9a5.5 5.5 0 0 1 11 0c0 4.6 1.9 6.8 2.5 7.5H4c.6-.7 2.5-2.9 2.5-7.5Z" />
          <path d="M10.4 19a1.9 1.9 0 0 0 3.2 0" />
        </Svg>
      );
    case "left_panel_open":
      return (
        <Svg {...props}>
          <rect x="3.5" y="4" width="17" height="16" rx="2.5" />
          <path d="M9 4v16" />
          <path d="m12.5 12 3-3" />
          <path d="m12.5 12 3 3" />
        </Svg>
      );
    case "forum":
      return (
        <Svg {...props}>
          <path d="M4.5 6.5a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-5l-3.5 3v-3H6.5a2 2 0 0 1-2-2z" />
          <path d="M9 8.5h3.5" />
          <path d="M9 11h5.5" />
          <path d="M16.5 9h1a2 2 0 0 1 2 2v5l-2.5-2H15" />
        </Svg>
      );
    case "close":
      return (
        <Svg {...props}>
          <path d="m6 6 12 12" />
          <path d="M18 6 6 18" />
        </Svg>
      );
    case "keyboard_arrow_down":
      return (
        <Svg {...props}>
          <path d="m7 10 5 5 5-5" />
        </Svg>
      );
    case "download":
      return (
        <Svg {...props}>
          <path d="M12 4.5v10" />
          <path d="m8.5 11 3.5 3.5 3.5-3.5" />
          <path d="M5 18.5h14" />
        </Svg>
      );
    case "upload":
      return (
        <Svg {...props}>
          <path d="M12 19.5v-10" />
          <path d="m8.5 13 3.5-3.5 3.5 3.5" />
          <path d="M5 5.5h14" />
        </Svg>
      );
    case "edit":
      return (
        <Svg {...props}>
          <path d="m4.5 19.5 3.6-.8L18 8.8 15.2 6 5.3 15.9l-.8 3.6Z" />
          <path d="m13.8 7.3 2.9 2.9" />
        </Svg>
      );
    case "search":
      return (
        <Svg {...props}>
          <circle cx="11" cy="11" r="5.5" />
          <path d="m15.2 15.2 4.3 4.3" />
        </Svg>
      );
    case "filter_list":
      return (
        <Svg {...props}>
          <path d="M5 7h14" />
          <path d="M8 12h8" />
          <path d="M11 17h2" />
        </Svg>
      );
    case "content_copy":
      return (
        <Svg {...props}>
          <rect x="8" y="8" width="10" height="12" rx="2" />
          <path d="M6.5 15.5H6A2.5 2.5 0 0 1 3.5 13V6A2.5 2.5 0 0 1 6 3.5h7A2.5 2.5 0 0 1 15.5 6v.5" />
        </Svg>
      );
    case "storefront":
      return (
        <Svg {...props}>
          <path d="M4.5 10h15" />
          <path d="M6 10v8.5h12V10" />
          <path d="M5.5 10 7 5.5h10l1.5 4.5" />
          <path d="M9.5 18.5V14h5v4.5" />
        </Svg>
      );
    case "more_horiz":
      return (
        <Svg {...props}>
          <circle cx="6" cy="12" r="1.2" fill="currentColor" stroke="none" />
          <circle cx="12" cy="12" r="1.2" fill="currentColor" stroke="none" />
          <circle cx="18" cy="12" r="1.2" fill="currentColor" stroke="none" />
        </Svg>
      );
    case "domain":
      return (
        <Svg {...props}>
          <path d="M4.5 19.5h15" />
          <path d="M6 19.5V7.5h12v12" />
          <path d="M9 10.5h2" />
          <path d="M13 10.5h2" />
          <path d="M9 13.5h2" />
          <path d="M13 13.5h2" />
        </Svg>
      );
    case "location_on":
      return (
        <Svg {...props}>
          <path d="M12 20s5-4.6 5-9a5 5 0 1 0-10 0c0 4.4 5 9 5 9Z" />
          <circle cx="12" cy="11" r="1.8" />
        </Svg>
      );
    case "badge":
      return (
        <Svg {...props}>
          <rect x="4.5" y="5.5" width="15" height="13" rx="2.5" />
          <circle cx="9" cy="11" r="1.7" />
          <path d="M12.2 15c-.6-1.5-1.8-2.2-3.2-2.2S6.4 13.5 5.8 15" />
          <path d="M13.5 10h3" />
          <path d="M13.5 13h3" />
        </Svg>
      );
    case "account_balance":
      return (
        <Svg {...props}>
          <path d="M4 9.5 12 5l8 4.5" />
          <path d="M5.5 9.5h13" />
          <path d="M7 9.5v6.5" />
          <path d="M12 9.5v6.5" />
          <path d="M17 9.5v6.5" />
          <path d="M4.5 18h15" />
        </Svg>
      );
    case "error":
      return (
        <Svg {...props}>
          <circle cx="12" cy="12" r="8" />
          <path d="M12 8v5" />
          <circle cx="12" cy="16.5" r="0.9" fill="currentColor" stroke="none" />
        </Svg>
      );
    case "warning":
      return (
        <Svg {...props}>
          <path d="M12 5.5 19 18.5H5z" />
          <path d="M12 10v3.7" />
          <circle cx="12" cy="16.2" r="0.9" fill="currentColor" stroke="none" />
        </Svg>
      );
    case "star_outline":
      return (
        <Svg {...props}>
          <path d="m12 4.8 2.2 4.5 5 .7-3.6 3.5.9 5-4.5-2.4-4.5 2.4.9-5-3.6-3.5 5-.7Z" />
        </Svg>
      );
    case "payments":
      return (
        <Svg {...props}>
          <rect x="4.5" y="6.5" width="15" height="11" rx="2.5" />
          <path d="M4.5 10h15" />
          <path d="M9.5 14h2.5" />
          <path d="M14 14h1.5" />
        </Svg>
      );
    case "arrow_forward":
      return (
        <Svg {...props}>
          <path d="M5 12h14" />
          <path d="m13 7 5 5-5 5" />
        </Svg>
      );
    default:
      return (
        <Svg {...props}>
          <circle cx="12" cy="12" r="8" />
        </Svg>
      );
  }
}

export function DashboardIcon(props: IconProps) {
  return <MaterialIcon icon="space_dashboard" {...props} />;
}

export function BranchesIcon(props: IconProps) {
  return <MaterialIcon icon="store" {...props} />;
}

export function OrganizationIcon(props: IconProps) {
  return <MaterialIcon icon="account_tree" {...props} />;
}

export function SocialIcon(props: IconProps) {
  return <MaterialIcon icon="groups" {...props} />;
}

export function BellIcon(props: IconProps) {
  return <MaterialIcon icon="notifications" {...props} />;
}

export function SidebarIcon(props: IconProps) {
  return <MaterialIcon icon="left_panel_open" {...props} />;
}

export function AiChatIcon(props: IconProps) {
  return <MaterialIcon icon="forum" {...props} />;
}

export function CloseIcon(props: IconProps) {
  return <MaterialIcon icon="close" {...props} />;
}

export function ChevronDownIcon(props: IconProps) {
  return <MaterialIcon icon="keyboard_arrow_down" {...props} />;
}

export function ExportIcon(props: IconProps) {
  return <MaterialIcon icon="download" {...props} />;
}

export function EditIcon(props: IconProps) {
  return <MaterialIcon icon="edit" {...props} />;
}

export function CopyIcon(props: IconProps) {
  return <MaterialIcon icon="content_copy" {...props} />;
}
