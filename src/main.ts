import './style.css';
import {
  createIcons,
  ArrowUpRight, ChevronRight, Send, ChevronDown,
  GitCommit, CheckCircle2, ArrowRight,
  Lock, LockKeyhole, LogOut,
  FileText, Terminal, Bug, Database, Download, Upload, Trash2,
  Mail, Play, Star
} from 'lucide';
import { dbInstance } from './utils/db';

// =============================================================
// CONSTANTS
// =============================================================

/** 동아리 내부 포털 접속 코드 — 이 값을 변경하여 코드를 설정하세요 */
const PORTAL_CODE = 'fx-factory-2026';

const SESSION_KEY = 'fx_portal_auth';

// =============================================================
// LUCIDE ICONS INIT
// =============================================================
function initIcons() {
  createIcons({
    icons: {
      ArrowUpRight, ChevronRight, Send, ChevronDown,
      GitCommit, CheckCircle2, ArrowRight,
      Lock, LockKeyhole, LogOut,
      FileText, Terminal, Bug, Database, Download, Upload, Trash2,
      Mail, Play, Star
    }
  });
}

// =============================================================
// 1. HERO CANVAS — Mathematical f(x) Network Animation
// =============================================================
function initHeroCanvas() {
  const canvas = document.getElementById('heroCanvas') as HTMLCanvasElement;
  if (!canvas) return;
  const ctx = canvas.getContext('2d') as CanvasRenderingContext2D;
  if (!ctx) return;

  let width = (canvas.width = window.innerWidth);
  let height = (canvas.height = window.innerHeight);

  window.addEventListener('resize', () => {
    width = canvas.width = window.innerWidth;
    height = canvas.height = window.innerHeight;
  });

  interface Particle { x: number; y: number; vx: number; originalY: number; phase: number; radius: number; }
  const particles: Particle[] = Array.from({ length: 40 }, () => ({
    x: Math.random() * window.innerWidth,
    y: Math.random() * window.innerHeight,
    vx: (Math.random() - 0.5) * 0.4,
    originalY: Math.random() * window.innerHeight,
    phase: Math.random() * Math.PI * 2,
    radius: Math.random() * 2 + 1
  }));

  const mouse = { x: -1000, y: -1000, active: false };
  window.addEventListener('mousemove', e => { mouse.x = e.clientX; mouse.y = e.clientY; mouse.active = true; });
  window.addEventListener('mouseleave', () => { mouse.active = false; });

  let time = 0;
  function animate() {
    time += 0.005;
    ctx.clearRect(0, 0, width, height);

    // grid
    ctx.strokeStyle = 'rgba(255,255,255,0.02)';
    ctx.lineWidth = 1;
    for (let x = 0; x < width; x += 40) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, height); ctx.stroke(); }
    for (let y = 0; y < height; y += 40) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(width, y); ctx.stroke(); }

    // sin wave
    ctx.beginPath(); ctx.strokeStyle = 'rgba(255,255,255,0.06)'; ctx.lineWidth = 1.5;
    for (let x = 0; x < width; x += 5) {
      const y = height * 0.5 + Math.sin(x * 0.003 + time) * 120 * Math.cos(x * 0.001 - time * 0.5);
      x === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    }
    ctx.stroke();

    // particles & network
    particles.forEach((p, i) => {
      p.phase += 0.002; p.x += p.vx;
      p.y = p.originalY + Math.sin(p.phase + p.x * 0.005) * 30;
      if (p.x < 0) p.x = width; if (p.x > width) p.x = 0;

      ctx.beginPath(); ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(255,255,255,0.3)'; ctx.fill();

      if (mouse.active) {
        const dist = Math.hypot(p.x - mouse.x, p.y - mouse.y);
        if (dist < 120) {
          ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(mouse.x, mouse.y);
          ctx.strokeStyle = `rgba(255,255,255,${0.1 * (1 - dist / 120)})`; ctx.lineWidth = 0.8; ctx.stroke();
        }
      }

      for (let j = i + 1; j < particles.length; j++) {
        const p2 = particles[j];
        const dist = Math.hypot(p.x - p2.x, p.y - p2.y);
        if (dist < 150) {
          ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(p2.x, p2.y);
          ctx.strokeStyle = `rgba(255,255,255,${(150 - dist) / 150 * 0.12})`; ctx.lineWidth = 0.8; ctx.stroke();
        }
      }
    });
    requestAnimationFrame(animate);
  }
  animate();
}

