import { motion } from 'motion/react';
import { Newspaper, TrendingUp, Clock, Bookmark, Share2, ExternalLink, Filter, ArrowLeft } from 'lucide-react';
import { useState } from 'react';

interface NewsroomProps {
  onBack?: () => void;
}

export function Newsroom({ onBack }: NewsroomProps = {}) {
  const [selectedCategory, setSelectedCategory] = useState('all');

  const categories = [
    { id: 'all', label: 'All News' },
    { id: 'fintech', label: 'Fintech' },
    { id: 'blockchain', label: 'Blockchain' },
    { id: 'regulation', label: 'Regulation' },
    { id: 'security', label: 'Security' },
  ];

  const newsArticles = [
    {
      id: 1,
      category: 'fintech',
      title: 'Digital Banking Revolution: New Standards Emerge',
      excerpt: 'Industry leaders announce new security protocols for digital financial transactions, setting benchmarks for the next decade.',
      source: 'Financial Times',
      time: '2 hours ago',
      trending: true,
      image: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=800',
    },
    {
      id: 2,
      category: 'blockchain',
      title: 'Blockchain Adoption Reaches New Heights in Finance',
      excerpt: 'Major banks integrate blockchain technology for cross-border payments, reducing transaction times by 80%.',
      source: 'Bloomberg',
      time: '5 hours ago',
      trending: true,
      image: 'https://images.unsplash.com/photo-1639762681485-074b7f938ba0?w=800',
    },
    {
      id: 3,
      category: 'regulation',
      title: 'New Compliance Framework for Digital Assets',
      excerpt: 'Regulatory bodies worldwide collaborate on standardized framework for digital asset management and reporting.',
      source: 'Reuters',
      time: '8 hours ago',
      trending: false,
      image: 'https://images.unsplash.com/photo-1450101499163-c8848c66ca85?w=800',
    },
    {
      id: 4,
      category: 'security',
      title: 'Advanced Authentication Systems Prevent Fraud',
      excerpt: 'Next-generation biometric systems reduce identity fraud by 95% across financial institutions.',
      source: 'TechCrunch',
      time: '12 hours ago',
      trending: false,
      image: 'https://images.unsplash.com/photo-1563013544-824ae1b704d3?w=800',
    },
    {
      id: 5,
      category: 'fintech',
      title: 'AI-Powered Financial Advisory Goes Mainstream',
      excerpt: 'Artificial intelligence transforms personal finance management with predictive analytics and automated investing.',
      source: 'Wall Street Journal',
      time: '1 day ago',
      trending: false,
      image: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=800',
    },
    {
      id: 6,
      category: 'blockchain',
      title: 'Smart Contracts Revolutionize Trade Finance',
      excerpt: 'Automated contract execution reduces processing time and costs in international trade agreements.',
      source: 'Financial Express',
      time: '1 day ago',
      trending: false,
      image: 'https://images.unsplash.com/photo-1639762681485-074b7f938ba0?w=800',
    },
  ];

  const filteredNews = selectedCategory === 'all' 
    ? newsArticles 
    : newsArticles.filter(article => article.category === selectedCategory);

  return (
    <div className="min-h-screen bg-black relative overflow-hidden">
      <div className="relative z-10 p-8">
        {/* Back Button */}
        {onBack && (
          <motion.button
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            onClick={onBack}
            whileHover={{ scale: 1.05, x: -5 }}
            whileTap={{ scale: 0.95 }}
            className="mb-6 flex items-center gap-2 px-6 py-3 rounded-xl border text-white hover:bg-[#D3AF37]/10 transition-all"
            style={{ borderColor: 'rgba(211, 175, 55, 0.3)' }}
          >
            <ArrowLeft className="w-5 h-5" />
            <span>Back to Dashboard</span>
          </motion.button>
        )}

        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="flex items-center gap-3 mb-2">
            <Newspaper className="w-8 h-8" style={{ color: '#D3AF37' }} />
            <h1 className="text-4xl font-light text-white">Newsroom</h1>
          </div>
          <p className="text-zinc-400 text-lg">Stay updated with latest fintech and blockchain news</p>
        </motion.div>

        {/* Category Filter */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="mb-8 p-6 rounded-2xl"
          style={{ background: '#1A1A1A', borderColor: 'rgba(211, 175, 55, 0.3)', borderWidth: '1px' }}
        >
          <div className="flex items-center gap-3 mb-4">
            <Filter className="w-5 h-5" style={{ color: '#D3AF37' }} />
            <h2 className="text-xl text-white">Categories</h2>
          </div>
          <div className="flex flex-wrap gap-3">
            {categories.map((category) => (
              <motion.button
                key={category.id}
                onClick={() => setSelectedCategory(category.id)}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="px-6 py-2 rounded-xl transition-all"
                style={{
                  background: selectedCategory === category.id ? '#D3AF37' : 'rgba(255,255,255,0.05)',
                  color: selectedCategory === category.id ? '#000' : '#fff',
                  border: `1px solid ${selectedCategory === category.id ? '#D3AF37' : 'rgba(211, 175, 55, 0.3)'}`,
                }}
              >
                {category.label}
              </motion.button>
            ))}
          </div>
        </motion.div>

        {/* Trending Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="mb-8"
        >
          <div className="flex items-center gap-3 mb-4">
            <TrendingUp className="w-6 h-6" style={{ color: '#D3AF37' }} />
            <h2 className="text-2xl font-light text-white">Trending Now</h2>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {filteredNews.filter(article => article.trending).map((article, index) => (
              <motion.div
                key={article.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.3 + index * 0.1 }}
                className="rounded-2xl overflow-hidden border cursor-pointer group"
                style={{ background: '#1A1A1A', borderColor: 'rgba(211, 175, 55, 0.3)' }}
              >
                <div className="aspect-video overflow-hidden">
                  <motion.img
                    src={article.image}
                    alt={article.title}
                    className="w-full h-full object-cover"
                    whileHover={{ scale: 1.05 }}
                    transition={{ duration: 0.3 }}
                  />
                </div>
                <div className="p-6">
                  <div className="flex items-center gap-3 mb-3">
                    <span className="px-3 py-1 rounded-full text-xs" style={{ background: 'rgba(211, 175, 55, 0.2)', color: '#D3AF37' }}>
                      {article.category.toUpperCase()}
                    </span>
                    <div className="flex items-center gap-1 text-zinc-400 text-sm">
                      <Clock className="w-4 h-4" />
                      <span>{article.time}</span>
                    </div>
                  </div>
                  <h3 className="text-xl text-white mb-2 group-hover:text-[#D3AF37] transition-colors">
                    {article.title}
                  </h3>
                  <p className="text-zinc-400 mb-4 line-clamp-2">{article.excerpt}</p>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-zinc-500">{article.source}</span>
                    <div className="flex gap-2">
                      <motion.button
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                        className="p-2 rounded-lg"
                        style={{ background: 'rgba(255,255,255,0.05)' }}
                      >
                        <Bookmark className="w-4 h-4 text-zinc-400" />
                      </motion.button>
                      <motion.button
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                        className="p-2 rounded-lg"
                        style={{ background: 'rgba(255,255,255,0.05)' }}
                      >
                        <Share2 className="w-4 h-4 text-zinc-400" />
                      </motion.button>
                      <motion.button
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                        className="p-2 rounded-lg"
                        style={{ background: 'rgba(211, 175, 55, 0.2)' }}
                      >
                        <ExternalLink className="w-4 h-4" style={{ color: '#D3AF37' }} />
                      </motion.button>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* All News Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <h2 className="text-2xl font-light text-white mb-4">Latest Updates</h2>
          <div className="space-y-4">
            {filteredNews.filter(article => !article.trending).map((article, index) => (
              <motion.div
                key={article.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.5 + index * 0.1 }}
                className="rounded-2xl p-6 border cursor-pointer group flex gap-6"
                style={{ background: '#1A1A1A', borderColor: 'rgba(211, 175, 55, 0.3)' }}
              >
                <div className="w-48 h-32 rounded-xl overflow-hidden flex-shrink-0">
                  <motion.img
                    src={article.image}
                    alt={article.title}
                    className="w-full h-full object-cover"
                    whileHover={{ scale: 1.05 }}
                    transition={{ duration: 0.3 }}
                  />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <span className="px-3 py-1 rounded-full text-xs" style={{ background: 'rgba(211, 175, 55, 0.2)', color: '#D3AF37' }}>
                      {article.category.toUpperCase()}
                    </span>
                    <div className="flex items-center gap-1 text-zinc-400 text-sm">
                      <Clock className="w-4 h-4" />
                      <span>{article.time}</span>
                    </div>
                  </div>
                  <h3 className="text-xl text-white mb-2 group-hover:text-[#D3AF37] transition-colors">
                    {article.title}
                  </h3>
                  <p className="text-zinc-400 mb-4">{article.excerpt}</p>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-zinc-500">{article.source}</span>
                    <div className="flex gap-2">
                      <motion.button
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                        className="p-2 rounded-lg"
                        style={{ background: 'rgba(255,255,255,0.05)' }}
                      >
                        <Bookmark className="w-4 h-4 text-zinc-400" />
                      </motion.button>
                      <motion.button
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                        className="p-2 rounded-lg"
                        style={{ background: 'rgba(255,255,255,0.05)' }}
                      >
                        <Share2 className="w-4 h-4 text-zinc-400" />
                      </motion.button>
                      <motion.button
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                        className="p-2 rounded-lg"
                        style={{ background: 'rgba(211, 175, 55, 0.2)' }}
                      >
                        <ExternalLink className="w-4 h-4" style={{ color: '#D3AF37' }} />
                      </motion.button>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>
    </div>
  );
}
