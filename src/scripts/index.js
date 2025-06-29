import '../styles/styles.css';

import App from './pages/app.js';
import { logoutUser } from './utils/auth.js';
import { subscribeUserToPush, unsubscribeUserFromPush } from './utils/push.js';
import { deleteDB } from 'idb';

let swRegistration = null;
let setupTimeout = null;

async function clearBrowserData() {
  try {
    const registrations = await navigator.serviceWorker.getRegistrations();
    for (const registration of registrations) {
      await registration.unregister();
    }

    const cacheNames = await caches.keys();
    await Promise.all(cacheNames.map((name) => caches.delete(name)));

    await deleteDB('story-app-db');

    console.log('Browser data cleared successfully');
  } catch (error) {
    console.error('Error clearing browser data:', error);
  }
}

async function initializeServiceWorker() {
  if (!('serviceWorker' in navigator)) {
    console.log('Service Worker not supported');
    hideNotificationButtons();
    return;
  }

  try {
    swRegistration = await navigator.serviceWorker.register('/sw.js', {
      scope: '/',
      updateViaCache: 'none'
    });
    console.log('Service Worker registered:', swRegistration);

    // Pastikan service worker benar-benar ready
    await navigator.serviceWorker.ready;
    console.log('Service Worker is ready');
    
    // Tunggu sebentar untuk Edge agar push manager siap
    if (navigator.userAgent.includes('Edg')) {
      await new Promise(resolve => setTimeout(resolve, 200));
    }

    if (Notification.permission === 'default') {
      await Notification.requestPermission();
    }

    setupNotificationButtons();
  } catch (error) {
    console.error('Service Worker registration failed:', error);
    hideNotificationButtons();
  }
}

document.addEventListener('DOMContentLoaded', async () => {
  const app = new App({
    content: document.querySelector('#main-content'),
    drawerButton: document.querySelector('#drawer-button'),
    navigationDrawer: document.querySelector('#navigation-drawer'),
  });

  await app.renderPage();
  toggleLogoutLink();
  await initializeServiceWorker();

  document.getElementById('skip-link')?.addEventListener('click', (e) => {
    e.preventDefault();
    const content = document.getElementById('content');
    content?.focus();
  });

  window.addEventListener('hashchange', async () => {
    await app.renderPage();
    toggleLogoutLink();
  });
});

function showNotification(message, type = 'info') {
  const notification = document.createElement('div');
  notification.className = `notification ${type}`;
  notification.textContent = message;
  document.body.appendChild(notification);

  setTimeout(() => {
    notification.classList.add('fade-out');
    setTimeout(() => notification.remove(), 300);
  }, 3000);
}

function setupNotificationButtons() {
  console.log('setupNotificationButtons called');
  
  // Clear timeout sebelumnya jika ada (debouncing)
  if (setupTimeout) {
    clearTimeout(setupTimeout);
    console.log('Cleared previous setup timeout');
  }
  
  // Delay setup yang lebih lama untuk Edge
  const setupDelay = navigator.userAgent.includes('Edg') ? 300 : 100;
  console.log('Setting up notification buttons with setup delay:', setupDelay);
  
  setupTimeout = setTimeout(() => {
    doSetupNotificationButtons();
  }, setupDelay);
}

