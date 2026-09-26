// Modelled on the HTML BroadcastChannel: a message is structured-cloned and reaches every other open channel of the same name on a later task, never the sender and never a closed channel.
export const createFakeBroadcastChannel = () => {
  const open = new Set<FakeBroadcastChannel>();

  class FakeBroadcastChannel extends EventTarget {
    name: string;

    constructor(name: string) {
      super();
      this.name = name;
      open.add(this);
    }

    postMessage = (data: unknown) => {
      const message = structuredClone(data);

      for (const channel of open) {
        if (channel === this || channel.name !== this.name) {
          continue;
        }

        setTimeout(() => {
          if (!open.has(channel)) {
            return;
          }

          channel.dispatchEvent(new MessageEvent("message", { data: message }));
        }, 0);
      }
    };

    close = () => {
      open.delete(this);
    };
  }

  return { FakeBroadcastChannel, open };
};
