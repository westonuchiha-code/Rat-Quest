interface ImportMetaEnv {
  /** "1" in the phone-test build, which adds the on-screen controller. Unset in the real game. */
  readonly VITE_TOUCHPAD?: string;
  /** "1" in the separate level-editor build. */
  readonly VITE_EDITOR?: string;
  /** THE FINAL BUILD (the one to ship): the game only, no test area and no tools. `vite build --mode final`. */
  readonly VITE_FINAL?: string;
}
interface ImportMeta {
  readonly env: ImportMetaEnv;
}
