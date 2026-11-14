interface ImportMetaEnv {
  /** "1" in the phone-test build, which adds the on-screen controller. Unset in the real game. */
  readonly VITE_TOUCHPAD?: string;
  /** "1" in the separate level-editor build. */
  readonly VITE_EDITOR?: string;
}
interface ImportMeta {
  readonly env: ImportMetaEnv;
}
