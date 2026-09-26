export class SelectionMemo<TValue, TSelection> {
  #select: (value: TValue) => TSelection;
  #memo: { snapshot: TValue; selection: TSelection } | null = null;

  constructor(select: (value: TValue) => TSelection) {
    this.#select = select;
  }

  getSelection = (snapshot: TValue): TSelection => {
    if (this.#memo !== null && Object.is(this.#memo.snapshot, snapshot)) {
      return this.#memo.selection;
    }

    const selection = this.#select(snapshot);

    this.#memo = { snapshot, selection };

    return selection;
  };
}
