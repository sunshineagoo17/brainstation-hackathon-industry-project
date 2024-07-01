const express = require('express');
const router = express.Router();
const path = require('path');
const csvtojson = require('csvtojson');
const fs = require('fs');
require('dotenv').config();

// Load environment variables
const DATA_DIR = path.resolve(__dirname, '../scripts/data');

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

// Endpoint to fetch dashboard data
router.get('/dashboard', async (req, res) => {
  try {
    const bestbuyFile = getMostRecentFile(DATA_DIR, 'bestbuy_comparison');
    const neweggFile = getMostRecentFile(DATA_DIR, 'newegg_comparison');

    if (!bestbuyFile || !neweggFile) {
      return res.status(404).json({ message: 'One or more data files not found.' });
    }

    const bestbuyFilePath = path.join(DATA_DIR, bestbuyFile);
    const neweggFilePath = path.join(DATA_DIR, neweggFile);

    const [bestbuyData, neweggData] = await Promise.all([
      csvtojson().fromFile(bestbuyFilePath),
      csvtojson().fromFile(neweggFilePath)
    ]);

    const totalOffenders = 2; // Assuming monitoring BestBuy and Newegg
    const bestbuyTop5 = bestbuyData.filter(item => item.Status !== 'Green').sort((a, b) => a.Deviation - b.Deviation).slice(0, 5);
    const neweggTop5 = neweggData.filter(item => item.Status !== 'Green').sort((a, b) => a.Deviation - b.Deviation).slice(0, 5);
    const totalDeviatedProductsBestBuy = bestbuyData.filter(item => item.Deviation !== 0).length;
    const totalDeviatedProductsNewegg = neweggData.filter(item => item.Deviation !== 0).length;
    const averageDeviationBestBuy = bestbuyData.reduce((sum, item) => sum + parseFloat(item.Deviation || 0), 0) / bestbuyData.length;
    const averageDeviationNewegg = neweggData.reduce((sum, item) => sum + parseFloat(item.Deviation || 0), 0) / neweggData.length;
    const complianceRateBestBuy = (bestbuyData.filter(item => item.Status === 'Green').length / bestbuyData.length) * 100;
    const complianceRateNewegg = (neweggData.filter(item => item.Status === 'Green').length / neweggData.length) * 100;

    const dashboardData = {
      totalOffenders,
      bestbuyTop5,
      neweggTop5,
      totalDeviatedProductsBestBuy,
      totalDeviatedProductsNewegg,
      averageDeviationBestBuy,
      averageDeviationNewegg,
      complianceRateBestBuy,
      complianceRateNewegg
    };

    res.json(dashboardData);
  } catch (error) {
    console.error(`Error fetching dashboard data: ${error.message}`);
    res.status(500).json({ message: 'Error fetching dashboard data', error });
  }
});

module.exports = router;