// Shared MSE field labels — the single source of truth for label text,
// used by both the recording form (app/admin/consultations/[id]/new/page.tsx)
// and the read-only display (components/admin/previous-consultations.tsx).
//
// Top-level fields (appearance, behaviour, ... insight) have single-word
// keys, so one map covers both consumers. Thought/Cognition sub-fields
// don't: the recording form's state is camelCase (streamFlow), but the
// display reads directly from the database's jsonb shape, which is
// snake_case (stream_flow) — so those get a camelCase map and a
// snake_case map, both deriving their text from one shared object so a
// label only has to be written once.

export const MSE_FIELD_LABELS: Record<string, string> = {
  appearance: "1. Appearance",
  behaviour: "2. Behaviour",
  mood: "3. Mood",
  affect: "4. Affect",
  perception: "5. Perception",
  speech: "6. Speech",
  insight: "9. Insight",
};

const THOUGHT_TEXT = {
  streamFlow: "Stream / Flow",
  form: "Form",
  content: "Content",
  possession: "Possession",
  control: "Control",
};

const COGNITION_TEXT = {
  orientation: "Orientation",
  memory: "Memory",
  attention: "Attention",
  concentration: "Concentration",
  abstraction: "Abstraction",
  generalFundOfKnowledge: "General Fund of Knowledge",
  judgement: "Judgement",
};

// camelCase — for the recording form's ThoughtState/CognitionState.
export const MSE_THOUGHT_LABELS: Record<string, string> = THOUGHT_TEXT;
export const MSE_COGNITION_LABELS: Record<string, string> = COGNITION_TEXT;

// snake_case — for the read-only display's jsonb-shaped Thought/Cognition.
export const MSE_THOUGHT_LABELS_DB: Record<string, string> = {
  stream_flow: THOUGHT_TEXT.streamFlow,
  form: THOUGHT_TEXT.form,
  content: THOUGHT_TEXT.content,
  possession: THOUGHT_TEXT.possession,
  control: THOUGHT_TEXT.control,
};

export const MSE_COGNITION_LABELS_DB: Record<string, string> = {
  orientation: COGNITION_TEXT.orientation,
  memory: COGNITION_TEXT.memory,
  attention: COGNITION_TEXT.attention,
  concentration: COGNITION_TEXT.concentration,
  abstraction: COGNITION_TEXT.abstraction,
  general_fund_of_knowledge: COGNITION_TEXT.generalFundOfKnowledge,
  judgement: COGNITION_TEXT.judgement,
};
