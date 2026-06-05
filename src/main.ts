import './style.css';
import { 
  createIcons, 
  ArrowUpRight, 
  ChevronRight, 
  Play, 
  GitCommit, 
  CheckCircle2, 
  ArrowRight, 
  ChevronDown, 
  Send, 
  Mail 
} from 'lucide';
import { dbInstance } from './utils/db';

// Initialize Lucide icons globally
function initIcons() {
  createIcons({
    icons: {
      ArrowUpRight,
      ChevronRight,
      Play,
      GitCommit,
      CheckCircle2,
      ArrowRight,
      ChevronDown,
      Send,
      Mail
    }
  });
}

// -------------------------------------------------------------
// 1. DYNAMIC CANVAS ANIMATION (Mathematical f(x) Network Wave)
// -------------------------------------------------------------
function initHeroCanvas() {
  const canvas = document.getElementById('heroCanvas') as HTMLCanvasElement;
  if (!canvas) return;
  const ctx = canvas.getContext('2d') as CanvasRenderingContext2D;
  if (!ctx) return;

  let width = (canvas.width = window.innerWidth);
  let height = (canvas.height = window.innerHeight);

  window.addEventListener('resize', () => {
    width = (canvas.width = window.innerWidth);
    height = (canvas.height = window.innerHeight);
  });

  // Particles
  interface Particle {
    x: number;
    y: number;
    vx: number;
    vy: number;
    radius: number;
    originalY: number;
    phase: number;
  }

  const numParticles = 40;
  const particles: Particle[] = [];

  for (let i = 0; i < numParticles; i++) {
    particles.push({
      x: Math.random() * width,
      y: Math.random() * height,
      vx: (Math.random() - 0.5) * 0.4,
      vy: (Math.random() - 0.5) * 0.4,
      radius: Math.random() * 2 + 1,
      originalY: Math.random() * height,
      phase: Math.random() * Math.PI * 2
    });
  }

  let mouse = { x: -1000, y: -1000, active: false };

  window.addEventListener('mousemove', (e) => {
    mouse.x = e.clientX;
    mouse.y = e.clientY;
    mouse.active = true;
  });

  window.addEventListener('mouseleave', () => {
    mouse.active = false;
  });

  let time = 0;

  function animate() {
    time += 0.005;
    ctx.clearRect(0, 0, width, height);

    // Draw grid background (subtle corporate tech grid)
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.02)';
    ctx.lineWidth = 1;
    const gridGap = 40;
    for (let x = 0; x < width; x += gridGap) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
    }
    for (let y = 0; y < height; y += gridGap) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }

    // Draw dynamic f(x) functions (monochrome waves)
    // f(x) = sin(x) wave
    ctx.beginPath();
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.06)';
    ctx.lineWidth = 1.5;
    for (let x = 0; x < width; x += 5) {
      const y = height * 0.5 + Math.sin(x * 0.003 + time) * 120 * Math.cos(x * 0.001 - time * 0.5);
      if (x === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();

    // f(x) = cos(x) wave (secondary)
    ctx.beginPath();
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.03)';
    ctx.lineWidth = 1;
    for (let x = 0; x < width; x += 5) {
      const y = height * 0.5 + Math.cos(x * 0.002 - time * 0.7) * 80 * Math.sin(x * 0.004 + time);
      if (x === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();

    // Draw and update particles
    particles.forEach((p, idx) => {
      // Add subtle sin wave drift to particles
      p.phase += 0.002;
      p.x += p.vx;
      // Drift vertically based on a sine function to simulate compiler data flow
      p.y = p.originalY + Math.sin(p.phase + p.x * 0.005) * 30;

      // Handle boundary wrap
      if (p.x < 0) p.x = width;
      if (p.x > width) p.x = 0;
      if (p.originalY < 0) p.originalY = height;
      if (p.originalY > height) p.originalY = 0;

      // Render particle
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
      ctx.fill();

      // Mouse interaction (push effect)
      if (mouse.active) {
        const dx = p.x - mouse.x;
        const dy = p.y - mouse.y;
        const dist = Math.hypot(dx, dy);
        if (dist < 120) {
          const force = (120 - dist) / 120;
          ctx.beginPath();
          ctx.moveTo(p.x, p.y);
          ctx.lineTo(mouse.x, mouse.y);
          ctx.strokeStyle = `rgba(255, 255, 255, ${0.1 * force})`;
          ctx.stroke();
        }
      }

      // Draw lines between particles (network visualization)
      for (let j = idx + 1; j < particles.length; j++) {
        const p2 = particles[j];
        const dx = p.x - p2.x;
        const dy = p.y - p2.y;
        const dist = Math.hypot(dx, dy);

        if (dist < 150) {
          const alpha = (150 - dist) / 150 * 0.12;
          ctx.beginPath();
          ctx.moveTo(p.x, p.y);
          ctx.lineTo(p2.x, p2.y);
          ctx.strokeStyle = `rgba(255, 255, 255, ${alpha})`;
          ctx.lineWidth = 0.8;
          ctx.stroke();
        }
      }
    });

    requestAnimationFrame(animate);
  }

  animate();
}

// -------------------------------------------------------------
// 2. REACTIVE WEB APP RENDERING ENGINE (Vanilla JS & SQLite)
// -------------------------------------------------------------
let activeFilter = 'all';

function renderUI() {
  renderStatistics();
  renderCardNews();
  renderProjects();
  renderAttendanceBoard();
  populateMemberSelect();
  initIcons(); // Re-render newly inserted Lucide icons
}

// Render dynamic stats counters
function renderStatistics() {
  // 1. Active Members
  const members = dbInstance.query('SELECT COUNT(*) as count FROM members');
  const countMembers = members[0]?.count || 0;
  const statMembersEl = document.getElementById('statMembers');
  if (statMembersEl) statMembersEl.innerText = countMembers.toString();

  // 2. Projects
  const projects = dbInstance.query('SELECT COUNT(*) as count FROM projects');
  const countProjects = projects[0]?.count || 0;
  const statProjectsEl = document.getElementById('statProjects');
  if (statProjectsEl) statProjectsEl.innerText = countProjects.toString();

  // 3. Total Sessions
  const sessions = dbInstance.query('SELECT COUNT(*) as count FROM sessions');
  const countSessions = sessions[0]?.count || 0;
  const statSessionsEl = document.getElementById('statSessions');
  if (statSessionsEl) statSessionsEl.innerText = countSessions.toString();

  // 4. Attendance Rate
  const attendanceQuery = dbInstance.query(`
    SELECT COUNT(*) as present_count FROM attendance WHERE status = 'Present'
  `);
  const presentCount = attendanceQuery[0]?.present_count || 0;
  const possibleCount = countMembers * countSessions;
  
  const statRateEl = document.getElementById('statRate');
  if (statRateEl) {
    if (possibleCount > 0) {
      const rate = Math.round((presentCount / possibleCount) * 100);
      statRateEl.innerText = `${rate}%`;
    } else {
      statRateEl.innerText = '0%';
    }
  }
}

// Render Card News list
function renderCardNews() {
  const newsGrid = document.getElementById('newsGrid');
  if (!newsGrid) return;

  let sql = 'SELECT * FROM news ORDER BY date DESC';
  let params: any[] = [];
  if (activeFilter !== 'all') {
    sql = 'SELECT * FROM news WHERE category = ? ORDER BY date DESC';
    params = [activeFilter];
  }

  const newsItems = dbInstance.query(sql, params);
  
  if (newsItems.length === 0) {
    newsGrid.innerHTML = `
      <div style="grid-column: 1/-1; text-align: center; padding: 40px; color: var(--text-secondary); border: 1px solid var(--border-color); border-radius: 8px;">
        등록된 소식이 없습니다.
      </div>
    `;
    return;
  }

  newsGrid.innerHTML = newsItems.map(item => {
    // Human readable category
    let categoryName = '공지';
    if (item.category === 'seminar') categoryName = '세미나';
    if (item.category === 'project') categoryName = '프로젝트';
    if (item.category === 'event') categoryName = '행사';

    const bgImage = item.image_url || 'https://images.unsplash.com/photo-1618401471353-b98aedd07871?auto=format&fit=crop&q=80&w=600';

    return `
      <div class="news-card" data-id="${item.id}">
        <div class="news-img" style="background-image: url('${bgImage}')"></div>
        <div class="news-body">
          <div>
            <div class="news-meta">
              <span class="news-badge">${categoryName}</span>
              <span class="news-date">${item.date}</span>
            </div>
            <h3 class="news-title">${thisEscapeHtml(item.title)}</h3>
            <p class="news-excerpt">${thisEscapeHtml(item.content)}</p>
          </div>
          <span style="font-size: 0.8rem; font-weight: 600; display: inline-flex; align-items: center; gap: 4px; color: var(--text-primary); margin-top: 10px;">
            Read More <i data-lucide="chevron-right" style="width: 14px; height: 14px;"></i>
          </span>
        </div>
      </div>
    `;
  }).join('');

  // Add event listener to open detail modal on click
  newsGrid.querySelectorAll('.news-card').forEach(card => {
    card.addEventListener('click', () => {
      const id = card.getAttribute('data-id');
      if (id) openNewsModal(parseInt(id));
    });
  });
}

// Render Project Showcase
function renderProjects() {
  const projectGrid = document.getElementById('projectGrid');
  if (!projectGrid) return;

  const projects = dbInstance.query('SELECT * FROM projects ORDER BY stars DESC');

  if (projects.length === 0) {
    projectGrid.innerHTML = '<div style="grid-column: 1/-1; text-align: center;">등록된 프로젝트가 없습니다.</div>';
    return;
  }

  projectGrid.innerHTML = projects.map(p => {
    // Parse tags
    const tags = p.tech_stack ? p.tech_stack.split(',').map((t: string) => t.trim()) : [];
    const tagsHtml = tags.map((t: string) => `<span class="project-tag">${thisEscapeHtml(t)}</span>`).join('');

    return `
      <div class="project-card">
        <div>
          <div class="project-header">
            <h3 class="project-title">${thisEscapeHtml(p.title)}</h3>
            <button class="project-star" data-id="${p.id}">
              <i data-lucide="star" style="width: 12px; height: 12px; fill: currentColor;"></i> 
              <span class="star-count">${p.stars}</span>
            </button>
          </div>
          <p class="project-desc">${thisEscapeHtml(p.description)}</p>
        </div>
        <div class="project-footer">
          <div class="project-tags">
            ${tagsHtml}
          </div>
          <div class="project-meta-row">
            <span class="project-author">만든 이: ${thisEscapeHtml(p.author)}</span>
            <a href="${p.github_url}" target="_blank" class="project-github">
              GitHub <i data-lucide="arrow-up-right" style="width: 12px; height: 12px;"></i>
            </a>
          </div>
        </div>
      </div>
    `;
  }).join('');

  // Handle Stars logic (Update star counts directly in browser SQLite!)
  projectGrid.querySelectorAll('.project-star').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      const id = btn.getAttribute('data-id');
      if (id) {
        dbInstance.run('UPDATE projects SET stars = stars + 1 WHERE id = ?', [parseInt(id)]);
        // database onUpdate triggers reactive UI re-draw
      }
    });
  });
}

