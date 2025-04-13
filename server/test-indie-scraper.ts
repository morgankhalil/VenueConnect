import axios from 'axios';
import * as cheerio from 'cheerio';
import fs from 'fs';

async function testIndieOnTheMoveScraper() {
  try {
    console.log('Testing Indie on the Move scraper...');
    
    // Custom axios instance with appropriate headers
    const axiosInstance = axios.create({
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
        'Accept': 'text/html'
      }
    });
    
    // Test venue listing page
    console.log('Fetching NY venue listing...');
    const venueListingUrl = 'https://www.indieonthemove.com/venues/ny';
    const venueResponse = await axiosInstance.get(venueListingUrl);
    const $ = cheerio.load(venueResponse.data);
    
    // Find venue cards
    console.log('Analyzing venue listing structure...');
    const venueCards = $('div.card');
    console.log(`Found ${venueCards.length} venue cards`);
    
    if (venueCards.length > 0) {
      // Analyze first card
      const firstCard = venueCards.first();
      console.log('First venue card HTML:');
      console.log(firstCard.html());
      
      // Try to extract venue name
      const venueName = firstCard.find('h5').text().trim();
      console.log(`Venue name: ${venueName}`);
      
      // Try to extract venue location
      const venueLocation = firstCard.find('p.card-text').first().text().trim();
      console.log(`Venue location: ${venueLocation}`);
      
      // Try to extract venue URL
      const venueUrl = firstCard.find('a').attr('href');
      console.log(`Venue URL: ${venueUrl}`);
      
      // If we have a venue URL, fetch its detail page
      if (venueUrl) {
        console.log('Fetching venue details page...');
        const fullVenueUrl = venueUrl.startsWith('http') ? venueUrl : `https://www.indieonthemove.com${venueUrl}`;
        const detailResponse = await axiosInstance.get(fullVenueUrl);
        const detailPage = cheerio.load(detailResponse.data);
        
        console.log('Venue detail page structure:');
        
        // Find venue name in detail page
        const detailVenueName = detailPage('h1').first().text().trim();
        console.log(`Detail venue name: ${detailVenueName}`);
        
        // Find venue information sections
        console.log('Venue information:');
        const venueInfo = detailPage('.venue-info .card-body').text();
        console.log(venueInfo);
      }
    }
    
    // Test upcoming shows page
    console.log('\nFetching upcoming shows...');
    const showsUrl = 'https://www.indieonthemove.com/shows';
    const showsResponse = await axiosInstance.get(showsUrl);
    const showsPage = cheerio.load(showsResponse.data);
    
    // Find show cards
    const showCards = showsPage('div.card');
    console.log(`Found ${showCards.length} show cards`);
    
    if (showCards.length > 0) {
      // Analyze first show card
      const firstShowCard = showCards.first();
      console.log('First show card HTML:');
      console.log(firstShowCard.html());
      
      // Try to extract show details
      const showTitle = firstShowCard.find('h5').text().trim();
      console.log(`Show title: ${showTitle}`);
      
      const showDate = firstShowCard.find('.text-muted').text().trim();
      console.log(`Show date: ${showDate}`);
      
      const showVenue = firstShowCard.find('p.card-text').text().trim();
      console.log(`Show venue: ${showVenue}`);
    }
    
  } catch (error) {
    console.error('Error testing Indie on the Move scraper:', error);
  }
}

testIndieOnTheMoveScraper();