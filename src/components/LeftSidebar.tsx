"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

type NavItem = {
  href: string;
  label: string;
};

type NavGroup = {
  id: string;
  label: string;
  items: NavItem[];
};

const groups: NavGroup[] = [
  {
    id: "core",
    label: "Core",
    items: [
      { href: "/home", label: "Home" },
      { href: "/weekly-review", label: "Weekly Review" },
      { href: "/deadlines", label: "Reminders" },
      { href: "/tasks", label: "Tasks" },
      { href: "/vault", label: "Vault" },
      { href: "/profile", label: "Profile" },
    ],
  },
  {
    id: "checklists",
    label: "Checklists",
    items: [
      { href: "/study-permit", label: "Study checklist" },
      { href: "/pgwp", label: "PGWP checklist" },
      { href: "/risk", label: "PGWP Risk" },
      { href: "/crs", label: "CRS Calculator" },
    ],
  },
  {
    id: "account",
    label: "Account",
    items: [
      { href: "/notifications", label: "Notifications" },
      { href: "/pricing", label: "Pricing" },
      { href: "/contact", label: "Support" },
    ],
  },
];

export function LeftSidebar() {
  const pathname = usePathname();

  return (
    <aside className="left-nav" aria-label="App navigation">
      <div className="left-nav-head">
        <p className="left-nav-kicker">PaperPath</p>
        <h2>Navigation</h2>
      </div>

      <div className="left-nav-groups">
        {groups.map((group) => {
          const isGroupActive = group.items.some(
            ({ href }) => pathname === href || pathname.startsWith(`${href}/`),
          );

          return (
            <details key={group.id} className="left-nav-group" open={isGroupActive || group.id === "core"}>
              <summary>{group.label}</summary>
              <div className="left-nav-items">
                {group.items.map((item) => {
                  const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
                  return (
                    <Link key={item.href} href={item.href} className={isActive ? "left-nav-item active" : "left-nav-item"}>
                      <span className="left-nav-dot" aria-hidden />
                      <span>{item.label}</span>
                    </Link>
                  );
                })}
              </div>
            </details>
          );
        })}
      </div>
    </aside>
  );
}
