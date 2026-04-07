// ── Shared Types ──────────────────────────────────────────────
export interface DBEntry {
  id: string | number;
  title: string;
  number: string;
  abstract: string;
  titleScore?: number;
  abstractScore?: number;
  finalScore?: number;
  comparisonType?: "title_only" | "title_and_abstract" | "abstract_only";
}

export interface ParticipantField {
  id: string;
  label: string;
  type: "text" | "date" | "select";
  options?: string[]; // for select type
  required: boolean;
}

export interface Competition {
  id: string;
  name: string;
  ownerEmail: string;
  isPublic: boolean;
  createdAt: number;
  participantFields?: ParticipantField[];
  enableAbstractCheck?: boolean; // AI similarity gate on registration
}

export interface EventAbstract {
  id: string;
  competitionId: string;
  title: string;
  abstract: string;
  number: string;
  submittedAt: number;
}

export interface Participant {
  id: string;
  competitionId: string;
  submittedAt: number;
  data: Record<string, string>; // fieldId -> value
}
