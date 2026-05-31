import { AuthForm } from "@/components/AuthForm";

export default function LoginPage() {
  return (
    <div className="mx-auto max-w-md py-8">
      <h1 className="text-2xl font-bold text-slate-900">Welcome back</h1>
      <p className="mt-1 text-sm text-slate-600">Log in to your dashboard.</p>
      <div className="mt-6">
        <AuthForm mode="login" />
      </div>
    </div>
  );
}
