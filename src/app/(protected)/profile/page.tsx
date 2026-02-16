import Link from "next/link";
import { redirect } from "next/navigation";
import { requireCompletedProfile } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { SignOutButton } from "@/components/SignOutButton";
import { FooterLinks } from "@/components/FooterLinks";
import type { StatusType } from "@/lib/types";
import { getPgwpSnapshot, recalculatePgwp } from "@/lib/pgwpSnapshot";
import { normalizeDateOnlyOptional, normalizeDateOnlyRequired, sanitizeErrorMessage } from "@/lib/dateOnly";

async function updateProfile(formData: FormData) {
  "use server";

  const supabase = createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const status = formData.get("status") as StatusType;
  const expiryDateRaw = formData.get("expiry_date") as string;
  const knowsExpiry = formData.get("knows_expiry") === "on";
  const studyPermitExpiryDateRaw = (formData.get("study_permit_expiry_date") as string) || null;
  const programEndDateRaw = (formData.get("program_end_date") as string) || null;
  const cityInput = (formData.get("city") as string | null) ?? "";
  const city = cityInput.trim() ? cityInput.trim() : null;
  const expiryDateParsed = normalizeDateOnlyRequired(expiryDateRaw);
  const studyPermitParsed = normalizeDateOnlyOptional(studyPermitExpiryDateRaw);
  const programEndParsed = normalizeDateOnlyOptional(programEndDateRaw);

  if (!["student", "pgwp"].includes(status) || expiryDateParsed.error) {
    redirect("/profile?updated=0&error_message=Status%20and%20a%20valid%20expiry%20date%20are%20required.");
  }
  if (studyPermitParsed.error) {
    redirect(`/profile?updated=0&error_message=${encodeURIComponent(studyPermitParsed.error)}`);
  }
  if (programEndParsed.error) {
    redirect(`/profile?updated=0&error_message=${encodeURIComponent(programEndParsed.error)}`);
  }

  const baseUpdate = {
    status,
    expiry_date: expiryDateParsed.value,
    city,
    updated_at: new Date().toISOString(),
  };

  const fullUpdate = {
    ...baseUpdate,
    study_permit_expiry_date: studyPermitParsed.value ?? expiryDateParsed.value,
    knows_expiry: knowsExpiry,
    program_end_date: programEndParsed.value,
  };

  const { error } = await supabase
    .from("profiles")
    .update(fullUpdate)
    .eq("id", user.id);

  if (error) {
    console.error("Profile full update failed", {
      userId: user.id,
      payload: fullUpdate,
      error,
    });
    // Backward compatibility: if optional risk columns do not exist yet,
    // still save core profile fields.
    const { error: fallbackError } = await supabase
      .from("profiles")
      .update(baseUpdate)
      .eq("id", user.id);

    if (fallbackError) {
      console.error("Profile base update failed", {
        userId: user.id,
        payload: baseUpdate,
        error: fallbackError,
      });
      redirect(`/profile?updated=0&error_message=${encodeURIComponent(sanitizeErrorMessage(fallbackError.message, "Could not update profile."))}`);
    }

    // Best-effort updates for new optional columns.
    const { error: optionalError } = await supabase
      .from("profiles")
      .update({
        study_permit_expiry_date: studyPermitParsed.value ?? expiryDateParsed.value,
        knows_expiry: knowsExpiry,
        program_end_date: programEndParsed.value,
      })
      .eq("id", user.id);

    if (optionalError) {
      console.error("Profile optional update failed", {
        userId: user.id,
        payload: {
          study_permit_expiry_date: studyPermitParsed.value ?? expiryDateParsed.value,
          knows_expiry: knowsExpiry,
          program_end_date: programEndParsed.value,
        },
        error: optionalError,
      });
      redirect(`/profile?updated=partial&error_message=${encodeURIComponent(sanitizeErrorMessage(optionalError.message, "Could not save PGWP profile fields."))}`);
    }
  }

  await recalculatePgwp(user.id).catch(() => null);
  redirect("/profile?updated=1");
}

export default async function ProfilePage({
  searchParams,
}: {
  searchParams?: { updated?: string; error_message?: string };
}) {
  const { user, profile } = await requireCompletedProfile();
  const snapshot = await getPgwpSnapshot(user.id);
  const debugPlanLabel = snapshot.plan_owner_override
    ? "PRO (Owner)"
    : snapshot.plan === "pro"
      ? "PRO"
      : "FREE";
  const updated = searchParams?.updated;
  const statusMessage =
    updated === "1"
      ? "Profile updated successfully."
      : updated === "partial"
        ? (searchParams?.error_message ?? "Core profile saved, but PGWP fields (program/permit extras) were not saved. Apply latest DB schema and try again.")
        : updated === "0"
          ? (searchParams?.error_message ?? "Could not update profile.")
          : null;

  return (
    <div className="stack-16">
      <header className="inline-head">
        <div>
          <p className="eyebrow">Profile</p>
          <h1>Account</h1>
        </div>
      </header>

      <article className="card stack-8">
        <p><strong>Email:</strong> {user.email}</p>
        <p><strong>Status:</strong> {profile.status}</p>
        <p><strong>Study permit expiry:</strong> {profile.study_permit_expiry_date ?? profile.expiry_date ?? "Not set"}</p>
        <p><strong>Program end date:</strong> {profile.program_end_date ?? "Not set"}</p>
        <p><strong>City:</strong> {profile.city ?? "Not set"}</p>
        <p><strong>Plan:</strong> {debugPlanLabel}</p>
      </article>

      <article className="card stack-12">
        <h3>Update Profile</h3>
        {statusMessage && <p className={updated === "1" ? "success" : "error"}>{statusMessage}</p>}
        <form action={updateProfile} className="stack-12">
          <label htmlFor="status">Immigration status</label>
          <select id="status" name="status" required defaultValue={profile.status ?? "student"}>
            <option value="student">Student</option>
            <option value="pgwp">PGWP</option>
          </select>

          <label htmlFor="expiry_date">Status expiry date</label>
          <input id="expiry_date" type="date" name="expiry_date" required defaultValue={profile.expiry_date ?? ""} />

          <label htmlFor="study_permit_expiry_date">Study permit expiry date</label>
          <input
            id="study_permit_expiry_date"
            type="date"
            name="study_permit_expiry_date"
            defaultValue={profile.study_permit_expiry_date ?? profile.expiry_date ?? ""}
          />

          <label htmlFor="knows_expiry" style={{ display: "inline-flex", alignItems: "center", gap: "0.5rem" }}>
            <input
              id="knows_expiry"
              type="checkbox"
              name="knows_expiry"
              defaultChecked={profile.knows_expiry ?? Boolean(profile.study_permit_expiry_date ?? profile.expiry_date)}
              style={{ width: "auto" }}
            />
            I know my study permit expiry date
          </label>

          <label htmlFor="program_end_date">Program end date</label>
          <input id="program_end_date" type="date" name="program_end_date" defaultValue={profile.program_end_date ?? ""} />

          <label htmlFor="city">City (optional)</label>
          <input id="city" type="text" name="city" placeholder="Toronto" defaultValue={profile.city ?? ""} />

          <button type="submit" className="btn btn-primary">
            Save profile changes
          </button>
        </form>
      </article>

      <article className="card stack-8">
        <Link href="/notifications" className="text-link">Notifications</Link>
        <Link href="/pricing" className="text-link">Pricing</Link>
        <Link href="/study-permit" className="text-link">Study checklist</Link>
        <Link href="/pgwp" className="text-link">PGWP checklist</Link>
      </article>

      <SignOutButton />
      <FooterLinks />
    </div>
  );
}
