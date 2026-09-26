<script lang="ts">
  import { useSession } from "./useSession.js";

  const state = useSession();
</script>

<span>{state.current.status}</span>
