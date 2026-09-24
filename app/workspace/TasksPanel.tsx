"use client";

import { useEffect, useState, useRef } from "react";

type TaskType = "DOCS" | "PNR" | "SMR" | "OTHER";
type TaskStatus = "PLANNED" | "IN_PROGRESS" | "DONE" | "BLOCKED";

type Document = {
  id: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  uploadedAt: string;
};

type Assignee = {
  id: string;
  name: string | null;
  email: string;
};

type User = {
  id: string;
  email: string;
  name: string | null;
  role: "ADMIN" | "USER";
};

type Task = {
  id: string;
  title: string;
  type: TaskType;
  assigneeId: string | null;
  assignee: Assignee | null;
  planStart: string | null;
  planEnd: string | null;
  factStart: string | null;
  factEnd: string | null;
  status: TaskStatus;
  documents: Document[];
};

const TYPE_LABELS: Record<TaskType, string> = {
  DOCS: "Документация",
  PNR: "ПНР",
  SMR: "СМР",
  OTHER: "Другое",
};

const STATUS_LABELS: Record<TaskStatus, string> = {
  PLANNED: "Запланировано",
  IN_PROGRESS: "В работе",
  DONE: "Завершено",
  BLOCKED: "Заблокировано",
};

const STATUS_COLORS: Record<TaskStatus, string> = {
  PLANNED: "bg-gray-100 text-gray-700",
  IN_PROGRESS: "bg-blue-100 text-blue-700",
  DONE: "bg-green-100 text-green-700",
  BLOCKED: "bg-red-100 text-red-700",
};

function fmtDate(v: string | null) {
  if (!v) return "—";
  return new Date(v).toLocaleDateString("ru-RU");
}

function toInputDate(v: string | null) {
  if (!v) return "";
  return new Date(v).toISOString().slice(0, 10);
}

