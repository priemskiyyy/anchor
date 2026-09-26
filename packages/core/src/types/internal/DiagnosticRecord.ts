import type { AnchorDiagnosticType } from "src/types/AnchorDiagnosticType";

export type DiagnosticRecord = {
  type: AnchorDiagnosticType;
  session: string | null;
  context?: Record<string, string | number | boolean | null>;
};
