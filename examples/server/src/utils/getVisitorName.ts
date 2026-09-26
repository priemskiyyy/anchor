import { MAXIMUM_NAME_LENGTH } from "src/utils/constants/server";

/** The sign-up form's name, trimmed and bounded, or `Visitor` when it gave none. */
export const getVisitorName = (value: FormDataEntryValue | null) => {
  const name =
    typeof value === "string" ? value.trim().slice(0, MAXIMUM_NAME_LENGTH) : "";

  return name === "" ? "Visitor" : name;
};
