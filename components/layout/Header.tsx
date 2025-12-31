"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { NAV_ITEMS } from "@/constants";

interface HeaderProps {
  lastUpdate: number | null;
}

export function Header({ lastUpdate }: HeaderProps) {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <header className="border-b border-gray-800 bg-black/50 backdrop-blur-sm">
      <div className="px-3 sm:px-6 py-3 sm:py-4 flex items-center justify-between">
        <div className="flex items-center gap-2 sm:gap-4">
          <Link href="/" className="text-lg sm:text-2xl font-bold">
            <span className="text-green-400">DDOS</span>ATLAS
            <span className="hidden sm:inline ml-3 text-sm font-normal text-gray-500">
              LIVE MAP
            </span>
          </Link>
        </div>
        
        {/* Mobile menu button */}
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="md:hidden p-2 text-gray-400 hover:text-white"
          aria-label="Toggle menu"
        >
          <svg
            className="w-6 h-6"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            {mobileMenuOpen ? (
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            ) : (
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 6h16M4 12h16M4 18h16"
              />
            )}
          </svg>
        </button>
        
        <div className="hidden md:block text-xs sm:text-sm text-gray-400">
          Last updated:{" "}
          {lastUpdate ? new Date(lastUpdate).toLocaleTimeString() : "N/A"}
        </div>
      </div>

      {/* Desktop navigation */}
      <nav className="hidden md:flex px-3 sm:px-6 gap-4 sm:gap-8 text-sm">
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

      {/* Mobile navigation */}
      {mobileMenuOpen && (
        <nav className="md:hidden px-3 py-3 space-y-1 border-t border-gray-800">
          {NAV_ITEMS.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileMenuOpen(false)}
                className={`block py-2 px-3 rounded-lg text-sm transition-colors ${
                  isActive
                    ? "bg-green-400/10 text-green-400"
                    : "text-gray-400 hover:bg-gray-800 hover:text-white"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
          <div className="pt-2 px-3 text-xs text-gray-500 border-t border-gray-800 mt-2">
            Last updated:{" "}
            {lastUpdate ? new Date(lastUpdate).toLocaleTimeString() : "N/A"}
          </div>
        </nav>
      )}
    </header>
  );
}
