import type { DiagnosticOperation } from "@priemskiyyy/anchor";
import { Index, Show } from "solid-js";

import { formatOperationLine } from "src/formatting/formatOperationLine";

type OperationListProps = {
  operations: DiagnosticOperation[];
};

export const OperationList = (props: OperationListProps) => (
  <section class="operations" aria-labelledby="operations-heading">
    <h2 id="operations-heading" class="section-heading">
      Operations in flight
    </h2>
    <Show
      when={props.operations.length > 0}
      fallback={<p class="operation-empty">None</p>}
    >
      <ul class="operation-list">
        <Index each={props.operations}>
          {(operation) => (
            <li class="operation" data-kind={operation().kind}>
              {formatOperationLine(operation())}
            </li>
          )}
        </Index>
      </ul>
    </Show>
  </section>
);
