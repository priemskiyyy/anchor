import type { LabAnchor } from "example-shared/providers/types/LabAnchor";

declare module "@priemskiyyy/anchor-solid" {
  interface Register {
    anchor: LabAnchor;
  }
}
