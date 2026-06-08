// ========== 应用状态 ==========
let chunks = [];
let currentFilter = '全部';
let searchQuery = '';
let currentChunk = null;
let currentExprIndex = 0;
let learnedSet = new Set(); // 已学 chunk id 集合
let touchStartX = 0;
let touchEndX = 0;
let touchStartY = 0;
let touchEndY = 0;

// ========== DOM 元素 ==========
const $searchInput = document.getElementById('searchInput');
const $searchClear = document.getElementById('searchClear');
const $chunkList = document.getElementById('chunkList');
const $emptyState = document.getElementById('emptyState');
const $modalOverlay = document.getElementById('modalOverlay');
const $modal = document.getElementById('modal');
const $modalClose = document.getElementById('modalClose');
const $modalChinese = document.getElementById('modalChinese');
const $cardContainer = document.getElementById('cardContainer');
const $swipeDots = document.getElementById('swipeDots');
const $modalContext = document.getElementById('modalContext');
const $videoWrapper = document.getElementById('videoWrapper');
const $videoSource = document.getElementById('videoSource');
const $videoContainer = document.getElementById('videoContainer');
const $btnLearned = document.getElementById('btnLearned');
const $btnShare = document.getElementById('btnShare');
const $toast = document.getElementById('toast');

// ========== 初始化 ==========
async function init() {
  try {
    const res = await fetch('chunks.json');
    if (!res.ok) throw new Error('无法加载数据');
    chunks = await res.json();
  } catch (err) {
    console.error('加载数据失败:', err);
    $chunkList.innerHTML = '<div class="empty-state"><div class="empty-icon">⚠️</div><p>数据加载失败</p><p class="empty-hint">请检查 chunks.json 文件</p></div>';
    return;
  }

  // 恢复已学记录
  const saved = localStorage.getItem('chunktalk_learned');
  if (saved) {
    try { learnedSet = new Set(JSON.parse(saved)); } catch(e) {}
  }

  renderList();
  bindEvents();
}

// ========== 列表渲染 ==========
function getFilteredChunks() {
  let result = chunks;

  if (currentFilter !== '全部') {
    result = result.filter(c => c.category.includes(currentFilter));
  }

  if (searchQuery.trim()) {
    const q = searchQuery.trim().toLowerCase();
    result = result.filter(c =>
      c.chinese.toLowerCase().includes(q) ||
      c.expressions.some(e => e.text.toLowerCase().includes(q))
    );
  }

  return result;
}

function renderList() {
  const filtered = getFilteredChunks();

  if (filtered.length === 0) {
    $chunkList.innerHTML = '';
    $emptyState.style.display = 'block';
    return;
  }

  $emptyState.style.display = 'none';

  $chunkList.innerHTML = filtered.map(c => {
    const mainExpr = c.expressions[0];
    const isLearned = learnedSet.has(c.id);
    const cats = c.category.map(cat => `<span class="chunk-cat">${cat}</span>`).join('');
    const hasVideo = mainExpr.video;
    const badge = hasVideo ? '<span class="chunk-badge">🎬 有视频</span>' : '';

    return `
      <div class="chunk-card ${isLearned ? 'learned' : ''}" data-id="${c.id}">
        <div class="chunk-info">
          <div class="chunk-chinese">${c.chinese}</div>
          <div class="chunk-english">${mainExpr.text}</div>
          <div class="chunk-meta">
            ${cats}
            ${badge}
          </div>
        </div>
        <span class="chunk-arrow">›</span>
      </div>
    `;
  }).join('');

  // 绑定点击
  $chunkList.querySelectorAll('.chunk-card').forEach(card => {
    card.addEventListener('click', () => {
      const id = card.dataset.id;
      openDetail(id);
    });
  });
}

// ========== 详情弹窗 ==========
function openDetail(chunkId) {
  currentChunk = chunks.find(c => c.id === chunkId);
  if (!currentChunk) return;

  currentExprIndex = 0;
  renderDetail();
  updateVideo();

  $modalOverlay.classList.add('open');
  $modal.classList.add('open');
  document.body.style.overflow = 'hidden';

  // 滚动到顶部
  $modal.scrollTop = 0;

  // 向下滑动关闭
  bindModalSwipeDown();
}