// =============================================================
// 2. PUBLIC SITE RENDERING (공개 사이트)
// =============================================================
let activeFilter = 'all';

function renderPublicSite() {
  renderStats();
  renderCardNews();
  renderProjects();
  initIcons();
}

function renderStats() {
  const set = (id: string, val: string) => { const el = document.getElementById(id); if (el) el.innerText = val; };
  const members = dbInstance.query('SELECT COUNT(*) as c FROM members')[0]?.c || 0;
  const projects = dbInstance.query('SELECT COUNT(*) as c FROM projects')[0]?.c || 0;
  const sessions = dbInstance.query('SELECT COUNT(*) as c FROM sessions')[0]?.c || 0;
  const present = dbInstance.query("SELECT COUNT(*) as c FROM attendance")[0]?.c || 0;
  const possible = members * sessions;
  const rate = possible > 0 ? Math.round((present / possible) * 100) : 0;

  set('statMembers', String(members));
  set('statProjects', String(projects));
  set('statSessions', String(sessions));
  set('statRate', `${rate}%`);
}

function renderCardNews() {
  const grid = document.getElementById('newsGrid');
  if (!grid) return;
  const sql = activeFilter === 'all'
    ? 'SELECT * FROM news ORDER BY date DESC'
    : 'SELECT * FROM news WHERE category = ? ORDER BY date DESC';
  const items = activeFilter === 'all'
    ? dbInstance.query(sql)
    : dbInstance.query(sql, [activeFilter]);

  if (!items.length) {
    grid.innerHTML = `<div style="grid-column:1/-1;text-align:center;padding:40px;color:var(--text-secondary);border:1px solid var(--border-color);border-radius:8px;">등록된 소식이 없습니다.</div>`;
    return;
  }

  const catName: Record<string, string> = { seminar: '세미나', project: '프로젝트', event: '행사' };
  grid.innerHTML = items.map(item => `
    <div class="news-card" data-id="${item.id}">
      <div class="news-img" style="background-image:url('${item.image_url || ''}')"></div>
      <div class="news-body">
        <div>
          <div class="news-meta">
            <span class="news-badge">${catName[item.category] || '공지'}</span>
            <span class="news-date">${item.date}</span>
          </div>
          <h3 class="news-title">${esc(item.title)}</h3>
          <p class="news-excerpt">${esc(item.content)}</p>
        </div>
        <span style="font-size:0.8rem;font-weight:600;display:inline-flex;align-items:center;gap:4px;color:var(--text-primary);margin-top:10px;">
          Read More <i data-lucide="chevron-right" style="width:14px;height:14px;"></i>
        </span>
      </div>
    </div>`).join('');

  grid.querySelectorAll('.news-card').forEach(card => {
    card.addEventListener('click', () => {
      const id = card.getAttribute('data-id');
      if (id) openNewsModal(parseInt(id));
    });
  });
}

