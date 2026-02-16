"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import {
  CRS_OFFICIAL_SOURCES,
  type CanadianEducationType,
  calculateCRSEstimate,
  type CRSInput,
  type FrenchLevel,
  type JobOfferType,
  type MaritalStatus,
  type EducationLevel,
  buildCRSRecommendations,
} from "@/lib/crs";

const ageOptions = Array.from({ length: 29 }, (_, i) => i + 17);
const clbOptions = [4, 5, 6, 7, 8, 9, 10];

const educationOptions: { value: EducationLevel; label: string }[] = [
  { value: "secondary", label: "Secondary" },
  { value: "one_year", label: "1-year credential" },
  { value: "two_year", label: "2-year credential" },
  { value: "bachelor", label: "Bachelor (3+ years)" },
  { value: "two_or_more", label: "Two or more (one 3+ years)" },
  { value: "master_professional", label: "Master / Professional" },
  { value: "phd", label: "PhD" },
];

const jobOfferOptions: { value: JobOfferType; label: string }[] = [
  { value: "none", label: "None" },
  { value: "noc00", label: "NOC 00" },
  { value: "other", label: "Other" },
];

const canadianEducationOptions: { value: CanadianEducationType; label: string }[] = [
  { value: "none", label: "None" },
  { value: "one_two_years", label: "1-2 years" },
  { value: "three_plus_years", label: "3+ years" },
];

const frenchOptions: { value: FrenchLevel; label: string }[] = [
  { value: "none", label: "None" },
  { value: "clb7_all", label: "CLB 7+ all abilities" },
];

const defaultInput: CRSInput = {
  maritalStatus: "single",
  age: 29,
  education: "bachelor",
  listeningClb: 8,
  readingClb: 8,
  writingClb: 8,
  speakingClb: 8,
  canadianWorkYears: 0,
  foreignWorkYears: 1,
  provincialNomination: false,
  jobOffer: "none",
  canadianEducation: "none",
  siblingInCanada: false,
  french: "none",
};

