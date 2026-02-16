// Update tables to match latest IRCC CRS rules.
// This module intentionally keeps constants editable and logic centralized.

export type MaritalStatus = "single" | "married";
export type EducationLevel =
  | "secondary"
  | "one_year"
  | "two_year"
  | "bachelor"
  | "two_or_more"
  | "master_professional"
  | "phd";

export type JobOfferType = "none" | "noc00" | "other";
export type CanadianEducationType = "none" | "one_two_years" | "three_plus_years";
export type FrenchLevel = "none" | "clb7_all";

export type CRSInput = {
  maritalStatus: MaritalStatus;
  age: number;
  education: EducationLevel;
  listeningClb: number;
  readingClb: number;
  writingClb: number;
  speakingClb: number;
  canadianWorkYears: number;
  foreignWorkYears: number;
  provincialNomination: boolean;
  jobOffer: JobOfferType;
  canadianEducation: CanadianEducationType;
  siblingInCanada: boolean;
  french: FrenchLevel;
};

export type CRSResult = {
  total: number;
  coreHumanCapital: number;
  skillTransferability: number;
  additional: number;
};

const AGE_POINTS_SINGLE: Record<number, number> = {
  17: 0,
  18: 99,
  19: 105,
  20: 110,
  21: 110,
  22: 110,
  23: 110,
  24: 110,
  25: 110,
  26: 110,
  27: 110,
  28: 110,
  29: 110,
  30: 105,
  31: 99,
  32: 94,
  33: 88,
  34: 83,
  35: 77,
  36: 72,
  37: 66,
  38: 61,
  39: 55,
  40: 50,
  41: 39,
  42: 28,
  43: 17,
  44: 6,
  45: 0,
};

const EDUCATION_POINTS_SINGLE: Record<EducationLevel, number> = {
  secondary: 30,
  one_year: 90,
  two_year: 98,
  bachelor: 120,
  two_or_more: 128,
  master_professional: 135,
  phd: 150,
};

const LANGUAGE_POINTS_PER_ABILITY_SINGLE: Record<number, number> = {
  4: 6,
  5: 6,
  6: 9,
  7: 17,
  8: 23,
  9: 31,
  10: 34,
};

const CANADIAN_WORK_POINTS_SINGLE: Record<number, number> = {
  0: 0,
  1: 40,
  2: 53,
  3: 64,
  4: 72,
  5: 80,
};

const MARITAL_CORE_FACTOR: Record<MaritalStatus, number> = {
  single: 1,
  married: 0.92,
};

const EDUCATION_TRANSFER_CLB9: Record<EducationLevel, number> = {
  secondary: 0,
  one_year: 25,
  two_year: 25,
  bachelor: 50,
  two_or_more: 50,
  master_professional: 50,
  phd: 50,
};

const EDUCATION_TRANSFER_CLB7: Record<EducationLevel, number> = {
  secondary: 0,
  one_year: 13,
  two_year: 13,
  bachelor: 25,
  two_or_more: 25,
  master_professional: 25,
  phd: 25,
};

const JOB_OFFER_POINTS: Record<JobOfferType, number> = {
  none: 0,
  noc00: 200,
  other: 50,
};

const CANADIAN_EDUCATION_POINTS: Record<CanadianEducationType, number> = {
  none: 0,
  one_two_years: 15,
  three_plus_years: 30,
};

function clampAge(age: number) {
  return Math.max(17, Math.min(45, age));
}

function clampClb(clb: number) {
  return Math.max(4, Math.min(10, clb));
}

function normalizeWorkYears(years: number, max: number) {
  return Math.max(0, Math.min(max, years));
}

function languageAbilityPoints(clb: number) {
  return LANGUAGE_POINTS_PER_ABILITY_SINGLE[clampClb(clb)] ?? 0;
}

function educationLanguageTransfer(education: EducationLevel, minClb: number) {
  if (minClb >= 9) return EDUCATION_TRANSFER_CLB9[education];
  if (minClb >= 7) return EDUCATION_TRANSFER_CLB7[education];
  return 0;
}

