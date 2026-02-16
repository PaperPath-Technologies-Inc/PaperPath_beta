"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

export default function SignupPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    setError(null);
    let supabase;
    try {
      supabase = createSupabaseBrowserClient();
    } catch (clientError) {
      setLoading(false);
      setError(clientError instanceof Error ? clientError.message : "Supabase is not configured.");
      return;
    }

    const { data, error: signUpError } = await supabase.auth.signUp({ email, password });
    setLoading(false);
    if (signUpError) {
      setError(signUpError.message);
      return;
    }

    if (data.session) {
      router.push("/onboarding");
      router.refresh();
      return;
    }

    setError("Account created. Check your email to confirm, then log in.");
  };

  return (
    <section className="auth-card">
      <h1>Create account</h1>
      <p>Students and PGWP only.</p>
      <form className="stack-12" onSubmit={onSubmit}>
        <label>Email</label>
        <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
        <label>Password</label>
        <input type="password" minLength={8} required value={password} onChange={(e) => setPassword(e.target.value)} />
        {error ? <p className="error">{error}</p> : null}
        <button type="submit" className="btn btn-primary" disabled={loading}>
          {loading ? "Creating..." : "Create account"}
        </button>
      </form>
      <p>
        Already have an account? <Link href="/login">Log in</Link>
      </p>
    </section>
  );
}
