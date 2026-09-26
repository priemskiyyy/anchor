<script lang="ts">
  import AnchorProvider from "../context/AnchorProvider.svelte";
  import type { RegisteredAnchor } from "../types/Register.js";
  import UtilityCaller from "./UtilityCaller.fixture.svelte";

  type Props = {
    anchor: RegisteredAnchor;
    callUtilities: () => unknown;
    runInEffect?: () => unknown;
  };

  const props: Props = $props();
</script>

<AnchorProvider anchor={props.anchor}
  ><UtilityCaller
    callUtilities={props.callUtilities}
    runInEffect={props.runInEffect}
  /></AnchorProvider
>
