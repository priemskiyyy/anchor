import type { LabAnchor } from "example-shared/providers/types/LabAnchor";

declare module "@priemskiyyy/anchor-react" {
  interface Register {
    anchor: LabAnchor;
  }
}
