"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ClockIcon, HomeIcon, UserIcon, VaultIcon } from "@/components/icons";

const tabs = [
  { href: "/home", label: "Home", Icon: HomeIcon },
  { href: "/deadlines", label: "Deadlines", Icon: ClockIcon },
  { href: "/vault", label: "Vault", Icon: VaultIcon },
  { href: "/profile", label: "Profile", Icon: UserIcon },
];

export function TabBar() {
  const pathname = usePathname();

  return (
    <nav className="tabbar" aria-label="Bottom navigation">
      {tabs.map(({ href, label, Icon }) => {
        const active = pathname === href || pathname.startsWith(`${href}/`);
        return (
          <Link key={href} href={href} className={active ? "tab-item active" : "tab-item"}>
            <Icon className="tab-icon" />
            <span>{label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
