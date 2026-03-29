import { useTranslation } from 'react-i18next';

export default function Footer() {
  const { t } = useTranslation();

  return (
    <footer className="bg-white border-t border-gray-200 py-8 mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <p className="text-gray-500 text-sm">
          {t('made_by')} <span className="font-bold text-green-700">Mossaab Lachkar</span> (+212) 721803121
        </p>
        <p className="text-gray-400 text-xs mt-2">
          &copy; {new Date().getFullYear()} {t('app_name')}. All rights reserved.
        </p>
      </div>
    </footer>
  );
}