function closeDetail() {
  $modalOverlay.classList.remove('open');
  $modal.classList.remove('open');
  document.body.style.overflow = '';
  currentChunk = null;
}

function renderDetail() {
  if (!currentChunk) return;

  $modalChinese.textContent = currentChunk.chinese;

  // 渲染卡片
  $cardContainer.innerHTML = `
    <div class="cards-wrapper" id="cardsWrapper" style="transform: translateX(-${currentExprIndex * 100}%)">
      ${currentChunk.expressions.map((expr, i) => `
        <div class="expression-card">
          <div class="expr-text">${expr.text}</div>
          <div class="expr-badge-row">
            <span class="expr-probability ${getProbClass(expr.usageProbability)}">
              ${expr.usageProbability}% 的美国人这么说
            </span>
            <span class="expr-tone">${getToneLabel(expr.tone)}</span>
          </div>
          <div class="card-index">${i + 1} / ${currentChunk.expressions.length}</div>
        </div>
      `).join('')}
    </div>
  `;

  // 滑动指示点
  $swipeDots.innerHTML = currentChunk.expressions.map((_, i) =>
    `<div class="swipe-dot ${i === currentExprIndex ? 'active' : ''}"></div>`
  ).join('');

  // 场景说明
  updateContext();

  // 已学按钮状态
  updateLearnedButton();

  // 绑定触摸事件
  bindCardSwipe();
}

function getProbClass(prob) {
  if (prob >= 70) return 'high';
  if (prob >= 20) return 'medium';
  return 'low';
}

function getToneLabel(tone) {
  const map = {
    casual: '💬 随和',
    neutral: '👔 中性',
    formal: '🎩 正式',
    slang: '😎 俚语'
  };
  return map[tone] || tone;
}

function updateContext() {
  if (!currentChunk) return;
  const expr = currentChunk.expressions[currentExprIndex];
  $modalContext.textContent = `💡 ${expr.context}`;
}

function updateLearnedButton() {
  if (!currentChunk) return;
  const isLearned = learnedSet.has(currentChunk.id);
  $btnLearned.textContent = isLearned ? '✅ 已学过' : '✅ 标记已学';
  $btnLearned.classList.toggle('done', isLearned);
}

// ========== 视频 ==========
function updateVideo() {
  if (!currentChunk) return;
  const expr = currentChunk.expressions[currentExprIndex];
  const video = expr.video;

  if (video && video.bvid) {
    $videoContainer.classList.remove('no-video');
    const t = video.startTime || 0;
    $videoWrapper.innerHTML = `<iframe
      src="https://player.bilibili.com/player.html?bvid=${video.bvid}&page=1&t=${t}&autoplay=0&high_quality=1&danmaku=0"
      scrolling="no"
      border="0"
      frameborder="no"
      framespacing="0"
      allowfullscreen="true"
      referrerpolicy="no-referrer"
      sandbox="allow-scripts allow-same-origin allow-popups"
    ></iframe>`;
    $videoSource.textContent = `📺 ${video.title || 'B站视频'} · 从 ${formatTime(t)} 开始`;
  } else {
    $videoContainer.classList.add('no-video');
    $videoWrapper.innerHTML = '';
    $videoSource.textContent = '这个表达还没有视频，去 B 站找一个？';
  }
}

