// react-native-auth0 caches API credentials per audience and scope, and nothing in them names their user, so only a cache this adapter filled for a login counts as that login's.
export class ApiCredentialsCaches {
  #owners = new Map<string, string>();
  #lastLogin: string | null | undefined = undefined;
  #queue: Promise<unknown> = Promise.resolve();

  // Another login may have minted through the native client meanwhile, which the adapter never sees, so no cache keeps its owner across a change of login.
  noteLogin = (login: string | null) => {
    if (login === this.#lastLogin) {
      return;
    }

    this.#lastLogin = login;
    this.#owners.clear();
  };

  // One exchange at a time, so a cache is cleared only once no earlier exchange can still write another login's credentials into it.
  enqueue = <TValue>(exchange: () => Promise<TValue>) => {
    const exchanged = this.#queue.then(exchange);

    this.#queue = exchanged.catch(() => null);

    return exchanged;
  };

  isOwnedBy = (cache: string, login: string) =>
    this.#owners.get(cache) === login;

  setOwner = (cache: string, login: string) => {
    this.#owners.set(cache, login);
  };
}
