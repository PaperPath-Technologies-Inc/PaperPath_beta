"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

export default function LoginPage() {
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
    const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (signInError) {
      setError(signInError.message);
      return;
    }
    router.push("/home");
    router.refresh();
  };

  return (
    <section className="auth-card">
      <h1>Log in</h1>
      <p>Continue to your dashboard.</p>
      <form className="stack-12" onSubmit={onSubmit}>
        <label>Email</label>
        <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
        <label>Password</label>
        <input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} />
        {error ? <p className="error">{error}</p> : null}
        <button type="submit" className="btn btn-primary" disabled={loading}>
          {loading ? "Signing in..." : "Log in"}
        </button>
      </form>
      <p>
        New here? <Link href="/signup">Create account</Link>
      </p>
    </section>
  );
}
