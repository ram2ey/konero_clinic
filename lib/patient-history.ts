export type SystemicEnquiryState = {
  general: string;
  respiratory: string;
  cardiovascular: string;
  abdominal: string;
  genitourinary: string;
  centralNervous: string;
};

export type PastMedicalHistoryState = {
  seizureDisorder: string;
  sickleCellDisease: string;
  asthma: string;
  hypertension: string;
  diabetes: string;
  tuberculosis: string;
  headInjury: string;
  roadTrafficAccident: string;
  other: string;
};

export type TreatmentHistoryState = {
  orthodoxMedications: string;
  herbalMedications: string;
  allergies: string;
  churchPrayerCamps: string;
  other: string;
};

export type FamilyHistoryState = {
  father: string;
  mother: string;
  siblings: string;
  seizureDisorder: string;
  mentalIllness: string;
  suicide: string;
  addiction: string;
  hypertension: string;
  diabetes: string;
  asthma: string;
  sickleCellDisease: string;
};

export type PersonalHistoryState = {
  pregnancyAndBirth: string;
  earlyChildhoodAndDevelopment: string;
  education: string;
  occupation: string;
  psychosexualRelationship: string;
  maritalHistory: string;
  socialHistory: string;
  forensicHistory: string;
};

export type HistoryState = {
  presentingComplaints: string;
  historyOfPresentingComplaints: string;
  onDirectQuestion: string;
  systemicEnquiry: SystemicEnquiryState;
  pastPsychiatricHistory: string;
  pastMedicalHistory: PastMedicalHistoryState;
  pastSurgicalHistory: string;
  treatmentHistory: TreatmentHistoryState;
  familyHistory: FamilyHistoryState;
  personalHistory: PersonalHistoryState;
  substanceUseAddictionHistory: string;
  premorbidPersonality: string;
};

export const EMPTY_HISTORY: HistoryState = {
  presentingComplaints: "",
  historyOfPresentingComplaints: "",
  onDirectQuestion: "",
  systemicEnquiry: {
    general: "",
    respiratory: "",
    cardiovascular: "",
    abdominal: "",
    genitourinary: "",
    centralNervous: "",
  },
  pastPsychiatricHistory: "",
  pastMedicalHistory: {
    seizureDisorder: "",
    sickleCellDisease: "",
    asthma: "",
    hypertension: "",
    diabetes: "",
    tuberculosis: "",
    headInjury: "",
    roadTrafficAccident: "",
    other: "",
  },
  pastSurgicalHistory: "",
  treatmentHistory: {
    orthodoxMedications: "",
    herbalMedications: "",
    allergies: "",
    churchPrayerCamps: "",
    other: "",
  },
  familyHistory: {
    father: "",
    mother: "",
    siblings: "",
    seizureDisorder: "",
    mentalIllness: "",
    suicide: "",
    addiction: "",
    hypertension: "",
    diabetes: "",
    asthma: "",
    sickleCellDisease: "",
  },
  personalHistory: {
    pregnancyAndBirth: "",
    earlyChildhoodAndDevelopment: "",
    education: "",
    occupation: "",
    psychosexualRelationship: "",
    maritalHistory: "",
    socialHistory: "",
    forensicHistory: "",
  },
  substanceUseAddictionHistory: "",
  premorbidPersonality: "",
};

export function mapDbHistoryToState(raw: unknown): HistoryState {
  if (!raw || typeof raw !== "object") {
    return { ...EMPTY_HISTORY };
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const obj = raw as Record<string, any>;
  const systemic = obj.systemicEnquiry || obj.systemic_enquiry || {};
  const pastMed = obj.pastMedicalHistory || obj.past_medical_history || {};
  const treatment = obj.treatmentHistory || obj.treatment_history || {};
  const family = obj.familyHistory || obj.family_history || {};
  const personal = obj.personalHistory || obj.personal_history || {};

  return {
    presentingComplaints: obj.presentingComplaints ?? obj.presenting_complaints ?? "",
    historyOfPresentingComplaints:
      obj.historyOfPresentingComplaints ?? obj.history_of_presenting_complaints ?? "",
    onDirectQuestion: obj.onDirectQuestion ?? obj.on_direct_question ?? "",
    systemicEnquiry: {
      general: systemic.general ?? "",
      respiratory: systemic.respiratory ?? "",
      cardiovascular: systemic.cardiovascular ?? "",
      abdominal: systemic.abdominal ?? "",
      genitourinary: systemic.genitourinary ?? "",
      centralNervous: systemic.centralNervous ?? systemic.central_nervous ?? "",
    },
    pastPsychiatricHistory: obj.pastPsychiatricHistory ?? obj.past_psychiatric_history ?? "",
    pastMedicalHistory: {
      seizureDisorder: pastMed.seizureDisorder ?? pastMed.seizure_disorder ?? "",
      sickleCellDisease: pastMed.sickleCellDisease ?? pastMed.sickle_cell_disease ?? "",
      asthma: pastMed.asthma ?? "",
      hypertension: pastMed.hypertension ?? "",
      diabetes: pastMed.diabetes ?? "",
      tuberculosis: pastMed.tuberculosis ?? "",
      headInjury: pastMed.headInjury ?? pastMed.head_injury ?? "",
      roadTrafficAccident: pastMed.roadTrafficAccident ?? pastMed.road_traffic_accident ?? "",
      other: pastMed.other ?? "",
    },
    pastSurgicalHistory: obj.pastSurgicalHistory ?? obj.past_surgical_history ?? "",
    treatmentHistory: {
      orthodoxMedications: treatment.orthodoxMedications ?? treatment.orthodox_medications ?? "",
      herbalMedications: treatment.herbalMedications ?? treatment.herbal_medications ?? "",
      allergies: treatment.allergies ?? "",
      churchPrayerCamps: treatment.churchPrayerCamps ?? treatment.church_prayer_camps ?? "",
      other: treatment.other ?? "",
    },
    familyHistory: {
      father: family.father ?? "",
      mother: family.mother ?? "",
      siblings: family.siblings ?? "",
      seizureDisorder: family.seizureDisorder ?? family.seizure_disorder ?? "",
      mentalIllness: family.mentalIllness ?? family.mental_illness ?? "",
      suicide: family.suicide ?? "",
      addiction: family.addiction ?? "",
      hypertension: family.hypertension ?? "",
      diabetes: family.diabetes ?? "",
      asthma: family.asthma ?? "",
      sickleCellDisease: family.sickleCellDisease ?? family.sickle_cell_disease ?? "",
    },
    personalHistory: {
      pregnancyAndBirth: personal.pregnancyAndBirth ?? personal.pregnancy_and_birth ?? "",
      earlyChildhoodAndDevelopment:
        personal.earlyChildhoodAndDevelopment ?? personal.early_childhood_and_development ?? "",
      education: personal.education ?? "",
      occupation: personal.occupation ?? "",
      psychosexualRelationship:
        personal.psychosexualRelationship ?? personal.psychosexual_relationship ?? "",
      maritalHistory: personal.maritalHistory ?? personal.marital_history ?? "",
      socialHistory: personal.socialHistory ?? personal.social_history ?? "",
      forensicHistory: personal.forensicHistory ?? personal.forensic_history ?? "",
    },
    substanceUseAddictionHistory:
      obj.substanceUseAddictionHistory ?? obj.substance_use_addiction_history ?? "",
    premorbidPersonality: obj.premorbidPersonality ?? obj.premorbid_personality ?? "",
  };
}
