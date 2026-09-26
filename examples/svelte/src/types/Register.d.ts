import type { LabAnchor } from "example-shared/providers/types/LabAnchor";

declare module "@priemskiyyy/anchor-svelte" {
  interface Register {
    anchor: LabAnchor;
  }
}