function foreignLanguageTransfer(foreignWorkYears: number, minClb: number) {
  const y = normalizeWorkYears(foreignWorkYears, 3);
  if (y <= 0) return 0;
  if (minClb >= 9) {
    if (y >= 2) return 50;
    return 25;
  }
  if (minClb >= 7) {
    if (y >= 2) return 25;
    return 13;
  }
  return 0;
}

function foreignCanadianTransfer(foreignWorkYears: number, canadianWorkYears: number) {
  const f = normalizeWorkYears(foreignWorkYears, 3);
  const c = normalizeWorkYears(canadianWorkYears, 5);

  if (f >= 3 && c >= 2) return 50;
  if (f >= 1 && c >= 2) return 25;
  if (f >= 1 && c >= 1) return 13;
  return 0;
}

export function calculateCRSEstimate(input: CRSInput): CRSResult {
  const age = clampAge(input.age);
  const clbList = [input.listeningClb, input.readingClb, input.writingClb, input.speakingClb].map(clampClb);
  const minClb = Math.min(...clbList);
  const canadianWorkYears = normalizeWorkYears(input.canadianWorkYears, 5);
  const foreignWorkYears = normalizeWorkYears(input.foreignWorkYears, 3);

  const coreRaw =
    (AGE_POINTS_SINGLE[age] ?? 0) +
    EDUCATION_POINTS_SINGLE[input.education] +
    clbList.reduce((sum, clb) => sum + languageAbilityPoints(clb), 0) +
    (CANADIAN_WORK_POINTS_SINGLE[canadianWorkYears] ?? 0);

  const coreHumanCapital = Math.round(coreRaw * MARITAL_CORE_FACTOR[input.maritalStatus]);

  const skillTransferability = Math.min(
    100,
    educationLanguageTransfer(input.education, minClb) +
      foreignLanguageTransfer(foreignWorkYears, minClb) +
      foreignCanadianTransfer(foreignWorkYears, canadianWorkYears),
  );

  let additional = 0;
  if (input.provincialNomination) additional += 600;
  additional += JOB_OFFER_POINTS[input.jobOffer];
  additional += CANADIAN_EDUCATION_POINTS[input.canadianEducation];
  if (input.siblingInCanada) additional += 15;

  if (input.french === "clb7_all") {
    additional += minClb >= 5 ? 50 : 25;
  }

  return {
    total: coreHumanCapital + skillTransferability + additional,
    coreHumanCapital,
    skillTransferability,
    additional,
  };
}

export function buildCRSRecommendations(input: CRSInput, total: number): string[] {
  const minClb = Math.min(input.listeningClb, input.readingClb, input.writingClb, input.speakingClb);
  const recommendations: string[] = [];

  if (minClb < 9) {
    recommendations.push("Aim for CLB 9+ to unlock higher CRS and transferability points.");
  }

  if (input.canadianWorkYears < 1) {
    recommendations.push("Consider gaining 1 year of Canadian skilled work experience.");
  }

  if (!input.provincialNomination) {
    recommendations.push("Explore Provincial Nominee Programs (PNPs).");
  }

  if (input.education !== "master_professional" && input.education !== "phd") {
    recommendations.push("Higher credential or ECA strategy may help.");
  }

  if (total < 460) {
    recommendations.push("Focus plan for next 30 days: 1) language retest prep, 2) PNP research, 3) document readiness.");
  }

  return recommendations.slice(0, 5);
}

export const CRS_OFFICIAL_SOURCES = {
  criteria:
    "https://www.canada.ca/en/immigration-refugees-citizenship/services/immigrate-canada/express-entry/check-score/crs-criteria.html",
  rounds:
    "https://www.canada.ca/en/immigration-refugees-citizenship/services/immigrate-canada/express-entry/rounds-invitations.html",
  overview:
    "https://www.canada.ca/en/immigration-refugees-citizenship/services/immigrate-canada/express-entry/check-score.html",
};
