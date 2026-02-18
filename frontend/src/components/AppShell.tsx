"use client";

import { useEffect, useState, useCallback } from "react";
import { usePathname, useRouter } from "next/navigation";
import Sidebar from "./Sidebar";
import ChatWidget from "./ChatWidget";
import CalculatorWidget from "./CalculatorWidget";
import GlobalSearch from "./GlobalSearch";
import NotificationCenter from "./NotificationCenter";

const PUBLIC_ROUTES = ["/login", "/register"];

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [status, setStatus] = useState<"loading" | "auth" | "public">(
    "loading",
  );
  const [collapsedSidebar, setCollapsedSidebar] = useState(true);
  const [calculatorOpen, setCalculatorOpen] = useState(false);

  const isPublic = PUBLIC_ROUTES.includes(pathname);

  const checkAuth = useCallback(() => {
    const token =
      typeof window !== "undefined" ? localStorage.getItem("token") : null;

    if (!token && !isPublic) {
      setStatus("loading");
      router.replace("/login");
      return;
    }

    if (token && isPublic) {
      setStatus("loading");
      router.replace("/");
      return;
    }

    if (token && !isPublic) {
      fetch("/api/auth/me", {
        headers: { Authorization: `Bearer ${token}` },
      })
        .then((res) => {
          if (res.ok) {
            setStatus("auth");
          } else {
            localStorage.removeItem("token");
            router.replace("/login");
          }
        })
        .catch(() => {
          localStorage.removeItem("token");
          router.replace("/login");
        });
    } else {
      setStatus("public");
    }
  }, [isPublic, router]);

  useEffect(() => {
    checkAuth();
  }, [pathname, checkAuth]);

  if (status === "loading") {
    return (
      <div
        className="flex items-center justify-center min-h-screen"
        style={{ background: "var(--bg-base)" }}
      >
        <div className="flex flex-col items-center gap-3">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center animate-pulse"
            style={{ background: "linear-gradient(135deg, #3366ff, #8b5cf6)" }}
          >
            <svg
              className="w-5 h-5 text-white"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>
          <div
            className="w-6 h-6 border-2 border-t-transparent rounded-full animate-spin"
            style={{
              borderColor: "var(--brand)",
              borderTopColor: "transparent",
            }}
          />
        </div>
      </div>
    );
  }

  if (status === "public") {
    return <>{children}</>;
  }

  return (
    <div className="flex min-h-screen" style={{ background: "var(--bg-base)" }}>
      <Sidebar
        collapsed={collapsedSidebar}
        setCollapsed={setCollapsedSidebar}
      />
      <main
        className="flex-1 flex flex-col min-h-screen pt-14 lg:pt-0 transition-[margin] duration-500 ease-in-out"
        style={{ marginLeft: collapsedSidebar ? "" : "" }}
      >
        {/* Top Bar */}
        <header
          className="sticky top-0 z-20 hidden lg:flex items-center justify-end gap-3 px-8 py-4"
          style={{
            background: "var(--bg-base)",
            borderBottom: "1px solid var(--border-subtle)",
          }}
        >
          <GlobalSearch />
          <NotificationCenter />
        </header>

        {/* Content */}
        <div
          className="flex-1 p-4 lg:px-8 lg:py-6"
          style={{
            marginLeft: collapsedSidebar ? "5rem" : "16.5rem",
            transition: "margin-left 400ms cubic-bezier(0.4, 0, 0.2, 1)",
          }}
        >
          {children}
        </div>
      </main>
      <ChatWidget />
      <CalculatorWidget isOpen={calculatorOpen} setIsOpen={setCalculatorOpen} />
    </div>
  );
}
