import "leaflet";

declare module "leaflet" {
  /**
   * Network Map marker adapters may receive DivIcon-style HTML through the
   * shared IconOptions union at runtime.
   */
  interface IconOptions {
    html?: string | HTMLElement;
  }

  /** Custom marker factories attach a display color used by the 3D mirror. */
  interface MarkerOptions {
    color?: string;
  }
}

export {};
