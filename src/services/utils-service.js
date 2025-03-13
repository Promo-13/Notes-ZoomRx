// utils-service.js - Utility functions for the application

/*
 Toast notification service for providing user feedback
*/
export class NotificationService {
    constructor() {
      this.toastContainer = null;
      this.initToastContainer();
    }
  
    initToastContainer() {
      // Create the container if it doesn't exist
      if (!document.getElementById('toast-container')) {
        this.toastContainer = document.createElement('div');
        this.toastContainer.id = 'toast-container';
        this.toastContainer.className = 'toast-container';
        document.body.appendChild(this.toastContainer);
        
        // Add the styles for toast notifications
        const style = document.createElement('style');
        style.textContent = `
          .toast-container {
            position: fixed;
            bottom: 20px;
            right: 20px;
            z-index: 9999;
            display: flex;
            flex-direction: column;
            gap: 10px;
          }
          .toast {
            padding: 12px 20px;
            border-radius: 4px;
            color: white;
            font-weight: 500;
            max-width: 350px;
            box-shadow: 0 3px 6px rgba(0, 0, 0, 0.16);
            animation: fade-in 0.3s ease-in-out;
            display: flex;
            align-items: center;
            justify-content: space-between;
          }
          .toast-error {
            background-color: #f44336;
          }
          .toast-success {
            background-color: #4caf50;
          }
          .toast-info {
            background-color: #2196f3;
          }
          .toast-warning {
            background-color: #ff9800;
          }
          .toast i {
            margin-right: 10px;
          }
          .toast-close {
            background: none;
            border: none;
            color: white;
            margin-left: 10px;
            cursor: pointer;
            font-size: 18px;
          }
          @keyframes fade-in {
            from { opacity: 0; transform: translateY(20px); }
            to { opacity: 1; transform: translateY(0); }
          }
          @keyframes fade-out {
            from { opacity: 1; transform: translateY(0); }
            to { opacity: 0; transform: translateY(20px); }
          }
        `;
        document.head.appendChild(style);
      } else {
        this.toastContainer = document.getElementById('toast-container');
      }
    }
  
    /**
     * Show a toast notification
     * @param {string} message - The message to display
     * @param {string} type - The type of notification (error, success, info, warning)
     * @param {number} duration - How long to display the notification in ms
     */
    showToast(message, type = 'info', duration = 3000) {
      const toast = document.createElement('div');
      toast.className = `toast toast-${type}`;
      
      let icon;
      switch(type) {
        case 'error':
          icon = 'fa-circle-exclamation';
          break;
        case 'success':
          icon = 'fa-check-circle';
          break;
        case 'warning':
          icon = 'fa-triangle-exclamation';
          break;
        default:
          icon = 'fa-info-circle';
      }
      
      toast.innerHTML = `
        <div>
          <i class="fas ${icon}"></i>
          <span>${message}</span>
        </div>
        <button class="toast-close" aria-label="Close notification">
          <i class="fas fa-times"></i>
        </button>
      `;
      
      // Add close button functionality
      const closeBtn = toast.querySelector('.toast-close');
      closeBtn.addEventListener('click', () => {
        this.removeToast(toast);
      });
      
      this.toastContainer.appendChild(toast);
      
      // Auto remove after duration
      if (duration > 0) {
        setTimeout(() => {
          this.removeToast(toast);
        }, duration);
      }
      
      return toast;
    }
    
    /**
     * Remove a toast from the container with animation
     * @param {HTMLElement} toast - The toast element to remove
     */
    removeToast(toast) {
      toast.style.animation = 'fade-out 0.3s forwards';
      setTimeout(() => {
        if (toast.parentNode === this.toastContainer) {
          this.toastContainer.removeChild(toast);
        }
      }, 300);
    }
    
    /**
     * Show an error notification
     * @param {string} message - The error message
     * @param {number} duration - How long to display the notification
     */
    error(message, duration = 3000) {
      return this.showToast(message, 'error', duration);
    }
    
    /**
     * Show a success notification
     * @param {string} message - The success message
     * @param {number} duration - How long to display the notification
     */
    success(message, duration = 3000) {
      return this.showToast(message, 'success', duration);
    }
    
    /**
     * Show an info notification
     * @param {string} message - The info message
     * @param {number} duration - How long to display the notification
     */
    info(message, duration = 3000) {
      return this.showToast(message, 'info', duration);
    }
    
    /**
     * Show a warning notification
     * @param {string} message - The warning message
     * @param {number} duration - How long to display the notification
     */
    warning(message, duration = 3000) {
      return this.showToast(message, 'warning', duration);
    }
  }
  
  // Singleton instance
  export const notificationService = new NotificationService();
  
  /**
   * Network service to detect online/offline status
   */
  export class NetworkService {
    constructor() {
      this.isOnline = navigator.onLine;
      this.listeners = [];
      
      window.addEventListener('online', () => {
        this.isOnline = true;
        this.notifyListeners();
      });
      
      window.addEventListener('offline', () => {
        this.isOnline = false;
        this.notifyListeners();
      });
    }
    
    /**
     * Add a listener for network status changes
     * @param {Function} listener - The callback function
     */
    addStatusListener(listener) {
      this.listeners.push(listener);
    }
    
    /**
     * Remove a listener
     * @param {Function} listener - The callback function to remove
     */
    removeStatusListener(listener) {
      this.listeners = this.listeners.filter(l => l !== listener);
    }
    
    /**
     * Notify all listeners of network status change
     */
    notifyListeners() {
      this.listeners.forEach(listener => listener(this.isOnline));
    }
  }
  
  // Singleton instance
  export const networkService = new NetworkService();