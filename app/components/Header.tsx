"use client";

import { signOut } from "next-auth/react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";

type SessionUser = {
  email?: string | null;
  name?: string | null;
  role?: string;
  tenantId?: string | null;
};

export default function Header() {
  const pathname = usePathname();
  const [user, setUser] = useState<SessionUser | null>(null);
  const [tenantName, setTenantName] = useState<string | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);

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

  // Закрываем меню при переходе на другую страницу
  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  function displayUser(): string {
    if (!user) return "";
    if (user.name?.trim()) return user.name;
    return user.email ?? "";
  }

  return (
    <header className="border-b bg-white relative z-30">
      <div className="max-w-6xl mx-auto px-4 md:px-6 py-3 flex justify-between items-center gap-3">
        {/* Название — слева */}
        <Link
          href="/"
          className="font-bold text-base md:text-lg truncate"
        >
          {tenantName ?? "Project Control"}
        </Link>

        {/* Десктоп: полное меню справа */}
        <div className="hidden md:flex items-center gap-4 text-sm">
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
                <Link href="/workspace" className="text-blue-600 hover:underline">
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

        {/* Мобильные: бургер */}
        <button
          onClick={() => setMenuOpen((v) => !v)}
          className="md:hidden flex items-center justify-center w-10 h-10 rounded hover:bg-gray-100"
          aria-label="Меню"
        >
          {menuOpen ? (
            <span className="text-xl leading-none">✕</span>
          ) : (
            <span className="text-xl leading-none">☰</span>
          )}
        </button>
      </div>

      {/* Мобильное выпадающее меню */}
      {menuOpen && (
        <div className="md:hidden border-t bg-white shadow-lg absolute left-0 right-0">
          <div className="px-4 py-2 border-b">
            <div className="text-xs text-gray-500">Вы вошли как</div>
            <div className="font-medium text-sm truncate">{displayUser()}</div>
            {user?.role === "SUPER_ADMIN" && (
              <span className="inline-block mt-1 text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded">
                супер-админ
              </span>
            )}
            {user?.role === "ADMIN" && (
              <span className="inline-block mt-1 text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded">
                админ
              </span>
            )}
          </div>

          <div className="flex flex-col text-sm">
            {user?.role === "SUPER_ADMIN" ? (
              <Link
                href="/superadmin"
                className="px-4 py-3 border-b hover:bg-gray-50"
              >
                Компании
              </Link>
            ) : (
              user && (
                <>
                  <Link
                    href="/workspace"
                    className="px-4 py-3 border-b hover:bg-gray-50"
                  >
                    Заказчики
                  </Link>
                  {user.role === "ADMIN" && (
                    <Link
                      href="/settings/users"
                      className="px-4 py-3 border-b hover:bg-gray-50"
                    >
                      Сотрудники
                    </Link>
                  )}
                </>
              )
            )}
            <Link
              href="/settings/profile"
              className="px-4 py-3 border-b hover:bg-gray-50"
            >
              Профиль
            </Link>
            <button
              onClick={() => signOut({ callbackUrl: "/login" })}
              className="px-4 py-3 text-left text-red-600 hover:bg-red-50"
            >
              Выйти
            </button>
          </div>
        </div>
      )}
    </header>
  );
}