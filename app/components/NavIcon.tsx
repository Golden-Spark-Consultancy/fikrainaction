/** Compact inline SVG icons for navbar categories. */
export function NavIcon({
  name,
  className = "nav-icon",
}: {
  name?: string;
  className?: string;
}) {
  const key = (name || "folder").toLowerCase();
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      width="16"
      height="16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      {iconPath(key)}
    </svg>
  );
}

function iconPath(key: string) {
  switch (key) {
    case "home":
      return (
        <>
          <path d="M3 10.5 12 3l9 7.5" />
          <path d="M5 9.5V21h14V9.5" />
        </>
      );
    case "blog":
      return (
        <>
          <path d="M5 4h14v16H5z" />
          <path d="M8 8h8M8 12h8M8 16h5" />
        </>
      );
    case "about":
      return (
        <>
          <circle cx="12" cy="12" r="9" />
          <path d="M12 10v6M12 7.5h.01" />
        </>
      );
    case "ai":
    case "spark":
      return (
        <>
          <path d="M12 3v3M12 18v3M3 12h3M18 12h3" />
          <path d="M6.5 6.5 8.5 8.5M15.5 15.5l2 2M17.5 6.5 15.5 8.5M8.5 15.5l-2 2" />
          <circle cx="12" cy="12" r="3.5" />
        </>
      );
    case "automation":
      return (
        <>
          <circle cx="6" cy="7" r="2.2" />
          <circle cx="18" cy="7" r="2.2" />
          <circle cx="12" cy="17" r="2.2" />
          <path d="M8 7h8M7.2 8.8 10.8 15M16.8 8.8 13.2 15" />
        </>
      );
    case "software":
      return (
        <>
          <rect x="3" y="4" width="18" height="14" rx="2" />
          <path d="M8 21h8M12 18v3" />
        </>
      );
    case "programming":
      return (
        <>
          <path d="M8 8 4 12l4 4" />
          <path d="M16 8l4 4-4 4" />
          <path d="M13 6 11 18" />
        </>
      );
    case "hardware":
    case "cpu":
      return (
        <>
          <rect x="7" y="7" width="10" height="10" rx="1.5" />
          <path d="M9 3v4M12 3v4M15 3v4M9 17v4M12 17v4M15 17v4M3 9h4M3 12h4M3 15h4M17 9h4M17 12h4M17 15h4" />
        </>
      );
    case "arduino":
      return (
        <>
          <rect x="3" y="7" width="18" height="10" rx="3" />
          <circle cx="8" cy="12" r="1.4" />
          <circle cx="13" cy="12" r="1.4" />
          <path d="M17 10v4" />
        </>
      );
    case "raspberry-pi":
    case "rpi":
      return (
        <>
          <path d="M12 4c2 2 2 4 0 6-2-2-2-4 0-6Z" />
          <path d="M8 8c2.2 1.4 2.5 3.5.8 5.5C6.6 12 6.4 10 8 8Z" />
          <path d="M16 8c-2.2 1.4-2.5 3.5-.8 5.5C17.4 12 17.6 10 16 8Z" />
          <path d="M9 15.5c1.4 2 3.6 3 3 0 .6 3 1.6 2 3 0" />
        </>
      );
    case "esp32":
    case "wifi":
      return (
        <>
          <path d="M5 10a9 9 0 0 1 14 0" />
          <path d="M8 13a5 5 0 0 1 8 0" />
          <circle cx="12" cy="17" r="1.4" />
        </>
      );
    case "tutorials":
    case "book":
      return (
        <>
          <path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v16H6.5A2.5 2.5 0 0 0 4 21.5Z" />
          <path d="M4 5.5V21.5" />
        </>
      );
    case "reviews":
    case "star":
      return (
        <path d="m12 3 2.4 5.4L20 9.2l-4 4.1.9 5.7L12 16.5 7.1 19l.9-5.7-4-4.1 5.6-.8L12 3Z" />
      );
    case "guides":
      return (
        <>
          <path d="M8 4h9l3 3v13H8z" />
          <path d="M17 4v3h3M11 12h5M11 16h5M11 8h2" />
        </>
      );
    case "folder":
    default:
      return (
        <>
          <path d="M3 7h6l2 2h10v10H3z" />
        </>
      );
  }
}

export const NAV_ICON_BY_ID: Record<string, string> = {
  home: "home",
  blog: "blog",
  about: "about",
  "ai-automation": "ai",
  ai: "ai",
  automation: "automation",
  "software-group": "software",
  software: "software",
  programming: "programming",
  "hardware-group": "hardware",
  hardware: "hardware",
  arduino: "arduino",
  rpi: "raspberry-pi",
  "raspberry-pi": "raspberry-pi",
  esp32: "esp32",
  guides: "guides",
  tutorials: "tutorials",
  reviews: "reviews",
};

export function iconForNavItem(id: string, explicit?: string) {
  return explicit || NAV_ICON_BY_ID[id] || "folder";
}
