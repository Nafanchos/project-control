"use client";

import { useEffect, useState } from "react";
import Header from "@/app/components/Header";

type Tenant = {
  id: string;
  name: string;
  slug: string;
  createdAt: string;
  _count: { users: number; customers: number };
};

export default function SuperAdminPage() {
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);

  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [adminEmail, setAdminEmail] = useState("");
  const [adminPassword, setAdminPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [deletingTenant, setDeletingTenant] = useState<Tenant | null>(null);
  const [confirmText, setConfirmText] = useState("");
  const [deleting, setDeleting] = useState(false);

  async function loadTenants() {
    setLoading(true);
    const res = await fetch("/api/superadmin/tenants");
    const data = await res.json();
    setTenants(Array.isArray(data) ? data : []);
    setLoading(false);
  }

  useEffect(() => {
    loadTenants();
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);

    const res = await fetch("/api/superadmin/tenants", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, slug, adminEmail, adminPassword }),
    });

    setSaving(false);

    if (res.ok) {
      setName("");
      setSlug("");
      setAdminEmail("");
      setAdminPassword("");
      setShowForm(false);
      loadTenants();
    } else {
      const data = await res.json();
      setError(
        typeof data.error === "string"
          ? data.error
          : "Ошибка при создании компании"
      );
    }
  }

  async function handleDelete() {
    if (!deletingTenant) return;
    if (confirmText !== deletingTenant.name) {
      alert("Название введено неверно");
      return;
    }

    setDeleting(true);
    const res = await fetch(`/api/superadmin/tenants/${deletingTenant.id}`, {
      method: "DELETE",
    });
    setDeleting(false);

    if (res.ok) {
      setDeletingTenant(null);
      setConfirmText("");
      loadTenants();
    } else {
      const data = await res.json();
      alert(typeof data.error === "string" ? data.error : "Ошибка");
    }
  }

  return (
    <>
      <Header />
      <div className="max-w-4xl mx-auto p-4 md:p-6">
        <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-3 mb-6">
          <h1 className="text-xl md:text-2xl font-bold">
            Супер-админ: компании
          </h1>
          <button
            onClick={() => setShowForm((v) => !v)}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded text-sm md:text-base"
          >
            {showForm ? "Отмена" : "+ Создать компанию"}
          </button>
        </div>

        {showForm && (
          <form
            onSubmit={handleSubmit}
            className="bg-gray-50 border rounded p-4 mb-6 space-y-3"
          >
            <h2 className="font-medium">Новая компания</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium mb-1">
                  Название компании *
                </label>
                <input
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full border rounded px-3 py-2 text-sm md:text-base"
                  placeholder="ООО Ромашка"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">
                  Slug (латиница) *
                </label>
                <input
                  required
                  value={slug}
                  onChange={(e) =>
                    setSlug(
                      e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "")
                    )
                  }
                  className="w-full border rounded px-3 py-2 text-sm md:text-base"
                  placeholder="romashka"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">
                  Email администратора *
                </label>
                <input
                  required
                  type="email"
                  value={adminEmail}
                  onChange={(e) => setAdminEmail(e.target.value)}
                  className="w-full border rounded px-3 py-2 text-sm md:text-base"
                  placeholder="admin@romashka.ru"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">
                  Пароль администратора *
                </label>
                <input
                  required
                  type="text"
                  value={adminPassword}
                  onChange={(e) => setAdminPassword(e.target.value)}
                  className="w-full border rounded px-3 py-2 text-sm md:text-base"
                  placeholder="Минимум 6 символов"
                />
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
              className="w-full md:w-auto bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded disabled:opacity-50"
            >
              {saving ? "Создание..." : "Создать"}
            </button>
          </form>
        )}

        {loading ? (
          <p className="text-gray-500">Загрузка...</p>
        ) : tenants.length === 0 ? (
          <p className="text-gray-500">
            Пока нет компаний. Создайте первую.
          </p>
        ) : (
          <ul className="divide-y border rounded">
            {tenants.map((t) => (
              <li
                key={t.id}
                className="flex flex-col md:flex-row md:justify-between md:items-start gap-3 p-4"
              >
                <div className="min-w-0">
                  <div className="font-medium truncate">{t.name}</div>
                  <div className="text-sm text-gray-500 mt-1">
                    slug: <code>{t.slug}</code>
                  </div>
                  <div className="text-sm text-gray-500 mt-0.5">
                    пользователей: {t._count.users} · заказчиков:{" "}
                    {t._count.customers}
                  </div>
                </div>
                <button
                  onClick={() => {
                    setDeletingTenant(t);
                    setConfirmText("");
                  }}
                  className="text-red-600 hover:underline text-sm self-start md:self-center shrink-0"
                >
                  Удалить
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Модалка подтверждения удаления */}
      {deletingTenant && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded shadow-lg max-w-md w-full p-5 md:p-6 max-h-[90vh] overflow-y-auto">
            <h2 className="text-lg font-bold mb-2">Удалить компанию?</h2>
            <p className="text-sm text-gray-600 mb-4">
              Это действие <strong>необратимо</strong>. Удалятся все заказчики,
              проекты, задачи, документы и пользователи компании{" "}
              <strong>{deletingTenant.name}</strong>.
            </p>
            <p className="text-sm text-gray-600 mb-2">
              Чтобы подтвердить, введите название компании:
            </p>
            <input
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              className="w-full border rounded px-3 py-2 mb-4"
              placeholder={deletingTenant.name}
              autoFocus
            />
            <div className="flex flex-col-reverse md:flex-row md:justify-end gap-2">
              <button
                onClick={() => {
                  setDeletingTenant(null);
                  setConfirmText("");
                }}
                disabled={deleting}
                className="w-full md:w-auto border px-4 py-2 rounded hover:bg-gray-100 disabled:opacity-50"
              >
                Отмена
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting || confirmText !== deletingTenant.name}
                className="w-full md:w-auto bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded disabled:opacity-50"
              >
                {deleting ? "Удаление..." : "Удалить навсегда"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}