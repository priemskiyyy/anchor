<script lang="ts">
  import AnchorProvider from "../context/AnchorProvider.svelte";
  import type { RegisteredAnchor } from "../types/Register.js";
  import UtilityCaller from "./UtilityCaller.fixture.svelte";

  type Props = {
    outer: RegisteredAnchor;
    inner: RegisteredAnchor;
    callUtilities: () => unknown;
  };

  const props: Props = $props();
</script>

<AnchorProvider anchor={props.outer}>
  <AnchorProvider anchor={props.inner}
    ><UtilityCaller callUtilities={props.callUtilities} /></AnchorProvider
  >
</AnchorProvider>
