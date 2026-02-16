"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";

type DrawerItem = {
  href: string;
  label: string;
};

type DrawerGroup = {
  title: string;
  items: DrawerItem[];
};

const groups: DrawerGroup[] = [
  {
    title: "Main",
    items: [
      { href: "/home", label: "Home" },
      { href: "/weekly-review", label: "Weekly Review" },
      { href: "/notifications", label: "Notification" },
    ],
  },
  {
    title: "Planning",
    items: [
      { href: "/study-permit", label: "Study Permit" },
      { href: "/pgwp", label: "PGWP" },
      { href: "/deadlines", label: "Timeline / Deadlines" },
      { href: "/tasks?category=pgwp", label: "Tasks (PGWP)" },
      { href: "/reminders/create", label: "Reminders" },
      { href: "/risk", label: "Risk" },
    ],
  },
  {
    title: "Account",
    items: [
      { href: "/vault", label: "Vault (Documents)" },
      { href: "/profile", label: "Settings / Profile" },
    ],
  },
];

export function LeftNavDrawer() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  const isActive = (href: string) => {
    const cleanHref = href.split("?")[0] ?? href;
    return pathname === cleanHref || pathname.startsWith(`${cleanHref}/`);
  };

  return (
    <div className="mobile-drawer-wrap">
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger asChild>
          <button type="button" className="mobile-drawer-trigger" aria-label="Open menu">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
              <path d="M4 7h16M4 12h16M4 17h16" />
            </svg>
          </button>
        </SheetTrigger>

        <SheetContent side="left" className="left-drawer-content">
          <div className="left-drawer-header">
            <span className="left-drawer-logo-mark" aria-hidden>
              PP
            </span>
            <div>
              <p className="left-drawer-app">PaperPath</p>
              <p className="left-drawer-sub">Technologies</p>
            </div>
          </div>

          <div className="left-drawer-groups">
            {groups.map((group) => (
              <section key={group.title} className="left-drawer-group" aria-label={group.title}>
                <p className="left-drawer-group-title">{group.title}</p>
                <div className="left-drawer-links">
                  {group.items.map((item) => (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setOpen(false)}
                      className={isActive(item.href) ? "left-drawer-link active" : "left-drawer-link"}
                    >
                      {item.label}
                    </Link>
                  ))}
                </div>
              </section>
            ))}
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
