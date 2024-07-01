const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const csvtojson = require('csvtojson');
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

// Utility function to fetch data from a CSV file
const fetchDataFromFile = async (filePath) => {
  if (!fs.existsSync(filePath)) {
    throw new Error(`File does not exist: ${filePath}`);
  }
  return await csvtojson().fromFile(filePath);
};

// Endpoint to fetch Dell data
router.get('/dell', async (req, res) => {
  try {
    const dellFile = getMostRecentFile(DATA_DIR, 'official_dell_monitor');
    if (!dellFile) {
      return res.status(404).json({ message: 'Dell data file not found.' });
    }
    const dellFilePath = path.join(DATA_DIR, dellFile);
    const dellData = await fetchDataFromFile(dellFilePath);
    console.log('Fetched Dell Data:', dellData);
    res.json(Array.isArray(dellData) ? dellData : []);
  } catch (error) {
    console.error(`Error fetching Dell data: ${error.message}`);
    res.status(500).json({ message: 'Error fetching Dell data', error: error.message });
  }
});

// Endpoint to fetch BestBuy comparison data
router.get('/compare/dell-bestbuy', async (req, res) => {
  try {
    const bestbuyFile = getMostRecentFile(DATA_DIR, 'bestbuy_comparison');
    if (!bestbuyFile) {
      return res.status(404).json({ message: 'BestBuy data file not found.' });
    }
    const bestbuyFilePath = path.join(DATA_DIR, bestbuyFile);
    const bestbuyData = await fetchDataFromFile(bestbuyFilePath);
    console.log('Fetched BestBuy Data:', bestbuyData);
    res.json(Array.isArray(bestbuyData) ? bestbuyData : []);
  } catch (error) {
    console.error(`Error fetching BestBuy data: ${error.message}`);
    res.status(500).json({ message: 'Error fetching BestBuy data', error: error.message });
  }
});

// Endpoint to fetch Newegg comparison data
router.get('/compare/dell-newegg', async (req, res) => {
  try {
    const neweggFile = getMostRecentFile(DATA_DIR, 'newegg_comparison');
    if (!neweggFile) {
      return res.status(404).json({ message: 'Newegg data file not found.' });
    }
    const neweggFilePath = path.join(DATA_DIR, neweggFile);
    const neweggData = await fetchDataFromFile(neweggFilePath);
    console.log('Fetched Newegg Data:', neweggData);
    res.json(Array.isArray(neweggData) ? neweggData : []);
  } catch (error) {
    console.error(`Error fetching Newegg data: ${error.message}`);
    res.status(500).json({ message: 'Error fetching Newegg data', error: error.message });
  }
});

// Endpoint to fetch all products data
router.get('/', async (req, res) => {
  try {
    const dellFile = getMostRecentFile(DATA_DIR, 'official_dell_monitor');
    const bestbuyFile = getMostRecentFile(DATA_DIR, 'bestbuy_comparison');
    const neweggFile = getMostRecentFile(DATA_DIR, 'newegg_comparison');

    if (!dellFile || !bestbuyFile || !neweggFile) {
      return res.status(404).json({ message: 'One or more data files not found.' });
    }

    const dellFilePath = path.join(DATA_DIR, dellFile);
    const bestbuyFilePath = path.join(DATA_DIR, bestbuyFile);
    const neweggFilePath = path.join(DATA_DIR, neweggFile);

    const [dellData, bestbuyData, neweggData] = await Promise.all([
      fetchDataFromFile(dellFilePath),
      fetchDataFromFile(bestbuyFilePath),
      fetchDataFromFile(neweggFilePath)
    ]);

    console.log('Fetched Dell Data:', dellData);
    console.log('Fetched BestBuy Data:', bestbuyData);
    console.log('Fetched Newegg Data:', neweggData);

    res.json({
      dellData: Array.isArray(dellData) ? dellData : [],
      bestbuyData: Array.isArray(bestbuyData) ? bestbuyData : [],
      neweggData: Array.isArray(neweggData) ? neweggData : []
    });
  } catch (error) {
    console.error(`Error fetching all products data: ${error.message}`);
    res.status(500).json({ message: 'Error fetching all products data', error: error.message });
  }
});

module.exports = router;