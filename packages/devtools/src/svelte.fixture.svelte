<script lang="ts">
  import type { RegisteredAnchor } from "@priemskiyyy/anchor-svelte";
  import { AnchorProvider } from "@priemskiyyy/anchor-svelte";
  import Host from "src/svelteHost.fixture.svelte";
  import type { AnchorDevtoolsProps } from "src/types/AnchorDevtoolsProps";

  type Props = {
    anchor: RegisteredAnchor;
    options?: AnchorDevtoolsProps | undefined;
  };

  const props: Props = $props();
</script>

<AnchorProvider anchor={props.anchor}>
  <Host options={props.options} />
</AnchorProvider>
