import "server-only";

import Database from "better-sqlite3";
import { mkdirSync } from "node:fs";
import path from "node:path";
import type {
  Category,
  CategoryWithDocs,
  DashboardStats,
  DocRecord,
  DocSummary,
  DocVersion,
  FeedbackStats,
  SearchResult,
} from "@/lib/types";

type SqlRow = Record<string, unknown>;

const globalForDatabase = globalThis as typeof globalThis & {
  wickedDocsDatabase?: Database.Database;
};

function databasePath(): string {
  const configured = process.env.DOCS_DB_PATH?.trim();
  return path.resolve(configured || path.join(process.cwd(), "instance", "docs.db"));
}

function timestamp(): string {
  return new Date().toISOString().replace("T", " ").replace("Z", "");
}

function ensureSchema(database: Database.Database): void {
  database.exec(`
    CREATE TABLE IF NOT EXISTS user (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username VARCHAR(80) NOT NULL UNIQUE,
      password_hash VARCHAR(255) NOT NULL,
      created_at DATETIME
    );
    CREATE TABLE IF NOT EXISTS category (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name VARCHAR(100) NOT NULL,
      slug VARCHAR(120) NOT NULL UNIQUE,
      icon VARCHAR(10),
      sort_order INTEGER DEFAULT 0
    );
    CREATE TABLE IF NOT EXISTS doc (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title VARCHAR(200) NOT NULL,
      slug VARCHAR(250) NOT NULL UNIQUE,
      description VARCHAR(300),
      content TEXT,
      category_id INTEGER,
      sort_order INTEGER DEFAULT 0,
      is_published BOOLEAN DEFAULT 0,
      is_featured BOOLEAN DEFAULT 0,
      views INTEGER DEFAULT 0,
      created_at DATETIME,
      updated_at DATETIME,
      FOREIGN KEY(category_id) REFERENCES category(id)
    );
    CREATE TABLE IF NOT EXISTS doc_version (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      doc_id INTEGER NOT NULL,
      title VARCHAR(200) NOT NULL,
      content TEXT,
      message VARCHAR(200),
      created_at DATETIME,
      FOREIGN KEY(doc_id) REFERENCES doc(id) ON DELETE CASCADE
    );
    CREATE TABLE IF NOT EXISTS feedback (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      doc_id INTEGER NOT NULL,
      rating INTEGER NOT NULL,
      comment TEXT,
      created_at DATETIME,
      FOREIGN KEY(doc_id) REFERENCES doc(id) ON DELETE CASCADE
    );
  `);

  // The Flask version stored a short display title while its Markdown began with
  // the full product title. Promote only that known legacy row so navigation,
  // metadata, and the Next.js title agree without rewriting user-authored docs.
  database.prepare(`
    UPDATE doc
    SET title = 'Wickedhost Docs에 오신 것을 환영합니다'
    WHERE slug = 'welcome'
      AND title = '환영합니다'
      AND content LIKE '# Wickedhost Docs에 오신 것을 환영합니다%'
  `).run();
}

export function getDatabase(): Database.Database {
  if (globalForDatabase.wickedDocsDatabase) {
    return globalForDatabase.wickedDocsDatabase;
  }

  const file = databasePath();
  mkdirSync(path.dirname(file), { recursive: true });
  const database = new Database(file);
  database.pragma("foreign_keys = ON");
  database.pragma("journal_mode = WAL");
  database.pragma("busy_timeout = 5000");
  ensureSchema(database);
  globalForDatabase.wickedDocsDatabase = database;
  return database;
}

function mapCategory(row: SqlRow): Category {
  return {
    id: Number(row.id),
    name: String(row.name),
    slug: String(row.slug),
    icon: String(row.icon || "📄"),
    sortOrder: Number(row.sort_order || 0),
  };
}

function mapDoc(row: SqlRow): DocRecord {
  return {
    id: Number(row.id),
    title: String(row.title),
    slug: String(row.slug),
    description: String(row.description || ""),
    content: String(row.content || ""),
    categoryId: row.category_id == null ? null : Number(row.category_id),
    categoryName: row.category_name == null ? null : String(row.category_name),
    sortOrder: Number(row.sort_order || 0),
    isPublished: Boolean(row.is_published),
    isFeatured: Boolean(row.is_featured),
    views: Number(row.views || 0),
    createdAt: String(row.created_at || ""),
    updatedAt: String(row.updated_at || ""),
  };
}

function toSummary(doc: DocRecord): DocSummary {
  return {
    id: doc.id,
    title: doc.title,
    slug: doc.slug,
    description: doc.description,
    categoryId: doc.categoryId,
    categoryName: doc.categoryName,
    sortOrder: doc.sortOrder,
    isPublished: doc.isPublished,
    isFeatured: doc.isFeatured,
    views: doc.views,
    updatedAt: doc.updatedAt,
  };
}

