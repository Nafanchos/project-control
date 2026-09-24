import Link from "next/link";

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-6">
      <div className="text-center max-w-md">
        <div className="text-7xl md:text-8xl font-bold text-blue-600 mb-4">
          404
        </div>
        <h1 className="text-xl md:text-2xl font-bold mb-3">
          Страница не найдена
        </h1>
        <p className="text-gray-600 mb-6 text-sm md:text-base">
          Возможно, страница была удалена, переименована или вы ввели
          неверный адрес.
        </p>
        <div className="flex flex-col sm:flex-row gap-2 justify-center">
          <Link
            href="/workspace"
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded"
          >
            На главную
          </Link>
          <Link
            href="/login"
            className="border px-4 py-2 rounded hover:bg-gray-100"
          >
            Войти
          </Link>
        </div>
      </div>
    </div>
  );
}