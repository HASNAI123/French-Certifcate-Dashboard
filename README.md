# French Energy Certificate Auctions Dashboard

A comprehensive web application that extracts, stores, and visualizes data from French energy certificate auctions at EEX (European Energy Exchange).

## Features

- **Data Extraction**: Automatically scrapes volume and pricing data from EEX French energy auctions
- **Database Storage**: Stores extracted data in SQLite database with proper schema
- **Interactive Visualization**: Modern web dashboard with interactive charts and statistics
- **Real-time Updates**: API endpoints for data management and retrieval
- **Responsive Design**: Works on desktop and mobile devices

## Technology Stack

- **Backend**: Node.js with Express.js
- **Database**: SQLite with better-sqlite3
- **Web Scraping**: Axios + Cheerio
- **Frontend**: HTML5, CSS3, JavaScript (Vanilla)
- **Charts**: Chart.js for interactive visualizations
- **Styling**: Modern CSS with gradients and glassmorphism effects

## Project Structure

```
energy-auctions/
├── backend/
│   ├── index.js          # Main server file
│   ├── package.json      # Backend dependencies
│   └── node_modules/     # Backend packages
├── frontend/
│   └── index.html        # Main dashboard interface
├── package.json          # Root package.json
└── README.md            # This file
```

## Installation & Setup

### Prerequisites

- Node.js (v14 or higher)
- npm (comes with Node.js)

### Step 1: Clone or Download the Project

```bash
# If you have the project files, navigate to the directory
cd energy-auctions
```

### Step 2: Install Dependencies

```bash
# Install backend dependencies
cd backend
npm install
```

### Step 3: Start the Application

```bash
# Start the server (from the backend directory)
node index.js
```

The application will start on `http://localhost:3001`

## Usage

### 1. Access the Dashboard

Open your web browser and navigate to:
```
http://localhost:3001
```

### 2. Extract Data

Click the **"Extract New Data"** button to:
- Scrape the latest auction data from EEX
- Store it in the SQLite database
- Update the dashboard with new information

### 3. View Visualizations

The dashboard provides:
- **Statistics Cards**: Total auctions, average prices, volumes
- **Price Trend Chart**: Line chart showing clearing price trends
- **Volume Trend Chart**: Bar chart showing volume trends
- **Data Table**: Detailed view of all auction records

### 4. Manage Data

- **Refresh Data**: Reload existing data from database
- **Clear All Data**: Remove all stored auction records

## API Endpoints

The backend provides the following REST API endpoints:

- `GET /api/auctions` - Retrieve all auction data
- `GET /api/statistics` - Get aggregated statistics
- `POST /api/extract-data` - Trigger data extraction from EEX
- `DELETE /api/auctions` - Clear all stored data

## Data Schema

The SQLite database stores auction data with the following structure:

```sql
CREATE TABLE auctions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    auction_date TEXT NOT NULL,
    product_type TEXT NOT NULL,
    volume_mwh REAL,
    clearing_price REAL,
    total_volume REAL,
    participants INTEGER,
    scraped_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

## Data Source

The application extracts data from:
```
https://www.eex.com/en/markets/energy-certificates/french-auctions-power
```

**Note**: The web scraping functionality is designed to handle the EEX website structure. If the website changes, the scraping selectors may need to be updated.

## Features in Detail

### Data Extraction
- Uses Cheerio for HTML parsing
- Implements proper User-Agent headers
- Handles missing data gracefully with sample data
- Stores extraction timestamps

### Visualization
- **Price Trend**: Line chart showing clearing price evolution
- **Volume Trend**: Bar chart showing auction volumes
- **Statistics Dashboard**: Key metrics at a glance
- **Responsive Design**: Adapts to different screen sizes

### Database Features
- Automatic table creation
- Efficient SQLite queries
- Data integrity with proper constraints
- Timestamp tracking for all records

## Troubleshooting

### Common Issues

1. **Port Already in Use**
   ```bash
   # Change the port in backend/index.js
   const PORT = process.env.PORT || 3002;  # Use different port
   ```

2. **Database Permissions**
   ```bash
   # Ensure write permissions in the backend directory
   chmod 755 backend/
   ```

3. **CORS Issues**
   - The backend includes CORS middleware
   - If issues persist, check browser console for errors

4. **Data Extraction Fails**
   - Check internet connection
   - Verify EEX website is accessible
   - Review console logs for specific errors

### Development Mode

For development, you can add nodemon for automatic restarts:

```bash
# Install nodemon globally
npm install -g nodemon

# Run with nodemon
nodemon index.js
```

## Future Enhancements

Potential improvements for the project:

1. **Scheduled Data Extraction**: Automatic periodic data collection
2. **Email Notifications**: Alert system for significant price changes
3. **Advanced Analytics**: More sophisticated statistical analysis
4. **Export Functionality**: CSV/Excel export of auction data
5. **User Authentication**: Multi-user support with roles
6. **Historical Data**: Long-term trend analysis
7. **API Rate Limiting**: Protection against excessive requests

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

This project is open source and available under the ISC License.

## Support

For issues or questions:
1. Check the troubleshooting section
2. Review console logs for error messages
3. Verify all dependencies are installed
4. Ensure proper file permissions

---

**Note**: This application is for educational and demonstration purposes. Always respect website terms of service when scraping data. 