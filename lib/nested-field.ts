import type { Dispatch, SetStateAction } from "react";

/**
 * Returns a setter for one nested object field within a larger form
 * state, e.g. `createNestedFieldSetter(setHistory, "systemicEnquiry")`
 * gives back a function that updates `history.systemicEnquiry.<field>` —
 * so a form with several nested sections (MSE's thought/cognition,
 * History's systemicEnquiry/pastMedicalHistory/etc.) doesn't need one
 * hand-written setter per section, all with the same three-line shape.
 */
export function createNestedFieldSetter<P, K extends keyof P>(setParent: Dispatch<SetStateAction<P>>, sectionKey: K) {
  return function setField<F extends keyof P[K]>(field: F, value: P[K][F]) {
    setParent((prev) => ({
      ...prev,
      [sectionKey]: { ...prev[sectionKey], [field]: value },
    }));
  };
}
