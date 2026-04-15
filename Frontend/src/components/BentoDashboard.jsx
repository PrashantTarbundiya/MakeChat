import React from 'react';
import { TrendingUp, TrendingDown, Clock, Activity, BarChart2, Newspaper, Globe } from 'lucide-react';
import { motion } from 'framer-motion';

export const BentoDashboard = ({ dataString }) => {
  let data;
  try {
    data = JSON.parse(dataString);
  } catch (err) {
    console.error('Failed to parse bento dashboard data:', err);
    return <div className="text-red-400 text-sm">Failed to load dashboard data.</div>;
  }

  const { keyStats = [], news = [], sentiment = { score: 50, label: 'Neutral' } } = data;

  const getSentimentColor = (score) => {
    if (score >= 70) return 'text-emerald-400';
    if (score >= 40) return 'text-yellow-400';
    return 'text-red-400';
  };

  const getSentimentBg = (score) => {
    if (score >= 70) return 'bg-emerald-500/20 border-emerald-500/30';
    if (score >= 40) return 'bg-yellow-500/20 border-yellow-500/30';
    return 'bg-red-500/20 border-red-500/30';
  };

  return (
    <div className="my-6 grid grid-cols-1 md:grid-cols-3 gap-4 font-sans max-w-4xl">
      {/* Key Stats Widget */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="md:col-span-2 grid grid-cols-2 gap-4"
      >
        {keyStats.map((stat, idx) => {
          const isPositive = stat.trend && stat.trend.includes('+');
          const isNegative = stat.trend && stat.trend.includes('-');

          return (
            <div key={idx} className="bg-[#1e1e1e] border border-white/10 rounded-xl p-5 flex flex-col justify-center relative overflow-hidden group">
              <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                <BarChart2 className="w-16 h-16" />
              </div>
              <div className="text-gray-400 text-sm font-medium mb-1 z-10 uppercase tracking-wider">{stat.label}</div>
              <div className="text-2xl sm:text-3xl font-bold text-white z-10 mb-2">{stat.value}</div>
              {stat.trend && (
                <div className={`flex items-center text-xs font-semibold z-10 ${isPositive ? 'text-emerald-400' : isNegative ? 'text-red-400' : 'text-gray-400'}`}>
                  {isPositive ? <TrendingUp className="w-3 h-3 mr-1" /> : isNegative ? <TrendingDown className="w-3 h-3 mr-1" /> : null}
                  {stat.trend}
                </div>
              )}
            </div>
          );
        })}
      </motion.div>

      {/* Sentiment Gauge Widget */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className={`rounded-xl p-5 border flex flex-col items-center justify-center relative overflow-hidden ${getSentimentBg(sentiment.score)}`}
      >
        <div className="absolute top-0 right-0 p-4 opacity-10">
          <Activity className="w-20 h-20" />
        </div>
        <h3 className="text-sm font-semibold text-white/70 uppercase tracking-wider mb-4 z-10 w-full text-center">Market Sentiment</h3>

        {/* Simple CSS Gauge */}
        <div className="relative w-32 h-16 mb-2 flex items-end justify-center z-10">
          <div className="absolute top-0 left-0 w-full h-full overflow-hidden rounded-t-[64px]">
            <div className="w-full h-[200%] border-[16px] border-white/10 rounded-full box-border absolute top-0 left-0"></div>
            <div
              className="w-full h-[200%] border-[16px] border-current rounded-full box-border absolute top-0 left-0 origin-center transition-transform duration-1000 ease-out"
              style={{
                color: sentiment.score >= 70 ? '#34d399' : sentiment.score >= 40 ? '#fbbf24' : '#f87171',
                transform: `rotate(${(sentiment.score / 100) * 180 - 180}deg)`,
                clipPath: 'polygon(0 0, 100% 0, 100% 50%, 0 50%)'
              }}
            ></div>
          </div>
          <div className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-t from-white/80 to-white">{sentiment.score}</div>
        </div>
        <div className={`font-semibold tracking-wide z-10 ${getSentimentColor(sentiment.score)}`}>{sentiment.label}</div>
      </motion.div>

      {/* Live News Ticker Widget */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="md:col-span-3 bg-[#1e1e1e] border border-white/10 rounded-xl p-5 overflow-hidden"
      >
        <div className="flex items-center gap-2 text-blue-400 text-sm font-semibold uppercase tracking-wider mb-4 border-b border-white/10 pb-3">
          <Globe className="w-4 h-4 animate-pulse" />
          Live Intelligence Feed
        </div>
        <div className="space-y-3">
          {news.length === 0 && <div className="text-gray-500 text-sm italic">No recent developments found.</div>}
          {news.map((item, idx) => (
            <div key={idx} className="flex gap-4 group">
              <div className="text-xs font-mono text-gray-500 whitespace-nowrap flex items-start pt-0.5">
                <Clock className="w-3 h-3 mr-1 mt-0.5 opacity-50" />
                {item.time || 'Recent'}
              </div>
              <div className="text-sm text-gray-300 group-hover:text-white transition-colors leading-relaxed">
                {item.text}
              </div>
            </div>
          ))}
        </div>
      </motion.div>
    </div>
  );
};

export default BentoDashboard;