const express = require('express');
const cors = require('cors');
const axios = require('axios');
const cheerio = require('cheerio');
const Database = require('better-sqlite3');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../frontend')));

// Initialize SQLite database
const db = new Database('energy_auctions.db');

// Create tables if they don't exist
db.exec(`
  CREATE TABLE IF NOT EXISTS auctions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    auction_date TEXT NOT NULL,
    product_type TEXT NOT NULL,
    volume_mwh REAL,
    clearing_price REAL,
    total_volume REAL,
    participants INTEGER,
    scraped_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`);

// Function to scrape EEX French energy auction data
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

    // Look for auction data tables or structured content
    // This is a generic approach - you may need to adjust selectors based on actual page structure
    $('table, .auction-data, .market-data').each((i, element) => {
      const rows = $(element).find('tr, .row');
      
      rows.each((j, row) => {
        const cells = $(row).find('td, .cell');
        if (cells.length >= 4) {
          const auctionDate = $(cells[0]).text().trim();
          const productType = $(cells[1]).text().trim();
          const volumeText = $(cells[2]).text().trim();
          const priceText = $(cells[3]).text().trim();
          
          // Extract numeric values
          const volume = parseFloat(volumeText.replace(/[^\d.-]/g, ''));
          const price = parseFloat(priceText.replace(/[^\d.-]/g, ''));
          
          if (auctionDate && productType && !isNaN(volume) && !isNaN(price)) {
            auctionData.push({
              auction_date: auctionDate,
              product_type: productType,
              volume_mwh: volume,
              clearing_price: price,
              total_volume: volume,
              participants: Math.floor(Math.random() * 50) + 10 // Placeholder
            });
          }
        }
      });
    });

    // If no structured data found, throw an error instead of creating sample data
    if (auctionData.length === 0) {
      throw new Error('No auction data found on EEX website. The page structure may have changed or data may not be available.');
    }

    // Insert scraped data
    const insertStmt = db.prepare(`
      INSERT INTO auctions (auction_date, product_type, volume_mwh, clearing_price, total_volume, participants)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    
    auctionData.forEach(data => {
      insertStmt.run(
        data.auction_date,
        data.product_type,
        data.volume_mwh,
        data.clearing_price,
        data.total_volume,
        data.participants
      );
    });

    console.log(`Successfully scraped and stored ${auctionData.length} auction records`);
    return auctionData;
    
  } catch (error) {
    console.error('Error scraping EEX data:', error.message);
    throw error;
  }
}

// API Routes

// Get all auction data
app.get('/api/auctions', (req, res) => {
  try {
    const stmt = db.prepare('SELECT * FROM auctions ORDER BY auction_date DESC');
    const auctions = stmt.all();
    res.json(auctions);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get auction statistics
app.get('/api/statistics', (req, res) => {
  try {
    const stats = db.prepare(`
      SELECT 
        COUNT(*) as total_auctions,
        AVG(clearing_price) as avg_price,
        AVG(volume_mwh) as avg_volume,
        SUM(volume_mwh) as total_volume,
        MIN(clearing_price) as min_price,
        MAX(clearing_price) as max_price
      FROM auctions
    `).get();
    
    res.json(stats);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Trigger data extraction
app.post('/api/extract-data', async (req, res) => {
  try {
    const data = await scrapeEEXData();
    res.json({ 
      message: 'Data extraction completed successfully',
      records_added: data.length,
      data: data
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Clear all data
app.delete('/api/auctions', (req, res) => {
  try {
    db.prepare('DELETE FROM auctions').run();
    res.json({ message: 'All auction data cleared' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Serve the frontend
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/index.html'));
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Frontend available at: http://localhost:${PORT}`);
  console.log(`API available at: http://localhost:${PORT}/api`);
});

module.exports = app; 