// Render Attendance Commit-like Grid (GitHub Grass)
function renderAttendanceBoard() {
  const grassBoard = document.getElementById('grassBoard');
  const statsSummary = document.getElementById('attendanceStatsSummary');
  if (!grassBoard) return;

  const members = dbInstance.query('SELECT name FROM members');
  const sessions = dbInstance.query('SELECT date, topic, code FROM sessions ORDER BY date ASC');

  if (members.length === 0 || sessions.length === 0) {
    grassBoard.innerHTML = '<div style="padding: 20px;">출석 데이터를 조회할 구성원 또는 세션이 존재하지 않습니다.</div>';
    return;
  }

  // Create GitHub Commit Grid
  let boardHtml = '';

  members.forEach(m => {
    const memberName = m.name;
    let memberRow = `
      <div class="grass-row">
        <span class="grass-member-name">${thisEscapeHtml(memberName)}</span>
        <div class="grass-cells">
    `;

    sessions.forEach((session, idx) => {
      // Query attendance status
      const attend = dbInstance.query(
        'SELECT 1 FROM attendance WHERE member_name = ? AND date = ?',
        [memberName, session.date]
      );

      const isPresent = attend.length > 0;
      
      // Assign dynamic green values like github contributions (1 to 4 depth based on progress)
      // For this board, let's use green for present, dark gray for absent
      // But let's add some color depth variation based on session index for pure design aesthetics!
      let cellClass = 'absent';
      if (isPresent) {
        const depth = (idx % 4) + 1; // present-1, present-2, present-3, present-4
        cellClass = `present-${depth}`;
      }

      const statusText = isPresent ? '출석 완료' : '결석';
      const tooltipText = `${memberName}<br>${session.date}<br>${session.topic}<br>상태: ${statusText}`;

      memberRow += `
        <div class="grass-cell ${cellClass}">
          <div class="tooltip">${tooltipText}</div>
        </div>
      `;
    });

    memberRow += `
        </div>
      </div>
    `;
    boardHtml += memberRow;
  });

  grassBoard.innerHTML = boardHtml;

  // Render stats details above the graph
  const totalPossible = members.length * sessions.length;
  const totalAttendedQuery = dbInstance.query("SELECT COUNT(*) as count FROM attendance WHERE status = 'Present'");
  const totalAttended = totalAttendedQuery[0]?.count || 0;
  
  if (statsSummary) {
    statsSummary.innerText = `총 출석 횟수: ${totalAttended} / ${totalPossible} 세션`;
  }
}

