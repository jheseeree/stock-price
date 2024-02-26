'use strict';

const axios = require('axios');

const STOCK_API_BASE_URL = process.env.API_URL;

module.exports = function (app) {

  app.route('/api/stock-prices')
    .get(function (req, res){
      const { stock, like } = req.query;

      // Check if the stock symbol is provided
      if (!stock) {
        return res.status(400).json({ error: 'Stock symbol is required.' });
      }

      // Ensure stock is always an array for simplicity
      const stockSymbols = Array.isArray(stock) ? stock : [stock];

      // Fetch stock information for each symbol concurrently
      const stockDataPromises = stockSymbols.map(symbol => fetchStockInfo(symbol, like));

      Promise.all(stockDataPromises)
        .then(stockData => {
          // If only one stock symbol is provided, send its data
          if (stockData.length === 1) {
            res.json({ stockData: stockData[0] });
          } else {
            // Calculate relative likes for multiple stocks
            const totalLikes = stockData.reduce((sum, stock) => sum + stock.likes, 0);
            const relLikes = stockData.map(stock => ({
              stock: stock.stock,
              price: stock.price,
              rel_likes: stock.likes - totalLikes,
            }));
            // Send the result with relative likes
            res.json({ stockData: relLikes });
          }
        })
        .catch(error => {
          console.error(error);
          res.status(500).json({ error: 'Internal server error.' });
        });
    });
    
};

function fetchStockInfo(symbol, like) {
  return new Promise((resolve, reject) => {
    axios.get(`${STOCK_API_BASE_URL}${symbol}/quote`)
      .then(response => {
        const stockInfo = response.data;
        resolve({
          stock: stockInfo.symbol,
          price: stockInfo.latestPrice,
          likes: like ? 1 : 0,
        });
      })
      .catch(error => {
        // Handle any errors when fetching stock information
        console.error(error);
        reject(new Error('Failed to fetch stock information.'));
      });
  });
}