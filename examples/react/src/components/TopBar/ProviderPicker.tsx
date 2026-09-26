import type React from "react";
import type { ChangeEvent } from "react";

import { Monogram } from "src/components/Common/Monogram";
import { useLab } from "src/hooks/useLab";
import { useObservable } from "src/hooks/useObservable";

export const ProviderPicker: React.FunctionComponent = () => {
  const lab = useLab();
  const { provider } = useObservable(lab.runtime);

  const handleProviderChange = (event: ChangeEvent<HTMLSelectElement>) => {
    lab.selectProvider(event.target.value);
  };

  return (
    <label className="flex items-center gap-2 text-sm">
      <span className="font-medium text-zinc-700 dark:text-zinc-300">
        Provider
      </span>
      <Monogram
        text={provider.icon.monogram}
        tone={provider.icon.tone}
        shape="tile"
      />
      <select
        value={provider.id}
        onChange={handleProviderChange}
        className="h-9 rounded-lg border border-zinc-300 bg-white px-2 text-sm font-medium shadow-sm dark:border-zinc-700 dark:bg-zinc-900"
      >
        {lab.catalog.map(({ id, label }) => (
          <option key={id} value={id}>
            {label}
          </option>
        ))}
      </select>
    </label>
  );
};
