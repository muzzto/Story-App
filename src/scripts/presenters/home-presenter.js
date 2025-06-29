import StoryModel from '../models/story-model.js';
import HomeView from '../views/home-view.js';
import { getAllStories, saveStory, unsaveStory, isStorySaved, checkIndexedDBStatus } from '../utils/idb.js';
import storySync from '../utils/story-sync.js';

const HomePresenter = {
  async init(container) {
    HomeView.init(container);
    this._initializeEvents();

    try {
      const stories = await StoryModel.getAll();
      await storySync.syncStories(stories);
      const storiesWithSaveStatus = await this._addSaveStatusToStories(stories);
      HomeView.showStories(storiesWithSaveStatus);
    } catch (error) {
      console.error('Error fetching stories:', error);
      const offlineStories = await getAllStories();
      
      if (offlineStories.length) {
        const storiesWithSaveStatus = await this._addSaveStatusToStories(offlineStories);
        HomeView.showStories(storiesWithSaveStatus);
        HomeView.showError(
          'Kamu sedang offline. Menampilkan data dari penyimpanan lokal.'
        );
      } else {
        HomeView.showError('Tidak bisa mengambil data, cek koneksi kamu!');
      }
    }
  },

  _initializeEvents() {
    window.addEventListener('stories-updated', async (event) => {
      const stories = event.detail.stories;
      if (stories && stories.length) {
        const storiesWithSaveStatus = await this._addSaveStatusToStories(stories);
        HomeView.showStories(storiesWithSaveStatus);
      }
    });

    document.addEventListener('story-bookmark-toggle', async (event) => {
      await this._handleBookmarkToggle(event.detail.storyId);
    });

    document.addEventListener('check-idb-status', async () => {
      await this._handleCheckIDBStatus();
    });

    window.addEventListener('online', () => {
      this._handleOnlineStatus(true);
    });

    window.addEventListener('offline', () => {
      this._handleOnlineStatus(false);
    });
  },

  async _handleOnlineStatus(isOnline) {
    if (isOnline) {
      try {
        const stories = await StoryModel.getAll();
        await storySync.syncStories(stories);
        const storiesWithSaveStatus = await this._addSaveStatusToStories(stories);
        HomeView.showStories(storiesWithSaveStatus);
        HomeView.hideError();
      } catch (error) {
        console.error('Error fetching stories when back online:', error);
      }
    } else {
      const offlineStories = await getAllStories();
      if (offlineStories.length) {
        const storiesWithSaveStatus = await this._addSaveStatusToStories(offlineStories);
        HomeView.showStories(storiesWithSaveStatus);
        HomeView.showError(
          'Kamu sedang offline. Menampilkan data dari penyimpanan lokal.'
        );
      }
    }
  },

  async _addSaveStatusToStories(stories) {
    const storiesWithSaveStatus = await Promise.all(
      stories.map(async (story) => {
        const isSaved = await isStorySaved(story.id);
        return { ...story, isSaved };
      })
    );
    return storiesWithSaveStatus;
  },

  async _handleBookmarkToggle(storyId) {
    try {
      const isSaved = await isStorySaved(storyId);
      
      if (isSaved) {
         await unsaveStory(storyId);
         HomeView._showNotification('Cerita dihapus dari tersimpan', 'info');
       } else {
         // Get story data from current stories
         const stories = await StoryModel.getAll();
         const story = stories.find(s => s.id === storyId);
         if (story) {
           await saveStory(story);
           HomeView._showNotification('Cerita berhasil disimpan', 'success');
         }
       }
       
       // Refresh stories to update bookmark status
       const updatedStories = await StoryModel.getAll();
       const storiesWithSaveStatus = await this._addSaveStatusToStories(updatedStories);
       HomeView.showStories(storiesWithSaveStatus);
     } catch (error) {
        console.error('Error handling bookmark toggle:', error);
        HomeView._showNotification('Gagal menyimpan cerita', 'error');
      }
    },

    async _handleCheckIDBStatus() {
      try {
        const status = await checkIndexedDBStatus();
        let message = '';

        if (status.isAvailable) {
          message = `Status IndexedDB:
- Database: ${status.dbName} (v${status.dbVersion})
- Jumlah Cerita Tersimpan: ${status.savedStoriesCount}
- Jumlah Cerita Offline: ${status.offlineStoriesCount}`;
        } else {
          message = `IndexedDB tidak tersedia: ${status.error}`;
        }

        alert(message);
      } catch (error) {
        alert('Gagal mengecek status IndexedDB');
      }
    }
  };

export default HomePresenter;