const DOC_SELECT = `
  SELECT d.*, c.name AS category_name
  FROM doc d
  LEFT JOIN category c ON c.id = d.category_id
`;

export function getNavigation(publishedOnly = true): CategoryWithDocs[] {
  const database = getDatabase();
  const categories: CategoryWithDocs[] = database
    .prepare("SELECT * FROM category ORDER BY sort_order ASC, id ASC")
    .all()
    .map((row) => ({ ...mapCategory(row as SqlRow), docs: [] as DocSummary[] }));
  const docs = database
    .prepare(`${DOC_SELECT} ${publishedOnly ? "WHERE d.is_published = 1" : ""} ORDER BY d.sort_order ASC, d.id ASC`)
    .all()
    .map((row) => toSummary(mapDoc(row as SqlRow)));
  const byId = new Map(categories.map((category) => [category.id, category]));

  for (const doc of docs) {
    if (doc.categoryId && byId.has(doc.categoryId)) {
      byId.get(doc.categoryId)?.docs.push(doc);
    }
  }

  return categories;
}

export function getDocBySlug(slug: string, includeDraft = false): DocRecord | null {
  const row = getDatabase()
    .prepare(`${DOC_SELECT} WHERE d.slug = ? ${includeDraft ? "" : "AND d.is_published = 1"} LIMIT 1`)
    .get(slug) as SqlRow | undefined;
  return row ? mapDoc(row) : null;
}

export function getDocById(id: number): DocRecord | null {
  const row = getDatabase().prepare(`${DOC_SELECT} WHERE d.id = ? LIMIT 1`).get(id) as
    | SqlRow
    | undefined;
  return row ? mapDoc(row) : null;
}

export function getLandingDoc(): DocRecord | null {
  const row = getDatabase()
    .prepare(`${DOC_SELECT} WHERE d.is_published = 1 ORDER BY d.is_featured DESC, d.sort_order ASC, d.id ASC LIMIT 1`)
    .get() as SqlRow | undefined;
  return row ? mapDoc(row) : null;
}

export function recordView(id: number): void {
  getDatabase().prepare("UPDATE doc SET views = COALESCE(views, 0) + 1 WHERE id = ?").run(id);
}

export function searchDocs(query: string): SearchResult[] {
  const term = `%${query.trim()}%`;
  if (term === "%%") return [];
  return getDatabase()
    .prepare(`
      SELECT d.id, d.title, d.slug, d.description, c.name AS category
      FROM doc d
      LEFT JOIN category c ON c.id = d.category_id
      WHERE d.is_published = 1
        AND (d.title LIKE ? OR d.description LIKE ? OR d.content LIKE ?)
      ORDER BY d.is_featured DESC, d.views DESC, d.updated_at DESC
      LIMIT 10
    `)
    .all(term, term, term)
    .map((row) => {
      const item = row as SqlRow;
      return {
        id: Number(item.id),
        title: String(item.title),
        slug: String(item.slug),
        description: String(item.description || ""),
        category: item.category == null ? null : String(item.category),
      };
    });
}

export function submitFeedback(docId: number, rating: 1 | -1, comment = ""): void {
  getDatabase()
    .prepare("INSERT INTO feedback (doc_id, rating, comment, created_at) VALUES (?, ?, ?, ?)")
    .run(docId, rating, comment.trim().slice(0, 1000), timestamp());
}

export function getFeedbackStats(docId: number): FeedbackStats {
  const row = getDatabase()
    .prepare(`
      SELECT
        SUM(CASE WHEN rating = 1 THEN 1 ELSE 0 END) AS positive,
        SUM(CASE WHEN rating = -1 THEN 1 ELSE 0 END) AS negative,
        COUNT(*) AS total
      FROM feedback WHERE doc_id = ?
    `)
    .get(docId) as SqlRow;
  return {
    positive: Number(row.positive || 0),
    negative: Number(row.negative || 0),
    total: Number(row.total || 0),
  };
}

export function getDashboardStats(): DashboardStats {
  const row = getDatabase()
    .prepare(`
      SELECT
        (SELECT COUNT(*) FROM doc) AS total_docs,
        (SELECT COUNT(*) FROM doc WHERE is_published = 1) AS published_docs,
        (SELECT COUNT(*) FROM doc WHERE is_published = 0) AS draft_docs,
        (SELECT COALESCE(SUM(views), 0) FROM doc) AS total_views,
        (SELECT COUNT(*) FROM feedback WHERE rating = 1) AS positive_feedback,
        (SELECT COUNT(*) FROM feedback WHERE rating = -1) AS negative_feedback
    `)
    .get() as SqlRow;
  return {
    totalDocs: Number(row.total_docs),
    publishedDocs: Number(row.published_docs),
    draftDocs: Number(row.draft_docs),
    totalViews: Number(row.total_views),
    positiveFeedback: Number(row.positive_feedback),
    negativeFeedback: Number(row.negative_feedback),
  };
}

