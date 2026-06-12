// In-browser WebAssembly SQLite Database using sql.js

export interface DBRow {
  [key: string]: any;
}

export interface DBResult {
  columns: string[];
  values: any[][];
}

export class ClubDatabase {
  private db: any = null;
  private onUpdateCallback: (() => void) | null = null;

  async init(): Promise<void> {
    if (this.db) return;

    // Load sql.js from CDN
    await this.loadScript('https://cdnjs.cloudflare.com/ajax/libs/sql.js/1.8.0/sql-wasm.js');

    // Initialize WebAssembly SQLite
    const initSqlJs = (window as any).initSqlJs;
    if (!initSqlJs) {
      throw new Error('Failed to load SQL.js from CDN.');
    }

    const SQL = await initSqlJs({
      locateFile: (file: string) => `https://cdnjs.cloudflare.com/ajax/libs/sql.js/1.8.0/${file}`
    });

    // Check localStorage for saved database binary
    const savedDb = localStorage.getItem('fx_factory_db_v2');
    if (savedDb) {
      try {
        const u8arr = new Uint8Array(JSON.parse(savedDb));
        this.db = new SQL.Database(u8arr);
        console.log('Database loaded from localStorage.');
        return;
      } catch (e) {
        console.error('Failed to restore saved database, creating new one.', e);
      }
    }

    // Create a new database if none exists
    this.db = new SQL.Database();
    this.createTables();
    this.seedData();
    this.save();
    console.log('Database initialized and seeded.');
  }

  private loadScript(src: string): Promise<void> {
    return new Promise((resolve, reject) => {
      if (document.querySelector(`script[src="${src}"]`)) {
        resolve();
        return;
      }
      const script = document.createElement('script');
      script.src = src;
      script.onload = () => resolve();
      script.onerror = () => reject(new Error(`Script load error for ${src}`));
      document.head.appendChild(script);
    });
  }

  private createTables(): void {
    // 1. Members Table
    this.db.run(`
      CREATE TABLE IF NOT EXISTS members (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        role TEXT NOT NULL,
        bio TEXT,
        github TEXT,
        join_date TEXT
      )
    `);

    // 2. Attendance Table
    this.db.run(`
      CREATE TABLE IF NOT EXISTS attendance (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        member_name TEXT NOT NULL,
        date TEXT NOT NULL,
        session_code TEXT NOT NULL,
        status TEXT DEFAULT 'Present'
      )
    `);

    // 3. Sessions Table (for valid attendance codes)
    this.db.run(`
      CREATE TABLE IF NOT EXISTS sessions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        date TEXT UNIQUE,
        code TEXT NOT NULL,
        topic TEXT
      )
    `);

    // 4. Projects Table
    this.db.run(`
      CREATE TABLE IF NOT EXISTS projects (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        description TEXT,
        tech_stack TEXT,
        github_url TEXT,
        author TEXT,
        stars INTEGER DEFAULT 0
      )
    `);

    // 5. Card News Table
    this.db.run(`
      CREATE TABLE IF NOT EXISTS news (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        category TEXT NOT NULL,
        content TEXT NOT NULL,
        date TEXT NOT NULL,
        image_url TEXT
      )
    `);

    // 6. Recruitment Table
    this.db.run(`
      CREATE TABLE IF NOT EXISTS applications (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        grade INTEGER NOT NULL,
        email TEXT NOT NULL,
        introduction TEXT NOT NULL,
        portfolio TEXT,
        status TEXT DEFAULT 'Pending',
        created_at TEXT NOT NULL
      )
    `);
  }

  private seedData(): void {
    // Database starts clean and empty.
    // News, projects, and members should be added dynamically via admin interface or SQL terminal.
  }

  // Run SQL query that modifies data
  run(sql: string, params: any[] = []): void {
    if (!this.db) throw new Error('Database not initialized.');
    this.db.run(sql, params);
    this.save();
    if (this.onUpdateCallback) {
      this.onUpdateCallback();
    }
  }

