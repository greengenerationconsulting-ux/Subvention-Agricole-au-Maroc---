import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import { auth, db } from './lib/firebase';
import { User } from './types';
import Navbar from './components/layout/Navbar';
import Footer from './components/layout/Footer';
import SubsidyFinder from './components/subsidy/SubsidyFinder';
import DetailsView from './components/subsidy/DetailsView';
import AdminDashboard from './components/admin/AdminDashboard';
import ErrorBoundary from './components/ui/ErrorBoundary';
import { Loader2, AlertCircle } from 'lucide-react';
import './lib/i18n';

export default function App() {
  const { t, i18n } = useTranslation();
  const [user, setUser] = useState<User | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState('home');
  const [selectedSubcategoryId, setSelectedSubcategoryId] = useState<string | null>(null);
  const [selectedThirdGradeId, setSelectedThirdGradeId] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setLoading(true);
      if (firebaseUser) {
        const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
        let userData: User;

        if (userDoc.exists()) {
          userData = userDoc.data() as User;
          // Force admin role for the specific email if not already set
          if (firebaseUser.email === "green.generation.consulting@gmail.com" && userData.role !== 'admin') {
            userData.role = 'admin';
            await updateDoc(doc(db, 'users', firebaseUser.uid), { role: 'admin' });
          }
        } else {
          // Default admin check for the specified email
          const role = firebaseUser.email === "green.generation.consulting@gmail.com" ? 'admin' : 'user';
          userData = {
            uid: firebaseUser.uid,
            email: firebaseUser.email || '',
            role: role
          };
          await setDoc(doc(db, 'users', firebaseUser.uid), userData);
        }

        setUser(userData);
        const adminStatus = userData.role === 'admin';
        setIsAdmin(adminStatus);
        if (adminStatus && currentPage === 'home') {
          setCurrentPage('admin');
        }
      } else {
        setUser(null);
        setIsAdmin(false);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Handle RTL
  useEffect(() => {
    const dir = i18n.language.startsWith('ar') ? 'rtl' : 'ltr';
    document.documentElement.dir = dir;
    document.documentElement.lang = i18n.language;
  }, [i18n.language]);

  const handleNavigate = (page: string) => {
    setCurrentPage(page);
    setSelectedSubcategoryId(null);
    setSelectedThirdGradeId(null);
    window.scrollTo(0, 0);
  };

  const handleSelectSubcategory = (subId: string, thirdGradeId?: string) => {
    setSelectedSubcategoryId(subId);
    setSelectedThirdGradeId(thirdGradeId || null);
    setCurrentPage('details');
    window.scrollTo(0, 0);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center">
        <Loader2 className="w-12 h-12 text-green-600 animate-spin mb-4" />
        <p className="text-gray-500 font-medium">{t('loading')}</p>
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-gray-50 flex flex-col font-sans">
        <Navbar 
          user={user} 
          isAdmin={isAdmin} 
          onNavigate={handleNavigate} 
          onSelectSubcategory={handleSelectSubcategory}
        />

        <main className="flex-grow">
          {currentPage === 'home' && (
            <SubsidyFinder onSelectSubcategory={handleSelectSubcategory} />
          )}

          {currentPage === 'details' && selectedSubcategoryId && (
            <DetailsView
              subcategoryId={selectedSubcategoryId}
              thirdGradeId={selectedThirdGradeId || undefined}
              onBack={() => handleNavigate('home')}
              isAdmin={isAdmin}
              onNavigate={handleNavigate}
            />
          )}

          {currentPage === 'admin' && (
            isAdmin ? (
              <AdminDashboard />
            ) : (
              <div className="max-w-md mx-auto py-20 text-center">
                <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
                <h2 className="text-2xl font-bold text-gray-900 mb-2">{t('admin_only')}</h2>
                <button
                  onClick={() => handleNavigate('home')}
                  className="text-green-600 font-medium hover:underline"
                >
                  {t('back')}
                </button>
              </div>
            )
          )}
        </main>

        <Footer />
      </div>
    </ErrorBoundary>
  );
}
