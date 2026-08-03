import "leaflet";

declare module "leaflet" {
  interface MarkerOptions {
    radius?: number;
    fillColor?: string;
    fillOpacity?: number;
    color?: string;
    opacity?: number;
    weight?: number;
    pane?: string;
    className?: string;
  }
}
