import axios from 'axios';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

async function testBandsintownAPI() {
  const apiKey = process.env.BANDSINTOWN_API_KEY;
  
  if (!apiKey) {
    console.error('ERROR: BANDSINTOWN_API_KEY environment variable is not set');
    process.exit(1);
  }
  
  console.log('Testing Bandsintown API artist endpoint...');
  console.log(`API Key in use: ${apiKey.substring(0, 4)}...${apiKey.substring(apiKey.length - 4)}`);
  
  // Try using the artist endpoint with different authentication approaches
  
  // Approach 1: API key as app_id only
  try {
    console.log('\n1. Testing with API key as app_id only:');
    const response1 = await axios.get('https://rest.bandsintown.com/artists/coldplay', {
      params: {
        app_id: apiKey
      }
    });
    
    console.log('Response status:', response1.status);
    console.log('Response data:', JSON.stringify(response1.data, null, 2));
  } catch (error) {
    console.error('Error with approach 1:', error.message);
    if (error.response) {
      console.error('Error status:', error.response.status);
      console.error('Error data:', error.response.data);
    }
  }
  
  // Approach 2: API key in header only
  try {
    console.log('\n2. Testing with API key in header only:');
    const response2 = await axios.get('https://rest.bandsintown.com/artists/coldplay', {
      headers: {
        'x-api-key': apiKey
      }
    });
    
    console.log('Response status:', response2.status);
    console.log('Response data:', JSON.stringify(response2.data, null, 2));
  } catch (error) {
    console.error('Error with approach 2:', error.message);
    if (error.response) {
      console.error('Error status:', error.response.status);
      console.error('Error data:', error.response.data);
    }
  }
  
  // Approach 3: API key in header and a generic app_id
  try {
    console.log('\n3. Testing with API key in header and generic app_id:');
    const response3 = await axios.get('https://rest.bandsintown.com/artists/coldplay', {
      params: {
        app_id: 'venue_discovery_platform'
      },
      headers: {
        'x-api-key': apiKey
      }
    });
    
    console.log('Response status:', response3.status);
    console.log('Response data:', JSON.stringify(response3.data, null, 2));
  } catch (error) {
    console.error('Error with approach 3:', error.message);
    if (error.response) {
      console.error('Error status:', error.response.status);
      console.error('Error data:', error.response.data);
    }
  }
  
  // Approach 4: Try with a completely different app_id
  try {
    console.log('\n4. Testing with completely different app_id:');
    const response4 = await axios.get('https://rest.bandsintown.com/artists/coldplay', {
      params: {
        app_id: 'test_account'
      },
      headers: {
        'x-api-key': apiKey
      }
    });
    
    console.log('Response status:', response4.status);
    console.log('Response data:', JSON.stringify(response4.data, null, 2));
  } catch (error) {
    console.error('Error with approach 4:', error.message);
    if (error.response) {
      console.error('Error status:', error.response.status);
      console.error('Error data:', error.response.data);
    }
  }
}

testBandsintownAPI();