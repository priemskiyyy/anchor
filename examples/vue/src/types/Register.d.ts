import type { LabAnchor } from "example-shared/providers/types/LabAnchor";

declare module "@priemskiyyy/anchor-vue" {
  interface Register {
    anchor: LabAnchor;
  }
}