function renderProjects() {
  const grid = document.getElementById('projectGrid');
  if (!grid) return;
  const projects = dbInstance.query('SELECT * FROM projects ORDER BY stars DESC');

  if (!projects.length) {
    grid.innerHTML = '<div style="grid-column:1/-1;text-align:center;">등록된 프로젝트가 없습니다.</div>';
    return;
  }

  grid.innerHTML = projects.map(p => {
    const tags = (p.tech_stack || '').split(',').map((t: string) =>
      `<span class="project-tag">${esc(t.trim())}</span>`).join('');
    return `
      <div class="project-card">
        <div>
          <div class="project-header">
            <h3 class="project-title">${esc(p.title)}</h3>
            <button class="project-star" data-id="${p.id}">
              <i data-lucide="star" style="width:12px;height:12px;fill:currentColor;"></i>
              <span class="star-count">${p.stars}</span>
            </button>
          </div>
          <p class="project-desc">${esc(p.description)}</p>
        </div>
        <div class="project-footer">
          <div class="project-tags">${tags}</div>
          <div class="project-meta-row">
            <span>${esc(p.author)}</span>
            <a href="${p.github_url}" target="_blank" class="project-github">
              GitHub <i data-lucide="arrow-up-right" style="width:12px;height:12px;"></i>
            </a>
          </div>
        </div>
      </div>`;
  }).join('');

  grid.querySelectorAll('.project-star').forEach(btn => {
    btn.addEventListener('click', e => {
      e.preventDefault();
      const id = btn.getAttribute('data-id');
      if (id) dbInstance.run('UPDATE projects SET stars = stars + 1 WHERE id = ?', [parseInt(id)]);
    });
  });
}

function openNewsModal(id: number) {
  const modal = document.getElementById('appModal');
  const item = dbInstance.query('SELECT * FROM news WHERE id = ?', [id])[0];
  if (!item || !modal) return;
  const catName: Record<string, string> = { seminar: '학술 세미나', project: '프로젝트 정보', event: '동아리 행사' };
  (document.getElementById('modalImg') as HTMLElement).style.backgroundImage = `url('${item.image_url || ''}')`;
  (document.getElementById('modalCategory') as HTMLElement).innerText = catName[item.category] || '공지사항';
  (document.getElementById('modalTitle') as HTMLElement).innerText = item.title;
  (document.getElementById('modalDate') as HTMLElement).innerText = item.date;
  (document.getElementById('modalText') as HTMLElement).innerText = item.content;
  modal.classList.add('active');
  document.body.style.overflow = 'hidden';
}

// =============================================================
// 3. AUTHENTICATION GATE (코드 인증)
// =============================================================
function initAuth() {
  const portalBtn = document.getElementById('portalAccessBtn');
  const loginModal = document.getElementById('loginModal');
  const loginForm = document.getElementById('loginForm') as HTMLFormElement;
  const loginError = document.getElementById('loginError') as HTMLElement;
  const loginCancel = document.getElementById('loginCancelBtn');
  const codeInput = document.getElementById('loginCodeInput') as HTMLInputElement;

  // 이미 인증된 세션이면 자동 진입하지 않음 (명시적 버튼 클릭 필요)
  portalBtn?.addEventListener('click', () => {
    loginModal?.classList.add('active');
    document.body.style.overflow = 'hidden';
    setTimeout(() => codeInput?.focus(), 100);
  });

  loginCancel?.addEventListener('click', () => {
    loginModal?.classList.remove('active');
    document.body.style.overflow = '';
    if (codeInput) codeInput.value = '';
    loginError.style.display = 'none';
  });

  // 모달 외부 클릭 시 닫기
  loginModal?.addEventListener('click', e => {
    if (e.target === loginModal) {
      loginModal.classList.remove('active');
      document.body.style.overflow = '';
      if (codeInput) codeInput.value = '';
      loginError.style.display = 'none';
    }
  });

  loginForm?.addEventListener('submit', e => {
    e.preventDefault();
    const inputCode = codeInput?.value.trim();

    if (inputCode === PORTAL_CODE) {
      // 인증 성공
      sessionStorage.setItem(SESSION_KEY, 'true');
      loginModal?.classList.remove('active');
      document.body.style.overflow = '';
      if (codeInput) codeInput.value = '';
      loginError.style.display = 'none';
      openInternalPortal();
    } else {
      // 인증 실패
      loginError.style.display = 'block';
      codeInput.value = '';
      codeInput.focus();
      // 3번 연속 실패 방지용 shake 효과
      const content = loginModal?.querySelector('.modal-content');
      content?.classList.add('shake');
      setTimeout(() => content?.classList.remove('shake'), 500);
    }
  });
}

