import type { AnchorSnapshot } from "@priemskiyyy/anchor";

import { AnchorIcon } from "src/components/AnchorIcon";
import { useAutoFocus } from "src/hooks/useAutoFocus";

type LauncherProps = {
  status: AnchorSnapshot["session"]["status"];
  autoFocus: boolean;
  onOpen: () => void;
};

export const Launcher = (props: LauncherProps) => {
  const focusOnMount = useAutoFocus(props.autoFocus);

  return (
    <button
      ref={focusOnMount}
      type="button"
      class="launcher"
      aria-label="Open Anchor devtools"
      onClick={() => props.onOpen()}
    >
      <AnchorIcon />
      <span>Anchor</span>
      <span class="dot" data-state={props.status} />
    </button>
  );
};
