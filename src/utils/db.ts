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
    const savedDb = localStorage.getItem('fx_factory_db');
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
    // Seed members
    const members = [
      ['김민준', 'Club Leader & Full-Stack Dev', '동아리를 이끌며 백엔드와 프론트엔드를 넘나듭니다. f(x)의 엔진 역할을 하고 있습니다.', 'github.com/minjun-dev', '2025-03-02'],
      ['이서연', 'Co-Leader & AI Research', '수학적 알고리즘과 머신러닝 모델 연구를 좋아합니다. AI 급식 알리미 프로젝트를 주도했습니다.', 'github.com/seoyeon-ai', '2025-03-02'],
      ['박지호', 'Core System & Algorithms', 'C++과 알고리즘 문제 풀이를 즐기며, 동아리의 백엔드 성능 최적화를 담당합니다.', 'github.com/jiho-cpp', '2025-03-02'],
      ['최다은', 'UI/UX & Frontend Designer', '깔끔한 모노크롬 디자인 시스템과 인터랙티브 UI를 구현합니다. 웹사이트의 시각적 요소를 책임집니다.', 'github.com/daeun-design', '2025-09-01'],
      ['정우진', 'Junior Frontend Dev', 'HTML/CSS/JS 공부를 마치고 최근 React와 TypeScript에 푹 빠져 있습니다.', 'github.com/woojin-react', '2026-03-02'],
      ['윤아라', 'Junior Data Analyst', '파이썬을 활용한 데이터 분석 및 시각화 프로젝트를 진행 중입니다.', 'github.com/ara-python', '2026-03-02']
    ];

    members.forEach(m => {
      this.db.run(
        `INSERT INTO members (name, role, bio, github, join_date) VALUES (?, ?, ?, ?, ?)`,
        m
      );
    });

    // Seed sessions
    const sessions = [
      ['2026-05-01', 'fx-session-01', '동아리 오리엔테이션 & Git 기초'],
      ['2026-05-08', 'fx-session-02', 'HTML/CSS 심화 & 레이아웃 설계'],
      ['2026-05-15', 'fx-session-03', 'Javascript 비동기 처리 & Web APIs'],
      ['2026-05-22', 'fx-session-04', 'TypeScript 입문 & 정적 타입 이해'],
      ['2026-05-29', 'fx-session-05', 'SQLite와 데이터베이스 기초'],
      ['2026-06-05', 'fx-factory-1', '중간 프로젝트 쇼케이스 및 디버깅']
    ];

    sessions.forEach(s => {
      this.db.run(
        `INSERT INTO sessions (date, code, topic) VALUES (?, ?, ?)`,
        s
      );
    });

    // Seed projects
    const projects = [
      ['f(x) Factory Official Website', '동아리의 정체성을 담은 흑백 미니멀리즘 풀스택 포트폴리오 웹사이트. SQL.js를 이용한 서버리스 DB 아키텍처 적용.', 'React, TypeScript, WebAssembly SQLite, CSS', 'https://github.com/fx-factory/official-site', '최다은, 김민준', 18],
      ['AI-based Math Solver', '수학 문제를 스마트폰 카메라로 스캔하면 OpenCV와 AI 경량 모델을 통해 수식과 그래프를 그려주고 단계별 풀이를 제공하는 애플리케이션.', 'Python, PyTorch, OpenCV, React Native', 'https://github.com/fx-factory/math-solver', '이서연, 박지호', 24],
      ['Discord Smart Lunch Bot', '매일 아침 8시 학교 급식 정보를 자동으로 크롤링하여 Discord 채널에 영양 성분 및 알레르기 유발 물질과 함께 예쁜 임베드로 전송해주는 봇.', 'Node.js, Discord.js, Cheerio', 'https://github.com/fx-factory/lunch-bot', '정우진, 김민준', 12],
      ['Interactive Algorithm Playground', '정렬(Sorting) 및 탐색(Search) 알고리즘의 작동 방식을 시각적으로 보여주고 직접 데이터를 조작하며 테스트할 수 있는 웹 시뮬레이터.', 'TypeScript, HTML Canvas, CSS', 'https://github.com/fx-factory/algo-visualizer', '박지호, 윤아라', 15]
    ];

    projects.forEach(p => {
      this.db.run(
        `INSERT INTO projects (title, description, tech_stack, github_url, author, stars) VALUES (?, ?, ?, ?, ?, ?)`,
        p
      );
    });

    // Seed attendance for past dates (generating green contribution cells!)
    const memberNames = ['김민준', '이서연', '박지호', '최다은', '정우진', '윤아라'];
    const pastSessions = [
      { date: '2026-05-01', code: 'fx-session-01' },
      { date: '2026-05-08', code: 'fx-session-02' },
      { date: '2026-05-15', code: 'fx-session-03' },
      { date: '2026-05-22', code: 'fx-session-04' },
      { date: '2026-05-29', code: 'fx-session-05' }
    ];

    pastSessions.forEach(session => {
      memberNames.forEach(name => {
        // 90% attendance rate for seed data
        if (Math.random() < 0.9) {
          this.db.run(
            `INSERT INTO attendance (member_name, date, session_code) VALUES (?, ?, ?)`,
            [name, session.date, session.code]
          );
        }
      });
    });

    // Seed card news
    const news = [
      ['[세미나] Git & GitHub 협업 프로세스 정복하기', 'seminar', '협업을 위해 필수적인 Git 브랜칭 전략(Git Flow)과 Pull Request 코드 리뷰 문화를 배우는 기술 세미나를 성공적으로 마쳤습니다.', '2026-05-08', 'https://images.unsplash.com/photo-1618401471353-b98aedd07871?auto=format&fit=crop&q=80&w=600'],
      ['[프로젝트] 교내 급식 디스코드 봇 정식 런칭!', 'project', '동아리에서 자체 제작한 디스코드 봇이 교내 다수의 반에 공유되어 매일 학생들에게 알림을 발송하고 있습니다.', '2026-05-20', 'https://images.unsplash.com/photo-1614064641938-3bbee52942c7?auto=format&fit=crop&q=80&w=600'],
      ['[소식] f(x) factory 해커톤 대회 최우수상 수상', 'event', '동네 학생 연합 해커톤 대회에 참가한 f(x) factory 대표팀이 "AI 기반 중학교 수학 학습 도우미" 서비스로 최우수상을 획득했습니다!', '2026-06-01', 'https://images.unsplash.com/photo-1504384308090-c894fdcc538d?auto=format&fit=crop&q=80&w=600'],
      ['[강좌] 비동기 프로그래밍과 Web API 완전 해부', 'seminar', '동아리 학습 부장 박지호 군이 발표한 JavaScript 비동기(Promise, async/await)와 브라우저 렌더링 파이프라인의 관계 강좌가 진행되었습니다.', '2026-05-15', 'https://images.unsplash.com/photo-1555066931-4365d14bab8c?auto=format&fit=crop&q=80&w=600']
    ];

    news.forEach(n => {
      this.db.run(
        `INSERT INTO news (title, category, content, date, image_url) VALUES (?, ?, ?, ?, ?)`,
        n
      );
    });
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
      localStorage.setItem('fx_factory_db', JSON.stringify(arr));
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