// Populate Member Select dropdown
function populateMemberSelect() {
  const select = document.getElementById('checkinMember') as HTMLSelectElement;
  if (!select) return;

  const members = dbInstance.query('SELECT name FROM members ORDER BY name ASC');
  select.innerHTML = members.map(m => `
    <option value="${thisEscapeHtml(m.name)}">${thisEscapeHtml(m.name)}</option>
  `).join('');
}

// Open news modal detail popup
function openNewsModal(id: number) {
  const modal = document.getElementById('appModal');
  const modalImg = document.getElementById('modalImg');
  const modalCategory = document.getElementById('modalCategory');
  const modalTitle = document.getElementById('modalTitle');
  const modalDate = document.getElementById('modalDate');
  const modalText = document.getElementById('modalText');

  if (!modal || !modalImg || !modalCategory || !modalTitle || !modalDate || !modalText) return;

  const item = dbInstance.query('SELECT * FROM news WHERE id = ?', [id]);
  if (item.length === 0) return;

  const data = item[0];
  let categoryName = '공지사항';
  if (data.category === 'seminar') categoryName = '학술 세미나';
  if (data.category === 'project') categoryName = '프로젝트 정보';
  if (data.category === 'event') categoryName = '동아리 행사';

  modalImg.style.backgroundImage = `url('${data.image_url || ''}')`;
  modalCategory.innerText = categoryName;
  modalTitle.innerText = data.title;
  modalDate.innerText = data.date;
  modalText.innerText = data.content;

  modal.classList.add('active');
  document.body.style.overflow = 'hidden'; // Lock scrolling
}

