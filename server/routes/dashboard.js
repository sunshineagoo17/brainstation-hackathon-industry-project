const express = require("express");
const router = express.Router();
const csvtojson = require("csvtojson");
const path = require("path");
const fs = require("fs");
const bcrypt = require("bcrypt");
const knex = require("../knex");

// Define paths to your CSV files
const DATA_DIR = path.resolve(__dirname, "../scripts/data");

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

// Get the user ID when authorized
router
  .route("/:id")
  .get(async (req, res) => {
    // Pull the userId from the request params
    const userId = req.params.id;

    // Database Requests
    try {
      // Get the user info
      const user = await knex("users").where({ id: userId }).first();

      // Verify the user exists
      if (!user) {
        return res.status(404).json({ message: "User not found." });
      }

      res.status(200).json(user);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  })
  .put(async (req, res) => {
    const userId = req.params.id;
    const { first_name, last_name, email } = req.body;

    try {
      const user = await knex("users").where({ id: userId }).first();

      if (!user) {
        return res.status(404).json({ message: "User not found." });
      }

      await knex("users")
        .where({ id: userId })
        .update({ first_name, last_name, email });

      res.status(200).json({
        success: true,
        message: "User updated successfully",
        id: userId,
      });
    } catch (error) {
      console.error("Error updating user:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

// Endpoint to fetch data and calculate metrics
router.get("/retailer-metrics", async (req, res) => {
  try {
    // Get the most recent files
    const bestbuyFile = getMostRecentFile(DATA_DIR, 'bestbuy_comparison');
    const neweggFile = getMostRecentFile(DATA_DIR, 'newegg_comparison');

    if (!bestbuyFile || !neweggFile) {
      return res.status(404).json({ message: 'One or more data files not found.' });
    }

    const bestbuyFilePath = path.join(DATA_DIR, bestbuyFile);
    const neweggFilePath = path.join(DATA_DIR, neweggFile);

    // Fetch data from CSV files
    const [bestbuyData, neweggData] = await Promise.all([
      csvtojson().fromFile(bestbuyFilePath),
      csvtojson().fromFile(neweggFilePath),
    ]);

    // Calculate metrics for BestBuy
    const bestbuyMetrics = calculateMetrics(bestbuyData);

    // Calculate metrics for Newegg
    const neweggMetrics = calculateMetrics(neweggData);

    // Calculate total metrics across both retailers
    const totalMetrics = calculateTotalMetrics(bestbuyData, neweggData);

    // Prepare response object
    const response = {
      bestbuy: bestbuyMetrics,
      newegg: neweggMetrics,
      total: totalMetrics,
    };

    // Return response
    res.status(200).json(response);
  } catch (error) {
    console.error("Error fetching or calculating metrics:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

// Function to calculate metrics (compliance rate, average deviation, etc.) for a given retailer's data
const calculateMetrics = (data) => {
  const totalProducts = data.length;
  const compliantProducts = data.filter(product => product.Status === 'Green').length;
  const complianceRate = (compliantProducts / totalProducts) * 100 || 0;
  const averageDeviation = data.reduce((sum, product) => sum + parseFloat(product.Deviation || 0), 0) / totalProducts || 0;
  const totalDeviatedProducts = totalProducts - compliantProducts;

  return {
    totalProducts,
    complianceRate: complianceRate.toFixed(2),
    averageDeviation: averageDeviation.toFixed(2),
    totalDeviatedProducts,
    topOffendingProducts: data.filter(product => product.Status !== 'Green').slice(0, 5),
  };
};

// Function to calculate total deviated products across both retailers
const calculateTotalMetrics = (bestbuyData, neweggData) => {
  const totalBestBuyDeviated = bestbuyData.filter(product => product.Status !== 'Green').length;
  const totalNeweggDeviated = neweggData.filter(product => product.Status !== 'Green').length;
  const totalDeviatedProducts = totalBestBuyDeviated + totalNeweggDeviated;

  return {
    totalDeviatedProducts,
  };
};

// Endpoint to update user password
router.put("/:id/password", async (req, res) => {
  const userId = req.params.id;
  const { current_password, new_password } = req.body;

  try {
    const user = await knex("users").where({ id: userId }).first();

    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }

    const isMatch = await bcrypt.compare(current_password, user.password);
    if (!isMatch) {
      return res
        .status(400)
        .json({ message: "Current password is incorrect." });
    }

    const newHashedPassword = await bcrypt.hash(new_password, 10);

    await knex("users")
      .where({ id: userId })
      .update({ password: newHashedPassword });

    res.status(200).json({
      success: true,
      message: "Password updated successfully",
    });
  } catch (error) {
    console.error("Error updating password:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

module.exports = router;