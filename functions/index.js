/**
 * Cloud Functions for French Energy Certificate Auctions
 * - Scrapes auction results from the EEX website
 * - Stores structured data in Firestore
 * - Provides API endpoints for dashboard and statistics
 * - Includes a scheduled function for daily updates
 */

const functions = require('firebase-functions');
const admin = require('firebase-admin');
const axios = require('axios');
const cheerio = require('cheerio');
const cors = require('cors')({ origin: true });

// Initialize Firebase Admin
admin.initializeApp();

// Get Firestore database
const db = admin.firestore();

/**
 * Scrapes the EEX French auctions page for the latest results.
 * Extracts both region and technology tables, parses volume and price data,
 * and stores the results in Firestore.
 * Returns the structured data array.
 */
async function scrapeEEXData() {
  try {
    console.log('Starting data extraction from EEX...');
    
    // EEX French auctions URL
    const url = 'https://www.eex.com/en/markets/energy-certificates/french-auctions-power';
    
    const response = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      }
    });

    const $ = cheerio.load(response.data);
    const auctionData = [];

    // Try to find the Results section by heading
    const resultsSection = $("h2:contains('Results')").closest('div.container, section, div.row').parent();
    // Fallback: just look for all tables after the Results heading
    let foundResults = false;
    let resultsTables = [];
    $('h2').each((i, el) => {
      if ($(el).text().trim().toLowerCase() === 'results') {
        foundResults = true;
      }
      // If we've found the Results heading, grab the next two tables (region and technology)
      if (foundResults && $(el).nextAll('table').length >= 2) {
        resultsTables = $(el).nextAll('table').slice(0, 2).toArray();
        return false;
      }
    });

    // If not found, fallback to all tables with Region/Technology headers
    // This ensures robustness if the EEX page layout changes.
    if (resultsTables.length < 2) {
      resultsTables = [];
      $('table').each((i, table) => {
        const text = $(table).text();
        if (text.includes('Region') && text.includes('Volume Offered')) {
          resultsTables.push(table);
        } else if (text.includes('Technology') && text.includes('Volume Offered')) {
          resultsTables.push(table);
        }
      });
    }

    // Parse the two results tables
    resultsTables.forEach((table, idx) => {
      const isRegion = $(table).text().includes('Region');
      const isTechnology = $(table).text().includes('Technology');
      const type = isRegion ? 'region' : isTechnology ? 'technology' : 'unknown';
      $(table).find('tr').each((j, row) => {
        const cells = $(row).find('td');
        if (cells.length >= 4) {
          const name = $(cells[0]).text().trim();
          const volumeOfferedText = $(cells[1]).text().trim();
          const volumeAllocatedText = $(cells[2]).text().trim();
          const priceText = $(cells[3]).text().trim();
          // Skip header rows
          if (name && !name.toLowerCase().includes('region') && !name.toLowerCase().includes('technology') && !name.toLowerCase().includes('volume') && name.length > 0) {
            // Extract numeric values
            const volumeOffered = parseFloat(volumeOfferedText.replace(/[^\d.-]/g, ''));
            const volumeAllocated = parseFloat(volumeAllocatedText.replace(/[^\d.-]/g, ''));
            const price = parseFloat(priceText.replace(/[^\d.-]/g, ''));
            if (!isNaN(volumeAllocated) && !isNaN(price)) {
              auctionData.push({
                name,
                type,
                volume_offered: volumeOffered,
                volume_allocated: volumeAllocated,
                weighted_avg_price: price,
                scraped_at: admin.firestore.FieldValue.serverTimestamp()
              });
            }
          }
        }
      });
    });

    // If no data found, throw an error instead of creating sample data
    if (auctionData.length === 0) {
      throw new Error('No auction data found on EEX website. The page structure may have changed or data may not be available.');
    }

    // Insert scraped data into Firestore
    const batch = db.batch();
    auctionData.forEach(data => {
      const docRef = db.collection('auctions').doc();
      batch.set(docRef, data);
    });
    await batch.commit();

    console.log(`Successfully scraped and stored ${auctionData.length} auction records`);
    return auctionData;
    
  } catch (error) {
    console.error('Error scraping EEX data:', error.message);
    throw error;
  }
}

/**
 * HTTP endpoint to get all auction data from Firestore.
 * Returns an array of auction records, most recent first.
 */
