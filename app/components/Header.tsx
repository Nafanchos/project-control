"use client";

import { signOut } from "next-auth/react";
import Link from "next/link";
import { useEffect, useState } from "react";

type SessionUser = {
  email?: string | null;
  name?: string | null;
  role?: string;
  tenantId?: string | null;
};

export default function Header() {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [tenantName, setTenantName] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/auth/session")
      .then((r) => r.json())
      .then(async (session) => {
        setUser(session?.user ?? null);

        if (session?.user?.tenantId) {
          const res = await fetch("/api/tenant/me");
          if (res.ok) {
            const data = await res.json();
            setTenantName(data?.name ?? null);
          }
        }
      });
  }, []);

  function displayUser(): string {
    if (!user) return "";
    if (user.name?.trim()) return user.name;
    return user.email ?? "";
  }

  return (
    <header className="border-b bg-white">
      <div className="max-w-6xl mx-auto px-6 py-3 flex justify-between items-center">
        <Link href="/" className="font-bold text-lg">
          {tenantName ?? "Project Control"}
        </Link>

        <div className="flex items-center gap-4 text-sm">
          {user?.email && (
            <Link
              href="/settings/profile"
              className="text-gray-600 hover:text-gray-900"
              title={user.email ?? ""}
            >
              {displayUser()}
              {user.role === "SUPER_ADMIN" && (
                <span className="ml-2 text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded">
                  супер-админ
                </span>
              )}
              {user.role === "ADMIN" && (
                <span className="ml-2 text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded">
                  админ
                </span>
              )}
            </Link>
          )}

          {user?.role === "SUPER_ADMIN" ? (
            <Link href="/superadmin" className="text-blue-600 hover:underline">
              Компании
            </Link>
          ) : (
            user && (
              <>
                <Link
                  href="/workspace"
                  className="text-blue-600 hover:underline"
                >
                  Заказчики
                </Link>
                {user.role === "ADMIN" && (
                  <Link
                    href="/settings/users"
                    className="text-blue-600 hover:underline"
                  >
                    Сотрудники
                  </Link>
                )}
              </>
            )
          )}

          <button
            onClick={() => signOut({ callbackUrl: "/login" })}
            className="border px-3 py-1 rounded hover:bg-gray-100"
          >
            Выйти
          </button>
        </div>
      </div>
    </header>
  );
}