function formatTime(seconds) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}分${s}秒`;
}

// ========== 卡片滑动 ==========
function bindCardSwipe() {
  const wrapper = document.getElementById('cardsWrapper');
  if (!wrapper) return;

  wrapper.addEventListener('touchstart', (e) => {
    touchStartX = e.changedTouches[0].screenX;
  }, { passive: true });

  wrapper.addEventListener('touchend', (e) => {
    touchEndX = e.changedTouches[0].screenX;
    handleSwipe();
  });

  // 鼠标拖动支持（桌面端）
  let mouseDown = false;
  wrapper.addEventListener('mousedown', (e) => {
    mouseDown = true;
    touchStartX = e.screenX;
  });
  wrapper.addEventListener('mouseup', (e) => {
    if (mouseDown) {
      touchEndX = e.screenX;
      handleSwipe();
      mouseDown = false;
    }
  });
  wrapper.addEventListener('mouseleave', () => {
    mouseDown = false;
  });
}

function handleSwipe() {
  if (!currentChunk) return;
  const diff = touchStartX - touchEndX;
  const threshold = 60; // 滑动阈值

  if (Math.abs(diff) < threshold) return;

  if (diff > 0 && currentExprIndex < currentChunk.expressions.length - 1) {
    // 左滑 → 下一个表达
    currentExprIndex++;
    updateCardPosition();
  } else if (diff < 0 && currentExprIndex > 0) {
    // 右滑 → 上一个表达
    currentExprIndex--;
    updateCardPosition();
  }
}

function bindModalSwipeDown() {
  $modal.addEventListener('touchstart', (e) => {
    touchStartY = e.changedTouches[0].screenY;
  }, { passive: true });

  $modal.addEventListener('touchend', (e) => {
    touchEndY = e.changedTouches[0].screenY;
    // 只在顶部且向下滑动时关闭
    if ($modal.scrollTop <= 10 && touchEndY - touchStartY > 80) {
      closeDetail();
    }
  });
}

function updateCardPosition() {
  const wrapper = document.getElementById('cardsWrapper');
  if (wrapper) {
    wrapper.style.transform = `translateX(-${currentExprIndex * 100}%)`;
  }

  // 更新指示点
  const dots = $swipeDots.querySelectorAll('.swipe-dot');
  dots.forEach((d, i) => d.classList.toggle('active', i === currentExprIndex));

  // 更新场景说明
  updateContext();

  // 更新视频
  updateVideo();
}

// ========== 事件绑定 ==========
function bindEvents() {
  // 搜索
  $searchInput.addEventListener('input', () => {
    searchQuery = $searchInput.value;
    $searchClear.style.display = searchQuery ? 'flex' : 'none';
    renderList();
  });

  $searchClear.addEventListener('click', () => {
    $searchInput.value = '';
    searchQuery = '';
    $searchClear.style.display = 'none';
    renderList();
    $searchInput.focus();
  });

  // 分类
  document.querySelectorAll('.cat-tag').forEach(tag => {
    tag.addEventListener('click', () => {
      document.querySelectorAll('.cat-tag').forEach(t => t.classList.remove('active'));
      tag.classList.add('active');
      currentFilter = tag.dataset.cat;
      renderList();
    });
  });

  // 关闭弹窗
  $modalClose.addEventListener('click', closeDetail);
  $modalOverlay.addEventListener('click', (e) => {
    if (e.target === $modalOverlay) closeDetail();
  });

  // 标记已学
  $btnLearned.addEventListener('click', () => {
    if (!currentChunk) return;
    if (learnedSet.has(currentChunk.id)) {
      learnedSet.delete(currentChunk.id);
      showToast('已取消标记');
    } else {
      learnedSet.add(currentChunk.id);
      showToast('🎉 已标记为学过！');
    }
    localStorage.setItem('chunktalk_learned', JSON.stringify([...learnedSet]));
    updateLearnedButton();
    renderList();
  });

  // 复制表达
  $btnShare.addEventListener('click', () => {
    if (!currentChunk) return;
    const expr = currentChunk.expressions[currentExprIndex];
    const text = `${currentChunk.chinese}\n→ ${expr.text}\n\n💡 ${expr.context}`;
    navigator.clipboard.writeText(text).then(() => {
      showToast('📋 已复制到剪贴板！');
    }).catch(() => {
      showToast('复制失败，请手动复制');
    });
  });

  // ESC 关闭
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeDetail();
    if (e.key === 'ArrowRight' && currentChunk && currentExprIndex < currentChunk.expressions.length - 1) {
      currentExprIndex++;
      updateCardPosition();
    }
    if (e.key === 'ArrowLeft' && currentChunk && currentExprIndex > 0) {
      currentExprIndex--;
      updateCardPosition();
    }
  });
}

// ========== Toast ==========
function showToast(msg) {
  $toast.textContent = msg;
  $toast.classList.add('show');
  clearTimeout($toast._timeout);
  $toast._timeout = setTimeout(() => {
    $toast.classList.remove('show');
  }, 2000);
}

// ========== 启动 ==========
init();
