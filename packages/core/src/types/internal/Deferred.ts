import type { createDeferred } from "src/utils/common/createDeferred";

export type Deferred<TValue> = ReturnType<typeof createDeferred<TValue>>;
