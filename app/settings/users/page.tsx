"use client";

import { useEffect, useState } from "react";
import Header from "@/app/components/Header";

type User = {
  id: string;
  email: string;
  name: string | null;
  role: "SUPER_ADMIN" | "ADMIN" | "USER";
  mustChangePassword: boolean;
  createdAt: string;
};

const ROLE_LABELS: Record<string, string> = {
  SUPER_ADMIN: "супер-админ",
  ADMIN: "админ",
  USER: "пользователь",
};

const ROLE_COLORS: Record<string, string> = {
  SUPER_ADMIN: "bg-purple-100 text-purple-700",
  ADMIN: "bg-blue-100 text-blue-700",
  USER: "bg-gray-100 text-gray-700",
};

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  const [showForm, setShowForm] = useState(false);
  const [email, setEmail] = useState("");
  const [userName, setUserName] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<"ADMIN" | "USER">("USER");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [resetting, setResetting] = useState<User | null>(null);
  const [tempPassword, setTempPassword] = useState("");
  const [resettingSave, setResettingSave] = useState(false);
  const [resetError, setResetError] = useState<string | null>(null);

  async function loadUsers() {
    setLoading(true);
    const [usersRes, sessionRes] = await Promise.all([
      fetch("/api/tenant/users"),
      fetch("/api/auth/session").then((r) => r.json()),
    ]);
    const data = await usersRes.json();
    setUsers(Array.isArray(data) ? data : []);
    setCurrentUserId(sessionRes?.user?.id ?? null);
    setLoading(false);
  }

  useEffect(() => {
    loadUsers();
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);

    const res = await fetch("/api/tenant/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password, role, name: userName }),
    });

    setSaving(false);

    if (res.ok) {
      setEmail("");
      setUserName("");
      setPassword("");
      setRole("USER");
      setShowForm(false);
      loadUsers();
    } else {
      const data = await res.json();
      setError(
        typeof data.error === "string"
          ? data.error
          : "Ошибка при создании пользователя"
      );
    }
  }

  async function handleDelete(userId: string) {
    if (!confirm("Удалить пользователя?")) return;
    const res = await fetch(`/api/tenant/users/${userId}`, {
      method: "DELETE",
    });
    if (res.ok) {
      loadUsers();
    } else {
      const data = await res.json();
      alert(typeof data.error === "string" ? data.error : "Ошибка");
    }
  }

  function openReset(u: User) {
    setResetting(u);
    setTempPassword("");
    setResetError(null);
  }

  async function handleReset() {
    if (!resetting) return;
    if (tempPassword.length < 6) {
      setResetError("Пароль должен быть не короче 6 символов");
      return;
    }
    setResettingSave(true);
    setResetError(null);

    const res = await fetch(
      `/api/tenant/users/${resetting.id}/reset-password`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ newPassword: tempPassword }),
      }
    );

    setResettingSave(false);

    if (res.ok) {
      alert(
        `Пароль для ${resetting.name?.trim() || resetting.email} успешно сброшен.\n\nПередайте сотруднику временный пароль: ${tempPassword}\n\nПри следующем входе он должен будет сменить его.`
      );
      setResetting(null);
      setTempPassword("");
      loadUsers();
    } else {
      const data = await res.json().catch(() => ({}));
      setResetError(
        typeof data.error === "string" ? data.error : "Ошибка сброса"
      );
    }
  }

  return (
    <>
      <Header />
      <div className="max-w-4xl mx-auto p-4 md:p-6">
        <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-3 mb-6">
          <h1 className="text-xl md:text-2xl font-bold">
            Сотрудники компании
          </h1>
          <button
            onClick={() => setShowForm((v) => !v)}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded text-sm md:text-base"
          >
            {showForm ? "Отмена" : "+ Добавить сотрудника"}
          </button>
        </div>

        {showForm && (
          <form
            onSubmit={handleSubmit}
            className="bg-gray-50 border rounded p-4 mb-6 space-y-3"
          >
            <h2 className="font-medium">Новый сотрудник</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="md:col-span-2">
                <label className="block text-sm font-medium mb-1">ФИО</label>
                <input
                  value={userName}
                  onChange={(e) => setUserName(e.target.value)}
                  className="w-full border rounded px-3 py-2 text-sm md:text-base"
                  placeholder="Иванов Иван Иванович"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">
                  Email *
                </label>
                <input
                  required
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full border rounded px-3 py-2 text-sm md:text-base"
                  placeholder="user@example.com"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">
                  Пароль *
                </label>
                <input
                  required
                  type="text"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full border rounded px-3 py-2 text-sm md:text-base"
                  placeholder="Минимум 6 символов"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Роль</label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value as "ADMIN" | "USER")}
                  className="w-full border rounded px-3 py-2 text-sm md:text-base"
                >
                  <option value="USER">Пользователь</option>
                  <option value="ADMIN">Администратор</option>
                </select>
              </div>
            </div>

            {error && (
              <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded px-3 py-2">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={saving}
              className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded disabled:opacity-50"
            >
              {saving ? "Создание..." : "Создать"}
            </button>
          </form>
        )}

        {loading ? (
          <p className="text-gray-500">Загрузка...</p>
        ) : users.length === 0 ? (
          <p className="text-gray-500">Нет сотрудников.</p>
        ) : (
          <ul className="divide-y border rounded">
            {users.map((u) => (
              <li
                key={u.id}
                className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 p-4"
              >
                <div className="min-w-0">
                  <div className="font-medium truncate">
                    {u.name?.trim() || u.email}
                  </div>
                  <div className="text-sm text-gray-500 mt-1 flex flex-wrap items-center gap-2">
                    {u.name?.trim() && (
                      <span className="text-xs text-gray-400 truncate">
                        {u.email}
                      </span>
                    )}
                    <span
                      className={`inline-block px-2 py-0.5 rounded text-xs ${ROLE_COLORS[u.role]}`}
                    >
                      {ROLE_LABELS[u.role]}
                    </span>
                    {u.id === currentUserId && (
                      <span className="text-xs text-gray-400">(это вы)</span>
                    )}
                    {u.mustChangePassword && (
                      <span className="text-xs text-orange-600 bg-orange-50 px-2 py-0.5 rounded">
                        ждёт смены пароля
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex flex-row md:flex-row gap-4 md:gap-4 text-sm">
                  <button
                    onClick={() => openReset(u)}
                    className="text-blue-600 hover:underline"
                  >
                    Сбросить пароль
                  </button>
                  {u.id !== currentUserId && (
                    <button
                      onClick={() => handleDelete(u.id)}
                      className="text-red-600 hover:underline"
                    >
                      Удалить
                    </button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Модалка сброса пароля */}
      {resetting && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded shadow-lg max-w-md w-full p-6">
            <h2 className="text-lg font-bold mb-2">Сбросить пароль</h2>
            <p className="text-sm text-gray-600 mb-4">
              Для сотрудника{" "}
              <strong>{resetting.name?.trim() || resetting.email}</strong>{" "}
              будет установлен временный пароль. При следующем входе он должен
              будет его сменить.
            </p>
            <label className="block text-sm font-medium mb-1">
              Временный пароль
            </label>
            <input
              type="text"
              value={tempPassword}
              onChange={(e) => setTempPassword(e.target.value)}
              className="w-full border rounded px-3 py-2 mb-4"
              placeholder="Минимум 6 символов"
              autoFocus
            />

            {resetError && (
              <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded px-3 py-2 mb-4">
                {resetError}
              </p>
            )}

            <div className="flex gap-2 justify-end">
              <button
                onClick={() => {
                  setResetting(null);
                  setTempPassword("");
                  setResetError(null);
                }}
                disabled={resettingSave}
                className="border px-4 py-2 rounded hover:bg-gray-100 disabled:opacity-50"
              >
                Отмена
              </button>
              <button
                onClick={handleReset}
                disabled={resettingSave || tempPassword.length < 6}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded disabled:opacity-50"
              >
                {resettingSave ? "Сброс..." : "Сбросить"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}