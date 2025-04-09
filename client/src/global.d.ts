// add support for Vite environment variables
interface ImportMeta {
  env: {
    VITE_MAPBOX_TOKEN?: string;
    // add other environment variables as needed
  };
}