// HTML Escaper for security
function thisEscapeHtml(unsafe: string): string {
  if (!unsafe) return '';
  return unsafe
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

// -------------------------------------------------------------
// 3. EVENT LISTENERS & FORM HANDLERS
// -------------------------------------------------------------
function initEventListeners() {
  // Modal Close Action
  const closeModal = document.getElementById('closeModal');
  const modal = document.getElementById('appModal');
  if (closeModal && modal) {
    const closeFunc = () => {
      modal.classList.remove('active');
      document.body.style.overflow = ''; // Unlock scrolling
    };
    closeModal.addEventListener('click', closeFunc);
    modal.addEventListener('click', (e) => {
      if (e.target === modal) closeFunc();
    });
  }

  // News Filtering
  const newsFilters = document.getElementById('newsFilters');
  if (newsFilters) {
    newsFilters.querySelectorAll('.filter-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        newsFilters.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        activeFilter = btn.getAttribute('data-filter') || 'all';
        renderCardNews();
        initIcons();
      });
    });
  }

  // Attendance Form Submit
  const checkinForm = document.getElementById('checkinForm');
  if (checkinForm) {
    checkinForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const name = (document.getElementById('checkinMember') as HTMLSelectElement).value;
      const code = (document.getElementById('checkinCode') as HTMLInputElement).value;

      // Validate session code
      const session = dbInstance.query('SELECT date, code FROM sessions WHERE code = ?', [code]);
      if (session.length === 0) {
        alert('올바르지 않은 출석 암호입니다. 다시 확인해 주세요!');
        return;
      }

      const sessionDate = session[0].date;

      // Check if already checked in
      const checkDup = dbInstance.query(
        'SELECT 1 FROM attendance WHERE member_name = ? AND date = ?',
        [name, sessionDate]
      );

      if (checkDup.length > 0) {
        alert(`이미 [${sessionDate}] 세션에 출석 기록이 되어 있습니다.`);
        return;
      }

      // Add to attendance database
      dbInstance.run(
        `INSERT INTO attendance (member_name, date, session_code) VALUES (?, ?, ?)`,
        [name, sessionDate, code]
      );

      alert(`${name}님의 출석이 완료되었습니다! (세션 일자: ${sessionDate})`);
      (document.getElementById('checkinCode') as HTMLInputElement).value = ''; // Reset input
    });
  }

  // Header Scroll Effect & Navigation highlight
  window.addEventListener('scroll', () => {
    const header = document.getElementById('header');
    if (header) {
      if (window.scrollY > 50) {
        header.classList.add('scrolled');
      } else {
        header.classList.remove('scrolled');
      }
    }

    // Scroll Spy active navigation state
    const sections = document.querySelectorAll('section');
    const navLinks = document.querySelectorAll('.nav-link');
    
    let currentId = '';
    sections.forEach(sec => {
      const top = sec.offsetTop - 120;
      const height = sec.offsetHeight;
      if (window.scrollY >= top && window.scrollY < top + height) {
        currentId = sec.getAttribute('id') || '';
      }
    });

    navLinks.forEach(link => {
      link.classList.remove('active');
      if (link.getAttribute('href') === `#${currentId}`) {
        link.classList.add('active');
      }
    });
  });

  // DB Backup Action
  const exportBtn = document.getElementById('exportDbBtn');
  if (exportBtn) {
    exportBtn.addEventListener('click', () => {
      const dataStr = dbInstance.exportData();
      const blob = new Blob([dataStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `fx_factory_database_backup_${new Date().toISOString().split('T')[0]}.json`;
      link.click();
      URL.revokeObjectURL(url);
    });
  }

  // DB Restore Action
  const importTrigger = document.getElementById('importDbTrigger');
  const importFile = document.getElementById('importDbFile') as HTMLInputElement;
  if (importTrigger && importFile) {
    importTrigger.addEventListener('click', () => {
      importFile.click();
    });

    importFile.addEventListener('change', () => {
      const file = importFile.files?.[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = (e) => {
        const text = e.target?.result as string;
        if (text) {
          dbInstance.importData(text);
          alert('데이터베이스가 정상적으로 복구되었습니다!');
        }
      };
      reader.readAsText(file);
      importFile.value = ''; // Reset file input
    });
  }

  // DB Reset Action
  const resetBtn = document.getElementById('resetDbBtn');
  if (resetBtn) {
    resetBtn.addEventListener('click', () => {
      if (confirm('경고: 정말로 데이터베이스를 완전 초기화하시겠습니까? 로컬에 저장된 모든 데이터가 삭제됩니다.')) {
        localStorage.removeItem('fx_factory_db');
        window.location.reload();
      }
    });
  }
}

// -------------------------------------------------------------
// 4. INTERACTIVE SQL TERMINAL CONTROLLER (Engaging Widget)
// -------------------------------------------------------------
function initSqlTerminal() {
  const terminalInput = document.getElementById('terminalInput') as HTMLInputElement;
  const terminalBody = document.getElementById('terminalBody');
  const terminalHistory = document.getElementById('terminalHistory');
  const toggleSchema = document.getElementById('toggleSchema');
  const schemaPanel = document.getElementById('schemaPanel');

  if (!terminalInput || !terminalBody || !terminalHistory) return;

  // Schema list toggle
  if (toggleSchema && schemaPanel) {
    toggleSchema.addEventListener('click', () => {
      schemaPanel.classList.toggle('active');
    });
  }

  terminalInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      const rawCmd = terminalInput.value.trim();
      if (!rawCmd) return;

      // Append command prompt to history
      const promptLine = document.createElement('div');
      promptLine.className = 'terminal-prompt-row';
      promptLine.innerHTML = `<span class="terminal-prompt">sqlite&gt;</span> <span style="color: #a6e22e;">${thisEscapeHtml(rawCmd)}</span>`;
      terminalHistory.appendChild(promptLine);

      // Process command
      const cmdLower = rawCmd.toLowerCase();
      
      if (cmdLower === 'clear') {
        terminalHistory.innerHTML = '';
      } else if (cmdLower === 'help') {
        const response = document.createElement('div');
        response.style.color = '#c5c5c5';
        response.innerHTML = `
          사용 가능한 전용 명령어:<br>
          - <span style="color: #66d9ef;">schema</span>: 데이터베이스 내 테이블 형태(스키마) 요약 보기<br>
          - <span style="color: #66d9ef;">clear</span>: 화면 비우기<br>
          - 일반 SQL 쿼리: 표준 SQL(ANSI SQL) 명령을 작성하여 데이터베이스를 조회 또는 수정할 수 있습니다.<br>
            예: SELECT * FROM members;<br>
            예: SELECT name, role FROM members WHERE id = 1;<br>
            예: SELECT * FROM projects ORDER BY stars DESC;
        `;
        terminalHistory.appendChild(response);
      } else if (cmdLower === 'schema') {
        if (schemaPanel) {
          schemaPanel.classList.toggle('active');
          const response = document.createElement('div');
          response.style.color = '#8a8a8a';
          response.innerText = schemaPanel.classList.contains('active') ? '스키마 패널을 노출시켰습니다.' : '스키마 패널을 숨겼습니다.';
          terminalHistory.appendChild(response);
        }
      } else {
        // Run SQL query!
        try {
          // If query starts with select, count, explain, pragma
          const isSelect = cmdLower.startsWith('select') || cmdLower.startsWith('explain') || cmdLower.startsWith('pragma') || cmdLower.startsWith('show');
          
          if (isSelect) {
            const result = dbInstance.query(rawCmd);
            
            if (result.length === 0) {
              const resLine = document.createElement('div');
              resLine.style.color = '#8a8a8a';
              resLine.innerText = 'Empty set (조회된 결과가 없습니다).';
              terminalHistory.appendChild(resLine);
            } else {
              // Format results as an elegant HTML Table
              const columns = Object.keys(result[0]);
              let tableHtml = '<table class="sql-table"><thead><tr>';
              columns.forEach(col => {
                tableHtml += `<th>${thisEscapeHtml(col)}</th>`;
              });
              tableHtml += '</tr></thead><tbody>';

              result.forEach(row => {
                tableHtml += '<tr>';
                columns.forEach(col => {
                  tableHtml += `<td>${thisEscapeHtml(String(row[col]))}</td>`;
                });
                tableHtml += '</tr>';
              });
              tableHtml += '</tbody></table>';

              const resLine = document.createElement('div');
              resLine.innerHTML = tableHtml;
              terminalHistory.appendChild(resLine);
            }
          } else {
            // Modify query: INSERT, UPDATE, DELETE
            dbInstance.run(rawCmd);
            const resLine = document.createElement('div');
            resLine.style.color = '#27c93f';
            resLine.innerText = 'Query OK. 데이터베이스가 성공적으로 수정되었습니다.';
            terminalHistory.appendChild(resLine);
            
            // Database reactive trigger updates UI statistics & board!
          }
        } catch (err: any) {
          const errLine = document.createElement('div');
          errLine.style.color = '#da363c';
          errLine.innerText = `Error: ${err.message || err}`;
          terminalHistory.appendChild(errLine);
        }
      }

      // Clear input and scroll down
      terminalInput.value = '';
      terminalBody.scrollTop = terminalBody.scrollHeight;
    }
  });
}

