import { useContext } from "react";

import { LabContext } from "src/context/LabContext";

/** The lab the app renders, from the nearest `LabContext` provider. */
export const useLab = () => {
  const lab = useContext(LabContext);

  if (lab === null) {
    throw new Error("Render the lab's components inside LabContext.");
  }

  return lab;
};
