export interface Category {
  id: number;
  name: string;
  slug: string;
  icon: string;
  sortOrder: number;
}

export interface DocSummary {
  id: number;
  title: string;
  slug: string;
  description: string;
  categoryId: number | null;
  categoryName?: string | null;
  sortOrder: number;
  isPublished: boolean;
  isFeatured: boolean;
  views: number;
  updatedAt: string;
}

export interface DocRecord extends DocSummary {
  content: string;
  createdAt: string;
}

export interface CategoryWithDocs extends Category {
  docs: DocSummary[];
}

export interface DocVersion {
  id: number;
  docId: number;
  title: string;
  content: string;
  message: string;
  createdAt: string;
}

export interface FeedbackStats {
  positive: number;
  negative: number;
  total: number;
}

export interface SearchResult {
  id: number;
  title: string;
  slug: string;
  description: string;
  category: string | null;
}

export interface DashboardStats {
  totalDocs: number;
  publishedDocs: number;
  draftDocs: number;
  totalViews: number;
  positiveFeedback: number;
  negativeFeedback: number;
}
