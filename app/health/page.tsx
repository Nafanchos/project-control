"use client";

import { useEffect, useState } from "react";

type HealthStatus = {
  timestamp: string;
  vercel: string;
  database: { status: string; latencyMs?: number; error?: string };
  storage: { status: string; latencyMs?: number; error?: string };
};

export default function HealthPage() {
  const [data, setData] = useState<HealthStatus | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  async function check() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/health", { cache: "no-store" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setData(await res.json());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка");
      setData(null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    check();
    const interval = setInterval(check, 15000);
    return () => clearInterval(interval);
  }, []);

  function statusBadge(status: string) {
    if (status === "ok") {
      return (
        <span className="text-green-700 bg-green-100 px-2 py-0.5 rounded text-sm font-medium">
          OK
        </span>
      );
    }
    return (
      <span className="text-red-700 bg-red-100 px-2 py-0.5 rounded text-sm font-medium">
        ОШИБКА
      </span>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-6">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-xl md:text-2xl font-bold mb-6">
          Проверка доступности сервисов
        </h1>

        <button
          onClick={check}
          disabled={loading}
          className="mb-6 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded disabled:opacity-50"
        >
          {loading ? "Проверка..." : "Проверить сейчас"}
        </button>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded p-4 mb-4">
            <div className="font-medium text-red-700 mb-1">
              Не удалось получить статус
            </div>
            <div className="text-sm text-red-600 break-all">{error}</div>
            <div className="text-xs text-gray-600 mt-3">
              Если страница вообще не открывается (ERR_CONNECTION_RESET и
              подобное) — блокируется сам сайт (Vercel). Если открывается, но
              не отвечает — проблема на стороне сервиса.
            </div>
          </div>
        )}

        {data && (
          <div className="space-y-3">
            <div className="border rounded bg-white p-4 flex justify-between items-center gap-3">
              <div>
                <div className="font-medium">Vercel (хостинг сайта)</div>
                <div className="text-sm text-gray-500 mt-0.5">
                  Приложение отвечает
                </div>
              </div>
              {statusBadge(data.vercel)}
            </div>

            <div className="border rounded bg-white p-4 flex justify-between items-start gap-3">
              <div className="min-w-0">
                <div className="font-medium">Neon (база данных)</div>
                <div className="text-sm text-gray-500 mt-0.5">
                  {data.database.latencyMs !== undefined &&
                    `Отклик: ${data.database.latencyMs} мс`}
                </div>
                {data.database.error && (
                  <div className="text-xs text-red-600 mt-1 break-all">
                    {data.database.error}
                  </div>
                )}
              </div>
              {statusBadge(data.database.status)}
            </div>

            <div className="border rounded bg-white p-4 flex justify-between items-start gap-3">
              <div className="min-w-0">
                <div className="font-medium">Backblaze B2 (файлы)</div>
                <div className="text-sm text-gray-500 mt-0.5">
                  {data.storage.latencyMs !== undefined &&
                    `Отклик: ${data.storage.latencyMs} мс`}
                </div>
                {data.storage.error && (
                  <div className="text-xs text-red-600 mt-1 break-all">
                    {data.storage.error}
                  </div>
                )}
              </div>
              {statusBadge(data.storage.status)}
            </div>

            <div className="text-xs text-gray-400 text-center mt-4">
              Проверено в{" "}
              {new Date(data.timestamp).toLocaleString("ru-RU")}. Обновляется
              каждые 15 секунд.
            </div>
          </div>
        )}

        <div className="mt-6 bg-blue-50 border border-blue-200 rounded p-4 text-sm text-gray-700">
          <div className="font-medium mb-2">Как читать результат:</div>
          <ul className="space-y-1 list-disc list-inside">
            <li>
              <strong>Vercel OK, Neon ОШИБКА</strong> — сайт открывается, но
              база недоступна. Скорее всего, Neon блокируется провайдером.
            </li>
            <li>
              <strong>Страница не открывается вообще</strong> — блокируется
              сам Vercel.
            </li>
            <li>
              <strong>Всё OK, но приложение тормозит</strong> — проблема в
              другом, смотрите консоль браузера.
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}