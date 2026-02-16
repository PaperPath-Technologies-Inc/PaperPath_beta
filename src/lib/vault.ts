export const VAULT_DOC_TYPES = [
  "passport",
  "study_permit",
  "program_proof",
  "transcript_or_completion",
  "address_proof",
  "other",
] as const;

export type VaultDocType = (typeof VAULT_DOC_TYPES)[number];

export const VAULT_DOC_TYPE_LABELS: Record<VaultDocType, string> = {
  passport: "Passport",
  study_permit: "Study Permit",
  program_proof: "Program Proof",
  transcript_or_completion: "Transcript / Completion",
  address_proof: "Address Proof",
  other: "Other",
};

export const VAULT_DOC_TYPE_HINTS: Record<VaultDocType, string> = {
  passport: "Upload your current passport copy.",
  study_permit: "Keep the latest study permit copy in one place.",
  program_proof: "Store school letters that confirm your program details.",
  transcript_or_completion: "Add transcript or completion records when available.",
  address_proof: "Keep one recent address proof document.",
  other: "Use this for any additional personal records.",
};

export function isVaultDocType(value: string | null | undefined): value is VaultDocType {
  if (!value) return false;
  return (VAULT_DOC_TYPES as readonly string[]).includes(value);
}

export function normalizeVaultDocType(value: string | null | undefined): VaultDocType {
  return isVaultDocType(value) ? value : "other";
}

export function getRecommendedVaultTypes(profile?: {
  study_permit_expiry_date?: string | null;
  program_end_date?: string | null;
  city?: string | null;
}): VaultDocType[] {
  void profile;
  return ["passport", "study_permit", "program_proof", "transcript_or_completion", "address_proof"];
}

export type VaultChecklistItem = {
  doc_type: VaultDocType;
  label: string;
  required: boolean;
  uploaded: boolean;
  hint: string;
};

export function buildVaultChecklist(uploadedTypes: Set<VaultDocType>, profile?: {
  study_permit_expiry_date?: string | null;
  program_end_date?: string | null;
  city?: string | null;
}): VaultChecklistItem[] {
  const required = new Set(getRecommendedVaultTypes(profile));

  return VAULT_DOC_TYPES.map((docType) => ({
    doc_type: docType,
    label: VAULT_DOC_TYPE_LABELS[docType],
    required: required.has(docType),
    uploaded: uploadedTypes.has(docType),
    hint: VAULT_DOC_TYPE_HINTS[docType],
  }));
}
