/** How the page drives the real devtools for a tour: open them, turn on Show values, and close them. */
export type DevtoolsControls = {
  open: () => void;
  showValues: () => void;
  close: () => void;
};
