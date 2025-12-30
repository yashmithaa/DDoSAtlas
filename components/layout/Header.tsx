"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { NAV_ITEMS } from "@/constants";

interface HeaderProps {
  lastUpdate: number | null;
}

export function Header({ lastUpdate }: HeaderProps) {
  const pathname = usePathname();

  return (
    <header className="border-b border-gray-800 bg-black/50 backdrop-blur-sm">
      <div className="px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/" className="text-2xl font-bold">
            <span className="text-green-400">DDOS</span>ATLAS
            <span className="ml-3 text-sm font-normal text-gray-500">
              LIVE MAP
            </span>
          </Link>
        </div>
        <div className="text-sm text-gray-400">
          Last updated:{" "}
          {lastUpdate ? new Date(lastUpdate).toLocaleTimeString() : "N/A"}
        </div>
      </div>

      <nav className="px-6 flex gap-8 text-sm">
        {NAV_ITEMS.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`pb-3 border-b-2 transition-colors ${
                isActive
                  ? "border-green-400 text-green-400"
                  : "border-transparent text-gray-400 hover:text-white"
              }`}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>
    </header>
  );
}
