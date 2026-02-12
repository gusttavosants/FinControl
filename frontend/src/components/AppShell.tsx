"use client";

import { useEffect, useState, useCallback } from "react";
import { usePathname, useRouter } from "next/navigation";
import Sidebar from "./Sidebar";
import ChatWidget from "./ChatWidget";
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
      <div className="flex items-center justify-center min-h-screen bg-slate-50 dark:bg-slate-900">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary-600" />
      </div>
    );
  }

  if (status === "public") {
    return <>{children}</>;
  }

  return (
    <div className="flex min-h-screen bg-slate-50 dark:bg-slate-900">
      <Sidebar
        collapsed={collapsedSidebar}
        setCollapsed={setCollapsedSidebar}
      />
      <main
        className={`flex-1 p-4 lg:p-8 pt-16 lg:pt-8 transition-[margin] duration-500 ease-in-out ${collapsedSidebar ? "lg:ml-20" : "lg:ml-64"}`}
      >
        <div className="mb-6 flex justify-end gap-3">
          <NotificationCenter />
          <GlobalSearch />
        </div>
        {children}
      </main>
      <ChatWidget />
    </div>
  );
}
