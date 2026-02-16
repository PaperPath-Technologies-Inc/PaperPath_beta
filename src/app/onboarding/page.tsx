import { redirect } from "next/navigation";
import { generateInitialReminders } from "@/lib/reminders";
import { requireUser, getProfile } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";

async function saveOnboarding(formData: FormData) {
  "use server";

  const supabase = createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const status = formData.get("status") as "student" | "pgwp";
  const expiryDate = formData.get("expiry_date") as string;
  const city = (formData.get("city") as string) || null;

  if (!status || !expiryDate) return;

  const { error: upsertError } = await supabase.from("profiles").upsert({
    id: user.id,
    status,
    expiry_date: expiryDate,
    study_permit_expiry_date: expiryDate,
    knows_expiry: true,
    city,
  });

  if (upsertError) {
    const { error: fallbackError } = await supabase.from("profiles").upsert({
      id: user.id,
      status,
      expiry_date: expiryDate,
      city,
    });

    if (fallbackError) {
      redirect("/onboarding?error=save_failed");
    }
  }

  const { data: existing } = await supabase
    .from("reminders")
    .select("id")
    .eq("user_id", user.id)
    .in("category", ["study_milestone", "pgwp_deadline"]);

  if (!existing?.length) {
    const reminders = generateInitialReminders(user.id, status, expiryDate);
    if (reminders.length) {
      await supabase.from("reminders").insert(reminders);
    }
  }

  await supabase.from("notifications").insert({
    user_id: user.id,
    type: "onboarding",
    title: "Profile setup complete",
    body: "Your initial reminders are ready.",
  });

  redirect("/home");
}

export default async function OnboardingPage({
  searchParams,
}: {
  searchParams?: { error?: string };
}) {
  const user = await requireUser();
  const profile = await getProfile(user.id);
  const errorText = searchParams?.error === "save_failed" ? "Could not save profile. Please try again." : null;

  if (profile?.status && profile?.expiry_date) {
    redirect("/home");
  }

  return (
    <main className="screen">
      <section className="shell">
        <article className="card">
          <h1>Onboarding</h1>
          <p>Set your status and expiry date to generate deadline reminders.</p>
          {errorText && <p className="error">{errorText}</p>}
          <form action={saveOnboarding} className="stack-12">
            <label>Status</label>
            <select name="status" required defaultValue="student">
              <option value="student">Student</option>
              <option value="pgwp">PGWP</option>
            </select>

            <label>Permit expiry date</label>
            <input type="date" name="expiry_date" required />

            <label>City (optional)</label>
            <input type="text" name="city" placeholder="Toronto" />

            <button type="submit" className="btn btn-primary">
              Save and continue
            </button>
          </form>
        </article>
      </section>
    </main>
  );
}
