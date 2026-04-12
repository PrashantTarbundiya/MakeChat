const {join} = require('path');

/**
 * @type {import("puppeteer").Configuration}
 */
module.exports = {
  // Changes the cache location for Puppeteer so it is cached in the project directory
  // This is required for Render deployments to avoid losing the chromium executable.
  cacheDirectory: join(__dirname, '.puppeteer-cache'),
};