// =============================================================
// 4. INTERNAL PORTAL (내부 포털)
// =============================================================
function openInternalPortal() {
  const portal = document.getElementById('internalPortal');
  if (!portal) return;
  portal.classList.add('active');
  document.body.style.overflow = 'hidden';

  // 진입 시 데이터 렌더링
  renderPortalAttendance();
  renderPortalApplications();
  initIcons();
}

function closeInternalPortal() {
  const portal = document.getElementById('internalPortal');
  portal?.classList.remove('active');
  document.body.style.overflow = '';
  sessionStorage.removeItem(SESSION_KEY);
}

function initPortalTabs() {
  const tabs = document.querySelectorAll('.portal-tab');
  const panes = document.querySelectorAll('.portal-pane');

  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      const target = tab.getAttribute('data-tab');
      tabs.forEach(t => t.classList.remove('active'));
      panes.forEach(p => p.classList.remove('active'));
      tab.classList.add('active');
      document.getElementById(`tab-${target}`)?.classList.add('active');
    });
  });

  document.getElementById('portalCloseBtn')?.addEventListener('click', closeInternalPortal);
}

// 출석 현황판 렌더링
function renderPortalAttendance() {
  const grassBoard = document.getElementById('grassBoard');
  const statsSummary = document.getElementById('attendanceStatsSummary');
  if (!grassBoard) return;

  const members = dbInstance.query('SELECT name FROM members');
  const sessions = dbInstance.query('SELECT date, topic, code FROM sessions ORDER BY date ASC');

  if (!members.length || !sessions.length) {
    grassBoard.innerHTML = '<div style="padding:20px;color:var(--text-muted);">출석 데이터가 없습니다.</div>';
    return;
  }

  grassBoard.innerHTML = members.map(m => {
    const cells = sessions.map((s, idx) => {
      const present = dbInstance.query(
        'SELECT 1 FROM attendance WHERE member_name = ? AND date = ?',
        [m.name, s.date]
      ).length > 0;
      const cls = present ? `present-${(idx % 4) + 1}` : 'absent';
      const tip = `${m.name} · ${s.date} · ${s.topic} · ${present ? '출석' : '결석'}`;
      return `<div class="grass-cell ${cls}"><div class="tooltip">${tip}</div></div>`;
    }).join('');

    return `<div class="grass-row">
      <span class="grass-member-name">${esc(m.name)}</span>
      <div class="grass-cells">${cells}</div>
    </div>`;
  }).join('');

  const total = members.length * sessions.length;
  const present = dbInstance.query("SELECT COUNT(*) as c FROM attendance")[0]?.c || 0;
  if (statsSummary) statsSummary.innerText = `총 출석: ${present} / ${total}`;
}