export function listAllDocs(): DocSummary[] {
  return getDatabase()
    .prepare(`${DOC_SELECT} ORDER BY d.updated_at DESC, d.id DESC`)
    .all()
    .map((row) => toSummary(mapDoc(row as SqlRow)));
}

export function getVersions(docId: number): DocVersion[] {
  return getDatabase()
    .prepare("SELECT * FROM doc_version WHERE doc_id = ? ORDER BY created_at DESC, id DESC")
    .all(docId)
    .map((row) => {
      const item = row as SqlRow;
      return {
        id: Number(item.id),
        docId: Number(item.doc_id),
        title: String(item.title),
        content: String(item.content || ""),
        message: String(item.message || ""),
        createdAt: String(item.created_at || ""),
      };
    });
}

export interface SaveDocInput {
  title: string;
  slug: string;
  description: string;
  content: string;
  categoryId: number | null;
  sortOrder: number;
  isPublished: boolean;
  isFeatured: boolean;
  message?: string;
}

export function saveDoc(id: number | null, input: SaveDocInput): DocRecord {
  const database = getDatabase();
  const save = database.transaction(() => {
    const now = timestamp();
    let docId = id;
    const previous = id ? getDocById(id) : null;

    if (input.isFeatured) {
      database.prepare("UPDATE doc SET is_featured = 0 WHERE category_id IS ?").run(input.categoryId);
    }

    if (id) {
      database.prepare(`
        UPDATE doc SET title = ?, slug = ?, description = ?, content = ?, category_id = ?,
          sort_order = ?, is_published = ?, is_featured = ?, updated_at = ?
        WHERE id = ?
      `).run(
        input.title,
        input.slug,
        input.description,
        input.content,
        input.categoryId,
        input.sortOrder,
        Number(input.isPublished),
        Number(input.isFeatured),
        now,
        id,
      );
    } else {
      const result = database.prepare(`
        INSERT INTO doc (
          title, slug, description, content, category_id, sort_order,
          is_published, is_featured, views, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?)
      `).run(
        input.title,
        input.slug,
        input.description,
        input.content,
        input.categoryId,
        input.sortOrder,
        Number(input.isPublished),
        Number(input.isFeatured),
        now,
        now,
      );
      docId = Number(result.lastInsertRowid);
    }

    if (!docId) throw new Error("문서 ID를 생성하지 못했습니다.");
    if (!previous || previous.title !== input.title || previous.content !== input.content) {
      database.prepare(`
        INSERT INTO doc_version (doc_id, title, content, message, created_at)
        VALUES (?, ?, ?, ?, ?)
      `).run(docId, input.title, input.content, input.message?.trim() || "문서 저장", now);
    }

    return docId;
  });

  const saved = getDocById(save());
  if (!saved) throw new Error("저장된 문서를 불러오지 못했습니다.");
  return saved;
}

export function deleteDoc(id: number): void {
  const database = getDatabase();
  database.transaction(() => {
    database.prepare("DELETE FROM feedback WHERE doc_id = ?").run(id);
    database.prepare("DELETE FROM doc_version WHERE doc_id = ?").run(id);
    database.prepare("DELETE FROM doc WHERE id = ?").run(id);
  })();
}

export function restoreVersion(docId: number, versionId: number): DocRecord {
  const database = getDatabase();
  const version = database
    .prepare("SELECT * FROM doc_version WHERE id = ? AND doc_id = ?")
    .get(versionId, docId) as SqlRow | undefined;
  const current = getDocById(docId);
  if (!version || !current) throw new Error("버전을 찾을 수 없습니다.");
  return saveDoc(docId, {
    title: String(version.title),
    slug: current.slug,
    description: current.description,
    content: String(version.content || ""),
    categoryId: current.categoryId,
    sortOrder: current.sortOrder,
    isPublished: current.isPublished,
    isFeatured: current.isFeatured,
    message: `버전 #${versionId} 복원`,
  });
}

export function createCategory(name: string, slug: string, icon: string): Category {
  const database = getDatabase();
  const next = database.prepare("SELECT COALESCE(MAX(sort_order), -1) + 1 AS value FROM category").get() as SqlRow;
  const result = database
    .prepare("INSERT INTO category (name, slug, icon, sort_order) VALUES (?, ?, ?, ?)")
    .run(name, slug, icon, Number(next.value));
  const row = database.prepare("SELECT * FROM category WHERE id = ?").get(result.lastInsertRowid) as SqlRow;
  return mapCategory(row);
}

export function deleteCategory(id: number): void {
  const database = getDatabase();
  database.transaction(() => {
    database.prepare("UPDATE doc SET category_id = NULL WHERE category_id = ?").run(id);
    database.prepare("DELETE FROM category WHERE id = ?").run(id);
  })();
}
