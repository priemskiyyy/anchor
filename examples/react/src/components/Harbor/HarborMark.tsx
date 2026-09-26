import { Notebook } from "@phosphor-icons/react";
import type React from "react";

export const HarborMark: React.FunctionComponent = () => (
  <span
    aria-hidden="true"
    className="mx-auto inline-flex size-11 items-center justify-center rounded-2xl bg-teal-600 text-white shadow-sm dark:bg-teal-500 dark:text-zinc-950"
  >
    <Notebook size={24} weight="duotone" />
  </span>
);
