import axios from 'axios';
import { load } from 'cheerio';

export async function performWebSearch(query) {
  try {
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
