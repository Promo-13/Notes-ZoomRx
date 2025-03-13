import { SERVER_URL } from "../../mocks/handlers.js";
import { networkService } from './utils-service.js';

/*
 Service to handle all API requests
*/
class ApiService {
  constructor() {
    this.SERVER_URL = SERVER_URL;
    this.isOnline = navigator.onLine;
    
    // Update online status when it changes
    networkService.addStatusListener((isOnline) => {
      this.isOnline = isOnline;
    });
  }

  /**
   * Generic API request method with error handling
   * @param {string} url - The API endpoint URL
   * @param {string} method - The HTTP method
   * @param {Object} body - The request body (for non-GET requests)
   * @returns {Promise<Object>} The API response
   */
  async request(url, method = 'GET', body = null) {
    // Don't try network requests when offline
    if (!this.isOnline) {
      return null;
    }
    
    try {
      const options = {
        method,
        headers: method !== 'GET' ? { 'Content-Type': 'application/json' } : {}
      };
      
      if (body && method !== 'GET') {
        options.body = JSON.stringify(body);
      }
      
      // Set a timeout to prevent hanging requests
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout
      options.signal = controller.signal;
      
      const response = await fetch(url, options);
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const errorMessage = errorData.error || `Request failed with status ${response.status}`;
        // Removed notification here to prevent duplicates
        throw new Error(errorMessage);
      }
      
      return await response.json();
    } catch (error) {
      // If the request was aborted due to timeout, show appropriate message
      if (error.name === 'AbortError') {
        const message = 'Request timed out. Please try again.';
        // Removed notification here to prevent duplicates
        console.error('Request timed out:', url);
      } else if (!error.message.includes('Request failed with status')) {
        // Only show generic error if it's not already handled above
        // Removed notification here to prevent duplicates
        console.error('API request error:', error);
      }
      
      return null;
    }
  }

  // Notes API methods
  
  /**
   * Fetch all notes
   * @returns {Promise<Array>} Array of notes
   */
  async getNotes() {
    const response = await this.request(`${this.SERVER_URL}/notes`);
    return response?.notes || [];
  }
  
  /**
   * Fetch all trash notes
   * @returns {Promise<Array>} Array of trash notes
   */
  async getTrashNotes() {
    const response = await this.request(`${this.SERVER_URL}/trash`);
    return response?.notes || [];
  }
  
  /**
   * Create a new note
   * @param {Object} noteData - The note data
   * @returns {Promise<Object>} The created note
   */
  async createNote(noteData) {
    const response = await this.request(`${this.SERVER_URL}/notes`, 'POST', noteData);
    // Removed notification here
    return response?.note;
  }
  
  /**
   * Update an existing note
   * @param {number} id - The note ID
   * @param {Object} updates - The properties to update
   * @returns {Promise<Object>} The updated note
   */
  async updateNote(id, updates) {
    const response = await this.request(`${this.SERVER_URL}/notes/${id}`, 'PATCH', updates);
    // Removed notification here
    return response?.note;
  }
  
  /**
   * Move a note to trash
   * @param {number} id - The note ID
   * @returns {Promise<boolean>} Success status
   */
  async moveToTrash(id) {
    // Changed from POST to PATCH as requested
    const response = await this.request(`${this.SERVER_URL}/notes/${id}/trash`, 'PATCH');
    // Removed notification here
    return !!response?.success;
  }
  
  /**
   * Restore a note from trash
   * @param {number} id - The note ID
   * @returns {Promise<boolean>} Success status
   */
  async restoreFromTrash(id) {
    const response = await this.request(`${this.SERVER_URL}/trash/${id}/restore`, 'POST');
    // Removed notification here
    return !!response?.success;
  }
  
  /**
   * Permanently delete a note
   * @param {number} id - The note ID
   * @returns {Promise<boolean>} Success status
   */
  async deletePermanently(id) {
    const response = await this.request(`${this.SERVER_URL}/trash/${id}`, 'DELETE');
    // Removed notification here
    return !!response?.success;
  }
  
  /**
   * Update note order
   * @param {Array<number>} noteIds - Array of note IDs in the desired order
   * @returns {Promise<boolean>} Success status
   */
  async updateNoteOrder(noteIds) {
    // Only send the IDs array instead of full notes objects
    const response = await this.request(`${this.SERVER_URL}/notes/sync`, 'POST', { noteIds });
    return !!response?.success;
  }
  
  /**
   * Sync all notes with the server
   * @param {Array<Object>} notes - Array of all notes
   * @returns {Promise<boolean>} Success status
   */
  async syncNotes(notes) {
    const response = await this.request(`${this.SERVER_URL}/notes/sync`, 'POST', { notes });
    return !!response?.success;
  }
}

// Export a singleton instance
export const apiService = new ApiService();