exports.getAuctions = functions.https.onRequest((req, res) => {
  return cors(req, res, async () => {
    try {
      const snapshot = await db.collection('auctions')
        .orderBy('scraped_at', 'desc')
        .get();
      
      const auctions = [];
      snapshot.forEach(doc => {
        auctions.push({
          id: doc.id,
          ...doc.data()
        });
      });
      
      res.json(auctions);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });
});

/**
 * HTTP endpoint to get auction statistics (average price, total volume, etc).
 * Computes stats for both region and technology records.
 * Returns an object with summary statistics for the dashboard.
 */
exports.getStatistics = functions.https.onRequest((req, res) => {
  return cors(req, res, async () => {
    try {
      const snapshot = await db.collection('auctions').get();
      
      let totalRegions = 0;
      let totalTechnologies = 0;
      let totalPrice = 0;
      let totalVolume = 0;
      let minPrice = Infinity;
      let maxPrice = -Infinity;
      let priceCount = 0;
      let volumeCount = 0;
      
      snapshot.forEach(doc => {
        const data = doc.data();
        // Check for new data structure with type field
        if (data.type && (data.type === 'region' || data.type === 'technology') && data.weighted_avg_price > 0) {
          if (data.type === 'region') {
            totalRegions++;
          } else if (data.type === 'technology') {
            totalTechnologies++;
          }
          
          totalPrice += data.weighted_avg_price || 0;
          totalVolume += data.volume_allocated || 0;
          minPrice = Math.min(minPrice, data.weighted_avg_price || 0);
          maxPrice = Math.max(maxPrice, data.weighted_avg_price || 0);
          priceCount++;
          volumeCount++;
        }
        // Fallback for old data structure
        else if (data.data_type === 'results' && data.clearing_price > 0) {
          totalRegions++; // Assume old data is mostly regions
          totalPrice += data.clearing_price || 0;
          totalVolume += data.volume_mwh || 0;
          minPrice = Math.min(minPrice, data.clearing_price || 0);
          maxPrice = Math.max(maxPrice, data.clearing_price || 0);
          priceCount++;
          volumeCount++;
        }
      });
      
      const stats = {
        total_regions: totalRegions,
        total_technologies: totalTechnologies,
        avg_price: priceCount > 0 ? totalPrice / priceCount : 0,
        avg_volume: volumeCount > 0 ? totalVolume / volumeCount : 0,
        total_volume: totalVolume,
        min_price: minPrice === Infinity ? 0 : minPrice,
        max_price: maxPrice === -Infinity ? 0 : maxPrice
      };
      
      res.json(stats);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });
});

/**
 * Get current API usage
 */
exports.getApiUsage = functions.https.onRequest((req, res) => {
  return cors(req, res, async () => {
    try {
      const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format
      const usageDoc = await db.collection('api_usage').doc(today).get();
      
      let usage = 0;
      if (usageDoc.exists) {
        usage = usageDoc.data().count || 0;
      }
      
      res.json({
        today: today,
        calls_used: usage,
        calls_remaining: Math.max(0, 20 - usage),
        daily_limit: 20
      });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });
});

/**
 * Trigger data extraction
 */
exports.extractData = functions.https.onRequest((req, res) => {
  return cors(req, res, async () => {
    try {
      // Check daily API limit
      const today = new Date().toISOString().split('T')[0];
      const usageDoc = await db.collection('api_usage').doc(today).get();
      
      let currentUsage = 0;
      if (usageDoc.exists) {
        currentUsage = usageDoc.data().count || 0;
      }
      
      if (currentUsage >= 20) {
        return res.status(429).json({ 
          error: 'Daily API limit reached (20 calls). Please try again tomorrow.',
          calls_used: currentUsage,
          calls_remaining: 0,
          daily_limit: 20
        });
      }
      
      // Increment usage counter
      await db.collection('api_usage').doc(today).set({
        count: currentUsage + 1,
        last_updated: admin.firestore.FieldValue.serverTimestamp()
      }, { merge: true });
      
      const data = await scrapeEEXData();
      res.json({ 
        message: 'Data extraction completed successfully',
        records_added: data.length,
        data: data,
        calls_used: currentUsage + 1,
        calls_remaining: 19 - currentUsage,
        daily_limit: 20
      });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });
});

/**
 * HTTP endpoint to clear all auction data from Firestore.
 * Use with caution! This will delete all records.
 */
exports.clearData = functions.https.onRequest((req, res) => {
  return cors(req, res, async () => {
    try {
      const snapshot = await db.collection('auctions').get();
      
      const batch = db.batch();
      snapshot.forEach(doc => {
        batch.delete(doc.ref);
      });
      await batch.commit();
      
      res.json({ message: 'All auction data cleared' });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });
});
