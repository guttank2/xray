function parseNumber(str) {
  if (!str) return 0;
  str = str.toLowerCase().replace(/,/g, '');
  if (str.includes('k')) return parseFloat(str) * 1000;
  if (str.includes('m')) return parseFloat(str) * 1000000;
  return parseInt(str) || 0;
}

function getPostData(article) {
  try {
    const textEl = article.querySelector('[data-testid="tweetText"]');
    const text = textEl ? textEl.innerText : '';
    const timeEl = article.querySelector('time');
    const timestamp = timeEl ? timeEl.getAttribute('datetime') : '';
    const linkEl = article.querySelector('a[href*="/status/"]');
    const url = linkEl ? 'https://x.com' + linkEl.getAttribute('href') : '';
    const metrics = { replies: 0, retweets: 0, likes: 0, views: 0, bookmarks: 0 };
    
    const replyBtn = article.querySelector('[data-testid="reply"]');
    if (replyBtn) {
      const span = replyBtn.querySelector('span[data-testid="app-text-transition-container"]');
      metrics.replies = span ? parseNumber(span.innerText) : 0;
    }
    const retweetBtn = article.querySelector('[data-testid="retweet"]');
    if (retweetBtn) {
      const span = retweetBtn.querySelector('span[data-testid="app-text-transition-container"]');
      metrics.retweets = span ? parseNumber(span.innerText) : 0;
    }
    const likeBtn = article.querySelector('[data-testid="like"]');
    if (likeBtn) {
      const span = likeBtn.querySelector('span[data-testid="app-text-transition-container"]');
      metrics.likes = span ? parseNumber(span.innerText) : 0;
    }
    const analyticsLink = article.querySelector('a[href*="/analytics"]');
    if (analyticsLink) {
      const span = analyticsLink.querySelector('span');
      metrics.views = span ? parseNumber(span.innerText) : 0;
    }
    const bookmarkBtn = article.querySelector('[data-testid="bookmark"]');
    if (bookmarkBtn) {
      const span = bookmarkBtn.querySelector('span[data-testid="app-text-transition-container"]');
      metrics.bookmarks = span ? parseNumber(span.innerText) : 0;
    }
    
    let mediaType = 'text';
    if (article.querySelector('[data-testid="tweetPhoto"]')) mediaType = 'image';
    if (article.querySelector('[data-testid="videoPlayer"]')) mediaType = 'video';
    if (article.querySelector('[data-testid="card.wrapper"]')) mediaType = 'link';
    
    return {
      timestamp,
      text: text.substring(0, 500),
      likes: metrics.likes,
      retweets: metrics.retweets,
      replies: metrics.replies,
      views: metrics.views,
      bookmarks: metrics.bookmarks,
      media_type: mediaType,
      url
    };
  } catch (e) {
    console.error('XRay: Error parsing post', e);
    return null;
  }
}

async function scrollAndCollect(maxPosts = 50) {
  const posts = new Map();
  let noNewPostsCount = 0;
  while (posts.size < maxPosts && noNewPostsCount < 3) {
    const articles = document.querySelectorAll('article[data-testid="tweet"]');
    const prevSize = posts.size;
    articles.forEach(article => {
      const data = getPostData(article);
      if (data && data.url && !posts.has(data.url)) {
        posts.set(data.url, data);
      }
    });
    if (posts.size === prevSize) {
      noNewPostsCount++;
    } else {
      noNewPostsCount = 0;
    }
    window.scrollBy(0, 800);
    await new Promise(r => setTimeout(r, 1000));
  }
  return Array.from(posts.values());
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'scrape') {
    scrollAndCollect(50).then(data => {
      sendResponse({ data });
    });
    return true;
  }
});

console.log('XRay: Content script loaded');
