import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { collection, getDocs, query, orderBy } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../../lib/firebase';
import { Category, Subcategory } from '../../types';
import { ChevronRight, ChevronLeft, Search, Loader2 } from 'lucide-react';
import * as Icons from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface SubsidyFinderProps {
  onSelectSubcategory: (subId: string) => void;
}

export default function SubsidyFinder({ onSelectSubcategory }: SubsidyFinderProps) {
  const { t, i18n } = useTranslation();
  const [categories, setCategories] = useState<Category[]>([]);
  const [subcategories, setSubcategories] = useState<Subcategory[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  const currentLang = i18n.language.split('-')[0] as 'ar' | 'fr' | 'en';
  const isRTL = currentLang === 'ar';

  // Ensure unique categories by name to avoid duplicates in UI
  const uniqueCategories = categories.reduce((acc, current) => {
    const exists = acc.find(item => item.name[currentLang] === current.name[currentLang]);
    if (!exists) return [...acc, current];
    return acc;
  }, [] as Category[]);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        let catSnap, subSnap;
        try {
          catSnap = await getDocs(query(collection(db, 'categories'), orderBy('order')));
          subSnap = await getDocs(query(collection(db, 'subcategories'), orderBy('order')));
        } catch (e) {
          console.warn('Firestore index missing for order, falling back to unordered fetch');
          catSnap = await getDocs(collection(db, 'categories'));
          subSnap = await getDocs(collection(db, 'subcategories'));
        }

        setCategories(catSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Category)));
        setSubcategories(subSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Subcategory)));
      } catch (error) {
        handleFirestoreError(error, OperationType.GET, 'categories/subcategories');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const filteredCategories = uniqueCategories.filter(cat => {
    const catMatch = cat.name[currentLang]?.toLowerCase().includes(searchQuery.toLowerCase());
    const subMatch = subcategories.some(sub => 
      sub.categoryId === cat.id && 
      sub.name[currentLang]?.toLowerCase().includes(searchQuery.toLowerCase())
    );
    return catMatch || subMatch;
  });

  const filteredSubcategories = subcategories.filter(sub =>
    sub.categoryId === selectedCategory?.id &&
    sub.name[currentLang]?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const renderIcon = (iconName: string) => {
    const IconComponent = (Icons as any)[iconName] || Icons.HelpCircle;
    return <IconComponent className="w-8 h-8 text-green-600" />;
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero Section */}
      <div className="bg-green-700 text-white py-20 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-0 left-0 w-64 h-64 bg-white rounded-full -translate-x-1/2 -translate-y-1/2 blur-3xl"></div>
          <div className="absolute bottom-0 right-0 w-96 h-96 bg-green-400 rounded-full translate-x-1/3 translate-y-1/3 blur-3xl"></div>
        </div>
        
        <div className="max-w-5xl mx-auto relative z-10 text-center">
          <motion.h1 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-4xl md:text-6xl font-extrabold mb-6 leading-tight"
          >
            {t('app_name')}
          </motion.h1>
          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-xl md:text-2xl text-green-100 max-w-3xl mx-auto mb-10"
          >
            {t('tagline')}
          </motion.p>

          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="relative max-w-xl mx-auto"
          >
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none rtl:left-auto rtl:right-0 rtl:pr-4">
              <Search className="h-6 w-6 text-green-200" />
            </div>
            <input
              type="text"
              className="block w-full pl-12 pr-4 py-4 bg-green-800/50 border border-green-500/30 rounded-2xl text-white placeholder-green-300 focus:outline-none focus:ring-2 focus:ring-green-400 focus:bg-green-800 transition-all text-lg rtl:pl-4 rtl:pr-12"
              placeholder={t('search')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </motion.div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto py-16 px-4 sm:px-6 lg:px-8">
        <AnimatePresence mode="wait">
          {!selectedCategory ? (
            <motion.div
              key="categories"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <div className="flex items-center justify-between mb-10">
                <h2 className="text-3xl font-bold text-gray-900 border-r-4 border-green-600 pr-4 rtl:border-r-0 rtl:border-l-4 rtl:pl-4">
                  {t('categories')}
                </h2>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
                {filteredCategories.map((cat, idx) => (
                  <motion.button
                    key={cat.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.05 }}
                    onClick={() => {
                      setSelectedCategory(cat);
                      setSearchQuery('');
                      window.scrollTo({ top: 400, behavior: 'smooth' });
                    }}
                    className="group relative bg-white p-10 rounded-3xl border border-gray-200 hover:border-green-500 hover:shadow-2xl transition-all duration-500 text-right rtl:text-right ltr:text-left overflow-hidden"
                  >
                    <div className="absolute top-0 right-0 w-32 h-32 bg-green-50 rounded-bl-full -mr-16 -mt-16 group-hover:bg-green-600 transition-colors duration-500 opacity-50 group-hover:opacity-100"></div>
                    
                    <div className="relative z-10">
                      <div className="w-16 h-16 bg-white shadow-lg rounded-2xl flex items-center justify-center mb-8 group-hover:scale-110 transition-transform duration-500">
                        {renderIcon(cat.icon)}
                      </div>
                      <h3 className="text-2xl font-bold text-gray-900 mb-4 group-hover:text-green-700 transition-colors">
                        {cat.name[currentLang]}
                      </h3>
                      <p className="text-gray-500 text-base leading-relaxed mb-6">
                        {cat.description[currentLang]}
                      </p>
                      <div className="flex items-center text-green-600 font-bold group-hover:translate-x-2 rtl:group-hover:-translate-x-2 transition-transform duration-300">
                        <span className="mr-2 rtl:ml-2 rtl:mr-0">{t('get_started')}</span>
                        {isRTL ? <ChevronLeft className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
                      </div>
                    </div>
                  </motion.button>
                ))}
              </div>

              {filteredCategories.length === 0 && (
                <div className="text-center py-20 bg-white rounded-3xl border border-dashed border-gray-300">
                  <Search className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500 text-xl">{t('no_results')}</p>
                </div>
              )}
            </motion.div>
          ) : (
            <motion.div
              key="subcategories"
              initial={{ opacity: 0, x: isRTL ? -50 : 50 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: isRTL ? 50 : -50 }}
            >
              <div className="flex flex-col md:flex-row md:items-center justify-between mb-10 gap-4">
                <div className="flex items-center">
                  <button
                    onClick={() => {
                      setSelectedCategory(null);
                      setSearchQuery('');
                    }}
                    className="w-12 h-12 bg-white rounded-full border border-gray-200 flex items-center justify-center text-green-600 hover:bg-green-50 transition-colors shadow-sm"
                  >
                    {isRTL ? <ChevronRight className="w-6 h-6" /> : <ChevronLeft className="w-6 h-6" />}
                  </button>
                  <div className="mr-6 rtl:ml-6 rtl:mr-0">
                    <h2 className="text-3xl font-bold text-gray-900">{selectedCategory.name[currentLang]}</h2>
                    <p className="text-gray-500">{t('subcategories')}</p>
                  </div>
                </div>
                
                <div className="relative w-full md:w-72">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none rtl:left-auto rtl:right-0 rtl:pr-3">
                    <Search className="h-4 w-4 text-gray-400" />
                  </div>
                  <input
                    type="text"
                    className="block w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg bg-white text-sm focus:ring-green-500 focus:border-green-500 rtl:pl-3 rtl:pr-9"
                    placeholder={t('search')}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {filteredSubcategories.map((sub, idx) => (
                  <motion.button
                    key={sub.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.05 }}
                    onClick={() => onSelectSubcategory(sub.id)}
                    className="bg-white p-8 rounded-2xl border border-gray-100 shadow-sm hover:shadow-xl hover:border-green-500 transition-all duration-300 flex items-center justify-between group"
                  >
                    <div className="text-right rtl:text-right ltr:text-left flex-1">
                      <h4 className="text-xl font-bold text-gray-900 group-hover:text-green-700 transition-colors">
                        {sub.name[currentLang]}
                      </h4>
                      <p className="text-gray-500 mt-2 leading-relaxed">
                        {sub.description[currentLang]}
                      </p>
                    </div>
                    <div className="w-12 h-12 bg-green-50 rounded-full flex items-center justify-center group-hover:bg-green-600 transition-colors ml-6 rtl:mr-6 rtl:ml-0">
                      {isRTL ? (
                        <ChevronLeft className="w-6 h-6 text-green-600 group-hover:text-white transition-colors" />
                      ) : (
                        <ChevronRight className="w-6 h-6 text-green-600 group-hover:text-white transition-colors" />
                      )}
                    </div>
                  </motion.button>
                ))}
              </div>

              {filteredSubcategories.length === 0 && (
                <div className="text-center py-20 bg-white rounded-3xl border border-dashed border-gray-300">
                  <p className="text-gray-500 text-lg">{t('no_results')}</p>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
