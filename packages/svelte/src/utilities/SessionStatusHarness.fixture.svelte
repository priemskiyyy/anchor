<script lang="ts">
  import AnchorProvider from "../context/AnchorProvider.svelte";
  import type { RegisteredAnchor } from "../types/Register.js";
  import SessionStatus from "./SessionStatus.fixture.svelte";

  const props: { anchor: RegisteredAnchor } = $props();
</script>

<AnchorProvider anchor={props.anchor}><SessionStatus /></AnchorProvider>
