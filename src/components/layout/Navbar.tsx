import { useState, useEffect, useRef, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Globe, LogIn, LogOut, LayoutDashboard, ChevronDown, Menu, X, ChevronLeft, ChevronRight } from 'lucide-react';
import * as Icons from 'lucide-react';
import { auth, db } from '../../lib/firebase';
import { signInWithPopup, GoogleAuthProvider, signOut } from 'firebase/auth';
import { collection, getDocs, query, orderBy } from 'firebase/firestore';
import { User, Category, Subcategory, ThirdGradeSubcategory } from '../../types';
import { motion, AnimatePresence } from 'motion/react';

interface NavbarProps {
  user: User | null;
  isAdmin: boolean;
  onNavigate: (page: string) => void;
  onSelectSubcategory: (subId: string, thirdGradeId?: string) => void;
}

export default function Navbar({ user, isAdmin, onNavigate, onSelectSubcategory }: NavbarProps) {
  const { t, i18n } = useTranslation();
  const [categories, setCategories] = useState<Category[]>([]);
  const [subcategories, setSubcategories] = useState<Subcategory[]>([]);
  const [thirdGradeSubcategories, setThirdGradeSubcategories] = useState<ThirdGradeSubcategory[]>([]);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isMegaMenuOpen, setIsMegaMenuOpen] = useState(false);
  const [activeCategoryId, setActiveCategoryId] = useState<string | null>(null);
  const [expandedSubcategoryId, setExpandedSubcategoryId] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const currentLang = i18n.language.split('-')[0] as 'ar' | 'fr' | 'en';
  const isRTL = currentLang === 'ar';

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsMegaMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Ensure unique categories by name to avoid duplicates in UI
  const uniqueCategories = useMemo(() => {
    return categories.reduce((acc, current) => {
      const exists = acc.find(item => item.name[currentLang] === current.name[currentLang]);
      if (!exists) return [...acc, current];
      return acc;
    }, [] as Category[]);
  }, [categories, currentLang]);

  // Set initial active category when menu opens
  useEffect(() => {
    if (isMegaMenuOpen && !activeCategoryId && uniqueCategories.length > 0) {
      setActiveCategoryId(uniqueCategories[0].id);
    }
  }, [isMegaMenuOpen, uniqueCategories, activeCategoryId]);

  useEffect(() => {
    const fetchMenuData = async () => {
      try {
        // Try with orderBy first
        let catSnap, subSnap, thirdSnap;
        try {
          catSnap = await getDocs(query(collection(db, 'categories'), orderBy('order')));
          subSnap = await getDocs(query(collection(db, 'subcategories'), orderBy('order')));
          thirdSnap = await getDocs(query(collection(db, 'third_grade_subcategories'), orderBy('order')));
        } catch (e) {
          // Fallback if index is missing
          console.warn('Firestore index missing for order, falling back to unordered fetch');
          catSnap = await getDocs(collection(db, 'categories'));
          subSnap = await getDocs(collection(db, 'subcategories'));
          thirdSnap = await getDocs(collection(db, 'third_grade_subcategories'));
        }
        
        setCategories(catSnap.docs.map(d => ({ id: d.id, ...d.data() } as Category)));
        setSubcategories(subSnap.docs.map(d => ({ id: d.id, ...d.data() } as Subcategory)));
        setThirdGradeSubcategories(thirdSnap.docs.map(d => ({ id: d.id, ...d.data() } as ThirdGradeSubcategory)));
      } catch (error) {
        console.error('Error fetching menu data:', error);
      }
    };
    fetchMenuData();
  }, []);

  const toggleLanguage = () => {
    const langs = ['ar', 'fr', 'en'];
    const current = i18n.language.split('-')[0];
    const next = langs[(langs.indexOf(current) + 1) % langs.length];
    i18n.changeLanguage(next);
  };

  const handleLogin = async () => {
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
    } catch (error) {
      console.error('Login error:', error);
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  return (
    <nav className="bg-white border-b border-gray-200 sticky top-0 z-50 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16 items-center">
          <div className="flex items-center space-x-8 rtl:space-x-reverse">
            <div className="flex items-center cursor-pointer" onClick={() => onNavigate('home')}>
              <div className="w-10 h-10 bg-green-600 rounded-lg flex items-center justify-center text-white font-bold text-xl mr-3 rtl:ml-3">
                SA
              </div>
              <span className="text-xl font-bold text-gray-900 hidden lg:block">
                {t('app_name')}
              </span>
            </div>

            <div className="hidden md:block relative" ref={menuRef}>
              <button
                onClick={() => setIsMegaMenuOpen(!isMegaMenuOpen)}
                className={`flex items-center space-x-2 rtl:space-x-reverse px-4 py-2 rounded-xl text-sm font-bold transition-all border ${
                  isMegaMenuOpen 
                    ? 'bg-green-600 text-white border-green-600 shadow-lg' 
                    : 'bg-white text-gray-700 border-gray-200 hover:border-green-500 hover:text-green-600'
                }`}
              >
                <Menu className="w-4 h-4" />
                <span>{t('categories')}</span>
                <ChevronDown className={`w-4 h-4 transition-transform duration-300 ${isMegaMenuOpen ? 'rotate-180' : ''}`} />
              </button>

              <AnimatePresence>
                {isMegaMenuOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: 15, scale: 0.98 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 15, scale: 0.98 }}
                    className="absolute top-full left-0 rtl:right-0 rtl:left-auto w-[600px] bg-white border border-gray-100 shadow-2xl rounded-2xl mt-4 overflow-hidden z-[100]"
                  >
                    <div className="flex h-[450px]">
                      {/* Order 1: Vertical Category List */}
                      <div className="w-2/5 bg-gray-50 border-r border-gray-100 overflow-y-auto custom-scrollbar p-2">
                        <div className="px-3 py-2 text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">
                          {t('categories')}
                        </div>
                        {uniqueCategories.map(cat => {
                          const IconComponent = (Icons as any)[cat.icon] || Icons.HelpCircle;
                          const isActive = activeCategoryId === cat.id;
                          return (
                            <button
                              key={cat.id}
                              onMouseEnter={() => setActiveCategoryId(cat.id)}
                              className={`w-full flex items-center space-x-3 rtl:space-x-reverse px-4 py-3 text-sm font-medium rounded-xl transition-all mb-1 ${
                                isActive 
                                  ? 'bg-white text-green-700 shadow-sm border border-green-100' 
                                  : 'text-gray-600 hover:bg-white/50 hover:text-green-600'
                              }`}
                            >
                              <IconComponent className={`w-4 h-4 ${isActive ? 'text-green-600' : 'opacity-60'}`} />
                              <span className="flex-1 text-right rtl:text-right ltr:text-left">{cat.name[currentLang]}</span>
                              {isActive && <ChevronRight className="w-3 h-3 text-green-400" />}
                            </button>
                          );
                        })}
                      </div>

                      {/* Order 2: Vertical Subcategory List */}
                      <div className="w-3/5 bg-white overflow-y-auto custom-scrollbar p-2">
                        {activeCategoryId ? (
                          <>
                            <div className="px-4 py-2 text-[10px] font-bold text-green-600 uppercase tracking-widest mb-2 border-b border-green-50">
                              {uniqueCategories.find(c => c.id === activeCategoryId)?.name[currentLang]}
                            </div>
                            <div className="space-y-1">
                              {subcategories
                                .filter(sub => sub.categoryId === activeCategoryId)
                                .map(sub => {
                                  const relatedThirdGrade = thirdGradeSubcategories.filter(t => t.subcategoryId === sub.id);
                                  const isExpanded = expandedSubcategoryId === sub.id;
                                  
                                  return (
                                    <div key={sub.id} className="space-y-1">
                                      <button
                                        onClick={() => {
                                          if (relatedThirdGrade.length > 0) {
                                            setExpandedSubcategoryId(isExpanded ? null : sub.id);
                                          } else {
                                            onSelectSubcategory(sub.id);
                                            setIsMegaMenuOpen(false);
                                          }
                                        }}
                                        className={`w-full text-right rtl:text-right ltr:text-left px-4 py-3 text-sm transition-all rounded-xl flex items-center justify-between group ${
                                          isExpanded ? 'bg-green-50 text-green-700' : 'text-gray-700 hover:bg-green-50 hover:text-green-700'
                                        }`}
                                      >
                                        <span className="font-medium">{sub.name[currentLang]}</span>
                                        {relatedThirdGrade.length > 0 ? (
                                          <ChevronDown className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                                        ) : (
                                          <ChevronRight className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-all transform translate-x-1 rtl:-translate-x-1" />
                                        )}
                                      </button>
                                      
                                      <AnimatePresence>
                                        {isExpanded && (
                                          <motion.div
                                            initial={{ height: 0, opacity: 0 }}
                                            animate={{ height: 'auto', opacity: 1 }}
                                            exit={{ height: 0, opacity: 0 }}
                                            className="overflow-hidden bg-gray-50/50 rounded-xl mx-2"
                                          >
                                            {relatedThirdGrade.map(third => (
                                              <button
                                                key={third.id}
                                                onClick={() => {
                                                  onSelectSubcategory(sub.id, third.id);
                                                  setIsMegaMenuOpen(false);
                                                }}
                                                className="w-full text-right rtl:text-right ltr:text-left px-6 py-2.5 text-xs text-gray-600 hover:text-green-600 hover:bg-white transition-colors flex items-center"
                                              >
                                                <div className="w-1 h-1 bg-green-300 rounded-full mr-2 rtl:ml-2" />
                                                {third.name[currentLang]}
                                              </button>
                                            ))}
                                            <button
                                              onClick={() => {
                                                onSelectSubcategory(sub.id);
                                                setIsMegaMenuOpen(false);
                                              }}
                                              className="w-full text-right rtl:text-right ltr:text-left px-6 py-2.5 text-xs text-gray-400 hover:text-green-600 hover:bg-white transition-colors italic"
                                            >
                                              {t('view_all_in')} {sub.name[currentLang]}
                                            </button>
                                          </motion.div>
                                        )}
                                      </AnimatePresence>
                                    </div>
                                  );
                                })}
                              {subcategories.filter(sub => sub.categoryId === activeCategoryId).length === 0 && (
                                <div className="px-4 py-10 text-center text-gray-400 italic">
                                  {t('no_results')}
                                </div>
                              )}
                            </div>
                          </>
                        ) : (
                          <div className="h-full flex items-center justify-center text-gray-400 italic text-sm">
                            {t('select_category')}
                          </div>
                        )}
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          <div className="flex items-center space-x-4 rtl:space-x-reverse">
            <button
              onClick={toggleLanguage}
              className="p-2 text-gray-500 hover:text-green-600 transition-colors flex items-center space-x-2 rtl:space-x-reverse"
            >
              <Globe className="w-5 h-5" />
              <span className="uppercase text-sm font-medium">{i18n.language.split('-')[0]}</span>
            </button>

            {isAdmin && (
              <button
                onClick={() => onNavigate('admin')}
                className="p-2 text-gray-500 hover:text-green-600 transition-colors flex items-center space-x-2 rtl:space-x-reverse"
              >
                <LayoutDashboard className="w-5 h-5" />
                <span className="hidden sm:inline text-sm font-medium">{t('admin')}</span>
              </button>
            )}

            {user ? (
              <button
                onClick={handleLogout}
                className="flex items-center space-x-2 rtl:space-x-reverse text-gray-500 hover:text-red-600 transition-colors"
              >
                <LogOut className="w-5 h-5" />
                <span className="hidden sm:inline text-sm font-medium">{t('logout')}</span>
              </button>
            ) : (
              <button
                onClick={handleLogin}
                className="flex items-center space-x-2 rtl:space-x-reverse bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors"
              >
                <LogIn className="w-5 h-5" />
                <span className="text-sm font-medium">{t('login')}</span>
              </button>
            )}

            {/* Mobile Menu Toggle */}
            <button 
              className="md:hidden p-2 text-gray-500"
              onClick={() => setIsMenuOpen(!isMenuOpen)}
            >
              {isMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      <AnimatePresence>
        {isMenuOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="md:hidden bg-white border-t border-gray-100 overflow-hidden"
          >
            <div className="px-4 py-6 space-y-6 max-h-[80vh] overflow-y-auto">
              {uniqueCategories.map(cat => {
                const IconComponent = (Icons as any)[cat.icon] || Icons.HelpCircle;
                return (
                  <div key={cat.id} className="space-y-3">
                    <div className="flex items-center space-x-3 rtl:space-x-reverse font-bold text-gray-900 border-b border-gray-50 pb-2">
                      <IconComponent className="w-5 h-5 text-green-600" />
                      <span>{cat.name[currentLang]}</span>
                    </div>
                    <div className="grid grid-cols-1 gap-1 pl-8 rtl:pr-8 rtl:pl-0">
                      {subcategories
                        .filter(sub => sub.categoryId === cat.id)
                        .map(sub => {
                          const relatedThirdGrade = thirdGradeSubcategories.filter(t => t.subcategoryId === sub.id);
                          return (
                            <div key={sub.id} className="space-y-1">
                              <button
                                onClick={() => {
                                  onSelectSubcategory(sub.id);
                                  setIsMenuOpen(false);
                                }}
                                className="w-full text-right rtl:text-right ltr:text-left py-2.5 text-sm text-gray-600 hover:text-green-600 active:bg-green-50 rounded-md px-2 transition-colors font-medium"
                              >
                                {sub.name[currentLang]}
                              </button>
                              {relatedThirdGrade.map(third => (
                                <button
                                  key={third.id}
                                  onClick={() => {
                                    onSelectSubcategory(sub.id, third.id);
                                    setIsMenuOpen(false);
                                  }}
                                  className="w-full text-right rtl:text-right ltr:text-left py-1.5 text-xs text-gray-400 hover:text-green-600 pl-4 rtl:pr-4 rtl:pl-0 transition-colors"
                                >
                                  • {third.name[currentLang]}
                                </button>
                              ))}
                            </div>
                          );
                        })}
                    </div>
                  </div>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
}
