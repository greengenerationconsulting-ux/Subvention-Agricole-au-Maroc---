import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { doc, getDoc, collection, getDocs, query, where, limit } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../../lib/firebase';
import { SubsidyDetail, Subcategory, ThirdGradeSubcategory } from '../../types';
import { ChevronLeft, ChevronRight, FileText, CheckCircle, Percent, DollarSign, Loader2 } from 'lucide-react';
import { motion } from 'motion/react';

interface DetailsViewProps {
  subcategoryId: string;
  thirdGradeId?: string;
  onBack: () => void;
  isAdmin: boolean;
  onNavigate: (page: string) => void;
}

export default function DetailsView({ subcategoryId, thirdGradeId, onBack, isAdmin, onNavigate }: DetailsViewProps) {
  const { t, i18n } = useTranslation();
  const [detail, setDetail] = useState<SubsidyDetail | null>(null);
  const [subcategory, setSubcategory] = useState<Subcategory | null>(null);
  const [thirdGrade, setThirdGrade] = useState<ThirdGradeSubcategory | null>(null);
  const [loading, setLoading] = useState(true);
  const [quantity, setQuantity] = useState<number>(0);
  const [cost, setCost] = useState<number>(0);
  const [selectedVariantId, setSelectedVariantId] = useState<string>('');
  const [result, setResult] = useState<{ subsidy: number; isMaxed: boolean } | null>(null);

  const currentLang = i18n.language.split('-')[0] as 'ar' | 'fr' | 'en';
  const isRTL = currentLang === 'ar';

  useEffect(() => {
    const fetchDetail = async () => {
      setLoading(true);
      try {
        const subDoc = await getDoc(doc(db, 'subcategories', subcategoryId));
        if (subDoc.exists()) {
          const subData = subDoc.data();
          setSubcategory({ id: subDoc.id, ...(subData as any) } as Subcategory);
        }

        if (thirdGradeId) {
          const thirdDoc = await getDoc(doc(db, 'third_grade_subcategories', thirdGradeId));
          if (thirdDoc.exists()) {
            const thirdData = thirdDoc.data();
            setThirdGrade({ id: thirdDoc.id, ...(thirdData as any) } as ThirdGradeSubcategory);
          }
        } else {
          setThirdGrade(null);
        }

        let q;
        if (thirdGradeId) {
          q = query(
            collection(db, 'subsidy_details'), 
            where('subcategoryId', '==', subcategoryId),
            where('thirdGradeSubcategoryId', '==', thirdGradeId),
            limit(1)
          );
        } else {
          q = query(
            collection(db, 'subsidy_details'), 
            where('subcategoryId', '==', subcategoryId),
            where('thirdGradeSubcategoryId', '==', null),
            limit(1)
          );
        }

        const detailSnap = await getDocs(q);
        if (!detailSnap.empty) {
          const detailData = detailSnap.docs[0].data();
          setDetail({ id: detailSnap.docs[0].id, ...(detailData as any) } as SubsidyDetail);
        } else if (thirdGradeId) {
          // Fallback to subcategory detail if third-grade specific detail doesn't exist
          const fallbackSnap = await getDocs(query(
            collection(db, 'subsidy_details'), 
            where('subcategoryId', '==', subcategoryId),
            where('thirdGradeSubcategoryId', '==', null),
            limit(1)
          ));
          if (!fallbackSnap.empty) {
            const fallbackData = fallbackSnap.docs[0].data();
            setDetail({ id: fallbackSnap.docs[0].id, ...(fallbackData as any) } as SubsidyDetail);
          } else {
            setDetail(null);
          }
        } else {
          setDetail(null);
        }
      } catch (error) {
        handleFirestoreError(error, OperationType.GET, 'subsidy_details');
      } finally {
        setLoading(false);
      }
    };
    fetchDetail();
  }, [subcategoryId, thirdGradeId]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <Loader2 className="w-12 h-12 text-green-600 animate-spin mb-4" />
        <p className="text-gray-500 font-medium">{t('loading')}</p>
      </div>
    );
  }

  if (!subcategory) {
    return (
      <div className="max-w-3xl mx-auto py-12 px-4 text-center">
        <p className="text-gray-500 mb-6">{t('no_results')}</p>
        <button
          onClick={onBack}
          className="bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700 transition-colors"
        >
          {t('back')}
        </button>
      </div>
    );
  }

  const calculateSubsidy = () => {
    if (!detail) return;

    let rate = detail.ratePercentage;
    let max = detail.maxPerUnit;

    if (detail.variants && detail.variants.length > 0) {
      const variant = detail.variants.find(v => v.id === selectedVariantId);
      if (variant) {
        rate = variant.ratePercentage;
        max = variant.maxPerUnit;
      } else {
        return;
      }
    }

    if (rate === undefined || max === undefined) return;
    
    const subsidyByRate = cost * (rate / 100);
    const subsidyByMax = max * quantity;
    
    const finalSubsidy = Math.min(subsidyByRate, subsidyByMax);
    setResult({ 
      subsidy: finalSubsidy, 
      isMaxed: subsidyByMax <= subsidyByRate 
    });
  };

  const sections = detail ? [
    { title: t('conditions'), content: detail.conditions?.[currentLang], icon: CheckCircle, color: 'text-blue-700', bg: 'bg-blue-50', border: 'border-blue-200' },
    { title: t('requirements'), content: detail.requirements?.[currentLang], icon: FileText, color: 'text-purple-700', bg: 'bg-purple-50', border: 'border-purple-200' },
    { title: t('rates'), content: detail.rates?.[currentLang], icon: Percent, color: 'text-emerald-700', bg: 'bg-emerald-50', border: 'border-emerald-200' },
    { title: t('docs_pre'), content: detail.docs_pre?.[currentLang], icon: FileText, color: 'text-amber-700', bg: 'bg-amber-50', border: 'border-amber-200' },
    { title: t('docs_post'), content: detail.docs_post?.[currentLang], icon: FileText, color: 'text-indigo-700', bg: 'bg-indigo-50', border: 'border-indigo-200' },
    { title: t('plafonds'), content: detail.plafonds?.[currentLang], icon: DollarSign, color: 'text-rose-700', bg: 'bg-rose-50', border: 'border-rose-200' },
  ].filter(s => s.content && s.content.trim() !== '') : [];

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="max-w-4xl mx-auto py-12 px-4 sm:px-6 lg:px-8"
    >
      <button
        onClick={onBack}
        className="flex items-center text-green-600 font-medium hover:text-green-700 mb-8 transition-colors"
      >
        {isRTL ? <ChevronRight className="w-5 h-5 ml-1" /> : <ChevronLeft className="w-5 h-5 mr-1" />}
        {t('back')}
      </button>

      <div className="bg-white rounded-3xl shadow-xl overflow-hidden border border-gray-100">
        <div className="bg-green-600 px-8 py-10 text-white text-center relative">
          <div className="absolute top-0 left-0 w-full h-full opacity-10 pointer-events-none">
             <div className="absolute top-0 left-0 w-32 h-32 bg-white rounded-full -translate-x-1/2 -translate-y-1/2"></div>
             <div className="absolute bottom-0 right-0 w-48 h-48 bg-white rounded-full translate-x-1/3 translate-y-1/3"></div>
          </div>
          <h2 className="text-3xl font-bold mb-2 relative z-10">
            {thirdGrade ? thirdGrade.name[currentLang] : subcategory.name[currentLang]}
          </h2>
          <p className="text-green-100 max-w-2xl mx-auto relative z-10">
            {thirdGrade ? thirdGrade.description[currentLang] : subcategory.description[currentLang]}
          </p>
        </div>

        <div className="p-8 space-y-6">
          {!detail && (
            <div className="p-8 text-center bg-gray-50 rounded-3xl border border-dashed border-gray-200">
              <p className="text-gray-500">{t('no_results')}</p>
              {isAdmin && (
                <button 
                  onClick={() => onNavigate('admin')}
                  className="mt-4 text-green-600 font-bold hover:underline"
                >
                  {t('add_new')} {t('details')}
                </button>
              )}
            </div>
          )}

          {/* Simulator Section */}
          {detail && ((detail.ratePercentage && detail.maxPerUnit) || (detail.variants && detail.variants.length > 0)) && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-8 rounded-3xl bg-green-50 border border-green-200 shadow-sm"
            >
              <h3 className="text-xl font-bold mb-6 text-green-800 flex items-center">
                <Percent className="w-6 h-6 mr-2 rtl:ml-2" />
                {t('simulator')}
              </h3>
              
              <div className="space-y-6">
                {detail.variants && detail.variants.length > 0 && (
                  <div>
                    <label className="block text-sm font-medium text-green-700 mb-2">
                      {t('variants')}
                    </label>
                    <select
                      value={selectedVariantId}
                      onChange={(e) => setSelectedVariantId(e.target.value)}
                      className="w-full p-3 border border-green-200 rounded-xl focus:ring-2 focus:ring-green-500 outline-none transition-all"
                    >
                      <option value="">{t('select_category')}</option>
                      {detail.variants.map(v => (
                        <option key={v.id} value={v.id}>{v.name[currentLang]}</option>
                      ))}
                    </select>
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-green-700 mb-2">
                      {t('quantity')} ({detail.unitType === 'hectare' ? t('unit_hectare') : t('unit_item')})
                    </label>
                    <input
                      type="number"
                      value={quantity || ''}
                      onChange={(e) => setQuantity(parseFloat(e.target.value))}
                      className="w-full p-3 border border-green-200 rounded-xl focus:ring-2 focus:ring-green-500 outline-none transition-all"
                      placeholder="0"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-green-700 mb-2">
                      {t('total_cost')} ({t('mad')})
                    </label>
                    <input
                      type="number"
                      value={cost || ''}
                      onChange={(e) => setCost(parseFloat(e.target.value))}
                      className="w-full p-3 border border-green-200 rounded-xl focus:ring-2 focus:ring-green-500 outline-none transition-all"
                      placeholder="0"
                    />
                  </div>
                </div>
              </div>

              <button
                onClick={calculateSubsidy}
                className="w-full bg-green-600 text-white py-4 rounded-xl font-bold hover:bg-green-700 transition-all shadow-md hover:shadow-lg active:scale-95 mt-6"
              >
                {t('calculate')}
              </button>

              {result && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="mt-8 p-6 bg-white rounded-2xl border border-green-200 text-center"
                >
                  <p className="text-gray-500 text-sm mb-1 uppercase tracking-wider font-bold">{t('estimated_subsidy')}</p>
                  <div className="text-4xl font-black text-green-600 mb-2">
                    {result.subsidy.toLocaleString()} {t('mad')}
                  </div>
                  {result.isMaxed && (
                    <p className="text-amber-600 text-xs font-medium">
                      * {t('max_amount')} {t('reached')}
                    </p>
                  )}
                  <div className="mt-4 pt-4 border-t border-gray-100 grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-gray-400 block">{t('rate')}</span>
                      <span className="font-bold text-gray-700">
                        {detail.variants && detail.variants.length > 0 
                          ? detail.variants.find(v => v.id === selectedVariantId)?.ratePercentage 
                          : detail.ratePercentage}%
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-400 block">{t('max_amount')}</span>
                      <span className="font-bold text-gray-700">
                        {(detail.variants && detail.variants.length > 0 
                          ? detail.variants.find(v => v.id === selectedVariantId)?.maxPerUnit 
                          : detail.maxPerUnit || 0).toLocaleString()} {t('mad')} / {detail.unitType === 'hectare' ? t('unit_hectare') : t('unit_item')}
                      </span>
                    </div>
                  </div>
                </motion.div>
              )}
            </motion.div>
          )}

          {sections.map((section, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.1 }}
              className={`flex flex-col md:flex-row gap-6 p-8 rounded-3xl ${section.bg} border ${section.border} transition-all duration-300 hover:shadow-lg`}
            >
              <div className={`w-16 h-16 shrink-0 rounded-2xl bg-white shadow-sm flex items-center justify-center`}>
                <section.icon className={`w-8 h-8 ${section.color}`} />
              </div>
              <div className="flex-1">
                <h3 className={`text-xl font-bold mb-4 ${section.color} flex items-center`}>
                  <span className="w-2 h-2 rounded-full bg-current mr-2 rtl:ml-2 rtl:mr-0"></span>
                  {section.title}
                </h3>
                <div className="text-gray-800 leading-relaxed whitespace-pre-line text-lg font-medium">
                  {section.content || '---'}
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </motion.div>
  );
}