  // Run SQL query that returns raw results
  exec(sql: string): DBResult[] {
    if (!this.db) throw new Error('Database not initialized.');
    return this.db.exec(sql);
  }

  // Utility to convert exec query result to array of objects
  query(sql: string, params: any[] = []): DBRow[] {
    if (!this.db) throw new Error('Database not initialized.');
    
    // SQL.js prepare/step API for param binding
    const stmt = this.db.prepare(sql);
    stmt.bind(params);
    
    const results: DBRow[] = [];
    while (stmt.step()) {
      results.push(stmt.getAsObject());
    }
    stmt.free();
    return results;
  }

  // Register callback for reactive updates
  onUpdate(callback: () => void): void {
    this.onUpdateCallback = callback;
  }

  // Export db state to localStorage
  private save(): void {
    if (!this.db) return;
    const binaryDb = this.db.export();
    const arr = Array.from(binaryDb);
    try {
      localStorage.setItem('fx_factory_db_v2', JSON.stringify(arr));
    } catch (e) {
      console.error('LocalStorage save quota exceeded or failed.', e);
    }
  }

  // Export DB as downloadable JSON
  exportData(): string {
    const backup: any = {};
    const tables = ['members', 'attendance', 'sessions', 'projects', 'news', 'applications'];
    tables.forEach(t => {
      backup[t] = this.query(`SELECT * FROM ${t}`);
    });
    return JSON.stringify(backup, null, 2);
  }

  // Import DB from JSON backup
  importData(jsonData: string): void {
    try {
      const data = JSON.parse(jsonData);
      this.db.run(`DROP TABLE IF EXISTS members`);
      this.db.run(`DROP TABLE IF EXISTS attendance`);
      this.db.run(`DROP TABLE IF EXISTS sessions`);
      this.db.run(`DROP TABLE IF EXISTS projects`);
      this.db.run(`DROP TABLE IF EXISTS news`);
      this.db.run(`DROP TABLE IF EXISTS applications`);
      this.createTables();

      if (data.members) {
        data.members.forEach((row: any) => {
          this.db.run(`INSERT INTO members (id, name, role, bio, github, join_date) VALUES (?, ?, ?, ?, ?, ?)`, 
            [row.id, row.name, row.role, row.bio, row.github, row.join_date]);
        });
      }
      if (data.sessions) {
        data.sessions.forEach((row: any) => {
          this.db.run(`INSERT INTO sessions (id, date, code, topic) VALUES (?, ?, ?, ?)`, 
            [row.id, row.date, row.code, row.topic]);
        });
      }
      if (data.projects) {
        data.projects.forEach((row: any) => {
          this.db.run(`INSERT INTO projects (id, title, description, tech_stack, github_url, author, stars) VALUES (?, ?, ?, ?, ?, ?, ?)`, 
            [row.id, row.title, row.description, row.tech_stack, row.github_url, row.author, row.stars]);
        });
      }
      if (data.attendance) {
        data.attendance.forEach((row: any) => {
          this.db.run(`INSERT INTO attendance (id, member_name, date, session_code, status) VALUES (?, ?, ?, ?, ?)`, 
            [row.id, row.member_name, row.date, row.session_code, row.status]);
        });
      }
      if (data.news) {
        data.news.forEach((row: any) => {
          this.db.run(`INSERT INTO news (id, title, category, content, date, image_url) VALUES (?, ?, ?, ?, ?, ?)`, 
            [row.id, row.title, row.category, row.content, row.date, row.image_url]);
        });
      }
      if (data.applications) {
        data.applications.forEach((row: any) => {
          this.db.run(`INSERT INTO applications (id, name, grade, email, introduction, portfolio, status, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`, 
            [row.id, row.name, row.grade, row.email, row.introduction, row.portfolio, row.status, row.created_at]);
        });
      }
      this.save();
      if (this.onUpdateCallback) {
        this.onUpdateCallback();
      }
    } catch (e) {
      alert('데이터 복구에 실패했습니다. 올바른 JSON 백업 파일인지 확인해주세요.');
      console.error(e);
    }
  }
}

export const dbInstance = new ClubDatabase();
