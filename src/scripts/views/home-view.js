import L from 'leaflet';

const HomeView = {
  init(container) {
    container.innerHTML = this.getTemplate();

    this.root = container;
    this.list = container.querySelector('#story-list');
    this.mapContainer = container.querySelector('#map');
    this.savedStoriesBtn = container.querySelector('#view-saved-stories');
    this.errorContainer = container.querySelector('#error-message');
    this.offlineContainer = container.querySelector('#offline-message');

    this.addClearButton();
    this.addCheckIDBButton();
    this._updateOfflineStatus();
  },

  getTemplate() {
    return `
      <section class="container">
        <h1>Semua Cerita</h1>
        <div id="error-message" class="error-message" style="display: none;"></div>
        <div id="offline-message" class="offline-message" style="display: none;">
          <p>Anda sedang offline. Beberapa fitur mungkin tidak tersedia.</p>
        </div>
        <div id="map"></div>
        <div class="story-actions">
          <button id="view-saved-stories">Lihat Cerita Tersimpan</button>
          <button id="check-idb" class="check-idb-btn">Cek Status IndexedDB</button>
        </div>
        <div id="story-list" class="story-list"></div>
        <button id="clear-idb">Hapus Data Offline</button>
      </section>
    `;
  },

  showStories(stories) {
    if (!stories || !stories.length) {
      this.list.innerHTML = '<p class="no-stories">Tidak ada cerita tersedia.</p>';
      return;
    }

    this.list.innerHTML = stories.map(story => this.renderItem(story, story.isSaved || false)).join('');
    this.attachStoryEvents();
    this.initializeMap(stories);
  },

  showError(message) {
    if (!this.errorContainer) return;

    this.errorContainer.textContent = message;
    this.errorContainer.style.display = 'block';
  },

  hideError() {
    if (!this.errorContainer) return;

    this.errorContainer.textContent = '';
    this.errorContainer.style.display = 'none';
  },

  _updateOfflineStatus() {
    const isOffline = !navigator.onLine;
    if (this.offlineContainer) {
      this.offlineContainer.style.display = isOffline ? 'block' : 'none';
    }
  },

  renderItem(story, isSaved = false) {
    const saveButtonIcon = isSaved ? 'fas fa-bookmark' : 'far fa-bookmark';
    const saveButtonText = isSaved ? 'Tersimpan' : 'Simpan';

    return `
      <article class="story-card" data-id="${story.id}" tabindex="0">
        <img src="${story.photoUrl}" alt="Foto untuk cerita ${story.description}" class="story-image">
        <div class="story-content">
          <h2>${story.name}</h2>
          <p>${story.description}</p>
          <div class="story-meta">
            <span class="story-date">${new Date(story.createdAt).toLocaleDateString()}</span>
            <button class="save-story-btn" data-id="${story.id}" data-story='${JSON.stringify(story)}'>
              <i class="${saveButtonIcon}"></i> ${saveButtonText}
            </button>
          </div>
        </div>
      </article>
    `;
  },

  initializeMap(stories) {
    if (!this.mapContainer || !stories.length) return;

    const map = L.map(this.mapContainer).setView([-2.548926, 118.014863], 5);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors',
    }).addTo(map);

    stories.forEach((story) => {
      if (story.lat && story.lon) {
        const marker = L.marker([story.lat, story.lon]).addTo(map);
        marker.bindPopup(`
          <h4>${story.name}</h4>
          <p>${story.description}</p>
          <img src="${story.photoUrl}" alt="Story image" style="max-width: 200px;">
        `);
      }
    });
  },

  attachStoryEvents() {
    this.root.querySelectorAll('.story-card').forEach((card) => {
      const id = card.dataset.id;
      card.addEventListener('click', (e) => {
        if (e.target.classList.contains('save-story-btn')) return;
        if (id) window.location.hash = `#/detail/${id}`;
      });
      card.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
          if (id) window.location.hash = `#/detail/${id}`;
        }
      });
    });

    this.root.querySelectorAll('.save-story-btn').forEach((btn) => {
      btn.addEventListener('click', async (e) => {
        e.preventDefault();
        e.stopPropagation();

        const storyId = btn.dataset.id;
        
        // Emit custom event untuk presenter handle
        const event = new CustomEvent('story-bookmark-toggle', {
          detail: { storyId }
        });
        document.dispatchEvent(event);
      });
    });

    this.savedStoriesBtn?.addEventListener('click', () => {
      window.location.hash = '#/saved';
    });
  },

  _showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = message;

    document.body.appendChild(notification);
    setTimeout(() => {
      notification.remove();
    }, 3000);
  },

  addCheckIDBButton() {
    const checkBtn = document.getElementById('check-idb');
    if (!checkBtn) return;

    checkBtn.addEventListener('click', () => {
      // Emit custom event untuk presenter handle
      const event = new CustomEvent('check-idb-status');
      document.dispatchEvent(event);
    });
  },

  addClearButton() {
    const btn = document.getElementById('clear-idb');
    if (!btn) return;

    const isOffline = !navigator.onLine;
    btn.style.display = isOffline ? 'none' : 'block';
  },
};

export default HomeView;
