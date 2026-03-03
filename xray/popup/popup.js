const scrapeBtn = document.getElementById('scrapeBtn');
const exportBtn = document.getElementById('exportBtn');
const statsCard = document.getElementById('statsCard');
const progressContainer = document.getElementById('progressContainer');
const progressFill = document.getElementById('progressFill');
const progressText = document.getElementById('progressText');
const statusDot = document.querySelector('.status-dot');
const statusTextEl = document.querySelector('.status-text');
const statusHint = document.querySelector('.status-hint');
const postsCount = document.getElementById('postsCount');
const totalLikes = document.getElementById('totalLikes');
const totalViews = document.getElementById('totalViews');

let scrapedData = [];

async function checkPage() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  const isTwitter = tab.url.includes('twitter.com') || tab.url.includes('x.com');
  if (!isTwitter) {
    statusDot.classList.add('error');
    statusTextEl.textContent = 'Not on Twitter/X';
    statusHint.textContent = 'Navigate to a profile to scan';
    scrapeBtn.disabled = true;
  }
  return isTwitter;
}

function setScanning(isScanning) {
  if (isScanning) {
    scrapeBtn.disabled = true;
    scrapeBtn.innerHTML = '<span class="btn-icon">◌</span> Scanning...';
    statusDot.classList.add('scanning');
    statusTextEl.textContent = 'Scanning posts...';
    progressContainer.style.display = 'block';
  } else {
    scrapeBtn.disabled = false;
    scrapeBtn.innerHTML = '<span class="btn-icon">⊙</span> Scan Posts';
    statusDot.classList.remove('scanning');
  }
}

function updateProgress(current, total) {
  const percent = Math.round((current / total) * 100);
  progressFill.style.width = percent + '%';
  progressText.textContent = 'Scanned ' + current + ' of ' + total + ' posts';
}

function updateStats(data) {
  postsCount.textContent = data.length;
  const likes = data.reduce((sum, post) => sum + (post.likes || 0), 0);
  const views = data.reduce((sum, post) => sum + (post.views || 0), 0);
  totalLikes.textContent = formatNumber(likes);
  totalViews.textContent = formatNumber(views);
  statsCard.style.display = 'block';
  statsCard.classList.add('fade-in');
}

function formatNumber(num) {
  if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
  if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
  return num.toString();
}

function exportCSV(data) {
  const headers = ['timestamp', 'text', 'likes', 'retweets', 'replies', 'views', 'bookmarks', 'media_type', 'url'];
  const rows = data.map(row => {
    return headers.map(h => {
      let val = row[h] || '';
      if (typeof val === 'string') {
        val = val.replace(/"/g, '""');
        if (val.includes(',') || val.includes('\n')) {
          val = '"' + val + '"';
        }
      }
      return val;
    }).join(',');
  });
  const csvContent = [headers.join(','), ...rows].join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'xray-export-' + Date.now() + '.csv';
  a.click();
  URL.revokeObjectURL(url);
}

scrapeBtn.addEventListener('click', async () => {
  const isTwitter = await checkPage();
  if (!isTwitter) return;
  setScanning(true);
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  chrome.tabs.sendMessage(tab.id, { action: 'scrape' }, (response) => {
    setScanning(false);
    if (chrome.runtime.lastError) {
      statusDot.classList.add('error');
      statusTextEl.textContent = 'Error scanning';
      statusHint.textContent = 'Refresh the page and try again';
      return;
    }
    if (response && response.data) {
      scrapedData = response.data;
      updateStats(scrapedData);
      exportBtn.disabled = false;
      statusTextEl.textContent = 'Scan complete';
      statusHint.textContent = 'Found ' + scrapedData.length + ' posts';
      progressContainer.style.display = 'none';
    }
  });
});

exportBtn.addEventListener('click', () => {
  if (scrapedData.length > 0) exportCSV(scrapedData);
});

chrome.runtime.onMessage.addListener((message) => {
  if (message.action === 'progress') updateProgress(message.current, message.total);
});

checkPage();
