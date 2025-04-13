import express from 'express';
import { db } from '../db';
import { venues, events, artists } from '../../shared/schema';
import { eq, sql, inArray, and, like } from 'drizzle-orm';
import axios from 'axios';
import * as cheerio from 'cheerio';

const router = express.Router();

// Endpoint to import venue CSV data
router.post('/import-from-csv', async (req, res) => {
  try {
    const { data } = req.body;
    
    if (!data || !Array.isArray(data)) {
      return res.status(400).json({ success: false, message: 'Invalid CSV data. Must provide an array of venue records.' });
    }
    
    // Process each venue
    let venuesAdded = 0;
    let venuesUpdated = 0;
    let errors = 0;
    
    for (const venue of data) {
      try {
        // Check if venue already exists (by name and city)
        const existingVenue = await db.select()
          .from(venues)
          .where(
            and(
              eq(venues.name, venue.name),
              eq(venues.city, venue.city)
            )
          )
          .limit(1);
        
        if (existingVenue.length > 0) {
          // Update venue
          await db.update(venues)
            .set({
              name: venue.name,
              address: venue.address || existingVenue[0].address,
              city: venue.city,
              region: venue.state || venue.region || existingVenue[0].region,
              country: venue.country || 'USA',
              capacity: venue.capacity ? parseInt(venue.capacity) : existingVenue[0].capacity,
              bookingEmail: venue.bookingEmail || venue.booking_email || existingVenue[0].bookingEmail,
              websiteUrl: venue.websiteUrl || venue.website_url || venue.website || existingVenue[0].websiteUrl,
              description: venue.description || existingVenue[0].description,
              venueType: venue.venueType || venue.venue_type || existingVenue[0].venueType,
              updatedAt: sql`NOW()`
            })
            .where(eq(venues.id, existingVenue[0].id));
          
          venuesUpdated++;
        } else {
          // Insert new venue
          await db.insert(venues).values({
            name: venue.name,
            address: venue.address || null,
            city: venue.city,
            region: venue.state || venue.region || null,
            country: venue.country || 'USA',
            capacity: venue.capacity ? parseInt(venue.capacity) : null,
            bookingEmail: venue.bookingEmail || venue.booking_email || null,
            websiteUrl: venue.websiteUrl || venue.website_url || venue.website || null,
            description: venue.description || null,
            venueType: venue.venueType || venue.venue_type || null,
            createdAt: sql`NOW()`,
            updatedAt: sql`NOW()`
          });
          
          venuesAdded++;
        }
      } catch (error) {
        console.error(`Error processing venue ${venue.name}:`, error);
        errors++;
      }
    }
    
    return res.json({
      success: true,
      message: `Processed ${data.length} venues: added ${venuesAdded}, updated ${venuesUpdated}, errors ${errors}`,
      venuesAdded,
      venuesUpdated,
      errors
    });
  } catch (error) {
    console.error('Error importing from CSV:', error);
    return res.status(500).json({ success: false, message: `Error: ${error instanceof Error ? error.message : String(error)}` });
  }
});

// Endpoint to manually add a single venue
router.post('/add-venue', async (req, res) => {
  try {
    const venueData = req.body;
    
    if (!venueData.name || !venueData.city) {
      return res.status(400).json({ success: false, message: 'Venue name and city are required' });
    }
    
    // Check if venue already exists
    const existingVenue = await db.select()
      .from(venues)
      .where(
        and(
          eq(venues.name, venueData.name),
          eq(venues.city, venueData.city)
        )
      )
      .limit(1);
    
    if (existingVenue.length > 0) {
      return res.status(409).json({ 
        success: false, 
        message: 'Venue already exists', 
        venue: existingVenue[0]
      });
    }
    
    // Add the venue
    const [newVenue] = await db.insert(venues).values({
      name: venueData.name,
      address: venueData.address || null,
      city: venueData.city,
      region: venueData.state || venueData.region || null,
      country: venueData.country || 'USA',
      capacity: venueData.capacity ? parseInt(venueData.capacity) : null,
      bookingEmail: venueData.bookingEmail || venueData.booking_email || null,
      websiteUrl: venueData.websiteUrl || venueData.website_url || venueData.website || null,
      description: venueData.description || null,
      venueType: venueData.venueType || venueData.venue_type || null,
      createdAt: sql`NOW()`,
      updatedAt: sql`NOW()`
    }).returning();
    
    return res.json({
      success: true,
      message: `Added venue: ${venueData.name}`,
      venue: newVenue
    });
  } catch (error) {
    console.error('Error adding venue:', error);
    return res.status(500).json({ success: false, message: `Error: ${error instanceof Error ? error.message : String(error)}` });
  }
});

