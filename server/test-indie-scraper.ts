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
    
    // First, test the main venues page to understand its structure
    console.log('Fetching main venues page...');
    const mainVenueUrl = 'https://www.indieonthemove.com/venues';
    const mainResponse = await axiosInstance.get(mainVenueUrl);
    const mainPage = cheerio.load(mainResponse.data);
    
    // Look for state links
    console.log('Finding state links...');
    const stateLinks = mainPage('a[href^="/venues/"]');
    console.log(`Found ${stateLinks.length} state links`);
    
    const stateUrls = [];
    stateLinks.each((i, el) => {
      const href = mainPage(el).attr('href');
      if (href && href.match(/\/venues\/[A-Z]{2}$/)) {
        stateUrls.push(href);
      }
    });
    
    console.log('State URLs found:');
    console.log(stateUrls.slice(0, 5)); // Show first 5
    
    // Try to access a specific state page (using the first state found)
    if (stateUrls.length > 0) {
      const stateUrl = stateUrls[0];
      console.log(`\nFetching venue listing for state: ${stateUrl}...`);
      const stateFullUrl = `https://www.indieonthemove.com${stateUrl}`;
      
      const stateResponse = await axiosInstance.get(stateFullUrl);
      const statePage = cheerio.load(stateResponse.data);
      
      // Look for venue listings
      console.log('Finding venue cards...');
      const venueElements = statePage('.card');
      console.log(`Found ${venueElements.length} venue elements`);
      
      if (venueElements.length > 0) {
        // Analyze first venue card
        const firstVenue = venueElements.first();
        console.log('\nFirst venue element HTML:');
        console.log(firstVenue.html().slice(0, 500)); // Show part of the HTML
        
        // Try different selectors for venue name
        const possibleTitleSelectors = ['h5.card-title', 'h5', '.card-title', 'h4', 'h3'];
        let venueName = '';
        
        for (const selector of possibleTitleSelectors) {
          const title = firstVenue.find(selector).text().trim();
          if (title) {
            venueName = title;
            console.log(`Found venue name using selector "${selector}": ${venueName}`);
            break;
          }
        }
        
        // Try to extract venue location
        const locationText = firstVenue.find('p').text().trim() || firstVenue.find('.card-text').text().trim();
        console.log(`Venue location text: ${locationText}`);
        
        // Try to extract venue URL
        const venueLinks = firstVenue.find('a');
        if (venueLinks.length > 0) {
          const venueUrl = venueLinks.first().attr('href');
          console.log(`Venue URL: ${venueUrl}`);
          
          // If we have a venue URL, fetch its detail page
          if (venueUrl) {
            console.log('\nFetching venue details page...');
            const fullVenueUrl = venueUrl.startsWith('http') ? venueUrl : `https://www.indieonthemove.com${venueUrl}`;
            
            try {
              const detailResponse = await axiosInstance.get(fullVenueUrl);
              const detailPage = cheerio.load(detailResponse.data);
              
              // Find venue name in detail page
              const detailVenueName = detailPage('h1').first().text().trim();
              console.log(`Detail venue name: ${detailVenueName}`);
              
              // Find all paragraphs for venue info
              console.log('\nVenue information paragraphs:');
              const paragraphs = detailPage('.container p').map((i, el) => detailPage(el).text().trim()).get();
              console.log(paragraphs.slice(0, 5)); // Show first 5 paragraphs
              
              // Look for specific info
              const addressParagraph = paragraphs.find(p => p.includes('Address:'));
              if (addressParagraph) {
                console.log(`Address found: ${addressParagraph}`);
              }
              
              const capacityParagraph = paragraphs.find(p => p.includes('Capacity:'));
              if (capacityParagraph) {
                console.log(`Capacity found: ${capacityParagraph}`);
              }
              
              const bookingParagraph = paragraphs.find(p => p.includes('Booking:'));
              if (bookingParagraph) {
                console.log(`Booking info found: ${bookingParagraph}`);
              }
            } catch (error) {
              console.error(`Error fetching venue details: ${error.message}`);
            }
          }
        }
      }
    }
    
    // Test upcoming shows page
    console.log('\nFetching upcoming shows...');
    const showsUrl = 'https://www.indieonthemove.com/shows';
    
    try {
      const showsResponse = await axiosInstance.get(showsUrl);
      const showsPage = cheerio.load(showsResponse.data);
      
      // Find show cards
      const showCards = showsPage('.card');
      console.log(`Found ${showCards.length} show cards`);
      
      if (showCards.length > 0) {
        // Analyze first show card
        const firstShowCard = showCards.first();
        console.log('\nFirst show card HTML:');
        console.log(firstShowCard.html().slice(0, 500)); // Show part of the HTML
        
        // Try to extract show details
        const showTitle = firstShowCard.find('.card-title').text().trim() || firstShowCard.find('h5').text().trim();
        console.log(`Show title: ${showTitle}`);
        
        const showDate = firstShowCard.find('.text-muted').text().trim() || firstShowCard.find('.card-subtitle').text().trim();
        console.log(`Show date: ${showDate}`);
        
        const showVenue = firstShowCard.find('.card-text').text().trim() || firstShowCard.find('p').text().trim();
        console.log(`Show venue: ${showVenue}`);
      }
    } catch (error) {
      console.error(`Error fetching shows: ${error.message}`);
    }
    
  } catch (error) {
    console.error('Error testing Indie on the Move scraper:', error);
  }
}

testIndieOnTheMoveScraper();