// -------------------------------------------------------------
// 5. INTERACTIVE DEBUGGING GAME ENGINE (Engagement Widget)
// -------------------------------------------------------------
function initDebugGame() {
  const runBtn = document.getElementById('runCodeBtn');
  const codeEditor = document.getElementById('gameCode') as HTMLTextAreaElement;
  const consoleOutput = document.getElementById('gameOutput');
  const successBadge = document.getElementById('gameSuccessBadge');

  if (!runBtn || !codeEditor || !consoleOutput) return;

  runBtn.addEventListener('click', () => {
    const code = codeEditor.value;
    consoleOutput.innerText = 'Compiling and executing...\n';

    try {
      // Create a safe-like evaluation block
      // Declare a variable sumOfOdds to test it
      const evalFunc = new Function(`${code}\nreturn sumOfOdds;`)();
      
      if (typeof evalFunc !== 'function') {
        throw new Error('sumOfOdds 함수가 정의되지 않았거나 함수 타입이 아닙니다.');
      }

      // Run tests
      const testArray = [1, 2, 3, 4, 5];
      const result = evalFunc(testArray);

      consoleOutput.innerText += `Executing sumOfOdds([1, 2, 3, 4, 5])...\n`;
      consoleOutput.innerText += `-> Return value: ${result}\n`;

      if (result === 9) {
        consoleOutput.innerText += `\n[SUCCESS] 모든 테스트 케이스를 통과했습니다!\n보상 코드 발급 완료: FX-DEBUG-SUCCESS-2026\n(이 코드를 출석 암호에 입력해 추가 포인트를 획득할 수 있습니다!)`;
        consoleOutput.style.color = '#27c93f'; // green text
        if (successBadge) successBadge.style.display = 'inline-block';
      } else {
        consoleOutput.innerText += `\n[FAILED] 결과값이 9가 아닌 ${result}을 반환했습니다.`;
        consoleOutput.innerText += `\n힌트: 홀수 조건문 "arr[i] % 2 === 0" 부분을 홀수에 맞게 수정해 보세요.`;
        consoleOutput.style.color = '#ff9f00'; // orange
        if (successBadge) successBadge.style.display = 'none';
      }
    } catch (err: any) {
      consoleOutput.innerText += `\n[COMPILE ERROR] 자바스크립트 컴파일 오류:\n${err.message || err}`;
      consoleOutput.style.color = '#da363c'; // red
      if (successBadge) successBadge.style.display = 'none';
    }
  });
}