// 지원서 목록 렌더링
function renderPortalApplications() {
  const list = document.getElementById('applicationsList');
  const countEl = document.getElementById('applicationCount');
  if (!list) return;

  const apps = dbInstance.query('SELECT * FROM applications ORDER BY created_at DESC');
  if (countEl) countEl.innerText = `총 ${apps.length}건`;

  if (!apps.length) {
    list.innerHTML = '<div class="applications-empty">아직 접수된 지원서가 없습니다.</div>';
    return;
  }

  const statusMap: Record<string, string> = {
    Pending: '검토 대기', Accepted: '서류 합격', Interview: '면접 예정', Rejected: '불합격'
  };
  const statusCls: Record<string, string> = {
    Pending: 'pending', Accepted: 'accepted', Interview: 'interview', Rejected: 'rejected'
  };

  list.innerHTML = apps.map(app => `
    <div class="application-card">
      <div class="application-info">
        <h4>${esc(app.name)} · ${app.grade}학년</h4>
        <div class="application-meta">
          <span>${esc(app.email)}</span>
          ${app.portfolio ? `<a href="${app.portfolio}" target="_blank" style="color:var(--text-secondary);">포트폴리오 보기</a>` : ''}
          <span style="color:var(--text-muted);">${app.created_at}</span>
        </div>
        <div class="application-intro">${esc(app.introduction)}</div>
      </div>
      <div class="application-status">
        <span class="status-badge ${statusCls[app.status] || 'pending'}">${statusMap[app.status] || app.status}</span>
        <select class="status-select" data-id="${app.id}" data-current="${app.status}">
          <option value="Pending" ${app.status === 'Pending' ? 'selected' : ''}>검토 대기</option>
          <option value="Accepted" ${app.status === 'Accepted' ? 'selected' : ''}>서류 합격</option>
          <option value="Interview" ${app.status === 'Interview' ? 'selected' : ''}>면접 예정</option>
          <option value="Rejected" ${app.status === 'Rejected' ? 'selected' : ''}>불합격</option>
        </select>
      </div>
    </div>`).join('');

  // 상태 변경 이벤트
  list.querySelectorAll('.status-select').forEach(sel => {
    sel.addEventListener('change', () => {
      const id = sel.getAttribute('data-id');
      const val = (sel as HTMLSelectElement).value;
      dbInstance.run('UPDATE applications SET status = ? WHERE id = ?', [val, parseInt(id!)]);
      renderPortalApplications();
      initIcons();
    });
  });
}

// 출석 체크인
function initCheckinForm() {
  // 멤버 드롭다운 채우기
  const select = document.getElementById('checkinMember') as HTMLSelectElement;
  if (select) {
    const members = dbInstance.query('SELECT name FROM members ORDER BY name ASC');
    select.innerHTML = members.map(m => `<option value="${esc(m.name)}">${esc(m.name)}</option>`).join('');
  }

  document.getElementById('checkinForm')?.addEventListener('submit', e => {
    e.preventDefault();
    const name = (document.getElementById('checkinMember') as HTMLSelectElement).value;
    const code = (document.getElementById('checkinCode') as HTMLInputElement).value.trim();

    const session = dbInstance.query('SELECT date FROM sessions WHERE code = ?', [code]);
    if (!session.length) { alert('올바르지 않은 출석 암호입니다.'); return; }

    const date = session[0].date;
    const dup = dbInstance.query('SELECT 1 FROM attendance WHERE member_name = ? AND date = ?', [name, date]);
    if (dup.length) { alert(`이미 [${date}] 세션에 출석 기록이 있습니다.`); return; }

    dbInstance.run('INSERT INTO attendance (member_name, date, session_code) VALUES (?, ?, ?)', [name, date, code]);
    alert(`${name}님 출석 완료! (${date})`);
    (document.getElementById('checkinCode') as HTMLInputElement).value = '';
    renderPortalAttendance();
  });

  // 세션 등록 (동아리장 패널)
  const today = new Date().toISOString().split('T')[0];
  const dateInput = document.getElementById('newSessionDate') as HTMLInputElement;
  if (dateInput) dateInput.value = today;

  document.getElementById('addSessionBtn')?.addEventListener('click', () => {
    const d = (document.getElementById('newSessionDate') as HTMLInputElement).value;
    const code = (document.getElementById('newSessionCode') as HTMLInputElement).value.trim();
    const topic = (document.getElementById('newSessionTopic') as HTMLInputElement).value.trim();
    if (!d || !code || !topic) { alert('날짜, 코드, 주제를 모두 입력하세요.'); return; }

    const dup = dbInstance.query('SELECT 1 FROM sessions WHERE code = ?', [code]);
    if (dup.length) { alert('이미 사용 중인 코드입니다.'); return; }

    dbInstance.run('INSERT INTO sessions (date, code, topic) VALUES (?, ?, ?)', [d, code, topic]);
    alert(`세션이 등록되었습니다!\n날짜: ${d}\n코드: ${code}\n주제: ${topic}`);
    (document.getElementById('newSessionCode') as HTMLInputElement).value = '';
    (document.getElementById('newSessionTopic') as HTMLInputElement).value = '';
    renderPortalAttendance();
  });
}