export default function CRSPage() {
  const router = useRouter();
  const [checking, setChecking] = useState(true);
  const [isPro, setIsPro] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [gateError, setGateError] = useState<string | null>(null);
  const [input, setInput] = useState<CRSInput>(defaultInput);

  useEffect(() => {
    let mounted = true;

    const checkAccess = async () => {
      try {
        const supabase = createSupabaseBrowserClient();
        const { data: userData } = await supabase.auth.getUser();
        const user = userData.user;

        if (!user) {
          router.replace("/login");
          return;
        }
        if (mounted) setUserId(user.id);

        const planRes = await fetch("/api/plan");
        const planPayload = (await planRes.json().catch(() => ({}))) as { isPro?: boolean };
        if (!planRes.ok || planPayload.isPro !== true) {
          router.replace("/pricing");
          return;
        }

        if (mounted) {
          setIsPro(true);
          setChecking(false);
        }
      } catch (error) {
        if (mounted) {
          setGateError(error instanceof Error ? error.message : "Unable to verify access.");
          setChecking(false);
        }
      }
    };

    checkAccess();

    return () => {
      mounted = false;
    };
  }, [router]);

  const result = useMemo(() => calculateCRSEstimate(input), [input]);
  const recommendations = useMemo(() => buildCRSRecommendations(input, result.total), [input, result.total]);

  const saveScore = async () => {
    if (!userId) return;
    setSaving(true);
    setSaveMessage(null);
    try {
      const supabase = createSupabaseBrowserClient();
      const { error } = await supabase
        .from("profiles")
        .update({
          crs_score: result.total,
          crs_score_updated_at: new Date().toISOString(),
        })
        .eq("id", userId);

      if (error) {
        setSaveMessage("Could not save score. Please apply latest DB schema and try again.");
      } else {
        setSaveMessage("CRS score saved. Home will show your latest score.");
      }
    } catch {
      setSaveMessage("Could not save score right now.");
    } finally {
      setSaving(false);
    }
  };

  if (checking) {
    return (
      <div className="stack-16">
        <article className="card">
          <p className="muted">Checking Pro access...</p>
        </article>
      </div>
    );
  }

  if (gateError) {
    return (
      <div className="stack-16">
        <article className="card stack-8">
          <h2>Access check failed</h2>
          <p className="error">{gateError}</p>
          <Link href="/pricing" className="btn btn-secondary">Go to Pricing</Link>
        </article>
      </div>
    );
  }

  if (!isPro) return null;

  return (
    <div className="stack-16">
      <header className="stack-8">
        <p className="eyebrow">🧮 Express Entry</p>
        <h1>CRS Points Calculator</h1>
        <p className="hint">Organizational estimate only - always verify on Canada.ca.</p>
      </header>

      <article className="card stack-12">
        <h3>🧾 Profile inputs</h3>

        <div className="field-grid">
          <div>
            <label>Marital status</label>
            <select
              value={input.maritalStatus}
              onChange={(e) => setInput((prev) => ({ ...prev, maritalStatus: e.target.value as MaritalStatus }))}
            >
              <option value="single">Single</option>
              <option value="married">Married</option>
            </select>
            <p className="hint small">Married mode uses a simplified split-factor estimate.</p>
          </div>

          <div>
            <label>Age</label>
            <select value={input.age} onChange={(e) => setInput((prev) => ({ ...prev, age: Number(e.target.value) }))}>
              {ageOptions.map((age) => (
                <option key={age} value={age}>{age}</option>
              ))}
            </select>
          </div>

          <div className="full-row">
            <label>Education</label>
            <select
              value={input.education}
              onChange={(e) => setInput((prev) => ({ ...prev, education: e.target.value as EducationLevel }))}
            >
              {educationOptions.map((item) => (
                <option key={item.value} value={item.value}>{item.label}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="field-grid">
          <div>
            <label>Listening (CLB)</label>
            <select
              value={input.listeningClb}
              onChange={(e) => setInput((prev) => ({ ...prev, listeningClb: Number(e.target.value) }))}
            >
              {clbOptions.map((clb) => (
                <option key={clb} value={clb}>{clb === 10 ? "10+" : clb}</option>
              ))}
            </select>
          </div>

          <div>
            <label>Reading (CLB)</label>
            <select
              value={input.readingClb}
              onChange={(e) => setInput((prev) => ({ ...prev, readingClb: Number(e.target.value) }))}
            >
              {clbOptions.map((clb) => (
                <option key={clb} value={clb}>{clb === 10 ? "10+" : clb}</option>
              ))}
            </select>
          </div>

          <div>
            <label>Writing (CLB)</label>
            <select
              value={input.writingClb}
              onChange={(e) => setInput((prev) => ({ ...prev, writingClb: Number(e.target.value) }))}
            >
              {clbOptions.map((clb) => (
                <option key={clb} value={clb}>{clb === 10 ? "10+" : clb}</option>
              ))}
            </select>
          </div>

          <div>
            <label>Speaking (CLB)</label>
            <select
              value={input.speakingClb}
              onChange={(e) => setInput((prev) => ({ ...prev, speakingClb: Number(e.target.value) }))}
            >
              {clbOptions.map((clb) => (
                <option key={clb} value={clb}>{clb === 10 ? "10+" : clb}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="field-grid">
          <div>
            <label>Canadian work experience</label>
            <select
              value={input.canadianWorkYears}
              onChange={(e) => setInput((prev) => ({ ...prev, canadianWorkYears: Number(e.target.value) }))}
            >
              {[0, 1, 2, 3, 4, 5].map((y) => (
                <option key={y} value={y}>{y === 5 ? "5+ years" : `${y} year${y === 1 ? "" : "s"}`}</option>
              ))}
            </select>
          </div>

          <div>
            <label>Foreign work experience</label>
            <select
              value={input.foreignWorkYears}
              onChange={(e) => setInput((prev) => ({ ...prev, foreignWorkYears: Number(e.target.value) }))}
            >
              {[0, 1, 2, 3].map((y) => (
                <option key={y} value={y}>{y === 3 ? "3+ years" : `${y} year${y === 1 ? "" : "s"}`}</option>
              ))}
            </select>
          </div>

          <div>
            <label>Provincial nomination</label>
            <select
              value={input.provincialNomination ? "yes" : "no"}
              onChange={(e) => setInput((prev) => ({ ...prev, provincialNomination: e.target.value === "yes" }))}
            >
              <option value="no">No</option>
              <option value="yes">Yes (+600)</option>
            </select>
          </div>

          <div>
            <label>Job offer</label>
            <select
              value={input.jobOffer}
              onChange={(e) => setInput((prev) => ({ ...prev, jobOffer: e.target.value as JobOfferType }))}
            >
              {jobOfferOptions.map((item) => (
                <option key={item.value} value={item.value}>{item.label}</option>
              ))}
            </select>
          </div>

          <div>
            <label>Canadian education</label>
            <select
              value={input.canadianEducation}
              onChange={(e) => setInput((prev) => ({ ...prev, canadianEducation: e.target.value as CanadianEducationType }))}
            >
              {canadianEducationOptions.map((item) => (
                <option key={item.value} value={item.value}>{item.label}</option>
              ))}
            </select>
          </div>

          <div>
            <label>Sibling in Canada</label>
            <select
              value={input.siblingInCanada ? "yes" : "no"}
              onChange={(e) => setInput((prev) => ({ ...prev, siblingInCanada: e.target.value === "yes" }))}
            >
              <option value="no">No</option>
              <option value="yes">Yes (+15)</option>
            </select>
          </div>

          <div className="full-row">
            <label>French</label>
            <select
              value={input.french}
              onChange={(e) => setInput((prev) => ({ ...prev, french: e.target.value as FrenchLevel }))}
            >
              {frenchOptions.map((item) => (
                <option key={item.value} value={item.value}>{item.label}</option>
              ))}
            </select>
          </div>
        </div>
      </article>

      <article className="card stack-8">
        <h3>📈 Score</h3>
        <p className="crs-total">{result.total}</p>
        <p className="muted">Live estimate from your selected profile factors.</p>
        <button type="button" className="btn btn-primary" onClick={saveScore} disabled={saving}>
          {saving ? "Saving..." : "Save score to Home"}
        </button>
        {saveMessage ? <p className={saveMessage.startsWith("CRS score saved") ? "success" : "error"}>{saveMessage}</p> : null}
      </article>

      <article className="card stack-8">
        <h3>🧠 Breakdown</h3>
        <div className="breakdown-grid">
          <div className="break-item">
            <p className="muted">Core / Human Capital</p>
            <p className="break-value">{result.coreHumanCapital}</p>
          </div>
          <div className="break-item">
            <p className="muted">Skill Transferability</p>
            <p className="break-value">{result.skillTransferability}</p>
          </div>
          <div className="break-item">
            <p className="muted">Additional</p>
            <p className="break-value">{result.additional}</p>
          </div>
        </div>
      </article>

      <article className="card stack-8">
        <h3>🧠 Recommendations</h3>
        <ul className="tips-list">
          {recommendations.map((tip) => (
            <li key={tip}>{tip}</li>
          ))}
        </ul>
      </article>

      <article className="card stack-8">
        <h3>🧾 Official sources</h3>
        <a href={CRS_OFFICIAL_SOURCES.criteria} target="_blank" rel="noreferrer" className="text-link">
          CRS criteria and points (IRCC)
        </a>
        <a href={CRS_OFFICIAL_SOURCES.rounds} target="_blank" rel="noreferrer" className="text-link">
          Ministerial Instructions / rounds of invitations
        </a>
        <a href={CRS_OFFICIAL_SOURCES.overview} target="_blank" rel="noreferrer" className="text-link">
          How Express Entry works
        </a>
      </article>
    </div>
  );
}
