// 學術文獻摘要卡核心應用程式 (App Logic - Warm Editorial Style)

document.addEventListener('DOMContentLoaded', () => {
  // 1. 初始化 Mermaid.js（採用溫暖雅緻配色與防裁切留白設定）
  if (window.mermaid) {
    mermaid.initialize({
      startOnLoad: false,
      theme: 'base',
      securityLevel: 'loose',
      flowchart: {
        htmlLabels: true,
        useMaxWidth: true,
        padding: 24,
        nodeSpacing: 45,
        rankSpacing: 45
      },
      fontSize: 15,
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Noto Sans TC", sans-serif',
      themeVariables: {
        fontSize: '15px',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Noto Sans TC", sans-serif',
        primaryColor: '#FDF9F5',
        primaryTextColor: '#2D2823',
        primaryBorderColor: '#D8CEBF',
        lineColor: '#8C7E70',
        secondaryColor: '#F5EFE6',
        tertiaryColor: '#FFFFFF',
        edgeLabelBackground: '#FAF8F5',
        nodeBorder: '#C9BEAD',
        clusterBkg: '#F5EFE6',
        clusterBorder: '#D8CEBF'
      }
    });
  }

  // 2. 狀態管理
  const state = {
    notes: window.NOTES_MANIFEST || [],
    searchQuery: '',
    selectedJournal: '',
    selectedYear: '',
    selectedTag: ''
  };

  // DOM 節點
  const cardsGrid = document.getElementById('cards-grid');
  const searchInput = document.getElementById('search-input');
  const journalFilter = document.getElementById('journal-filter');
  const yearFilter = document.getElementById('year-filter');
  const tagCloud = document.getElementById('tag-cloud');
  const resetBtn = document.getElementById('reset-filters');
  const totalCountEl = document.getElementById('total-count');
  
  // Note Modal
  const modalOverlay = document.getElementById('note-modal');
  const modalTitle = document.getElementById('modal-title');
  const modalAuthors = document.getElementById('modal-authors');
  const modalBody = document.getElementById('modal-body');
  const modalCloseBtn = document.getElementById('modal-close-btn');

  // 3. 初始化篩選器選單
  function initFilters() {
    const journals = new Set();
    const years = new Set();
    const tagCounts = {};

    // 建立期刊黑名單，確保熱門主題不出現期刊名稱
    const journalBlacklist = new Set([
      'jae', 'irfa', 'jri', 'jafb', 'tar', 'car', 'jar', 'rast',
      '證券期貨市場評論', '會計評論', '經濟論文', '管理評論'
    ]);

    state.notes.forEach(note => {
      if (note.journal) {
        journals.add(note.journal);
        journalBlacklist.add(note.journal.toLowerCase().trim());
      }
      if (note.year) years.add(note.year);
      if (Array.isArray(note.tags)) {
        note.tags.forEach(t => {
          const tClean = t.trim();
          const tLower = tClean.toLowerCase();
          const isJournal = journalBlacklist.has(tLower) || Array.from(journals).some(j => j.toLowerCase().includes(tLower));
          if (!isJournal) {
            tagCounts[tClean] = (tagCounts[tClean] || 0) + 1;
          }
        });
      }
    });

    // 期刊選項
    journalFilter.innerHTML = '<option value="">所有期刊</option>';
    Array.from(journals).sort().forEach(j => {
      const opt = document.createElement('option');
      opt.value = j;
      opt.textContent = j;
      journalFilter.appendChild(opt);
    });

    // 年份選項
    yearFilter.innerHTML = '<option value="">所有年份</option>';
    Array.from(years).sort((a, b) => b - a).forEach(y => {
      const opt = document.createElement('option');
      opt.value = y;
      opt.textContent = y;
      yearFilter.appendChild(opt);
    });

    // 熱門主題：不包含期刊名稱，固定呈現前 5 個最核心主題
    const top5Tags = Object.keys(tagCounts)
      .sort((a, b) => tagCounts[b] - tagCounts[a])
      .slice(0, 5);

    renderTagCloud(top5Tags);
  }

  function renderTagCloud(tags) {
    tagCloud.innerHTML = '<span class="tag-cloud-label">熱門主題:</span>';
    tags.forEach(t => {
      const pill = document.createElement('span');
      pill.className = `tag-pill ${state.selectedTag === t ? 'active' : ''}`;
      pill.textContent = `#${t}`;
      pill.addEventListener('click', () => {
        if (state.selectedTag === t) {
          state.selectedTag = '';
        } else {
          state.selectedTag = t;
        }
        renderTagCloud(tags);
        renderCards();
      });
      tagCloud.appendChild(pill);
    });
  }

  // 4. 篩選與搜尋
  function getFilteredNotes() {
    return state.notes.filter(note => {
      const q = state.searchQuery.toLowerCase().trim();
      const matchQuery = !q || (
        (note.title && note.title.toLowerCase().includes(q)) ||
        (note.authors && note.authors.toLowerCase().includes(q)) ||
        (note.takeaway && note.takeaway.toLowerCase().includes(q)) ||
        (note.journal && note.journal.toLowerCase().includes(q)) ||
        (Array.isArray(note.tags) && note.tags.some(t => t.toLowerCase().includes(q)))
      );

      const matchJournal = !state.selectedJournal || note.journal === state.selectedJournal;
      const matchYear = !state.selectedYear || String(note.year) === String(state.selectedYear);
      const matchTag = !state.selectedTag || (Array.isArray(note.tags) && note.tags.includes(state.selectedTag));

      return matchQuery && matchJournal && matchYear && matchTag;
    });
  }

  // 5. 渲染卡片網格
  function renderCards() {
    const filtered = getFilteredNotes();
    totalCountEl.textContent = `共收錄 ${filtered.length} 篇學術論文摘要卡`;

    if (filtered.length === 0) {
      cardsGrid.innerHTML = `
        <div class="empty-state">
          <div class="empty-icon">🔍</div>
          <h3>未找到相符的文獻筆記</h3>
          <p>請嘗試放寬搜尋關鍵字或清除篩選條件。</p>
        </div>
      `;
      return;
    }

    cardsGrid.innerHTML = filtered.map(note => `
      <div class="card" data-id="${note.id}">
        <div class="card-meta">
          <span class="badge-journal">${escapeHtml(note.journal || 'Journal')}</span>
          <span class="badge-year">${note.year || ''}</span>
        </div>
        <h3 class="card-title">${escapeHtml(note.title)}</h3>
        <p class="card-authors">${escapeHtml(note.authors || '')}</p>
        <div class="card-takeaway">
          <strong>Key Takeaway</strong>
          ${escapeHtml(note.takeaway || '')}
        </div>
        <div class="card-tags">
          ${(note.tags || []).map(t => `<span class="tag-pill">#${escapeHtml(t)}</span>`).join('')}
        </div>
      </div>
    `).join('');

    // 綁定點擊事件打開 Modal
    cardsGrid.querySelectorAll('.card').forEach(cardEl => {
      cardEl.addEventListener('click', () => {
        const id = cardEl.getAttribute('data-id');
        const note = state.notes.find(n => n.id === id);
        if (note) openNoteModal(note);
      });
    });
  }

  // 6. 打開詳細筆記 Modal（頂部先呈現題目，下方不同色呈現作者資訊）
  async function openNoteModal(note) {
    modalTitle.textContent = note.title;
    if (modalAuthors) {
      modalAuthors.textContent = `${note.year ? note.year + ' 年 · ' : ''}${note.authors || ''}${note.journal ? ' · ' + note.journal : ''}`;
    }
    modalBody.innerHTML = `
      <div style="text-align: center; padding: 40px; color: var(--text-muted);">
        正在載入文獻詳細筆記...
      </div>
    `;
    modalOverlay.classList.add('open');
    document.body.style.overflow = 'hidden';

    try {
      const res = await fetch(note.filename);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const rawMarkdown = await res.text();
      await renderMarkdownContent(rawMarkdown);
    } catch (err) {
      modalBody.innerHTML = `
        <div style="padding: 24px; color: #9C4221; background: #FDF1E7; border-radius: 8px;">
          <strong>筆記載入失敗</strong>：無法讀取 <code>${note.filename}</code>。<br>
          <small>請確認終端機伺服器正在運行（例如 <code>python -m http.server 8000</code>）。</small>
        </div>
      `;
    }
  }

  // 7. 解析 Markdown 與渲染 Mermaid
  async function renderMarkdownContent(rawMd) {
    // 移除 YAML frontmatter (--- ... ---)
    let cleanMd = rawMd.replace(/^---[\s\S]*?---\s*/, '');

    if (!window.marked) {
      modalBody.textContent = cleanMd;
      return;
    }

    // 解析 Markdown 為 HTML
    let html = marked.parse(cleanMd);
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = html;

    // A. 處理假說列表（移除勾勾、徹底對齊三欄排版、消除開頭冒號與懸掛字符）
    const lists = tempDiv.querySelectorAll('ul');
    lists.forEach(ul => {
      const items = Array.from(ul.querySelectorAll('li'));
      const isHypothesisList = items.some(li => 
        /顯著正相關|顯著負相關|不顯著/.test(li.textContent)
      );

      if (isHypothesisList) {
        const container = document.createElement('div');
        container.className = 'hyp-list-container';

        items.forEach(li => {
          let text = li.innerHTML;
          // 移除任何 checkbox input 與 [x]/[ ]
          text = text.replace(/<input[^>]*>/gi, '');
          text = text.replace(/^\s*\[[ xX]?\]\s*/, '');

          // 解析標籤 (顯著正相關*** / 顯著負相關** / 不顯著)
          let badgeHtml = '';
          const matchPos = text.match(/\[顯著正相關\s*(\*{1,3})?\]/);
          const matchNeg = text.match(/\[顯著負相關\s*(\*{1,3})?\]/);
          const matchNs = text.match(/\[不顯著(?:\s*\([^)]*\))?\]/);

          if (matchPos) {
            const stars = matchPos[1] || '';
            badgeHtml = `<span class="hyp-status hyp-pos">顯著正相關${stars}</span>`;
            text = text.replace(matchPos[0], '');
          } else if (matchNeg) {
            const stars = matchNeg[1] || '';
            badgeHtml = `<span class="hyp-status hyp-neg">顯著負相關${stars}</span>`;
            text = text.replace(matchNeg[0], '');
          } else if (matchNs) {
            badgeHtml = `<span class="hyp-status hyp-ns">不顯著</span>`;
            text = text.replace(matchNs[0], '');
          }

          // 移除結尾懸掛破折號 —— 或 -
          text = text.replace(/[—\-\s]+$/, '').trim();

          // 分離假說代號與說明文字，並嚴格去除開頭的冒號
          let hypTag = '假說';
          let hypDesc = text;
          const tagMatch = text.match(/^\s*(<strong>.*?<\/strong>|<b>.*?<\/b>|H\d+[^:]*)\s*[:：]?\s*(.*)/i);
          if (tagMatch) {
            hypTag = tagMatch[1].replace(/[:：]/g, '').trim();
            hypDesc = tagMatch[2].replace(/^[:：\s]+/, '').trim();
          }

          const row = document.createElement('div');
          row.className = 'hyp-row';
          row.innerHTML = `
            <div class="hyp-tag-col">${hypTag}</div>
            <div class="hyp-desc-col">${hypDesc}</div>
            <div class="hyp-badge-col">${badgeHtml}</div>
          `;
          container.appendChild(row);
        });

        ul.parentNode.replaceChild(container, ul);
      }
    });

    // B. 處理 Mermaid 代碼塊（大尺寸與寬版清晰展示）
    const mermaidCodes = tempDiv.querySelectorAll('code.language-mermaid');
    mermaidCodes.forEach((codeEl, index) => {
      const pre = codeEl.closest('pre');
      const codeText = codeEl.textContent.trim();
      
      const wrapper = document.createElement('div');
      wrapper.className = 'mermaid-diagram-card';

      // 檢查前方是否有 h3 標題，若有則融合至卡片頭部
      let diagramTitleText = `變數關係圖 #${index + 1}`;
      const prevEl = pre.previousElementSibling;
      if (prevEl && prevEl.tagName === 'H3') {
        diagramTitleText = prevEl.textContent;
        prevEl.remove();
      }

      wrapper.innerHTML = `
        <div class="diagram-card-header">
          <span class="diagram-title">📊 ${escapeHtml(diagramTitleText)}</span>
        </div>
        <div class="mermaid-wrapper">
          <pre class="mermaid">${escapeHtml(codeText)}</pre>
        </div>
      `;
      
      pre.parentNode.replaceChild(wrapper, pre);
    });

    modalBody.innerHTML = tempDiv.innerHTML;

    // C. 依序安全渲染 Mermaid 圖表
    if (window.mermaid) {
      const mermaidNodes = modalBody.querySelectorAll('.mermaid');
      for (let i = 0; i < mermaidNodes.length; i++) {
        const node = mermaidNodes[i];
        try {
          const id = `mermaid-svg-${Date.now()}-${i}`;
          const graphDefinition = node.textContent;
          const { svg } = await mermaid.render(id, graphDefinition);
          node.innerHTML = svg;
        } catch (mErr) {
          console.error('Mermaid render error for diagram', i, mErr);
          node.innerHTML = `
            <div style="padding: 12px; font-size: 13px; color: #9C4221; background: #FDF1E7; border-radius: 6px;">
              ⚠️ 圖表繪製語法提示：${escapeHtml(mErr.message || '語法錯誤')}
            </div>
          `;
        }
      }
    }
  }

  // 8. 關閉 Modal
  function closeModal() {
    modalOverlay.classList.remove('open');
    document.body.style.overflow = '';
  }

  modalCloseBtn.addEventListener('click', closeModal);
  modalOverlay.addEventListener('click', (e) => {
    if (e.target === modalOverlay) closeModal();
  });
  
  // 鍵盤 Esc 關閉 Modal
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      if (modalOverlay.classList.contains('open')) {
        closeModal();
      }
    }
  });

  // 9. 事件監聽
  searchInput.addEventListener('input', (e) => {
    state.searchQuery = e.target.value;
    renderCards();
  });

  journalFilter.addEventListener('change', (e) => {
    state.selectedJournal = e.target.value;
    renderCards();
  });

  yearFilter.addEventListener('change', (e) => {
    state.selectedYear = e.target.value;
    renderCards();
  });

  resetBtn.addEventListener('click', () => {
    state.searchQuery = '';
    state.selectedJournal = '';
    state.selectedYear = '';
    state.selectedTag = '';
    searchInput.value = '';
    journalFilter.value = '';
    yearFilter.value = '';
    initFilters();
    renderCards();
  });

  // 工具函式
  function escapeHtml(str) {
    if (!str) return '';
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  // 初始化啟動
  initFilters();
  renderCards();
});
