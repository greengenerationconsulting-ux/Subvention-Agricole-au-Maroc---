import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc, query, orderBy } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../../lib/firebase';
import { Category, Subcategory, ThirdGradeSubcategory, SubsidyDetail } from '../../types';
import { 
  Plus, Edit2, Trash2, Save, X, Loader2, ChevronRight, ChevronLeft,
  Search, GitMerge, Filter, Download, Upload, Database, Settings,
  AlertTriangle, CheckCircle2, Info, ArrowRight, ArrowLeft,
  MoreVertical, Copy, RefreshCw
} from 'lucide-react';
import { GoogleGenAI } from "@google/genai";

export default function AdminDashboard() {
  const { t, i18n } = useTranslation();
  const [categories, setCategories] = useState<Category[]>([]);
  const [subcategories, setSubcategories] = useState<Subcategory[]>([]);
  const [thirdGradeSubcategories, setThirdGradeSubcategories] = useState<ThirdGradeSubcategory[]>([]);
  const [details, setDetails] = useState<SubsidyDetail[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'categories' | 'subcategories' | 'third_grade' | 'details'>('categories');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isBulkEditing, setIsBulkEditing] = useState(false);
  const [formData, setFormData] = useState<any>({});
  const [bulkFormData, setBulkFormData] = useState<any>({});
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [filterText, setFilterText] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
  const [confirmAction, setConfirmAction] = useState<{
    type: 'delete' | 'bulk_delete' | 'merge' | 'reset' | 'clear';
    id?: string;
    count?: number;
  } | null>(null);

  const currentLang = i18n.language.split('-')[0] as 'ar' | 'fr' | 'en';
  const isRTL = currentLang === 'ar';

  const updateNestedField = (field: string, lang: string, value: string) => {
    setFormData((prev: any) => ({
      ...prev,
      [field]: {
        ...(prev[field] || {}),
        [lang]: value
      }
    }));
  };

  const updateVariantField = (index: number, field: string, lang: string | null, value: any) => {
    const newVariants = [...(formData.variants || [])];
    if (lang) {
      newVariants[index] = {
        ...newVariants[index],
        name: {
          ...(newVariants[index].name || {}),
          [lang]: value
        }
      };
    } else {
      newVariants[index] = {
        ...newVariants[index],
        [field]: value
      };
    }
    setFormData({ ...formData, variants: newVariants });
  };

  const addVariant = () => {
    const newVariant = {
      id: crypto.randomUUID(),
      name: { ar: '', fr: '', en: '' },
      ratePercentage: 0,
      maxPerUnit: 0
    };
    setFormData({ ...formData, variants: [...(formData.variants || []), newVariant] });
  };

  const removeVariant = (index: number) => {
    const newVariants = [...(formData.variants || [])];
    newVariants.splice(index, 1);
    setFormData({ ...formData, variants: newVariants });
  };

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    if (statusMessage) {
      const timer = setTimeout(() => setStatusMessage(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [statusMessage]);

  const fetchData = async () => {
    setLoading(true);
    try {
      let catSnap, subSnap, thirdSnap;
      try {
        catSnap = await getDocs(query(collection(db, 'categories'), orderBy('order')));
        subSnap = await getDocs(query(collection(db, 'subcategories'), orderBy('order')));
        thirdSnap = await getDocs(query(collection(db, 'third_grade_subcategories'), orderBy('order')));
      } catch (e) {
        console.warn('Firestore index missing for order, falling back to unordered fetch');
        catSnap = await getDocs(collection(db, 'categories'));
        subSnap = await getDocs(collection(db, 'subcategories'));
        thirdSnap = await getDocs(collection(db, 'third_grade_subcategories'));
      }
      
      const detSnap = await getDocs(collection(db, 'subsidy_details'));

      setCategories(catSnap.docs.map(d => ({ id: d.id, ...d.data() } as Category)));
      setSubcategories(subSnap.docs.map(d => ({ id: d.id, ...d.data() } as Subcategory)));
      setThirdGradeSubcategories(thirdSnap.docs.map(d => ({ id: d.id, ...d.data() } as ThirdGradeSubcategory)));
      setDetails(detSnap.docs.map(d => ({ id: d.id, ...d.data() } as SubsidyDetail)));
    } catch (error) {
      handleFirestoreError(error, OperationType.GET, 'data');
    } finally {
      setLoading(false);
    }
  };

  const clearAllData = async () => {
    setLoading(true);
    try {
      const catSnap = await getDocs(collection(db, 'categories'));
      const subSnap = await getDocs(collection(db, 'subcategories'));
      const thirdSnap = await getDocs(collection(db, 'third_grade_subcategories'));
      const detSnap = await getDocs(collection(db, 'subsidy_details'));

      for (const d of catSnap.docs) await deleteDoc(doc(db, 'categories', d.id));
      for (const d of subSnap.docs) await deleteDoc(doc(db, 'subcategories', d.id));
      for (const d of thirdSnap.docs) await deleteDoc(doc(db, 'third_grade_subcategories', d.id));
      for (const d of detSnap.docs) await deleteDoc(doc(db, 'subsidy_details', d.id));

      setStatusMessage({ type: 'success', text: 'All data cleared!' });
      await fetchData();
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, 'all');
    } finally {
      setLoading(false);
      setConfirmAction(null);
    }
  };

  const resetToDefaultData = async () => {
    setLoading(true);
    try {
      const dataToSeed = [
        {
          cat: { name: { ar: 'الري الموضعي', fr: 'Irrigation Localisée', en: 'Localized Irrigation' }, description: { ar: 'أنظمة الري بالتنقيط والمعدات المرتبطة بها', fr: 'Systèmes de goutte-à-goutte et équipements associés', en: 'Drip irrigation systems and associated equipment' }, icon: 'Droplets', order: 1 },
          subs: [
            { name: { ar: 'تجهيز الضيعات بالري بالتنقيط', fr: 'Équipement en goutte-à-goutte', en: 'Drip irrigation equipment' }, description: { ar: 'دعم لتجهيز الضيعات الفلاحية بأنظمة الري الموضعي', fr: 'Subvention pour l\'équipement en systèmes d\'irrigation localisée', en: 'Subsidy for localized irrigation systems' } },
            { name: { ar: 'إحداث أحواض تجمع مياه الري', fr: 'Création de bassins de stockage', en: 'Creation of storage basins' }, description: { ar: 'بناء وتغطية أحواض تجمع مياه الري', fr: 'Construction et couverture des bassins de stockage d\'eau', en: 'Construction and covering of water storage basins' } }
          ]
        },
        {
          cat: { name: { ar: 'المعدات الفلاحية', fr: 'Matériel Agricole', en: 'Agricultural Equipment' }, description: { ar: 'الجرارات والآلات الفلاحية المختلفة', fr: 'Tracteurs et diverses machines agricoles', en: 'Tractors and various agricultural machines' }, icon: 'Tractor', order: 2 },
          subs: [
            { name: { ar: 'اقتناء الجرارات الفلاحية', fr: 'Acquisition de tracteurs agricoles', en: 'Acquisition of agricultural tractors' }, description: { ar: 'دعم لاقتناء الجرارات الفلاحية الجديدة', fr: 'Subvention pour l\'achat de tracteurs neufs', en: 'Subsidy for the purchase of new tractors' } },
            { name: { ar: 'آلات الحصاد والدرس', fr: 'Moissonneuses-batteuses', en: 'Combine harvesters' }, description: { ar: 'معدات الحصاد والجمع والدرس', fr: 'Matériel de récolte et de battage', en: 'Harvesting and threshing equipment' } }
          ]
        },
        {
          cat: { name: { ar: 'الأغراس المثمرة', fr: 'Plantations Fruitières', en: 'Fruit Plantations' }, description: { ar: 'إحداث وتوسيع بساتين الأشجار المثمرة', fr: 'Création et extension de vergers fruitiers', en: 'Creation and extension of fruit orchards' }, icon: 'TreePalm', order: 3 },
          subs: [
            { name: { ar: 'غرس النخيل', fr: 'Plantation de palmier dattier', en: 'Date palm plantation' }, description: { ar: 'دعم لغرس فسائل النخيل المختبرية', fr: 'Appui à la plantation de vitro-plants de palmier', en: 'Support for planting date palm vitro-plants' } },
            { name: { ar: 'غرس الزيتون', fr: 'Plantation d\'olivier', en: 'Olive plantation' }, description: { ar: 'تكثيف وتوسيع مساحات الزيتون', fr: 'Intensification et extension des oliveraies', en: 'Intensification and extension of olive groves' } }
          ]
        },
        {
          cat: { name: { ar: 'الإنتاج الحيواني', fr: 'Production Animale', en: 'Animal Production' }, description: { ar: 'تربية الماشية وتحسين السلالات', fr: 'Élevage et amélioration génétique', en: 'Livestock and genetic improvement' }, icon: 'Beef', order: 4 },
          subs: [
            { name: { ar: 'بناء وتجهيز الإسطبلات', fr: 'Construction et équipement d\'étables', en: 'Construction and equipment of stables' }, description: { ar: 'عصرنة وحدات الإنتاج الحيواني', fr: 'Modernisation des unités de production animale', en: 'Modernization of animal production units' } },
            { name: { ar: 'اقتناء فحول مختارة', fr: 'Acquisition de géniteurs sélectionnés', en: 'Acquisition of selected breeders' }, description: { ar: 'تحسين السلالات المحلية عبر فحول مختارة', fr: 'Amélioration des races locales via des géniteurs', en: 'Improvement of local breeds via breeders' } }
          ]
        },
        {
          cat: { name: { ar: 'تثمين المنتجات', fr: 'Valorisation', en: 'Valorization' }, description: { ar: 'وحدات التلفيف والتخزين والتحويل', fr: 'Unités de conditionnement et transformation', en: 'Packaging and processing units' }, icon: 'Warehouse', order: 5 },
          subs: [
            { name: { ar: 'وحدات التبريد والتخزين', fr: 'Unités de froid et stockage', en: 'Cold and storage units' }, description: { ar: 'تجهيز وحدات تبريد المنتجات الفلاحية', fr: 'Équipement d\'unités de froid agricole', en: 'Equipment of agricultural cold units' } },
            { name: { ar: 'معاصر الزيتون العصرية', fr: 'Huileries modernes', en: 'Modern oil mills' }, description: { ar: 'إحداث وحدات عصرية لاستخلاص زيت الزيتون', fr: 'Création d\'unités modernes d\'extraction d\'huile', en: 'Creation of modern oil extraction units' } }
          ]
        },
        {
          cat: { name: { ar: 'التأمين الفلاحي', fr: 'Assurance Agricole', en: 'Agricultural Insurance' }, description: { ar: 'حماية المحاصيل من المخاطر المناخية', fr: 'Protection contre les risques climatiques', en: 'Protection against climatic risks' }, icon: 'ShieldCheck', order: 6 },
          subs: [
            { name: { ar: 'التأمين المتعدد المخاطر', fr: 'Assurance multirisque climatique', en: 'Climatic multi-risk insurance' }, description: { ar: 'تغطية الحبوب والقطاني والزيتيات', fr: 'Couverture des céréales et légumineuses', en: 'Coverage of cereals and legumes' } },
            { name: { ar: 'تأمين الأشجار المثمرة', fr: 'Assurance arboriculture', en: 'Arboriculture insurance' }, description: { ar: 'حماية الأشجار المثمرة من البرد والرياح', fr: 'Protection des vergers contre la grêle et le vent', en: 'Protection of orchards against hail and wind' } }
          ]
        },
        {
          cat: { name: { ar: 'الشباب المقاول', fr: 'Jeunes Entrepreneurs', en: 'Young Entrepreneurs' }, description: { ar: 'دعم المشاريع الفلاحية للشباب', fr: 'Appui aux projets des jeunes', en: 'Support for youth projects' }, icon: 'UserPlus', order: 7 },
          subs: [
            { name: { ar: 'مشاريع التشغيل الذاتي', fr: 'Projets d\'auto-emploi', en: 'Self-employment projects' }, description: { ar: 'مواكبة الشباب في إحداث مقاولات خدماتية', fr: 'Accompagnement à la création d\'entreprises', en: 'Support for business creation' } },
            { name: { ar: 'الابتكار الفلاحي', fr: 'Innovation agricole', en: 'Agricultural innovation' }, description: { ar: 'دعم المشاريع المبتكرة والرقمنة', fr: 'Appui aux projets innovants et digitaux', en: 'Support for innovative and digital projects' } }
          ]
        },
        {
          cat: { name: { ar: 'الفلاحة البيولوجية', fr: 'Agriculture Biologique', en: 'Organic Farming' }, description: { ar: 'دعم المنتجات العضوية والبيئية', fr: 'Appui aux produits bio', en: 'Support for organic products' }, icon: 'Leaf', order: 8 },
          subs: [
            { name: { ar: 'المساعدة التقنية للبيو', fr: 'Assistance technique bio', en: 'Organic technical assistance' }, description: { ar: 'دعم تكاليف المراقبة والإشهاد', fr: 'Appui aux frais de contrôle et certification', en: 'Support for control and certification costs' } },
            { name: { ar: 'تحويل الضيعات للبيو', fr: 'Conversion au bio', en: 'Conversion to organic' }, description: { ar: 'دعم فترة التحول للفلاحة البيولوجية', fr: 'Appui à la période de conversion bio', en: 'Support for the organic conversion period' } }
          ]
        },
        {
          cat: { name: { ar: 'التهيئة الهيدروفلاحية', fr: 'Aménagements Hydro-agricoles', en: 'Hydro-agricultural Development' }, description: { ar: 'إصلاح وتجهيز شبكات الري التقليدية', fr: 'Réhabilitation des réseaux d\'irrigation', en: 'Rehabilitation of irrigation networks' }, icon: 'Waves', order: 9 },
          subs: [
            { name: { ar: 'إصلاح السواقي', fr: 'Réhabilitation des seguias', en: 'Rehabilitation of seguias' }, description: { ar: 'تحسين نجاعة شبكات الري التقليدية', fr: 'Amélioration de l\'efficience des réseaux', en: 'Improving network efficiency' } },
            { name: { ar: 'حماية الأراضي الفلاحية', fr: 'Protection des terres agricoles', en: 'Protection of agricultural lands' }, description: { ar: 'محاربة الانجراف والفيضانات', fr: 'Lutte contre l\'érosion et les inondations', en: 'Fighting erosion and floods' } }
          ]
        }
      ];

      for (const item of dataToSeed) {
        // Check if category already exists by name (English) to avoid duplicates
        const existingCat = categories.find(c => c.name.en === item.cat.name.en);
        let catId;
        
        if (existingCat) {
          catId = existingCat.id;
          // Update existing category order if needed
          await updateDoc(doc(db, 'categories', catId), { order: item.cat.order });
        } else {
          const catRef = await addDoc(collection(db, 'categories'), item.cat);
          catId = catRef.id;
        }

        for (const sub of item.subs) {
          // Check if subcategory already exists for this category
          const existingSub = subcategories.find(s => s.categoryId === catId && s.name.en === sub.name.en);
          let subId;

          if (existingSub) {
            subId = existingSub.id;
          } else {
            const subRef = await addDoc(collection(db, 'subcategories'), { ...sub, categoryId: catId, order: 1 });
            subId = subRef.id;
          }

          // Check if details already exist for this subcategory
          const existingDetail = details.find(d => d.subcategoryId === subId);
          if (!existingDetail) {
            await addDoc(collection(db, 'subsidy_details'), {
              subcategoryId: subId,
            conditions: { 
              ar: '1. التوفر على صفة فلاح\n2. الأرض يجب أن تكون في منطقة مسموح بها\n3. الالتزام بالمعايير التقنية المعمول بها', 
              fr: '1. Avoir le statut d\'agriculteur\n2. Le terrain doit être dans une zone autorisée\n3. Respect des normes techniques en vigueur', 
              en: '1. Have farmer status\n2. The land must be in an authorized area\n3. Compliance with current technical standards' 
            },
            requirements: {
              ar: '1. نسخة من بطاقة التعريف الوطنية\n2. شهادة الملكية أو عقد كراء\n3. التصميم الطبوغرافي للمشروع',
              fr: '1. Copie de la CIN\n2. Certificat de propriété ou bail\n3. Plan topographique du projet',
              en: '1. Copy of ID card\n2. Ownership certificate or lease\n3. Topographic plan of the project'
            },
            rates: { 
              ar: 'تتراوح نسبة الدعم بين 30% و 100% حسب نوع المشروع وحجم الاستثمار', 
              fr: 'Le taux de subvention varie entre 30% et 100% selon le projet', 
              en: 'The subsidy rate varies between 30% and 100% depending on the project' 
            },
            docs_pre: { 
              ar: '1. طلب الموافقة القبلية\n2. ملف تقني مصادق عليه\n3. شهادة الملكية أو عقد كراء موثق', 
              fr: '1. Demande d\'approbation préalable\n2. Dossier technique approuvé\n3. Certificat de propriété ou bail notarié', 
              en: '1. Prior approval request\n2. Approved technical file\n3. Ownership certificate or notarized lease' 
            },
            docs_post: { 
              ar: '1. طلب صرف الإعانة\n2. الفواتير النهائية الأصلية\n3. محضر المعاينة الميدانية', 
              fr: '1. Demande de déblocage\n2. Factures originales définitives\n3. Procès-verbal de constatation', 
              en: '1. Release request\n2. Original final invoices\n3. Field inspection report' 
            },
            plafonds: { 
              ar: 'يحدد السقف حسب المساحة أو الوحدة الإنتاجية وفقا لدليل الصندوق', 
              fr: 'Plafond fixé par hectare ou unité selon le guide du FDA', 
              en: 'Cap fixed per hectare or unit according to the FDA guide' 
            },
            ratePercentage: 80,
            maxPerUnit: 5000,
            unitType: 'hectare'
          });
          }
        }
      }

      setStatusMessage({ type: 'success', text: t('reset_success') });
      await fetchData();
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'seed');
    } finally {
      setLoading(false);
      setConfirmAction(null);
    }
  };

  const mergeDuplicateCategories = async () => {
    setLoading(true);
    try {
      // If items are selected, only merge those. Otherwise merge all.
      const targetCategories = selectedIds.length > 0 
        ? categories.filter(c => selectedIds.includes(c.id))
        : categories;

      const groups: { [key: string]: Category[] } = {};
      targetCategories.forEach(cat => {
        // Group by order (classe number) as requested
        if (cat.order !== undefined) {
          const key = String(cat.order);
          if (!groups[key]) groups[key] = [];
          groups[key].push(cat);
        }
      });

      let mergedCount = 0;
      let movedSubsCount = 0;

      for (const key in groups) {
        const group = groups[key];
        if (group.length > 1) {
          // Sort by ID or something to have a stable master, or just pick first
          const master = group[0];
          const duplicates = group.slice(1);

          for (const duplicate of duplicates) {
            // 1. Find subcategories of this duplicate
            const subsToMove = subcategories.filter(s => s.categoryId === duplicate.id);
            
            // 2. Update subcategories to point to master
            if (subsToMove.length > 0) {
              for (const sub of subsToMove) {
                try {
                  await updateDoc(doc(db, 'subcategories', sub.id), { categoryId: master.id });
                  movedSubsCount++;
                } catch (e) {
                  console.error(`Failed to move subcategory ${sub.id}`, e);
                }
              }
            }

            // 3. Delete the duplicate category
            try {
              await deleteDoc(doc(db, 'categories', duplicate.id));
              mergedCount++;
            } catch (e) {
              console.error(`Failed to delete category ${duplicate.id}`, e);
            }
          }
        }
      }
      
      if (mergedCount > 0) {
        await fetchData();
        setSelectedIds([]);
        setStatusMessage({ 
          type: 'success', 
          text: `${mergedCount} ${t('duplicates_merged') || 'duplicates merged successfully'}. ${movedSubsCount} subcategories moved.` 
        });
      } else {
        setStatusMessage({ 
          type: 'error', 
          text: t('no_duplicates_found') || 'No duplicates found with the same class number.' 
        });
      }
    } catch (error) {
      console.error("Merge error:", error);
      handleFirestoreError(error, OperationType.WRITE, 'merge');
    } finally {
      setLoading(false);
      setConfirmAction(null);
    }
  };

  const handleEdit = (item: any) => {
    setEditingId(item.id);
    setFormData(item);
  };

  const handleSave = async () => {
    setLoading(true);
    const path = activeTab === 'details' ? 'subsidy_details' : 
                 activeTab === 'third_grade' ? 'third_grade_subcategories' : 
                 activeTab;
    try {
      const { id, ...data } = formData;

      // Ensure unique categories by name
      if (activeTab === 'categories') {
        const isDuplicate = categories.some(cat => 
          cat.id !== id && (
            cat.name.ar === data.name.ar || 
            cat.name.fr === data.name.fr || 
            cat.name.en === data.name.en
          )
        );
        if (isDuplicate) {
          setStatusMessage({ type: 'error', text: 'A category with this name already exists.' });
          setLoading(false);
          return;
        }
      }

      if (id) {
        await updateDoc(doc(db, path, id), data);
      } else {
        await addDoc(collection(db, path), data);
      }
      setEditingId(null);
      setFormData({});
      await fetchData();
    } catch (error) {
      handleFirestoreError(error, formData.id ? OperationType.UPDATE : OperationType.CREATE, path);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    setLoading(true);
    const path = activeTab === 'details' ? 'subsidy_details' : 
                 activeTab === 'third_grade' ? 'third_grade_subcategories' : 
                 activeTab;
    try {
      await deleteDoc(doc(db, path, id));
      await fetchData();
      setStatusMessage({ type: 'success', text: t('delete_success') || 'Item deleted successfully' });
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, path);
    } finally {
      setLoading(false);
      setConfirmAction(null);
    }
  };

  const handleBulkDelete = async () => {
    if (selectedIds.length === 0) return;
    
    setLoading(true);
    const path = activeTab === 'details' ? 'subsidy_details' : 
                 activeTab === 'third_grade' ? 'third_grade_subcategories' : 
                 activeTab;
    let deletedCount = 0;
    try {
      console.log(`Bulk deleting ${selectedIds.length} items from ${path}`);
      for (const id of selectedIds) {
        try {
          await deleteDoc(doc(db, path, id));
          deletedCount++;
        } catch (e) {
          console.error(`Failed to delete ${id}`, e);
        }
      }
      setSelectedIds([]);
      await fetchData();
      setStatusMessage({ type: 'success', text: `${deletedCount} ${t('items_deleted') || 'items deleted successfully'}` });
    } catch (error) {
      console.error("Bulk delete error:", error);
      handleFirestoreError(error, OperationType.DELETE, path);
    } finally {
      setLoading(false);
      setConfirmAction(null);
    }
  };

  const handleBulkSave = async () => {
    if (selectedIds.length === 0) return;
    setLoading(true);
    const path = activeTab === 'details' ? 'subsidy_details' : 
                 activeTab === 'third_grade' ? 'third_grade_subcategories' : 
                 activeTab;
    try {
      // Filter out empty fields from bulkFormData and use dot notation for nested fields
      const updateData: any = {};
      Object.keys(bulkFormData).forEach(key => {
        if (typeof bulkFormData[key] === 'object' && bulkFormData[key] !== null) {
          const nested = bulkFormData[key];
          Object.keys(nested).forEach(subKey => {
            if (nested[subKey] !== '') {
              updateData[`${key}.${subKey}`] = nested[subKey];
            }
          });
        } else if (bulkFormData[key] !== '' && bulkFormData[key] !== undefined) {
          updateData[key] = bulkFormData[key];
        }
      });

      if (Object.keys(updateData).length === 0) {
        setStatusMessage({ type: 'error', text: 'No changes specified' });
        setLoading(false);
        return;
      }

      for (const id of selectedIds) {
        await updateDoc(doc(db, path, id), updateData);
      }

      setIsBulkEditing(false);
      setBulkFormData({});
      setSelectedIds([]);
      await fetchData();
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, path);
    } finally {
      setLoading(false);
    }
  };

  const toggleSelection = (id: string) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const filteredCategories = categories.filter(cat => 
    cat.name[currentLang].toLowerCase().includes(filterText.toLowerCase())
  );

  const filteredSubcategories = subcategories.filter(sub => {
    const matchesText = sub.name[currentLang].toLowerCase().includes(filterText.toLowerCase());
    const matchesCategory = filterCategory ? sub.categoryId === filterCategory : true;
    return matchesText && matchesCategory;
  });

  const filteredThirdGradeSubcategories = thirdGradeSubcategories.filter(third => {
    const matchesText = third.name[currentLang].toLowerCase().includes(filterText.toLowerCase());
    const sub = subcategories.find(s => s.id === third.subcategoryId);
    const matchesCategory = filterCategory ? sub?.categoryId === filterCategory : true;
    return matchesText && matchesCategory;
  });

  const filteredDetails = details.filter(det => {
    const sub = subcategories.find(s => s.id === det.subcategoryId);
    const matchesText = sub?.name[currentLang].toLowerCase().includes(filterText.toLowerCase());
    const matchesCategory = filterCategory ? sub?.categoryId === filterCategory : true;
    return matchesText && matchesCategory;
  });

  const renderBulkForm = () => {
    const isCategory = activeTab === 'categories';
    const isSubcategory = activeTab === 'subcategories';
    const isThirdGrade = activeTab === 'third_grade';

    const updateBulkNestedField = (field: string, lang: string, value: string) => {
      setBulkFormData((prev: any) => ({
        ...prev,
        [field]: {
          ...(prev[field] || {}),
          [lang]: value
        }
      }));
    };

    return (
      <div className="bg-blue-50 p-6 rounded-xl border border-blue-200 shadow-sm mb-8">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-bold text-blue-800">{t('bulk_edit_title')} ({selectedIds.length})</h3>
          <span className="text-xs text-blue-600 italic">{t('apply_to_all')}</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {(isCategory || isSubcategory || isThirdGrade) && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('name_ar')}</label>
                <input type="text" value={bulkFormData.name?.ar || ''} onChange={e => updateBulkNestedField('name', 'ar', e.target.value)} className="w-full p-2 border rounded" placeholder="Keep empty to skip" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('name_fr')}</label>
                <input type="text" value={bulkFormData.name?.fr || ''} onChange={e => updateBulkNestedField('name', 'fr', e.target.value)} className="w-full p-2 border rounded" placeholder="Keep empty to skip" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('name_en')}</label>
                <input type="text" value={bulkFormData.name?.en || ''} onChange={e => updateBulkNestedField('name', 'en', e.target.value)} className="w-full p-2 border rounded" placeholder="Keep empty to skip" />
              </div>
            </>
          )}

          {isCategory && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t('icon')}</label>
              <input type="text" value={bulkFormData.icon || ''} onChange={e => setBulkFormData({ ...bulkFormData, icon: e.target.value })} className="w-full p-2 border rounded" placeholder="Keep empty to skip" />
            </div>
          )}

          {isSubcategory && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t('category')}</label>
              <select value={bulkFormData.categoryId || ''} onChange={e => setBulkFormData({ ...bulkFormData, categoryId: e.target.value })} className="w-full p-2 border rounded">
                <option value="">{t('select_category')} (Skip)</option>
                {categories.map(c => <option key={c.id} value={c.id}>{c.name[currentLang]}</option>)}
              </select>
            </div>
          )}

          {isThirdGrade && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t('subcategory')}</label>
              <select value={bulkFormData.subcategoryId || ''} onChange={e => setBulkFormData({ ...bulkFormData, subcategoryId: e.target.value })} className="w-full p-2 border rounded">
                <option value="">{t('select_subcategory')} (Skip)</option>
                {subcategories.map(s => <option key={s.id} value={s.id}>{s.name[currentLang]}</option>)}
              </select>
            </div>
          )}
          
          {(isCategory || isSubcategory || isThirdGrade) && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t('order')}</label>
              <input type="number" value={bulkFormData.order || ''} onChange={e => setBulkFormData({ ...bulkFormData, order: e.target.value === '' ? '' : parseInt(e.target.value) })} className="w-full p-2 border rounded" placeholder="Keep empty to skip" />
            </div>
          )}
        </div>
        <div className="mt-6 flex justify-end space-x-3 rtl:space-x-reverse">
          <button onClick={() => { setIsBulkEditing(false); setBulkFormData({}); }} className="px-4 py-2 text-gray-600 hover:text-gray-800">{t('cancel')}</button>
          <button onClick={handleBulkSave} className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 flex items-center">
            <Save className="w-4 h-4 mr-2 rtl:ml-2" /> {t('save')}
          </button>
        </div>
      </div>
    );
  };

  const renderForm = () => {
    const isCategory = activeTab === 'categories';
    const isSubcategory = activeTab === 'subcategories';
    const isThirdGrade = activeTab === 'third_grade';
    const isDetail = activeTab === 'details';

    return (
      <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm mb-8">
        <h3 className="text-lg font-bold mb-4">{editingId ? t('edit') : t('add_new')}</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {!isDetail && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('name_ar')}</label>
                <input type="text" value={formData.name?.ar || ''} onChange={e => updateNestedField('name', 'ar', e.target.value)} className="w-full p-2 border rounded" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('name_fr')}</label>
                <input type="text" value={formData.name?.fr || ''} onChange={e => updateNestedField('name', 'fr', e.target.value)} className="w-full p-2 border rounded" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('name_en')}</label>
                <input type="text" value={formData.name?.en || ''} onChange={e => updateNestedField('name', 'en', e.target.value)} className="w-full p-2 border rounded" />
              </div>
            </>
          )}

          {isCategory && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('icon')}</label>
                <input type="text" value={formData.icon || ''} onChange={e => setFormData({ ...formData, icon: e.target.value })} className="w-full p-2 border rounded" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('order')}</label>
                <input type="number" value={formData.order || 0} onChange={e => setFormData({ ...formData, order: parseInt(e.target.value) })} className="w-full p-2 border rounded" />
              </div>
            </>
          )}

          {isSubcategory && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('category')}</label>
                <select value={formData.categoryId || ''} onChange={e => setFormData({ ...formData, categoryId: e.target.value })} className="w-full p-2 border rounded">
                  <option value="">{t('select_category')}</option>
                  {categories.map(c => <option key={c.id} value={c.id}>{c.name[currentLang]}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('order')}</label>
                <input type="number" value={formData.order || 0} onChange={e => setFormData({ ...formData, order: parseInt(e.target.value) })} className="w-full p-2 border rounded" />
              </div>
            </>
          )}

          {isThirdGrade && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('subcategory')}</label>
                <select value={formData.subcategoryId || ''} onChange={e => setFormData({ ...formData, subcategoryId: e.target.value })} className="w-full p-2 border rounded">
                  <option value="">{t('select_subcategory')}</option>
                  {subcategories.map(s => <option key={s.id} value={s.id}>{s.name[currentLang]}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('order')}</label>
                <input type="number" value={formData.order || 0} onChange={e => setFormData({ ...formData, order: parseInt(e.target.value) })} className="w-full p-2 border rounded" />
              </div>
            </>
          )}

          {isDetail && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('subcategory')}</label>
                <select value={formData.subcategoryId || ''} onChange={e => setFormData({ ...formData, subcategoryId: e.target.value })} className="w-full p-2 border rounded">
                  <option value="">{t('select_subcategory')}</option>
                  {subcategories.map(s => <option key={s.id} value={s.id}>{s.name[currentLang]}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('third_grade')} ({t('facultatif')})</label>
                <select value={formData.thirdGradeSubcategoryId || ''} onChange={e => setFormData({ ...formData, thirdGradeSubcategoryId: e.target.value })} className="w-full p-2 border rounded">
                  <option value="">{t('none')}</option>
                  {thirdGradeSubcategories
                    .filter(t => !formData.subcategoryId || t.subcategoryId === formData.subcategoryId)
                    .map(t => <option key={t.id} value={t.id}>{t.name[currentLang]}</option>)}
                </select>
              </div>
              {['conditions', 'requirements', 'rates', 'docs_pre', 'docs_post', 'plafonds'].map(field => (
                <div key={field} className="md:col-span-3 border-t pt-4 mt-2">
                  <div className="flex items-center justify-between mb-2">
                    <div className="font-bold text-green-700 uppercase text-xs">{t(field)}</div>
                    <label className="flex items-center text-xs text-gray-500 cursor-pointer">
                      <input 
                        type="checkbox" 
                        checked={!!formData[field]} 
                        onChange={e => {
                          if (e.target.checked) {
                            setFormData({ ...formData, [field]: { ar: '', fr: '', en: '' } });
                          } else {
                            const { [field]: _, ...rest } = formData;
                            setFormData(rest);
                          }
                        }}
                        className="mr-2 rtl:ml-2"
                      />
                      {t('active_sections')}
                    </label>
                  </div>
                  {formData[field] && (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-xs font-medium text-gray-500 mb-1">{t(field)} (AR)</label>
                        <textarea value={formData[field]?.ar || ''} onChange={e => updateNestedField(field, 'ar', e.target.value)} className="w-full p-2 border rounded h-20" />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-500 mb-1">{t(field)} (FR)</label>
                        <textarea value={formData[field]?.fr || ''} onChange={e => updateNestedField(field, 'fr', e.target.value)} className="w-full p-2 border rounded h-20" />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-500 mb-1">{t(field)} (EN)</label>
                        <textarea value={formData[field]?.en || ''} onChange={e => updateNestedField(field, 'en', e.target.value)} className="w-full p-2 border rounded h-20" />
                      </div>
                    </div>
                  )}
                </div>
              ))}
              
              <div className="md:col-span-3 grid grid-cols-1 md:grid-cols-3 gap-4 border-t pt-4 mt-2">
                <div className="md:col-span-3 flex justify-between items-center">
                  <div className="font-bold text-green-700 uppercase text-xs">{t('simulator')}</div>
                  <button onClick={addVariant} className="text-xs bg-green-50 text-green-600 px-2 py-1 rounded border border-green-200 hover:bg-green-100 flex items-center">
                    <Plus className="w-3 h-3 mr-1 rtl:ml-1" /> {t('add_variant')}
                  </button>
                </div>

                <div className="md:col-span-3 space-y-4">
                  {(formData.variants || []).map((variant: any, idx: number) => (
                    <div key={variant.id} className="p-4 bg-gray-50 rounded-lg border border-gray-200 relative">
                      <button onClick={() => removeVariant(idx)} className="absolute top-2 right-2 text-red-400 hover:text-red-600">
                        <X className="w-4 h-4" />
                      </button>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                          <label className="block text-xs font-medium text-gray-500 mb-1">{t('variant_name')} (AR)</label>
                          <input type="text" value={variant.name?.ar || ''} onChange={e => updateVariantField(idx, 'name', 'ar', e.target.value)} className="w-full p-2 border rounded" />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-500 mb-1">{t('variant_name')} (FR)</label>
                          <input type="text" value={variant.name?.fr || ''} onChange={e => updateVariantField(idx, 'name', 'fr', e.target.value)} className="w-full p-2 border rounded" />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-500 mb-1">{t('variant_name')} (EN)</label>
                          <input type="text" value={variant.name?.en || ''} onChange={e => updateVariantField(idx, 'name', 'en', e.target.value)} className="w-full p-2 border rounded" />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-500 mb-1">{t('rate')} (%)</label>
                          <input type="number" value={variant.ratePercentage || ''} onChange={e => updateVariantField(idx, 'ratePercentage', null, parseFloat(e.target.value))} className="w-full p-2 border rounded" />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-500 mb-1">{t('amount_per_unit')} (MAD)</label>
                          <input type="number" value={variant.maxPerUnit || ''} onChange={e => updateVariantField(idx, 'maxPerUnit', null, parseFloat(e.target.value))} className="w-full p-2 border rounded" />
                        </div>
                      </div>
                    </div>
                  ))}

                  {(!formData.variants || formData.variants.length === 0) && (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="md:col-span-3 text-xs text-gray-400 italic mb-2">{t('no_variants')}</div>
                      <div>
                        <label className="block text-xs font-medium text-gray-500 mb-1">{t('rate')} (%)</label>
                        <input type="number" value={formData.ratePercentage || ''} onChange={e => setFormData({ ...formData, ratePercentage: parseFloat(e.target.value) })} className="w-full p-2 border rounded" />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-500 mb-1">{t('amount_per_unit')} (MAD)</label>
                        <input type="number" value={formData.maxPerUnit || ''} onChange={e => setFormData({ ...formData, maxPerUnit: parseFloat(e.target.value) })} className="w-full p-2 border rounded" />
                      </div>
                    </div>
                  )}
                </div>

                <div className="md:col-span-3 pt-2">
                  <label className="block text-xs font-medium text-gray-500 mb-1">{t('unit')}</label>
                  <select value={formData.unitType || 'hectare'} onChange={e => setFormData({ ...formData, unitType: e.target.value })} className="w-full p-2 border rounded">
                    <option value="hectare">{t('unit_hectare')}</option>
                    <option value="unit">{t('unit_item')}</option>
                  </select>
                </div>
              </div>
            </>
          )}
        </div>
        <div className="mt-6 flex justify-end space-x-3 rtl:space-x-reverse">
          <button onClick={() => { setEditingId(null); setFormData({}); }} className="px-4 py-2 text-gray-600 hover:text-gray-800">{t('cancel')}</button>
          <button onClick={handleSave} className="bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700 flex items-center">
            <Save className="w-4 h-4 mr-2 rtl:ml-2" /> {t('save')}
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="max-w-7xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
      <div className="flex justify-between items-center mb-8">
        <h2 className="text-3xl font-bold text-gray-900">{t('admin')}</h2>
        <div className="flex items-center space-x-4 rtl:space-x-reverse">
          <button
            onClick={clearAllData}
            className="px-4 py-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors text-sm font-medium"
          >
            {t('clear_all_data')}
          </button>
          <button
            onClick={() => setConfirmAction({ type: 'reset' })}
            className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors text-sm font-medium"
          >
            {t('reset_to_defaults')}
          </button>
          {selectedIds.length > 0 && (
            <div className="flex items-center space-x-2 rtl:space-x-reverse">
              {activeTab === 'categories' && (
                <button
                  onClick={() => setConfirmAction({ type: 'merge' })}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium flex items-center"
                >
                  <GitMerge className="w-4 h-4 mr-2 rtl:ml-2" /> {t('merge_duplicates')}
                </button>
              )}
              <button
                onClick={() => setIsBulkEditing(true)}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium flex items-center"
              >
                <Edit2 className="w-4 h-4 mr-2 rtl:ml-2" /> {t('bulk_edit')} ({selectedIds.length})
              </button>
              <button
                onClick={() => setConfirmAction({ type: 'bulk_delete', count: selectedIds.length })}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm font-medium flex items-center"
              >
                <Trash2 className="w-4 h-4 mr-2 rtl:ml-2" /> {t('delete_selected')} ({selectedIds.length})
              </button>
            </div>
          )}
          <div className="flex bg-gray-100 p-1 rounded-lg">
            {(['categories', 'subcategories', 'third_grade', 'details'] as const).map(tab => (
              <button
                key={tab}
                onClick={() => { setActiveTab(tab); setEditingId(null); setFormData({}); setSelectedIds([]); }}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${activeTab === tab ? 'bg-white text-green-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
              >
                {t(tab)}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm mb-6 flex flex-col md:flex-row gap-4 items-end">
        <div className="flex-1 w-full">
          <label className="block text-xs font-medium text-gray-500 mb-1">{t('search')}</label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input 
              type="text" 
              value={filterText} 
              onChange={e => setFilterText(e.target.value)} 
              placeholder={t('search_placeholder')}
              className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
            />
          </div>
        </div>
        {(activeTab === 'subcategories' || activeTab === 'details') && (
          <div className="w-full md:w-64">
            <label className="block text-xs font-medium text-gray-500 mb-1">{t('filter_by_category')}</label>
            <select 
              value={filterCategory} 
              onChange={e => setFilterCategory(e.target.value)}
              className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
            >
              <option value="">{t('all_categories')}</option>
              {/* Ensure unique category names in the filter dropdown */}
              {Array.from(new Set(categories.map(c => c.name[currentLang]))).map(name => {
                const cat = categories.find(c => c.name[currentLang] === name);
                return <option key={cat?.id} value={cat?.id}>{name}</option>;
              })}
            </select>
          </div>
        )}
        <button 
          onClick={() => { setFilterText(''); setFilterCategory(''); }}
          className="px-4 py-2 text-sm text-gray-500 hover:text-gray-700 font-medium"
        >
          {t('reset')}
        </button>
      </div>

      {isBulkEditing ? renderBulkForm() : (editingId || Object.keys(formData).length > 0 ? renderForm() : (
        <div className="flex flex-wrap gap-4 mb-8">
          <button
            onClick={() => setFormData({})}
            className="bg-green-600 text-white px-6 py-3 rounded-xl hover:bg-green-700 transition-colors flex items-center shadow-lg hover:shadow-xl"
          >
            <Plus className="w-5 h-5 mr-2 rtl:ml-2" /> {t('add_new')}
          </button>
          {activeTab === 'categories' && categories.length > 0 && selectedIds.length === 0 && (
            <button
              onClick={() => setConfirmAction({ type: 'merge' })}
              className="bg-blue-600 text-white px-6 py-3 rounded-xl hover:bg-blue-700 transition-colors flex items-center shadow-lg hover:shadow-xl"
            >
              <GitMerge className="w-5 h-5 mr-2 rtl:ml-2" /> {t('merge_duplicates') || 'Merge Duplicates'}
            </button>
          )}
        </div>
      ))}

      {loading ? (
        <div className="flex justify-center py-20"><Loader2 className="w-10 h-10 text-green-600 animate-spin" /></div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-right rtl:text-right ltr:text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-10">
                  <input 
                    type="checkbox" 
                    checked={selectedIds.length > 0 && selectedIds.length === (
                      activeTab === 'categories' ? filteredCategories.length : 
                      activeTab === 'subcategories' ? filteredSubcategories.length : 
                      activeTab === 'third_grade' ? filteredThirdGradeSubcategories.length :
                      filteredDetails.length
                    )}
                    onChange={e => {
                      if (e.target.checked) {
                        const allIds = 
                          activeTab === 'categories' ? filteredCategories.map(c => c.id) : 
                          activeTab === 'subcategories' ? filteredSubcategories.map(s => s.id) : 
                          activeTab === 'third_grade' ? filteredThirdGradeSubcategories.map(t => t.id) :
                          filteredDetails.map(d => d.id);
                        setSelectedIds(allIds);
                      } else {
                        setSelectedIds([]);
                      }
                    }}
                  />
                </th>
                <th className="px-6 py-3 text-right rtl:text-right ltr:text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('name')}</th>
                {activeTab === 'subcategories' && (
                  <th className="px-6 py-3 text-right rtl:text-right ltr:text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('category')}</th>
                )}
                {activeTab === 'third_grade' && (
                  <th className="px-6 py-3 text-right rtl:text-right ltr:text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('subcategory')}</th>
                )}
                <th className="px-6 py-3 text-right rtl:text-right ltr:text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('order')}</th>
                <th className="px-6 py-3 text-right rtl:text-right ltr:text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('actions')}</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {activeTab === 'categories' && filteredCategories.map(cat => (
                <tr key={cat.id} className={selectedIds.includes(cat.id) ? 'bg-blue-50' : ''}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <input type="checkbox" checked={selectedIds.includes(cat.id)} onChange={() => toggleSelection(cat.id)} />
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap font-medium">{cat.name[currentLang]}</td>
                  <td className="px-6 py-4 whitespace-nowrap">{cat.order}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-right rtl:text-left space-x-3 rtl:space-x-reverse">
                    <button onClick={() => handleEdit(cat)} className="text-blue-600 hover:text-blue-900"><Edit2 className="w-5 h-5" /></button>
                    <button onClick={() => setConfirmAction({ type: 'delete', id: cat.id })} className="text-red-600 hover:text-red-900"><Trash2 className="w-5 h-5" /></button>
                  </td>
                </tr>
              ))}
              {activeTab === 'subcategories' && filteredSubcategories.map(sub => (
                <tr key={sub.id} className={selectedIds.includes(sub.id) ? 'bg-blue-50' : ''}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <input type="checkbox" checked={selectedIds.includes(sub.id)} onChange={() => toggleSelection(sub.id)} />
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap font-medium">{sub.name[currentLang]}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                    {categories.find(c => c.id === sub.categoryId)?.name[currentLang]}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">{sub.order}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-right rtl:text-left space-x-3 rtl:space-x-reverse">
                    <button onClick={() => handleEdit(sub)} className="text-blue-600 hover:text-blue-900"><Edit2 className="w-5 h-5" /></button>
                    <button onClick={() => setConfirmAction({ type: 'delete', id: sub.id })} className="text-red-600 hover:text-red-900"><Trash2 className="w-5 h-5" /></button>
                  </td>
                </tr>
              ))}
              {activeTab === 'third_grade' && filteredThirdGradeSubcategories.map(third => (
                <tr key={third.id} className={selectedIds.includes(third.id) ? 'bg-blue-50' : ''}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <input type="checkbox" checked={selectedIds.includes(third.id)} onChange={() => toggleSelection(third.id)} />
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap font-medium">{third.name[currentLang]}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                    {subcategories.find(s => s.id === third.subcategoryId)?.name[currentLang]}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">{third.order}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-right rtl:text-left space-x-3 rtl:space-x-reverse">
                    <button onClick={() => handleEdit(third)} className="text-blue-600 hover:text-blue-900"><Edit2 className="w-5 h-5" /></button>
                    <button onClick={() => setConfirmAction({ type: 'delete', id: third.id })} className="text-red-600 hover:text-red-900"><Trash2 className="w-5 h-5" /></button>
                  </td>
                </tr>
              ))}
              {activeTab === 'details' && filteredDetails.map(det => (
                <tr key={det.id} className={selectedIds.includes(det.id) ? 'bg-blue-50' : ''}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <input type="checkbox" checked={selectedIds.includes(det.id)} onChange={() => toggleSelection(det.id)} />
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap font-medium">
                    {subcategories.find(s => s.id === det.subcategoryId)?.name[currentLang]}
                    <div className="text-xs text-gray-400">
                      {(() => {
                        const sub = subcategories.find(s => s.id === det.subcategoryId);
                        return categories.find(c => c.id === sub?.categoryId)?.name[currentLang];
                      })()}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">---</td>
                  <td className="px-6 py-4 whitespace-nowrap text-right rtl:text-left space-x-3 rtl:space-x-reverse">
                    <button onClick={() => handleEdit(det)} className="text-blue-600 hover:text-blue-900"><Edit2 className="w-5 h-5" /></button>
                    <button onClick={() => setConfirmAction({ type: 'delete', id: det.id })} className="text-red-600 hover:text-red-900"><Trash2 className="w-5 h-5" /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Confirmation Modal */}
      {confirmAction && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-6 shadow-2xl">
            <div className="flex items-center text-amber-600 mb-4">
              <AlertTriangle className="w-8 h-8 mr-3 rtl:ml-3" />
              <h3 className="text-xl font-bold text-gray-900">{t('confirm')}</h3>
            </div>
            <p className="text-gray-600 mb-6">
              {confirmAction.type === 'delete' && t('confirm_delete')}
              {confirmAction.type === 'bulk_delete' && `${t('delete')} ${confirmAction.count} ${t('items')}?`}
              {confirmAction.type === 'merge' && t('confirm_merge_duplicates')}
              {confirmAction.type === 'reset' && t('confirm_reset_defaults')}
              {confirmAction.type === 'clear' && t('confirm_clear_all')}
            </p>
            <div className="flex justify-end space-x-3 rtl:space-x-reverse">
              <button
                onClick={() => setConfirmAction(null)}
                className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              >
                {t('no')}
              </button>
              <button
                onClick={() => {
                  if (confirmAction.type === 'delete' && confirmAction.id) handleDelete(confirmAction.id);
                  if (confirmAction.type === 'bulk_delete') handleBulkDelete();
                  if (confirmAction.type === 'merge') mergeDuplicateCategories();
                  if (confirmAction.type === 'reset') resetToDefaultData();
                  if (confirmAction.type === 'clear') clearAllData();
                }}
                className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium"
              >
                {t('yes')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Status Message */}
      {statusMessage && (
        <div className={`fixed bottom-8 left-1/2 -translate-x-1/2 px-6 py-3 rounded-full shadow-lg flex items-center z-50 animate-bounce ${statusMessage.type === 'success' ? 'bg-green-600 text-white' : 'bg-red-600 text-white'}`}>
          {statusMessage.type === 'success' ? <CheckCircle2 className="w-5 h-5 mr-2 rtl:ml-2" /> : <AlertTriangle className="w-5 h-5 mr-2 rtl:ml-2" />}
          <span className="font-medium">{statusMessage.text}</span>
          <button onClick={() => setStatusMessage(null)} className="ml-4 rtl:mr-4 hover:opacity-75">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
}
