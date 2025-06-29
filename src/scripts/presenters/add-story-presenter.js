import AddStoryView from '../views/add-story-view.js';
import StoryModel from '../models/story-model.js';

const AddStoryPresenter = {
  latlng: null,

  async init(container) {
    await AddStoryView.init(container);

    if (!AddStoryView.hasCameraAccess()) {
      AddStoryView.showError('Pastikan browser memiliki izin kamera.');
      return;
    }

    AddStoryView.setMap([-2.5, 118], (latlng) => {
      this.latlng = latlng;
    });

    AddStoryView.onSubmit(async ({ description, photo }) => {
      if (!this.latlng) {
        AddStoryView.showError('Silakan pilih lokasi di peta.');
        return;
      }

      try {
        const result = await StoryModel.post({
          description,
          photo,
          lat: this.latlng.lat,
          lon: this.latlng.lng,
        });

        // Send message to service worker to show push notification
        if ('serviceWorker' in navigator) {
          const registration = await navigator.serviceWorker.ready;
          if (registration.active) {
            registration.active.postMessage({
              type: 'SHOW_STORY_NOTIFICATION',
              data: {
                title: 'Story App',
                body: 'Cerita baru berhasil ditambahkan!',
                icon: '/images/app-icon.png',
                badge: '/images/app-icon.png',
                tag: 'story-added'
              }
            });
          }
        }

        AddStoryView.cleanup();
        AddStoryView.showSuccess('Cerita berhasil ditambahkan!');
        AddStoryView.goTo('/');
      } catch (error) {
        AddStoryView.showError(error.message);
      }
    });
  },
  destroy() {
    AddStoryView.cleanup();
  },
};

export default AddStoryPresenter;