// Endpoint to batch-add venues
router.post('/batch-add-venues', async (req, res) => {
  try {
    const { venues: venueDataArray } = req.body;
    
    if (!venueDataArray || !Array.isArray(venueDataArray) || venueDataArray.length === 0) {
      return res.status(400).json({ success: false, message: 'Invalid venue data. Must provide an array of venues.' });
    }
    
    const results = {
      total: venueDataArray.length,
      added: 0,
      skipped: 0,
      errors: 0
    };
    
    for (const venueData of venueDataArray) {
      try {
        if (!venueData.name || !venueData.city) {
          results.skipped++;
          continue;
        }
        
        // Check if venue already exists
        const existingVenue = await db.select()
          .from(venues)
          .where(
            and(
              eq(venues.name, venueData.name),
              eq(venues.city, venueData.city)
            )
          )
          .limit(1);
        
        if (existingVenue.length > 0) {
          results.skipped++;
          continue;
        }
        
        // Add the venue
        await db.insert(venues).values({
          name: venueData.name,
          address: venueData.address || null,
          city: venueData.city,
          region: venueData.state || venueData.region || null,
          country: venueData.country || 'USA',
          capacity: venueData.capacity ? parseInt(venueData.capacity) : null,
          bookingEmail: venueData.bookingEmail || venueData.booking_email || null,
          websiteUrl: venueData.websiteUrl || venueData.website_url || venueData.website || null,
          description: venueData.description || null,
          venueType: venueData.venueType || venueData.venue_type || null,
          createdAt: sql`NOW()`,
          updatedAt: sql`NOW()`
        });
        
        results.added++;
      } catch (error) {
        console.error(`Error processing venue ${venueData.name}:`, error);
        results.errors++;
      }
    }
    
    return res.json({
      success: true,
      message: `Processed ${results.total} venues: added ${results.added}, skipped ${results.skipped}, errors ${results.errors}`,
      ...results
    });
  } catch (error) {
    console.error('Error batch adding venues:', error);
    return res.status(500).json({ success: false, message: `Error: ${error instanceof Error ? error.message : String(error)}` });
  }
});

// Endpoint to manually add events
router.post('/add-event', async (req, res) => {
  try {
    const eventData = req.body;
    
    if (!eventData.artistName || !eventData.venueName || !eventData.date) {
      return res.status(400).json({ success: false, message: 'Artist name, venue name, and date are required' });
    }
    
    // Find or create venue
    let venue;
    if (eventData.venueId) {
      // Use provided venue ID
      const existingVenue = await db.select()
        .from(venues)
        .where(eq(venues.id, eventData.venueId))
        .limit(1);
      
      if (existingVenue.length === 0) {
        return res.status(404).json({ success: false, message: `Venue with ID ${eventData.venueId} not found` });
      }
      
      venue = existingVenue[0];
    } else {
      // Look up venue by name and city
      const city = eventData.venueCity || '';
      const state = eventData.venueState || '';
      
      const existingVenue = await db.select()
        .from(venues)
        .where(
          and(
            eq(venues.name, eventData.venueName),
            city ? eq(venues.city, city) : sql`1=1`
          )
        )
        .limit(1);
      
      if (existingVenue.length === 0) {
        // Create a minimal venue record
        const [newVenue] = await db.insert(venues).values({
          name: eventData.venueName,
          city: city || null,
          region: state || null,
          country: 'USA',
          createdAt: sql`NOW()`,
          updatedAt: sql`NOW()`
        }).returning();
        
        venue = newVenue;
      } else {
        venue = existingVenue[0];
      }
    }
    
    // Find or create artist
    let artist;
    if (eventData.artistId) {
      // Use provided artist ID
      const existingArtist = await db.select()
        .from(artists)
        .where(eq(artists.id, eventData.artistId))
        .limit(1);
      
      if (existingArtist.length === 0) {
        return res.status(404).json({ success: false, message: `Artist with ID ${eventData.artistId} not found` });
      }
      
      artist = existingArtist[0];
    } else {
      // Look up artist by name
      const existingArtist = await db.select()
        .from(artists)
        .where(eq(artists.name, eventData.artistName))
        .limit(1);
      
      if (existingArtist.length === 0) {
        // Create a new artist
        const [newArtist] = await db.insert(artists).values({
          name: eventData.artistName,
          genres: ['other'],
          popularity: 50,
          createdAt: sql`NOW()`,
          updatedAt: sql`NOW()`
        }).returning();
        
        artist = newArtist;
      } else {
        artist = existingArtist[0];
      }
    }
    
    // Check if event already exists
    const existingEvent = await db.select()
      .from(events)
      .where(
        and(
          eq(events.artistId, artist.id),
          eq(events.venueId, venue.id),
          eq(events.date, eventData.date)
        )
      )
      .limit(1);
    
    if (existingEvent.length > 0) {
      return res.status(409).json({ 
        success: false, 
        message: 'Event already exists', 
        event: existingEvent[0]
      });
    }
    
    // Add the event
    const [newEvent] = await db.insert(events).values({
      date: eventData.date,
      time: eventData.time || null,
      artistId: artist.id,
      venueId: venue.id,
      ticketPrice: eventData.ticketPrice || null,
      description: eventData.description || `${artist.name} at ${venue.name}`,
      status: eventData.status || 'confirmed',
      sourceName: eventData.sourceName || 'manual',
      createdAt: sql`NOW()`,
      updatedAt: sql`NOW()`
    }).returning();
    
    return res.json({
      success: true,
      message: `Added event: ${artist.name} at ${venue.name} on ${eventData.date}`,
      event: newEvent,
      artist,
      venue
    });
  } catch (error) {
    console.error('Error adding event:', error);
    return res.status(500).json({ success: false, message: `Error: ${error instanceof Error ? error.message : String(error)}` });
  }
});

export default router;