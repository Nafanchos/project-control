"use client";

import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-6">
      <div className="text-center max-w-md">
        <div className="text-6xl mb-4">😔</div>
        <h1 className="text-xl md:text-2xl font-bold mb-3">
          Что-то пошло не так
        </h1>
        <p className="text-gray-600 mb-6 text-sm md:text-base">
          Мы уже разбираемся. Попробуйте обновить страницу или вернуться
          назад.
        </p>
        <div className="flex flex-col sm:flex-row gap-2 justify-center">
          <button
            onClick={reset}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded"
          >
            Попробовать снова
          </button>
          <a
            href="/workspace"
            className="border px-4 py-2 rounded hover:bg-gray-100"
          >
            На главную
          </a>
        </div>
      </div>
    </div>
  );
}