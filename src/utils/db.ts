import { supabase } from './supabaseClient';

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

    // Create a new in-memory sandbox database
    this.db = new SQL.Database();
    this.createTables();

    // Fetch and populate from Supabase
    try {
      console.log('Fetching database state from Supabase...');
      const [
        { data: members },
        { data: attendance },
        { data: sessions },
        { data: projects },
        { data: news },
        { data: applications }
      ] = await Promise.all([
        supabase.from('members').select('*'),
        supabase.from('attendance').select('*'),
        supabase.from('sessions').select('*'),
        supabase.from('projects').select('*'),
        supabase.from('news').select('*'),
        supabase.from('applications').select('*')
      ]);

      if (members) {
        members.forEach((row: any) => {
          this.db.run(
            `INSERT INTO members (id, name, role, bio, github, join_date) VALUES (?, ?, ?, ?, ?, ?)`,
            [row.id, row.name, row.role, row.bio, row.github, row.join_date]
          );
        });
      }
      if (attendance) {
        attendance.forEach((row: any) => {
          this.db.run(
            `INSERT INTO attendance (id, member_name, date, session_code, status) VALUES (?, ?, ?, ?, ?)`,
            [row.id, row.member_name, row.date, row.session_code, row.status]
          );
        });
      }
      if (sessions) {
        sessions.forEach((row: any) => {
          this.db.run(
            `INSERT INTO sessions (id, date, code, topic) VALUES (?, ?, ?, ?)`,
            [row.id, row.date, row.code, row.topic]
          );
        });
      }
      if (projects) {
        projects.forEach((row: any) => {
          this.db.run(
            `INSERT INTO projects (id, title, description, tech_stack, github_url, author, stars) VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [row.id, row.title, row.description, row.tech_stack, row.github_url, row.author, row.stars]
          );
        });
      }
      if (news) {
        news.forEach((row: any) => {
          this.db.run(
            `INSERT INTO news (id, title, category, content, date, image_url) VALUES (?, ?, ?, ?, ?, ?)`,
            [row.id, row.title, row.category, row.content, row.date, row.image_url]
          );
        });
      }
      if (applications) {
        applications.forEach((row: any) => {
          this.db.run(
            `INSERT INTO applications (id, name, grade, email, introduction, portfolio, status, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [row.id, row.name, row.grade, row.email, row.introduction, row.portfolio, row.status, row.created_at]
          );
        });
      }
      console.log('Database loaded and synced from Supabase.');
    } catch (err) {
      console.error('Failed to sync from Supabase, running local database only:', err);
      // Try to load fallback from localStorage if offline
      const savedDb = localStorage.getItem('fx_factory_db_v2');
      if (savedDb) {
        try {
          const u8arr = new Uint8Array(JSON.parse(savedDb));
          this.db = new SQL.Database(u8arr);
          console.log('Loaded offline fallback from localStorage.');
        } catch (e) {
          console.error('Failed to restore offline fallback database.', e);
        }
      }
    }
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


  // Run SQL query that modifies data
  run(sql: string, params: any[] = []): void {
    if (!this.db) throw new Error('Database not initialized.');
    
    // Execute on local SQLite sandbox
    this.db.run(sql, params);

    // Sync to Supabase in the background
    this.syncToSupabase(sql, params).catch(err => {
      console.error('Failed to sync write to Supabase:', err);
    });

    this.save();
    if (this.onUpdateCallback) {
      this.onUpdateCallback();
    }
  }

  private async syncToSupabase(sql: string, params: any[]): Promise<void> {
    const cleanSql = sql.trim().replace(/\s+/g, ' ');
    const lower = cleanSql.toLowerCase();

    try {
      // 1. INSERT INTO attendance
      if (lower.startsWith('insert into attendance')) {
        const [name, date, code] = params;
        await supabase.from('attendance').insert({
          member_name: name,
          date: date,
          session_code: code,
          status: 'Present'
        });
      }
      // 2. INSERT INTO sessions
      else if (lower.startsWith('insert into sessions')) {
        const [date, code, topic] = params;
        await supabase.from('sessions').insert({
          date: date,
          code: code,
          topic: topic
        });
      }
      // 3. DELETE FROM members
      else if (lower.startsWith('delete from members')) {
        await supabase.from('members').delete().neq('id', 0);
      }
      // 4. INSERT INTO members
      else if (lower.startsWith('insert into members')) {
        const [name, role, bio, github, join_date] = params;
        await supabase.from('members').insert({
          name, role, bio, github, join_date
        });
      }
      // 5. UPDATE applications SET status = ? WHERE id = ?
      else if (lower.startsWith('update applications')) {
        const [status, id] = params;
        await supabase.from('applications').update({ status }).eq('id', id);
      }
      // 6. UPDATE projects SET stars = stars + 1 WHERE id = ?
      else if (lower.startsWith('update projects') && lower.includes('stars = stars + 1')) {
        const [id] = params;
        const { data } = await supabase.from('projects').select('stars').eq('id', id).single();
        const stars = data ? (data.stars || 0) + 1 : 1;
        await supabase.from('projects').update({ stars }).eq('id', id);
      }
      // 7. INSERT INTO applications
      else if (lower.startsWith('insert into applications')) {
        const [name, grade, email, intro, portfolio, created_at] = params;
        await supabase.from('applications').insert({
          name, grade, email, introduction: intro, portfolio, created_at
        });
      }
    } catch (e) {
      console.error('Supabase write error:', e);
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
  async importData(jsonData: string): Promise<void> {
    try {
      const data = JSON.parse(jsonData);
      this.db.run(`DROP TABLE IF EXISTS members`);
      this.db.run(`DROP TABLE IF EXISTS attendance`);
      this.db.run(`DROP TABLE IF EXISTS sessions`);
      this.db.run(`DROP TABLE IF EXISTS projects`);
      this.db.run(`DROP TABLE IF EXISTS news`);
      this.db.run(`DROP TABLE IF EXISTS applications`);
      this.createTables();

      // Clear Supabase tables
      console.log('Clearing Supabase database to import backup...');
      await Promise.all([
        supabase.from('members').delete().neq('id', 0),
        supabase.from('attendance').delete().neq('id', 0),
        supabase.from('sessions').delete().neq('id', 0),
        supabase.from('projects').delete().neq('id', 0),
        supabase.from('news').delete().neq('id', 0),
        supabase.from('applications').delete().neq('id', 0)
      ]);

      if (data.members) {
        for (const row of data.members) {
          this.db.run(`INSERT INTO members (id, name, role, bio, github, join_date) VALUES (?, ?, ?, ?, ?, ?)`, 
            [row.id, row.name, row.role, row.bio, row.github, row.join_date]);
          await supabase.from('members').insert({
            id: row.id, name: row.name, role: row.role, bio: row.bio, github: row.github, join_date: row.join_date
          });
        }
      }
      if (data.sessions) {
        for (const row of data.sessions) {
          this.db.run(`INSERT INTO sessions (id, date, code, topic) VALUES (?, ?, ?, ?)`, 
            [row.id, row.date, row.code, row.topic]);
          await supabase.from('sessions').insert({
            id: row.id, date: row.date, code: row.code, topic: row.topic
          });
        }
      }
      if (data.projects) {
        for (const row of data.projects) {
          this.db.run(`INSERT INTO projects (id, title, description, tech_stack, github_url, author, stars) VALUES (?, ?, ?, ?, ?, ?, ?)`, 
            [row.id, row.title, row.description, row.tech_stack, row.github_url, row.author, row.stars]);
          await supabase.from('projects').insert({
            id: row.id, title: row.title, description: row.description, tech_stack: row.tech_stack, github_url: row.github_url, author: row.author, stars: row.stars
          });
        }
      }
      if (data.attendance) {
        for (const row of data.attendance) {
          this.db.run(`INSERT INTO attendance (id, member_name, date, session_code, status) VALUES (?, ?, ?, ?, ?)`, 
            [row.id, row.member_name, row.date, row.session_code, row.status]);
          await supabase.from('attendance').insert({
            id: row.id, member_name: row.member_name, date: row.date, session_code: row.session_code, status: row.status
          });
        }
      }
      if (data.news) {
        for (const row of data.news) {
          this.db.run(`INSERT INTO news (id, title, category, content, date, image_url) VALUES (?, ?, ?, ?, ?, ?)`, 
            [row.id, row.title, row.category, row.content, row.date, row.image_url]);
          await supabase.from('news').insert({
            id: row.id, title: row.title, category: row.category, content: row.content, date: row.date, image_url: row.image_url
          });
        }
      }
      if (data.applications) {
        for (const row of data.applications) {
          this.db.run(`INSERT INTO applications (id, name, grade, email, introduction, portfolio, status, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`, 
            [row.id, row.name, row.grade, row.email, row.introduction, row.portfolio, row.status, row.created_at]);
          await supabase.from('applications').insert({
            id: row.id, name: row.name, grade: row.grade, email: row.email, introduction: row.introduction, portfolio: row.portfolio, status: row.status, created_at: row.created_at
          });
        }
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
