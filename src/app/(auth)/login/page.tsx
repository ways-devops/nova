import { LoginForm } from "./LoginForm";

export const metadata = { title: "Вход" };

export default function LoginPage() {
  return (
    <main className="flex min-h-dvh items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="mb-6 text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-600 text-xl font-bold text-white">
            N
          </div>
          <h1 className="text-xl font-semibold text-slate-900">Nova CRM</h1>
          <p className="mt-1 text-sm text-slate-500">Войдите в свой аккаунт</p>
        </div>
        <LoginForm />
      </div>
    </main>
  );
}
