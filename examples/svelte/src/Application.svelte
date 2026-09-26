<script lang="ts">
  import { AnchorProvider } from "@priemskiyyy/anchor-svelte";
  import { untrack } from "svelte";
  import type { SessionLab } from "example-shared/lab/types/SessionLab";
  import { PAGE_CLASS_NAME } from "example-shared/ui/styles/pageStyles";
  import AnchorDevtoolsHost from "src/components/Devtools/AnchorDevtoolsHost.svelte";
  import AppWindow from "src/components/Harbor/AppWindow.svelte";
  import MisbehaveList from "src/components/Lab/MisbehaveList.svelte";
  import SessionCard from "src/components/Lab/SessionCard.svelte";
  import TopBar from "src/components/Lab/TopBar.svelte";
  import { LAB_CONTEXT } from "src/utilities/constants/lab";
  import { useObservable } from "src/utilities/useObservable.svelte";

  type Props = { lab: SessionLab };

  const props: Props = $props();
  const [, setLab] = LAB_CONTEXT;
  const runtime = useObservable(() => props.lab.runtime);

  // The lab never changes, so the context holds the one the page mounted with.
  setLab(untrack(() => props.lab));
</script>

{#key runtime.current.id}
  <AnchorProvider anchor={runtime.current.anchor}>
    <TopBar />
    <main
      class="{PAGE_CLASS_NAME} grid items-start gap-6 pt-6 pb-28 lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)]"
    >
      <AppWindow />
      <div class="flex min-w-0 flex-col gap-6">
        <SessionCard />
        <MisbehaveList />
      </div>
    </main>
    <AnchorDevtoolsHost />
  </AnchorProvider>
{/key}
