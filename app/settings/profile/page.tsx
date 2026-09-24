"use client";

import { useEffect, useState } from "react";
import Header from "@/app/components/Header";

type SessionUser = {
  email?: string | null;
  name?: string | null;
  role?: string;
};

export default function ProfilePage() {
  const [user, setUser] = useState<SessionUser | null>(null);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    fetch("/api/auth/session")
      .then((r) => r.json())
      .then((s) => setUser(s?.user ?? null));
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(false);

    if (newPassword !== confirmPassword) {
      setError("Новый пароль и подтверждение не совпадают");
      return;
    }

    if (newPassword.length < 6) {
      setError("Новый пароль должен быть не короче 6 символов");
      return;
    }

    setSaving(true);

    const res = await fetch("/api/tenant/me/password", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ currentPassword, newPassword }),
    });

    setSaving(false);

    if (res.ok) {
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setSuccess(true);
    } else {
      const data = await res.json().catch(() => ({}));
      setError(
        typeof data.error === "string"
          ? data.error
          : "Ошибка при смене пароля"
      );
    }
  }

  return (
    <>
      <Header />
      <div className="max-w-2xl mx-auto p-4 md:p-6">
        <h1 className="text-xl md:text-2xl font-bold mb-6">Профиль</h1>

        {/* Блок с текущими данными */}
        <div className="border rounded p-4 mb-6 bg-gray-50">
          <div className="text-sm text-gray-500 mb-1">Вы вошли как</div>
          <div className="font-medium truncate">
            {user?.name?.trim() || user?.email || "..."}
          </div>
          {user?.name?.trim() && user?.email && (
            <div className="text-sm text-gray-500 mt-0.5 truncate">
              {user.email}
            </div>
          )}
          {user?.role === "SUPER_ADMIN" && (
            <span className="inline-block mt-2 text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded">
              супер-админ
            </span>
          )}
          {user?.role === "ADMIN" && (
            <span className="inline-block mt-2 text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded">
              админ
            </span>
          )}
          {user?.role === "USER" && (
            <span className="inline-block mt-2 text-xs bg-gray-100 text-gray-700 px-2 py-0.5 rounded">
              пользователь
            </span>
          )}
        </div>

        {/* Форма смены пароля */}
        <form
          onSubmit={handleSubmit}
          className="border rounded p-4 space-y-3"
        >
          <h2 className="font-medium">Смена пароля</h2>

          <div>
            <label className="block text-sm font-medium mb-1">
              Текущий пароль *
            </label>
            <input
              required
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              className="w-full border rounded px-3 py-2 text-sm md:text-base"
              autoComplete="current-password"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">
              Новый пароль *
            </label>
            <input
              required
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="w-full border rounded px-3 py-2 text-sm md:text-base"
              autoComplete="new-password"
              placeholder="Минимум 6 символов"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">
              Подтвердите новый пароль *
            </label>
            <input
              required
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full border rounded px-3 py-2 text-sm md:text-base"
              autoComplete="new-password"
            />
          </div>

          {error && (
            <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded px-3 py-2">
              {error}
            </p>
          )}

          {success && (
            <p className="text-sm text-green-700 bg-green-50 border border-green-200 rounded px-3 py-2">
              Пароль успешно изменён
            </p>
          )}

          <button
            type="submit"
            disabled={saving}
            className="w-full md:w-auto bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded disabled:opacity-50"
          >
            {saving ? "Сохранение..." : "Сменить пароль"}
          </button>
        </form>
      </div>
    </>
  );
}