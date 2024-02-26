const express = require('express');
const axios = require('axios');

const STOCK_API_BASE_URL = 'https://stock-price-checker-proxy.freecodecamp.rocks/v1/stock/';

module.exports = function (app) {

  app.route('/api/stock-prices')
    .get(async (req, res) => {
      try {
        const { stock, like } = req.query;

        // Check if the stock symbol is provided
        if (!stock) {
          return res.status(400).json({ error: 'Stock symbol is required.' });
        }

        // Ensure stock is always an array for simplicity
        const stockSymbols = Array.isArray(stock) ? stock : [stock];

        // Fetch stock information for each symbol concurrently
        const stockDataPromises = stockSymbols.map(async (symbol) => {
          try {
            const stockInfo = await fetchStockInfo(symbol);
            return {
              stock: stockInfo.symbol,
              price: stockInfo.latestPrice,
              likes: like ? 1 : 0,
            };
          } catch (error) {
            // Log the error and return a default object
            console.error(`Error fetching stock information for ${symbol}:`, error.message);
            return {
              stock: symbol,
              price: null,
              likes: 0,
            };
          }
        });

        // Wait for all promises to resolve
        const validStockData = await Promise.all(stockDataPromises);

        // If only one stock symbol is provided, send its data
        if (validStockData.length === 1) {
          const singleStockData = {
            stock: validStockData[0].stock,
            price: validStockData[0].price,
            likes: validStockData[0].likes,
          };
          return res.json({ stockData: singleStockData });
        }

        // Calculate relative likes for multiple stocks
        const totalLikes = validStockData.reduce((sum, stock) => sum + stock.likes, 0);
        const relLikes = validStockData.map(stock => ({
          stock: stock.stock,
          price: stock.price,
          rel_likes: stock.likes - totalLikes,
        }));

        // Send the result with relative likes
        return res.json({ stockData: relLikes });

      } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal server error.' });
      }
    });
};

// Function to fetch stock information from the external API
async function fetchStockInfo(symbol) {
  try {
    const response = await axios.get(`${STOCK_API_BASE_URL}${symbol}/quote`);
    return {
      symbol: response.data.symbol,
      latestPrice: response.data.latestPrice
    };
  } catch (error) {
    // Handle any errors when fetching stock information
    console.error(`Error fetching stock information for ${symbol}:`, error.message);
    throw new Error('Failed to fetch stock information.');
  }
}
