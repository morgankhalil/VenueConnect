
export interface EventProvider {
  getArtistEvents(artistName: string, options?: SyncOptions): Promise<any[]>;
  getVenueEvents(venueId: string, options?: SyncOptions): Promise<any[]>;
  searchVenues(query: string, options?: SyncOptions): Promise<any[]>;
}

export interface SyncOptions {
  startDate?: string;
  endDate?: string;
  location?: {
    latitude: number;
    longitude: number;
    radius: number;
  };
  limit?: number;
}