// DB 관리 버튼
function initDbManagement() {
  document.getElementById('exportDbBtn')?.addEventListener('click', () => {
    const data = dbInstance.exportData();
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `fx_factory_backup_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  });

  const importTrigger = document.getElementById('importDbTrigger');
  const importFile = document.getElementById('importDbFile') as HTMLInputElement;
  importTrigger?.addEventListener('click', () => importFile?.click());
  importFile?.addEventListener('change', () => {
    const file = importFile.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = e => {
      const text = e.target?.result as string;
      if (text) { dbInstance.importData(text); alert('데이터베이스가 복구되었습니다!'); }
    };
    reader.readAsText(file);
    importFile.value = '';
  });

  document.getElementById('resetDbBtn')?.addEventListener('click', () => {
    if (confirm('⚠️ 모든 데이터를 초기화합니다. 되돌릴 수 없습니다.')) {
      localStorage.removeItem('fx_factory_db');
      window.location.reload();
    }
  });
}

// =============================================================
// 5. SQL TERMINAL
// =============================================================
function initSqlTerminal() {
  const input = document.getElementById('terminalInput') as HTMLInputElement;
  const body = document.getElementById('terminalBody') as HTMLElement;
  const history = document.getElementById('terminalHistory') as HTMLElement;
  const schemaToggle = document.getElementById('toggleSchema');
  const schemaPanel = document.getElementById('schemaPanel');

  schemaToggle?.addEventListener('click', () => schemaPanel?.classList.toggle('active'));

  input?.addEventListener('keydown', e => {
    if (e.key !== 'Enter') return;
    const cmd = input.value.trim();
    if (!cmd) return;

    // echo command
    const line = document.createElement('div');
    line.className = 'terminal-prompt-row';
    line.innerHTML = `<span class="terminal-prompt">sqlite&gt;</span> <span style="color:#a6e22e;">${esc(cmd)}</span>`;
    history.appendChild(line);

    const lower = cmd.toLowerCase();
    if (lower === 'clear') { history.innerHTML = ''; }
    else if (lower === 'help') {
      appendTerminal(history, `사용 가능한 명령어:<br>
        <span style="color:#66d9ef;">schema</span> — 테이블 구조 보기<br>
        <span style="color:#66d9ef;">clear</span> — 화면 초기화<br>
        SQL 쿼리 — SELECT, INSERT, UPDATE, DELETE 지원<br>
        예) SELECT * FROM members;`, '#c5c5c5');
    } else if (lower === 'schema') {
      schemaPanel?.classList.toggle('active');
      appendTerminal(history, '스키마 패널을 토글했습니다.', '#888');
    } else {
      try {
        const isRead = lower.startsWith('select') || lower.startsWith('pragma') || lower.startsWith('explain');
        if (isRead) {
          const results = dbInstance.query(cmd);
          if (!results.length) { appendTerminal(history, 'Empty set.', '#888'); }
          else {
            const cols = Object.keys(results[0]);
            let table = `<table class="sql-table"><thead><tr>${cols.map(c => `<th>${esc(c)}</th>`).join('')}</tr></thead><tbody>`;
            results.forEach(row => {
              table += `<tr>${cols.map(c => `<td>${esc(String(row[c]))}</td>`).join('')}</tr>`;
            });
            table += '</tbody></table>';
            const div = document.createElement('div');
            div.innerHTML = table;
            history.appendChild(div);
          }
        } else {
          dbInstance.run(cmd);
          appendTerminal(history, 'Query OK.', '#27c93f');
        }
      } catch (err: any) {
        appendTerminal(history, `Error: ${err.message}`, '#da363c');
      }
    }

    input.value = '';
    body.scrollTop = body.scrollHeight;
  });
}

function appendTerminal(container: HTMLElement, html: string, color: string) {
  const div = document.createElement('div');
  div.style.color = color;
  div.innerHTML = html;
  container.appendChild(div);
}

// =============================================================
// 6. DEBUG GAME
// =============================================================
function initDebugGame() {
  document.getElementById('runCodeBtn')?.addEventListener('click', () => {
    const code = (document.getElementById('gameCode') as HTMLTextAreaElement).value;
    const output = document.getElementById('gameOutput') as HTMLElement;
    const badge = document.getElementById('gameSuccessBadge') as HTMLElement;
    output.innerText = 'Compiling...\n';

    try {
      const fn = new Function(`${code}\nreturn sumOfOdds;`)() as (arr: number[]) => number;
      if (typeof fn !== 'function') throw new Error('sumOfOdds 함수가 없습니다.');
      const result = fn([1, 2, 3, 4, 5]);
      output.innerText += `sumOfOdds([1,2,3,4,5]) → ${result}\n`;
      if (result === 9) {
        output.innerText += '\n[SUCCESS] 테스트 통과! 보상 코드: FX-DEBUG-2026';
        output.style.color = '#27c93f';
        badge.style.display = 'inline-block';
      } else {
        output.innerText += `\n[FAIL] 예상값: 9, 실제값: ${result}`;
        output.style.color = '#ff9f00';
        badge.style.display = 'none';
      }
    } catch (err: any) {
      output.innerText += `\n[ERROR] ${err.message}`;
      output.style.color = '#da363c';
      badge.style.display = 'none';
    }
  });
}

// =============================================================
// 7. RECRUIT PORTAL
// =============================================================
function initRecruitPortal() {
  // FAQ accordion
  document.querySelectorAll('.faq-item').forEach(item => {
    item.querySelector('.faq-trigger')?.addEventListener('click', () => {
      const active = item.classList.contains('active');
      document.querySelectorAll('.faq-item').forEach(f => f.classList.remove('active'));
      if (!active) item.classList.add('active');
    });
  });

  // Countdown
  const start = new Date('2026-06-10T00:00:00').getTime();
  const end   = new Date('2026-06-25T23:59:59').getTime();

  function tick() {
    const now = Date.now();
    const isOpen = now >= start && now <= end;
    const statusEl = document.getElementById('recruitStatus');
    const labelEl  = document.getElementById('countdownLabel');
    const formPanel = document.getElementById('recruitFormPanel');

    if (statusEl) {
      statusEl.innerText = isOpen ? '● 모집 진행 중' : now < start ? '○ 모집 대기 중' : '○ 모집 종료';
      statusEl.className = `recruit-status-tag${isOpen ? ' active' : ''}`;
    }

    const target = isOpen ? end : start;
    const diff = target - now;

    const days  = Math.max(0, Math.floor(diff / 86400000));
    const hours = Math.max(0, Math.floor((diff % 86400000) / 3600000));
    const mins  = Math.max(0, Math.floor((diff % 3600000) / 60000));
    const secs  = Math.max(0, Math.floor((diff % 60000) / 1000));

    (['cdDays', 'cdHours', 'cdMins', 'cdSecs'] as const).forEach((id, i) => {
      const el = document.getElementById(id);
      if (el) el.innerText = [days, hours, mins, secs][i].toString().padStart(2, '0');
    });

    if (labelEl) {
      labelEl.innerText = isOpen ? '원서 접수 마감까지' : now < start ? '모집 시작까지' : '모집이 종료되었습니다';
    }

    // 폼 활성/비활성
    if (formPanel) {
      const form = formPanel.querySelector('form') as HTMLFormElement | null;
      const inputs = formPanel.querySelectorAll('input,textarea,select,button[type="submit"]');
      if (!isOpen) {
        if (form) form.style.opacity = '0.4';
        inputs.forEach(el => (el as HTMLInputElement).disabled = true);
        if (!formPanel.querySelector('.form-closed-notice')) {
          const notice = document.createElement('div');
          notice.className = 'form-closed-notice';
          notice.style.cssText = 'text-align:center;padding:16px;color:var(--text-muted);font-size:0.85rem;margin-bottom:16px;border:1px solid var(--border-color);border-radius:6px;';
          notice.innerText = '현재 모집 기간이 아닙니다.';
          formPanel.prepend(notice);
        }
      } else {
        if (form) form.style.opacity = '1';
        inputs.forEach(el => (el as HTMLInputElement).disabled = false);
        formPanel.querySelector('.form-closed-notice')?.remove();
      }
    }
  }

  tick();
  setInterval(tick, 1000);

  // Form submit
  const recruitForm = document.getElementById('recruitForm') as HTMLFormElement;
  recruitForm?.addEventListener('submit', e => {
    e.preventDefault();
    const name     = (document.getElementById('recruitName') as HTMLInputElement).value;
    const grade    = parseInt((document.getElementById('recruitGrade') as HTMLSelectElement).value);
    const email    = (document.getElementById('recruitEmail') as HTMLInputElement).value;
    const intro    = (document.getElementById('recruitIntro') as HTMLTextAreaElement).value;
    const portfolio= (document.getElementById('recruitPortfolio') as HTMLInputElement).value;

    dbInstance.run(
      'INSERT INTO applications (name, grade, email, introduction, portfolio, created_at) VALUES (?, ?, ?, ?, ?, ?)',
      [name, grade, email, intro, portfolio, new Date().toISOString().split('T')[0]]
    );
    alert(`${name}님의 지원서가 접수되었습니다!\n검토 후 이메일로 연락드리겠습니다.`);
    recruitForm.reset();
  });
}

// =============================================================
// 8. COMMON EVENT LISTENERS
// =============================================================
function initCommonEvents() {
  // News modal close
  const modal = document.getElementById('appModal');
  const closeBtn = document.getElementById('closeModal');
  const closeModal = () => { modal?.classList.remove('active'); document.body.style.overflow = ''; };
  closeBtn?.addEventListener('click', closeModal);
  modal?.addEventListener('click', e => { if (e.target === modal) closeModal(); });

  // News filter
  document.getElementById('newsFilters')?.querySelectorAll('.filter-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      activeFilter = btn.getAttribute('data-filter') || 'all';
      renderCardNews();
      initIcons();
    });
  });

  // Header scroll effect & scroll spy
  window.addEventListener('scroll', () => {
    const header = document.getElementById('header');
    if (header) header.classList.toggle('scrolled', window.scrollY > 50);

    const sections = document.querySelectorAll<HTMLElement>('section');
    let current = '';
    sections.forEach(s => {
      if (window.scrollY >= s.offsetTop - 120) current = s.id;
    });
    document.querySelectorAll('.nav-link').forEach(link => {
      link.classList.toggle('active', link.getAttribute('href') === `#${current}`);
    });
  });
}

// =============================================================
// UTILITY
// =============================================================
function esc(str: string): string {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#039;');
}

// =============================================================
// BOOTSTRAP
// =============================================================
async function bootstrap() {
  try {
    await dbInstance.init();

    dbInstance.onUpdate(() => {
      renderPublicSite();
    });

    renderPublicSite();
    initHeroCanvas();
    initCommonEvents();
    initAuth();
    initPortalTabs();
    initCheckinForm();
    initDbManagement();
    initSqlTerminal();
    initDebugGame();
    initRecruitPortal();
    initIcons();

    console.log('f(x) factory — Application bootstrapped.');
  } catch (err) {
    console.error('Bootstrap error:', err);
  }
}

window.addEventListener('DOMContentLoaded', bootstrap);
