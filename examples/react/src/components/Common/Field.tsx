import type React from "react";
import { useId } from "react";

import {
  FIELD_LABEL_CLASS_NAME,
  FIELD_VALUE_CLASS_NAME,
} from "example-shared/ui/styles/fieldStyles";

type FieldProps = { label: string; value: string };

export const Field: React.FunctionComponent<FieldProps> = ({
  label,
  value,
}) => {
  const labelId = useId();

  return (
    <>
      <dt id={labelId} className={FIELD_LABEL_CLASS_NAME}>
        {label}
      </dt>
      <dd aria-labelledby={labelId} className={FIELD_VALUE_CLASS_NAME}>
        {value}
      </dd>
    </>
  );
};
