import { useSession } from "src/primitives/useSession";

export const SessionStatus = () => {
  const state = useSession();

  return <span>{state().status}</span>;
};
