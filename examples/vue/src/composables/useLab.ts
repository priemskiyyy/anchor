import { inject } from "vue";

import { LAB_KEY } from "src/utils/constants/lab";

/** The lab the page renders, as `Application.vue` provides it. */
export const useLab = () => {
  const lab = inject(LAB_KEY);

  if (lab === undefined) {
    throw new Error("Render the lab's components inside Application.vue.");
  }

  return lab;
};
