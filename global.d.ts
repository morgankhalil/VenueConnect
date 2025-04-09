declare module 'mapbox-gl' {
  export const accessToken: string;
  export class Map {
    constructor(options: any);
    on(event: string, handler: any): void;
    getLayer(id: string): any;
    removeLayer(id: string): void;
    getSource(id: string): any;
    removeSource(id: string): void;
    addSource(id: string, config: any): void;
    addLayer(layer: any): void;
    flyTo(options: any): void;
    zoomIn(): void;
    zoomOut(): void;
    remove(): void;
  }
  export class Popup {
    constructor(options?: any);
    setHTML(html: string): this;
  }
  export class Marker {
    constructor(element?: HTMLElement);
    setLngLat(lngLat: [number, number]): this;
    setPopup(popup: Popup): this;
    addTo(map: Map): this;
  }
}