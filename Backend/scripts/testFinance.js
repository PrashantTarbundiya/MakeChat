import { performWebSearch } from '../utils/webSearch.js';

async function test() {
  const res = await performWebSearch('Give me the live stock price of TCS right now');
  console.log(res);
}
test();
