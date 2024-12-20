const express = require('express');
const path = require('path');
const fs = require('fs');
const csvtojson = require('csvtojson');
const cors = require('cors');
require('dotenv').config(); // Load environment variables at the very top

const app = express();
const router = express.Router();

// Import the routes
const authRoutes = require('./routes/auth');
const dashboardRoutes = require('./routes/dashboard');
const productsRoutes = require('./routes/products');
const retailersRoutes = require('./routes/retailers');
const dataRoutes = require('./routes/data');

// Load environment variables
const { CORS_ORIGIN, DATA_DIR, DB_HOST, DB_USER, DB_PASSWORD, DB_NAME, NODE_ENV } = process.env;

// Enable CORS for all routes if the module is loaded
app.use(cors({
  origin: CORS_ORIGIN,
  credentials: true
}));

// Middleware to parse JSON bodies
app.use(express.json());

// Use the routes
app.use('/auth', authRoutes);
app.use('/dashboard', dashboardRoutes);
app.use('/api/products', productsRoutes);
app.use('/api/retailers', retailersRoutes);
app.use('/api/data', dataRoutes);

// Function to get the most recent file matching a pattern
function getMostRecentFile(dir, filePattern) {
  const files = fs.readdirSync(dir);
  const matchingFiles = files.filter(file => file.startsWith(filePattern) && file.endsWith('.csv'));

  if (matchingFiles.length === 0) {
    return null;
  }

  const sortedFiles = matchingFiles.sort((a, b) => {
    const dateA = a.split('_').pop().split('.').shift();
    const dateB = b.split('_').pop().split('.').shift();
    return dateB.localeCompare(dateA);
  });

  return sortedFiles[0];
}

// Data Fetch Endpoints
const createDataEndpoint = (route, filePattern) => {
  router.get(route, async (req, res) => {
    const fileName = getMostRecentFile(DATA_DIR, filePattern);
    if (!fileName) {
      const errorMessage = `No files found matching pattern: ${filePattern}`;
      console.error(errorMessage);
      return res.status(404).json({ message: errorMessage });
    }

    const filePath = path.join(DATA_DIR, fileName);
    console.log(`Fetching data from: ${filePath}`); // Debug log

    try {
      const data = await csvtojson().fromFile(filePath);
      console.log(`Number of items in ${filePath}: ${data.length}`);
      if (!Array.isArray(data)) {
        console.error('Data is not an array:', data);
        return res.status(500).json({ message: 'Error: Expected data to be an array' });
      }
      res.json(data);
    } catch (error) {
      console.error(`Error fetching data: ${error.message}`);
      res.status(500).json({ message: `Error fetching data from ${filePath}`, error });
    }
  });
};

// Define endpoints
createDataEndpoint('/dell', 'official_dell_monitor');
createDataEndpoint('/compare/dell-bestbuy', 'bestbuy_comparison');
createDataEndpoint('/compare/dell-newegg', 'newegg_comparison');
createDataEndpoint('/bestbuy', 'bestbuy_dell_monitor');
createDataEndpoint('/newegg', 'newegg_dell_monitor');
createDataEndpoint('/dashboard', 'combined_dashboard_data');

app.use('/api/data', router);

// Serve static files from the React app
app.use(express.static(path.join(__dirname, '../client/build')));

// The "catchall" handler: for any request that doesn't
// match one above, send back React's index.html file.
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../client/build', 'index.html'));
});

app.use(express.static('public'));

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});