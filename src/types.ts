export interface MultilingualString {
  ar: string;
  fr: string;
  en: string;
}

export interface Category {
  id: string;
  name: MultilingualString;
  description: MultilingualString;
  icon: string;
  order: number;
}

export interface Subcategory {
  id: string;
  categoryId: string;
  name: MultilingualString;
  description: MultilingualString;
  order: number;
}

export interface ThirdGradeSubcategory {
  id: string;
  subcategoryId: string;
  name: MultilingualString;
  description: MultilingualString;
  order: number;
}

export interface SimulationVariant {
  id: string;
  name: MultilingualString;
  ratePercentage: number;
  maxPerUnit: number;
}

export interface SubsidyDetail {
  id: string;
  subcategoryId: string;
  thirdGradeSubcategoryId?: string;
  conditions?: MultilingualString;
  requirements?: MultilingualString;
  rates?: MultilingualString;
  docs_pre?: MultilingualString;
  docs_post?: MultilingualString;
  plafonds?: MultilingualString;
  // Simulation fields
  unitType?: 'hectare' | 'unit';
  variants?: SimulationVariant[];
  // Legacy fields (keep for compatibility or simple cases)
  ratePercentage?: number;
  maxPerUnit?: number;
}

export interface User {
  uid: string;
  email: string;
  role: 'admin' | 'user';
}
