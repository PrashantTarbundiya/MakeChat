import axios from 'axios';
import { load } from 'cheerio';

export async function performWebSearch(query) {
  try {
    // ---- HACK: 100% Accurate Live Finance Data (Yahoo Finance Bypass) ----
    const searchLower = query.toLowerCase();
    if (searchLower.match(/(stock|share|price|ticker|market cap|bse|nse)/)) {
      try {
        let cleanQuery = searchLower
            .replace(/give me the|what is the|tell me the|show me|find the|search for|how much is/gi, ' ')
            .replace(/(live|stock|share|price|today|bse|nse|current|market|cap|ticker|quote|right now|please|\s+)/gi, ' ')
            .replace(/\b(a|an|the|of|for|in|on|at|to)\b/gi, ' ')
            .replace(/[^a-z0-9\s.]/g, '')
            .replace(/\s+/g, ' ')
            .trim();
            
        // Look for explicit ALL CAPS ticker in the original query (like "TCS", "AAPL")
        const words = query.split(' ');
        const caps = words.find(w => w === w.toUpperCase() && w.length >= 2 && w.length <= 8 && /^[A-Z.]+$/.test(w));
        const finalTarget = caps || cleanQuery || searchLower.substring(0, 10);

        if (finalTarget.length > 0) {
          // 1. Find the ticker symbol using Yahoo Finance Search
          let searchRes = await axios.get(`https://query2.finance.yahoo.com/v1/finance/search?q=${encodeURIComponent(finalTarget)}`, {
              headers: { 'User-Agent': 'Mozilla/5.0' }
          });

          // Fallback: If no results, try just the very first word
          if (!searchRes.data || !searchRes.data.quotes || searchRes.data.quotes.length === 0) {
             const firstWord = finalTarget.split(' ')[0];
             searchRes = await axios.get(`https://query2.finance.yahoo.com/v1/finance/search?q=${encodeURIComponent(firstWord)}`, {
                 headers: { 'User-Agent': 'Mozilla/5.0' }
             });
          }
          
          if (searchRes.data && searchRes.data.quotes && searchRes.data.quotes.length > 0) {
            const topQuotes = searchRes.data.quotes.slice(0, 4).filter(q => q.quoteType === 'EQUITY' || q.quoteType === 'ETF' || q.quoteType === 'CRYPTOCURRENCY');
            
            let financeResults = [];
            for (const q of topQuotes) {
              try {
                const chartRes = await axios.get(`https://query1.finance.yahoo.com/v8/finance/chart/${q.symbol}?interval=1d`, {
                  headers: { 'User-Agent': 'Mozilla/5.0' }
                });
                
                if (chartRes.data && chartRes.data.chart.result.length > 0) {
                  const meta = chartRes.data.chart.result[0].meta;
                  const livePrice = meta.regularMarketPrice;
                  const previousClose = meta.chartPreviousClose;
                  const change = (livePrice - previousClose).toFixed(2);
                  const changePercent = ((change / previousClose) * 100).toFixed(2);
                  
                  financeResults.push({
                    title: `🔥 URGENT FACT LIVE STOCK DATA: ${q.shortname || q.longname || q.symbol} (${meta.exchangeName}: ${q.symbol})`,
                    snippet: `CRITICAL INSTRUCTION FOR AI: You MUST use these exact numbers. Current Price for ${q.symbol} is ${livePrice} ${meta.currency}. Previous close: ${previousClose}. Change: ${change} (${changePercent}%). Exchange: ${meta.exchangeName}. Do not hallucinate or guess.`,
                    url: `https://finance.yahoo.com/quote/${q.symbol}`,
                    source: 'Yahoo Finance (Live API)'
                  });
                }
              } catch (e) {}
            }
            if (financeResults.length > 0) {
              return financeResults;
            }
          }
        }
      } catch (finErr) {
        console.log('Yahoo Finance bypass failed, falling back:', finErr.message);
      }
    }
    // ----------------------------------------------------------------------

    // Try Google search scraping
    const response = await axios.get('https://www.google.com/search', {
      params: { q: query, num: 5 },
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      },
      timeout: 5000
    });

    const $ = load(response.data);
    const results = [];

    $('.g').each((i, elem) => {
      if (i >= 5) return false;
      const title = $(elem).find('h3').text();
      const snippet = $(elem).find('.VwiC3b').text() || $(elem).find('.IsZvec').text();
      const url = $(elem).find('a').attr('href');
      
      if (title && snippet && url) {
        results.push({ title, snippet, url, source: 'Google' });
      }
    });

    if (results.length > 0) return results;

    // Fallback to DuckDuckGo
    const ddgResponse = await axios.get('https://api.duckduckgo.com/', {
      params: { q: query, format: 'json', no_html: 1, skip_disambig: 1 }
    });

    const data = ddgResponse.data;
    if (data.Abstract) {
      results.push({
        title: data.Heading || 'Summary',
        snippet: data.Abstract,
        url: data.AbstractURL,
        source: 'DuckDuckGo'
      });
    }

    if (data.RelatedTopics && data.RelatedTopics.length > 0) {
      data.RelatedTopics.slice(0, 5).forEach(topic => {
        if (topic.Text && topic.FirstURL) {
          results.push({
            title: topic.Text.split(' - ')[0],
            snippet: topic.Text,
            url: topic.FirstURL,
            source: 'DuckDuckGo'
          });
        }
      });
    }

    return results.length > 0 ? results : null;
  } catch (error) {
    console.error('Web search error:', error);
    return null;
  }
}
