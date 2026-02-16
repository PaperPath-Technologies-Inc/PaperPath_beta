"use client";

import { FormEvent, useState } from "react";

export function CheckoutButton() {
  const [loading, setLoading] = useState(false);
  const [promoCode, setPromoCode] = useState("");
  const [error, setError] = useState<string | null>(null);

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    setError(null);

    const response = await fetch("/api/stripe/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ promoCode }),
    });

    const payload = (await response.json()) as { url?: string; error?: string };

    setLoading(false);
    if (!response.ok || !payload.url) {
      setError(payload.error ?? "Unable to start checkout.");
      return;
    }

    window.location.href = payload.url;
  };

  return (
    <form className="stack-12" onSubmit={onSubmit}>
      <label>Coupon code (optional)</label>
      <input
        type="text"
        value={promoCode}
        onChange={(event) => setPromoCode(event.target.value)}
        placeholder="paperbeta"
      />
      {error ? <p className="error">{error}</p> : null}
      <button className="btn btn-primary" type="submit" disabled={loading}>
        {loading ? "Redirecting..." : "Start Pro"}
      </button>
    </form>
  );
}