function fmtSize(bytes: number) {
  if (bytes < 1024) return `${bytes} Б`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} КБ`;
  return `${(bytes / 1024 / 1024).toFixed(1)} МБ`;
}

function displayName(u: { name?: string | null; email: string }) {
  return u.name?.trim() || u.email;
}

const emptyForm = {
  title: "",
  type: "DOCS" as TaskType,
  assigneeId: "" as string,
  planStart: "",
  planEnd: "",
  factStart: "",
  factEnd: "",
  status: "PLANNED" as TaskStatus,
};

export default function TasksPanel({ projectId }: { projectId: string | null }) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [role, setRole] = useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  const [openDocsFor, setOpenDocsFor] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetch("/api/auth/session")
      .then((r) => r.json())
      .then((s) => {
        setRole(s?.user?.role ?? null);
        setCurrentUserId(s?.user?.id ?? null);
      });
  }, []);

  useEffect(() => {
    if (role === "ADMIN" || role === "SUPER_ADMIN") {
      fetch("/api/tenant/users")
        .then((r) => (r.ok ? r.json() : []))
        .then((data) => setUsers(Array.isArray(data) ? data : []))
        .catch(() => setUsers([]));
    }
  }, [role]);

  async function loadTasks() {
    if (!projectId) {
      setTasks([]);
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`/api/projects/${projectId}/tasks`);
      const data = await res.json();
      setTasks(Array.isArray(data) ? data : []);
    } catch {
      setTasks([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    setShowForm(false);
    setEditingId(null);
    setOpenDocsFor(null);
    loadTasks();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId]);

  const isAdmin = role === "ADMIN" || role === "SUPER_ADMIN";
  const isUser = role === "USER";

  function openCreate() {
    setEditingId(null);
    setForm(emptyForm);
    setShowForm(true);
  }

  function openEdit(t: Task) {
    setEditingId(t.id);
    setForm({
      title: t.title,
      type: t.type,
      assigneeId: t.assigneeId ?? "",
      planStart: toInputDate(t.planStart),
      planEnd: toInputDate(t.planEnd),
      factStart: toInputDate(t.factStart),
      factEnd: toInputDate(t.factEnd),
      status: t.status,
    });
    setShowForm(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!projectId) return;
    setSaving(true);

    const payload = isAdmin
      ? {
          title: form.title,
          type: form.type,
          assigneeId: form.assigneeId || null,
          planStart: form.planStart,
          planEnd: form.planEnd,
          factStart: form.factStart,
          factEnd: form.factEnd,
          status: form.status,
        }
      : {
          factStart: form.factStart,
          factEnd: form.factEnd,
          status: form.status,
        };

    const url = editingId
      ? `/api/tasks/${editingId}`
      : `/api/projects/${projectId}/tasks`;
    const method = editingId ? "PATCH" : "POST";

    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    setSaving(false);
    if (res.ok) {
      setShowForm(false);
      setEditingId(null);
      setForm(emptyForm);
      loadTasks();
    } else {
      const data = await res.json().catch(() => ({}));
      alert(
        typeof data.error === "string"
          ? data.error
          : "Ошибка при сохранении"
      );
    }
  }

  async function handleDelete(taskId: string) {
    if (!confirm("Удалить задачу?")) return;
    const res = await fetch(`/api/tasks/${taskId}`, { method: "DELETE" });
    if (res.ok) loadTasks();
  }

  async function handleUpload(taskId: string, files: File[]) {
    if (files.length === 0) return;
    setUploading(true);

    let errors = 0;
    for (const file of files) {
      const fd = new FormData();
      fd.append("file", file);

      const res = await fetch(`/api/tasks/${taskId}/documents`, {
        method: "POST",
        body: fd,
      });

      if (!res.ok) errors++;
    }

    setUploading(false);
    loadTasks();

    if (errors > 0) {
      alert(`Не удалось загрузить файлов: ${errors}`);
    }
  }

  async function handleDeleteDoc(docId: string) {
    if (!confirm("Удалить документ?")) return;
    const res = await fetch(`/api/documents/${docId}`, { method: "DELETE" });
    if (res.ok) loadTasks();
  }

  if (!projectId) {
    return (
      <div className="flex-1 flex items-center justify-center text-gray-400 p-6 text-center">
        Выберите проект в левой панели
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Заголовок */}
      <div className="border-b px-4 md:px-6 py-3 bg-white">
        <h2 className="font-medium text-gray-800 mb-2">Задачи проекта</h2>
        {isAdmin && (
          <button
            onClick={openCreate}
            className="bg-blue-600 hover:bg-blue-700 text-white text-sm px-3 py-1.5 rounded"
          >
            + Добавить задачу
          </button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-4 md:p-6">
        {showForm && (
          <form
            onSubmit={handleSubmit}
            className="bg-gray-50 border rounded p-4 mb-6 space-y-3"
          >
            <h3 className="font-medium text-sm">
              {editingId ? "Редактирование задачи" : "Новая задача"}
            </h3>

            {isAdmin ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium mb-1">
                    Название *
                  </label>
                  <input
                    required
                    value={form.title}
                    onChange={(e) =>
                      setForm({ ...form, title: e.target.value })
                    }
                    className="w-full border rounded px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Тип *</label>
                  <select
                    value={form.type}
                    onChange={(e) =>
                      setForm({ ...form, type: e.target.value as TaskType })
                    }
                    className="w-full border rounded px-3 py-2 text-sm"
                  >
                    {Object.entries(TYPE_LABELS).map(([k, v]) => (
                      <option key={k} value={k}>
                        {v}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Ответственный
                  </label>
                  <select
                    value={form.assigneeId}
                    onChange={(e) =>
                      setForm({ ...form, assigneeId: e.target.value })
                    }
                    className="w-full border rounded px-3 py-2 text-sm"
                  >
                    <option value="">— не назначен —</option>
                    {users.map((u) => (
                      <option key={u.id} value={u.id}>
                        {displayName(u)}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">
                    План: начало
                  </label>
                  <input
                    type="date"
                    value={form.planStart}
                    onChange={(e) =>
                      setForm({ ...form, planStart: e.target.value })
                    }
                    className="w-full border rounded px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">
                    План: окончание
                  </label>
                  <input
                    type="date"
                    value={form.planEnd}
                    onChange={(e) =>
                      setForm({ ...form, planEnd: e.target.value })
                    }
                    className="w-full border rounded px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Факт: начало
                  </label>
                  <input
                    type="date"
                    value={form.factStart}
                    onChange={(e) =>
                      setForm({ ...form, factStart: e.target.value })
                    }
                    className="w-full border rounded px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Факт: окончание
                  </label>
                  <input
                    type="date"
                    value={form.factEnd}
                    onChange={(e) =>
                      setForm({ ...form, factEnd: e.target.value })
                    }
                    className="w-full border rounded px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Статус
                  </label>
                  <select
                    value={form.status}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        status: e.target.value as TaskStatus,
                      })
                    }
                    className="w-full border rounded px-3 py-2 text-sm"
                  >
                    {Object.entries(STATUS_LABELS).map(([k, v]) => (
                      <option key={k} value={k}>
                        {v}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="md:col-span-2 text-sm text-gray-700 bg-gray-100 rounded px-3 py-2">
                  <div className="font-medium">{form.title}</div>
                  <div className="text-xs text-gray-500 mt-1">
                    Тип: {TYPE_LABELS[form.type]}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Факт: начало
                  </label>
                  <input
                    type="date"
                    value={form.factStart}
                    onChange={(e) =>
                      setForm({ ...form, factStart: e.target.value })
                    }
                    className="w-full border rounded px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Факт: окончание
                  </label>
                  <input
                    type="date"
                    value={form.factEnd}
                    onChange={(e) =>
                      setForm({ ...form, factEnd: e.target.value })
                    }
                    className="w-full border rounded px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Статус
                  </label>
                  <select
                    value={form.status}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        status: e.target.value as TaskStatus,
                      })
                    }
                    className="w-full border rounded px-3 py-2 text-sm"
                  >
                    {Object.entries(STATUS_LABELS).map(([k, v]) => (
                      <option key={k} value={k}>
                        {v}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            )}

            <div className="flex gap-2">
              <button
                type="submit"
                disabled={saving}
                className="bg-green-600 hover:bg-green-700 text-white text-sm px-4 py-2 rounded disabled:opacity-50"
              >
                {saving
                  ? "Сохранение..."
                  : editingId
                  ? "Обновить"
                  : "Создать"}
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowForm(false);
                  setEditingId(null);
                }}
                className="border text-sm px-4 py-2 rounded hover:bg-gray-100"
              >
                Отмена
              </button>
            </div>
          </form>
        )}

        {loading ? (
          <p className="text-gray-500 text-sm">Загрузка...</p>
        ) : tasks.length === 0 ? (
          <p className="text-gray-500 text-sm">
            {isUser
              ? "У вас пока нет назначенных задач в этом проекте."
              : "Пока нет задач. Добавьте первую."}
          </p>
        ) : (
          <div className="space-y-3 md:space-y-2">
            {tasks.map((t) => (
              <div key={t.id} className="border rounded bg-white">
                {/* ========== Десктопная версия ========== */}
                <div className="hidden md:grid grid-cols-12 gap-2 items-center p-3 text-sm">
                  <div className="col-span-3 font-medium">{t.title}</div>
                  <div className="col-span-1 text-gray-600">
                    {TYPE_LABELS[t.type]}
                  </div>
                  <div className="col-span-2 text-gray-600">
                    {t.assignee ? displayName(t.assignee) : "—"}
                  </div>
                  <div className="col-span-1 text-xs text-gray-600">
                    <div className="text-gray-400">план</div>
                    {fmtDate(t.planStart)}
                    <br />
                    {fmtDate(t.planEnd)}
                  </div>
                  <div className="col-span-1 text-xs text-gray-600">
                    <div className="text-gray-400">факт</div>
                    {fmtDate(t.factStart)}
                    <br />
                    {fmtDate(t.factEnd)}
                  </div>
                  <div className="col-span-2">
                    <span
                      className={`inline-block px-2 py-1 rounded text-xs ${STATUS_COLORS[t.status]}`}
                    >
                      {STATUS_LABELS[t.status]}
                    </span>
                  </div>
                  <div className="col-span-2 flex flex-wrap gap-x-3 gap-y-1 justify-end">
                    <button
                      onClick={() =>
                        setOpenDocsFor(openDocsFor === t.id ? null : t.id)
                      }
                      className="text-gray-700 hover:underline text-xs"
                    >
                      📎 Документы ({t.documents.length})
                    </button>
                    <button
                      onClick={() => openEdit(t)}
                      className="text-blue-600 hover:underline text-xs"
                    >
                      {isUser ? "Обновить прогресс" : "Изменить"}
                    </button>
                    {isAdmin && (
                      <button
                        onClick={() => handleDelete(t.id)}
                        className="text-red-600 hover:underline text-xs"
                      >
                        Удалить
                      </button>
                    )}
                  </div>
                </div>

                {/* ========== Мобильная версия ========== */}
                <div className="md:hidden p-3 space-y-3">
                  <div className="font-medium text-sm">{t.title}</div>

                  <div className="flex flex-wrap gap-1.5 text-xs">
                    <span className="px-2 py-0.5 rounded bg-gray-100 text-gray-700">
                      {TYPE_LABELS[t.type]}
                    </span>
                    <span className="px-2 py-0.5 rounded bg-gray-100 text-gray-700">
                      {t.assignee ? displayName(t.assignee) : "—"}
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded ${STATUS_COLORS[t.status]}`}
                    >
                      {STATUS_LABELS[t.status]}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs text-gray-600">
                    <div>
                      <div className="text-gray-400 mb-0.5">План</div>
                      <div>{fmtDate(t.planStart)}</div>
                      <div>{fmtDate(t.planEnd)}</div>
                    </div>
                    <div>
                      <div className="text-gray-400 mb-0.5">Факт</div>
                      <div>{fmtDate(t.factStart)}</div>
                      <div>{fmtDate(t.factEnd)}</div>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-x-4 gap-y-2 pt-1 text-xs border-t">
                    <button
                      onClick={() =>
                        setOpenDocsFor(openDocsFor === t.id ? null : t.id)
                      }
                      className="text-gray-700 hover:underline py-1"
                    >
                      📎 Документы ({t.documents.length})
                    </button>
                    <button
                      onClick={() => openEdit(t)}
                      className="text-blue-600 hover:underline py-1"
                    >
                      {isUser ? "Обновить прогресс" : "Изменить"}
                    </button>
                    {isAdmin && (
                      <button
                        onClick={() => handleDelete(t.id)}
                        className="text-red-600 hover:underline py-1"
                      >
                        Удалить
                      </button>
                    )}
                  </div>
                </div>

                {/* Секция документов (одинаковая для мобильного и десктопа) */}
                {openDocsFor === t.id && (
                  <div className="border-t bg-gray-50 p-3">
                    <div className="flex items-center gap-2 mb-3 flex-wrap">
                      <input
                        ref={fileInputRef}
                        type="file"
                        multiple
                        className="hidden"
                        onChange={(e) => {
                          const files = e.target.files
                            ? Array.from(e.target.files)
                            : [];
                          if (files.length > 0) handleUpload(t.id, files);
                          e.target.value = "";
                        }}
                      />
                      <button
                        onClick={() => fileInputRef.current?.click()}
                        disabled={uploading}
                        className="bg-blue-600 hover:bg-blue-700 text-white text-xs px-3 py-1.5 rounded disabled:opacity-50"
                      >
                        {uploading ? "Загрузка..." : "Загрузить документы"}
                      </button>
                    </div>

                    {t.documents.length === 0 ? (
                      <p className="text-xs text-gray-500">Нет документов</p>
                    ) : (
                      <ul className="divide-y bg-white border rounded">
                        {t.documents.map((d) => (
                          <li
                            key={d.id}
                            className="flex items-center justify-between gap-2 px-3 py-2 text-xs"
                          >
                            <a
                              href={`/api/documents/${d.id}`}
                              className="text-blue-600 hover:underline truncate flex-1 min-w-0"
                            >
                              {d.fileName}
                            </a>
                            <div className="flex items-center gap-3 text-gray-500 shrink-0">
                              <span className="hidden sm:inline">
                                {fmtSize(d.fileSize)}
                              </span>
                              <button
                                onClick={() => handleDeleteDoc(d.id)}
                                className="text-red-600 hover:underline"
                              >
                                Удалить
                              </button>
                            </div>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}