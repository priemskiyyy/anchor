<script lang="ts">
  import { useSession } from "./useSession.js";

  const props: { greeting: string } = $props();

  const greeting = useSession((state) => `${props.greeting} ${state.status}`);
</script>

<p>{greeting.current}</p>
