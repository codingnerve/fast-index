import { AuthForm } from "@/components/AuthForm";

export default function SignupPage() {
  return (
    <div className="mx-auto max-w-md py-8">
      <h1 className="text-2xl font-bold text-slate-900">Create your account</h1>
      <p className="mt-1 text-sm text-slate-600">
        Start with 10 free credits. No card required.
      </p>
      <div className="mt-6">
        <AuthForm mode="signup" />
      </div>
    </div>
  );
}