function doSetupNotificationButtons() {
  console.log('doSetupNotificationButtons called');
  const subscribeLink = document.getElementById('link-subscribe-push');
  const testPushLink = document.getElementById('link-test-push');

  console.log('Elements found - subscribe:', !!subscribeLink, 'test:', !!testPushLink, 'swRegistration:', !!swRegistration);

  if (!subscribeLink || !testPushLink || !swRegistration) {
    console.log('Missing required elements or swRegistration, hiding buttons');
    hideNotificationButtons();
    return;
  }
  
  console.log('All elements available, proceeding with setup');

  // Jangan langsung hide tombol, biarkan updateButtonState yang menentukan
  
  async function updateButtonState() {
    try {
      console.log('updateButtonState called, swRegistration:', !!swRegistration);
      
      // Tambahkan delay yang lebih lama untuk Edge
      if (navigator.userAgent.includes('Edg')) {
        console.log('Edge detected, adding delay');
        await new Promise(resolve => setTimeout(resolve, 300));
      }
      
      if (!swRegistration || !swRegistration.pushManager) {
        console.log('No swRegistration or pushManager available');
        hideNotificationButtons();
        return;
      }
      
      const subscription = await swRegistration.pushManager.getSubscription();
      const permission = Notification.permission;
      
      console.log('Permission:', permission, 'Subscription:', !!subscription);

      if (permission === 'denied') {
        console.log('Permission denied, hiding buttons');
        hideNotificationButtons();
        return;
      }

      if (subscription) {
        console.log('User subscribed, showing test button');
        subscribeLink.style.display = 'none';
        testPushLink.style.display = 'block';
      } else {
        console.log('User not subscribed, showing subscribe button');
        subscribeLink.style.display = 'block';
        testPushLink.style.display = 'none';
      }
    } catch (error) {
      console.error('Error checking subscription:', error);
      hideNotificationButtons();
    }
  }

  // Gunakan setTimeout dengan delay yang lebih lama untuk Edge
  const delay = navigator.userAgent.includes('Edg') ? 200 : 50;
  console.log('Setting up notification buttons with delay:', delay);
  setTimeout(() => {
    updateButtonState();
  }, delay);

  subscribeLink.addEventListener('click', async (e) => {
    e.preventDefault();
    e.stopPropagation();

    try {
      if (!localStorage.getItem('token')) {
        showNotification('Silakan login terlebih dahulu', 'error');
        return;
      }

      await subscribeUserToPush(swRegistration);
      await updateButtonState();
      showNotification('Berhasil mengaktifkan notifikasi!', 'success');
    } catch (error) {
      console.error('Failed to subscribe:', error);
      showNotification(
        error.message || 'Gagal mengaktifkan notifikasi. Silakan coba lagi.',
        'error'
      );
      await updateButtonState();
    }
  });

  testPushLink.addEventListener('click', async (e) => {
    e.preventDefault();
    e.stopPropagation();

    try {
      if (!localStorage.getItem('token')) {
        showNotification('Silakan login terlebih dahulu', 'error');
        return;
      }

      const registration = await navigator.serviceWorker.ready;
      await registration.showNotification('Test Notification', {
        body: 'Ini adalah test notifikasi dari Story App!',
        icon: '/images/app-icon.png',
        badge: '/images/app-icon.png',
        vibrate: [100, 50, 100],
        data: {
          dateOfArrival: Date.now(),
          primaryKey: 1,
          url: window.location.href,
        },
        actions: [
          {
            action: 'explore',
            title: 'Lihat Aplikasi',
          },
          {
            action: 'close',
            title: 'Tutup',
          },
        ],
      });

      showNotification('Test notifikasi berhasil dikirim!', 'success');
    } catch (error) {
      console.error('Failed to send test notification:', error);
      showNotification('Gagal mengirim test notifikasi. Silakan coba lagi.', 'error');
    }
  });

  if ('permissions' in navigator) {
    navigator.permissions.query({ name: 'notifications' }).then((permissionStatus) => {
      permissionStatus.onchange = () => {
        updateButtonState();
      };
    });
  }
}

function hideNotificationButtons() {
  console.log('hideNotificationButtons called');
  const subscribeLink = document.getElementById('link-subscribe-push');
  const testPushLink = document.getElementById('link-test-push');

  if (subscribeLink) {
    subscribeLink.style.display = 'none';
    console.log('Subscribe button hidden');
  }
  if (testPushLink) {
    testPushLink.style.display = 'none';
    console.log('Test push button hidden');
  }
}

function toggleLogoutLink() {
  const navList = document.querySelector('.nav-list');
  const existingLogout = document.querySelector('#logout-link');
  const addLink = document.querySelector('a[href="#/add"]');
  const loginLink = document.querySelector('a[href="#/login"]');
  const registerLink = document.querySelector('a[href="#/register"]');
  const token = localStorage.getItem('token');

  if (token) {
    if (!existingLogout) {
      const li = document.createElement('li');
      const a = document.createElement('a');
      a.href = '#';
      a.textContent = 'Logout';
      a.id = 'logout-link';

      a.addEventListener('click', (e) => {
        e.preventDefault();
        logoutUser();
      });

      li.appendChild(a);
      navList.appendChild(li);
    }

    if (addLink) addLink.style.display = 'inline-block';
    if (loginLink) loginLink.style.display = 'none';
    if (registerLink) registerLink.style.display = 'none';
  } else {
    if (existingLogout) existingLogout.parentElement.remove();
    if (addLink) addLink.style.display = 'none';
    if (loginLink) loginLink.style.display = 'inline-block';
    if (registerLink) registerLink.style.display = 'inline-block';
  }
}

if (window.location.hostname !== 'localhost') {
  window.addEventListener('load', initializeServiceWorker);
}
