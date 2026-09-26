import { useContext } from "solid-js";

import { LabContext } from "src/context/LabContext";

/** The lab the page renders, from the nearest `LabContext` provider. */
export const useLab = () => {
  const lab = useContext(LabContext);

  if (lab === undefined) {
    throw new Error("Render the lab's components inside LabContext.");
  }

  return lab;
};