// -------------------------------------------------------------
// 6. SMART RECRUITMENT PERIOD TIMER
// -------------------------------------------------------------
let recruitModeOverride = false; // Dev mode override to test application submissions

function initRecruitmentPortal() {
  const faqItems = document.querySelectorAll('.faq-item');

  // Accordion Toggle
  faqItems.forEach(item => {
    const trigger = item.querySelector('.faq-trigger');
    if (trigger) {
      trigger.addEventListener('click', () => {
        const isActive = item.classList.contains('active');
        faqItems.forEach(faq => faq.classList.remove('active'));
        if (!isActive) item.classList.add('active');
      });
    }
  });

  // Schedule timer countdown
  // Standard period: June 10, 2026 ~ June 25, 2026
  const recruitStartDate = new Date('2026-06-10T00:00:00').getTime();
  const recruitEndDate = new Date('2026-06-25T23:59:59').getTime();

  const statusTag = document.getElementById('recruitStatus');
  const countdownLabel = document.getElementById('countdownLabel');
  const recruitFormPanel = document.getElementById('recruitFormPanel');
  
  // Cache original form HTML to restore when active
  const originalFormHtml = recruitFormPanel ? recruitFormPanel.innerHTML : '';

  function updateRecruitState() {
    const now = new Date().getTime();
    
    let isRecruiting = now >= recruitStartDate && now <= recruitEndDate;
    if (recruitModeOverride) isRecruiting = true; // developer test mode

    if (statusTag) {
      if (isRecruiting) {
        statusTag.innerText = '● 모집 진행 중';
        statusTag.className = 'recruit-status-tag active';
      } else if (now < recruitStartDate) {
        statusTag.innerText = '○ 모집 대기 중';
        statusTag.className = 'recruit-status-tag';
      } else {
        statusTag.innerText = '○ 모집 종료';
        statusTag.className = 'recruit-status-tag';
      }
    }

    // Handle timer countdown
    let targetTime = recruitStartDate;
    if (now >= recruitStartDate && now <= recruitEndDate) {
      targetTime = recruitEndDate;
      if (countdownLabel) countdownLabel.innerText = '원서 접수 마감까지 남은 시간';
    } else if (now > recruitEndDate) {
      if (countdownLabel) countdownLabel.innerText = '모집 일정이 종료되었습니다.';
    } else {
      if (countdownLabel) countdownLabel.innerText = '모집 시작까지 남은 시간';
    }

    const diff = targetTime - now;
    
    const dEl = document.getElementById('cdDays');
    const hEl = document.getElementById('cdHours');
    const mEl = document.getElementById('cdMins');
    const sEl = document.getElementById('cdSecs');

    if (diff <= 0 && !recruitModeOverride) {
      if (dEl) dEl.innerText = '00';
      if (hEl) hEl.innerText = '00';
      if (mEl) mEl.innerText = '00';
      if (sEl) sEl.innerText = '00';

      // Render closed form view
      if (recruitFormPanel && !recruitFormPanel.querySelector('.recruit-form-closed')) {
        renderClosedForm();
      }
    } else {
      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const secs = Math.floor((diff % (1000 * 60)) / 1000);

      if (dEl) dEl.innerText = days.toString().padStart(2, '0');
      if (hEl) hEl.innerText = hours.toString().padStart(2, '0');
      if (mEl) mEl.innerText = mins.toString().padStart(2, '0');
      if (sEl) sEl.innerText = secs.toString().padStart(2, '0');

      // Make sure form is visible and handle submission
      if (recruitFormPanel && (recruitFormPanel.querySelector('.recruit-form-closed') || recruitFormPanel.innerHTML === '')) {
        recruitFormPanel.innerHTML = originalFormHtml;
        bindRecruitFormSubmit();
      }
    }
  }

  function renderClosedForm() {
    if (!recruitFormPanel) return;
    recruitFormPanel.innerHTML = `
      <div class="recruit-form-closed">
        <div class="recruit-form-closed-icon">
          <i data-lucide="mail"></i>
        </div>
        <h3 class="game-title" style="margin-top: 10px;">지금은 모집 기간이 아닙니다</h3>
        <p class="game-desc" style="text-align: center; max-width: 340px;">
          f(x) factory 부원 모집은 정해진 가입 접수 기간에만 오픈됩니다. 일정을 확인해 주십시오.<br>
          <span style="font-size: 0.8rem; color: var(--text-muted);">* 우측 하단의 개발용 스위치를 통해 원서 양식을 강제 활성화하여 사전 테스트를 해보실 수 있습니다.</span>
        </p>
        <button class="btn btn-secondary" id="devToggleRecruit" style="margin-top: 15px; font-size: 0.8rem; padding: 8px 16px;">
          [개발자 모드] 지원 기간 열기
        </button>
      </div>
    `;
    initIcons();

    // Dev Override button inside closed view
    const devBtn = document.getElementById('devToggleRecruit');
    if (devBtn) {
      devBtn.addEventListener('click', () => {
        recruitModeOverride = true;
        updateRecruitState();
      });
    }
  }

  function bindRecruitFormSubmit() {
    const recruitForm = document.getElementById('recruitForm') as HTMLFormElement;
    if (recruitForm) {
      recruitForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const name = (document.getElementById('recruitName') as HTMLInputElement).value;
        const grade = parseInt((document.getElementById('recruitGrade') as HTMLSelectElement).value);
        const email = (document.getElementById('recruitEmail') as HTMLInputElement).value;
        const intro = (document.getElementById('recruitIntro') as HTMLTextAreaElement).value;
        const portfolio = (document.getElementById('recruitPortfolio') as HTMLInputElement).value;

        // Insert into database
        dbInstance.run(
          `INSERT INTO applications (name, grade, email, introduction, portfolio, created_at) VALUES (?, ?, ?, ?, ?, ?)`,
          [name, grade, email, intro, portfolio, new Date().toISOString().split('T')[0]]
        );

        alert(`성공적으로 지원서가 접수되었습니다!\n감사합니다, ${name}님. 서류 검토 후 이메일로 회신해 드리겠습니다.`);
        recruitForm.reset();
      });
    }
  }

  // Run update timer
  updateRecruitState();
  setInterval(updateRecruitState, 1000);
}

// -------------------------------------------------------------
// 7. BOOTSTRAP INITIALIZATION
// -------------------------------------------------------------
async function bootstrap() {
  try {
    // 1. Initialize SQLite WASM DB
    await dbInstance.init();

    // 2. Set up reactive rendering
    dbInstance.onUpdate(() => {
      renderUI();
    });

    // 3. Trigger initial rendering
    renderUI();

    // 4. Initialize dynamic components
    initHeroCanvas();
    initEventListeners();
    initSqlTerminal();
    initDebugGame();
    initRecruitmentPortal();

    console.log('f(x) factory Application Bootstrapped successfully.');
  } catch (err) {
    console.error('Error during bootstrapping application:', err);
  }
}

// Start application
window.addEventListener('DOMContentLoaded', bootstrap);
