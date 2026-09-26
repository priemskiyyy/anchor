import { LAB_CONTEXT } from "src/utilities/constants/lab";

/** The lab the page renders, from the context `Application.svelte` set. */
export const useLab = () => {
  const [getLab] = LAB_CONTEXT;

  return getLab();
};
