import { AnchorError } from "src/utils/AnchorError";

export const createDisposedError = () =>
  new AnchorError({ code: "DISPOSED", message: "The Anchor was disposed." });
