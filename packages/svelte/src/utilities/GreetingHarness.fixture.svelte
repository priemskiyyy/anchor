<script lang="ts">
  import AnchorProvider from "../context/AnchorProvider.svelte";
  import type { RegisteredAnchor } from "../types/Register.js";
  import Greeting from "./Greeting.fixture.svelte";

  const props: { anchor: RegisteredAnchor; greeting: string } = $props();
</script>

<AnchorProvider anchor={props.anchor}
  ><Greeting greeting={props.greeting} /></AnchorProvider
>
