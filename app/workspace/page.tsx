"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Header from "@/app/components/Header";
import TasksPanel from "./TasksPanel";

type Customer = { id: string; name: string };
type Project = {
  id: string;
  name: string;
  description: string | null;
  createdAt: string;
};

const STORAGE_KEY = "workspace-tabs";

function WorkspaceContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const activeCustomerId = searchParams.get("customer");
  const activeProjectId = searchParams.get("project");

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [role, setRole] = useState<string | null>(null);
  const [openTabs, setOpenTabs] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [showPicker, setShowPicker] = useState(false);

  // Форма создания заказчика
  const [showCustomerForm, setShowCustomerForm] = useState(false);
  const [newName, setNewName] = useState("");
  const [newInn, setNewInn] = useState("");
  const [newContact, setNewContact] = useState("");
  const [savingCustomer, setSavingCustomer] = useState(false);
  const [customerError, setCustomerError] = useState<string | null>(null);

  // Проекты активного заказчика
  const [projects, setProjects] = useState<Project[]>([]);
  const [projectsLoading, setProjectsLoading] = useState(false);
  const [showProjectForm, setShowProjectForm] = useState(false);
  const [projectName, setProjectName] = useState("");
  const [projectDescription, setProjectDescription] = useState("");
  const [savingProject, setSavingProject] = useState(false);

  // Загрузка заказчиков компании
  useEffect(() => {
    fetch("/api/customers")
      .then((r) => r.json())
      .then((data) => setCustomers(Array.isArray(data) ? data : []))
      .catch(() => setCustomers([]));

    fetch("/api/auth/session")
      .then((r) => r.json())
      .then((s) => setRole(s?.user?.role ?? null))
      .catch(() => setRole(null));
  }, []);

  // Инициализация вкладок из localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      const tabs: string[] = stored ? JSON.parse(stored) : [];
      setOpenTabs(tabs);

      if (activeCustomerId && !tabs.includes(activeCustomerId)) {
        const next = [...tabs, activeCustomerId];
        setOpenTabs(next);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      }
      if (!activeCustomerId && tabs.length > 0) {
        router.replace(`/workspace?customer=${tabs[0]}`);
      }
    } catch {
      //
    }
    setLoading(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (loading) return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(openTabs));
  }, [openTabs, loading]);

  // Загрузка проектов при смене активного заказчика
  useEffect(() => {
    if (!activeCustomerId) {
      setProjects([]);
      return;
    }
    setProjectsLoading(true);
    fetch(`/api/customers/${activeCustomerId}/projects`)
      .then((r) => r.json())
      .then((data) => setProjects(Array.isArray(data) ? data : []))
      .catch(() => setProjects([]))
      .finally(() => setProjectsLoading(false));
  }, [activeCustomerId]);

  function resetCustomerForm() {
    setNewName("");
    setNewInn("");
    setNewContact("");
    setCustomerError(null);
    setShowCustomerForm(false);
  }

  async function createCustomer(e: React.FormEvent) {
    e.preventDefault();
    setSavingCustomer(true);
    setCustomerError(null);

    const res = await fetch("/api/customers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: newName,
        inn: newInn,
        contact: newContact,
      }),
    });

    setSavingCustomer(false);

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setCustomerError(
        typeof data.error === "string"
          ? data.error
          : "Ошибка при создании заказчика"
      );
      return;
    }

    const created: Customer = await res.json();
    setCustomers([created, ...customers]);

    // Открываем как вкладку
    if (!openTabs.includes(created.id)) {
      setOpenTabs([...openTabs, created.id]);
    }

    resetCustomerForm();
    setShowPicker(false);
    router.push(`/workspace?customer=${created.id}`);
  }

  function openTab(customerId: string) {
    if (!openTabs.includes(customerId)) {
      setOpenTabs([...openTabs, customerId]);
    }
    router.push(`/workspace?customer=${customerId}`);
    setShowPicker(false);
    resetCustomerForm();
  }

  function closeTab(customerId: string, e: React.MouseEvent) {
    e.stopPropagation();
    const next = openTabs.filter((id) => id !== customerId);
    setOpenTabs(next);

    if (activeCustomerId === customerId) {
      if (next.length > 0) {
        router.push(`/workspace?customer=${next[next.length - 1]}`);
      } else {
        router.push("/workspace");
      }
    }
  }

  function selectTab(customerId: string) {
    router.push(`/workspace?customer=${customerId}`);
  }

  function selectProject(projectId: string) {
    if (!activeCustomerId) return;
    router.push(`/workspace?customer=${activeCustomerId}&project=${projectId}`);
  }

  function getCustomerName(id: string) {
    return customers.find((c) => c.id === id)?.name ?? "...";
  }

  async function createProject(e: React.FormEvent) {
    e.preventDefault();
    if (!activeCustomerId) return;
    setSavingProject(true);

    const res = await fetch(`/api/customers/${activeCustomerId}/projects`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: projectName,
        description: projectDescription,
      }),
    });

    setSavingProject(false);
    if (res.ok) {
      const created = await res.json();
      setProjectName("");
      setProjectDescription("");
      setShowProjectForm(false);
      setProjects([created, ...projects]);
      selectProject(created.id);
    } else {
      alert("Ошибка при создании проекта");
    }
  }

  async function deleteProject(projectId: string, e: React.MouseEvent) {
    e.stopPropagation();
    if (!confirm("Удалить проект? Все его задачи и документы будут удалены.")) return;

    const res = await fetch(`/api/projects/${projectId}`, {
      method: "DELETE",
    });

    if (res.ok) {
      setProjects(projects.filter((p) => p.id !== projectId));
      if (activeProjectId === projectId) {
        router.push(`/workspace?customer=${activeCustomerId}`);
      }
    } else {
      alert("Ошибка при удалении проекта");
    }
  }

  const isAdmin = role === "ADMIN" || role === "SUPER_ADMIN";

  const availableCustomers = customers.filter(
    (c) => !openTabs.includes(c.id)
  );

  return (
    <div className="flex flex-col h-[calc(100vh-65px)]">
      {/* Полоса вкладок */}
      <div className="border-b bg-white flex items-center overflow-visible">
        {/* Кнопка «+» слева */}
        <div className="relative border-r">
          <button
            onClick={() => {
              setShowPicker((v) => !v);
              if (showPicker) resetCustomerForm();
            }}
            className="px-3 py-2 text-gray-600 hover:bg-gray-50 text-lg"
            title="Открыть заказчика"
          >
            +
          </button>

          {showPicker && (
            <div className="absolute top-full left-0 mt-1 bg-white border rounded shadow-lg z-20 min-w-[300px]">
              {!showCustomerForm ? (
                <>
                  {availableCustomers.length === 0 ? (
                    <p className="p-3 text-sm text-gray-500">
                      {customers.length === 0
                        ? "Пока нет заказчиков."
                        : "Все заказчики уже открыты."}
                    </p>
                  ) : (
                    <div className="max-h-64 overflow-y-auto">
                      {availableCustomers.map((c) => (
                        <button
                          key={c.id}
                          onClick={() => openTab(c.id)}
                          className="block w-full text-left px-3 py-2 text-sm hover:bg-gray-50"
                        >
                          {c.name}
                        </button>
                      ))}
                    </div>
                  )}
                  {isAdmin && (
                    <div className="border-t">
                      <button
                        onClick={() => setShowCustomerForm(true)}
                        className="block w-full text-left px-3 py-2 text-sm text-blue-600 hover:bg-gray-50"
                      >
                        + Создать нового заказчика
                      </button>
                    </div>
                  )}
                </>
              ) : (
                <form onSubmit={createCustomer} className="p-3 space-y-2">
                  <h3 className="font-medium text-sm">Новый заказчик</h3>
                  <div>
                    <label className="block text-xs font-medium mb-1">
                      Название *
                    </label>
                    <input
                      required
                      autoFocus
                      value={newName}
                      onChange={(e) => setNewName(e.target.value)}
                      className="w-full border rounded px-2 py-1 text-sm"
                      placeholder="ООО Ромашка"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium mb-1">
                      ИНН
                    </label>
                    <input
                      value={newInn}
                      onChange={(e) => setNewInn(e.target.value)}
                      className="w-full border rounded px-2 py-1 text-sm"
                      placeholder="7701234567"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium mb-1">
                      Контактное лицо
                    </label>
                    <input
                      value={newContact}
                      onChange={(e) => setNewContact(e.target.value)}
                      className="w-full border rounded px-2 py-1 text-sm"
                      placeholder="Иван Иванов"
                    />
                  </div>

                  {customerError && (
                    <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded px-2 py-1">
                      {customerError}
                    </p>
                  )}

                  <div className="flex gap-2 pt-1">
                    <button
                      type="submit"
                      disabled={savingCustomer}
                      className="flex-1 text-xs bg-green-600 hover:bg-green-700 text-white px-3 py-1.5 rounded disabled:opacity-50"
                    >
                      {savingCustomer ? "Создание..." : "Создать"}
                    </button>
                    <button
                      type="button"
                      onClick={resetCustomerForm}
                      className="text-xs border px-3 py-1.5 rounded hover:bg-gray-100"
                    >
                      Отмена
                    </button>
                  </div>
                </form>
              )}
            </div>
          )}
        </div>

        {/* Список вкладок */}
        <div className="flex overflow-x-auto flex-1">
          {openTabs.length === 0 && (
            <span className="px-4 py-2 text-sm text-gray-400">
              Нет открытых заказчиков — нажмите «+»
            </span>
          )}
          {openTabs.map((id) => {
            const isActive = id === activeCustomerId;
            return (
              <div
                key={id}
                onClick={() => selectTab(id)}
                className={`flex items-center gap-2 px-3 py-2 text-sm cursor-pointer border-r whitespace-nowrap ${
                  isActive
                    ? "bg-blue-50 text-blue-700 border-b-2 border-b-blue-600"
                    : "bg-white hover:bg-gray-50"
                }`}
              >
                <span className="max-w-[200px] truncate">
                  {getCustomerName(id)}
                </span>
                <button
                  onClick={(e) => closeTab(id, e)}
                  className="text-gray-400 hover:text-gray-700 text-xs"
                  title="Закрыть вкладку"
                >
                  ✕
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* Основная область */}
      <div className="flex flex-1 overflow-hidden">
        {/* Левая панель: проекты */}
        <aside
          className="border-r bg-gray-50 overflow-y-auto shrink-0 flex flex-col"
          style={{ width: "12.5%" }}
        >
          {isAdmin && (
            <div className="p-3 border-b">
              <button
               onClick={() => setShowProjectForm((v) => !v)}
                disabled={!activeCustomerId}
                className="w-full text-xs bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 text-white px-2 py-1.5 rounded"
              >
                {showProjectForm ? "Отмена" : "+ Проект"}
              </button>
            </div>
          )}

          {isAdmin && showProjectForm && activeCustomerId && (
            <form
              onSubmit={createProject}
              className="p-3 border-b bg-white space-y-2"
            >
              <input
                required
                value={projectName}
                onChange={(e) => setProjectName(e.target.value)}
                placeholder="Название"
                className="w-full border rounded px-2 py-1 text-xs"
              />
              <textarea
                value={projectDescription}
                onChange={(e) => setProjectDescription(e.target.value)}
                placeholder="Описание"
                rows={2}
                className="w-full border rounded px-2 py-1 text-xs"
              />
              <button
                type="submit"
                disabled={savingProject}
                className="w-full text-xs bg-green-600 hover:bg-green-700 text-white px-2 py-1 rounded disabled:opacity-50"
              >
                {savingProject ? "..." : "Создать"}
              </button>
            </form>
          )}

          <div className="flex-1 overflow-y-auto">
            {!activeCustomerId ? (
              <p className="p-3 text-xs text-gray-400">
                Выберите заказчика
              </p>
            ) : projectsLoading ? (
              <p className="p-3 text-xs text-gray-400">Загрузка...</p>
            ) : projects.length === 0 ? (
              <p className="p-3 text-xs text-gray-400">Нет проектов</p>
            ) : (
              <ul>
                {projects.map((p) => {
                  const isActive = p.id === activeProjectId;
                  return (
                    <li key={p.id}>
                      <div
                        onClick={() => selectProject(p.id)}
                        className={`group px-3 py-2 cursor-pointer border-b text-xs flex items-start gap-1 ${
                          isActive
                            ? "bg-blue-100 text-blue-800 font-medium"
                            : "hover:bg-white"
                        }`}
                      >
                        <div className="flex-1 min-w-0">
                          <div className="truncate">{p.name}</div>
                          {p.description && (
                            <div className="text-[10px] text-gray-400 truncate mt-0.5">
                              {p.description}
                            </div>
                          )}
                        </div>
                        {isAdmin && (
                          <button
                            onClick={(e) => deleteProject(p.id, e)}
                            className="opacity-0 group-hover:opacity-100 ..."
                          >
                            ✕
                          </button>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </aside>

        {/* Правая панель: задачи */}
        <TasksPanel projectId={activeProjectId} />
      </div>
    </div>
  );
}

export default function WorkspacePage() {
  return (
    <>
      <Header />
      <Suspense
        fallback={<div className="p-6 text-gray-500">Загрузка...</div>}
      >
        <WorkspaceContent />
      </Suspense>
    </>
  );
}