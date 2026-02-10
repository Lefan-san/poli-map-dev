<template>
  <div class="admin-panel" v-if="showAdmin">
    <!-- Admin Panel Container -->
    <div class="admin-overlay" @click="closeAdmin"></div>
    <div class="admin-modal">
      <!-- Header -->
      <div class="admin-header">
        <h2>Poli-Map Admin Dashboard</h2>
        <button @click="closeAdmin" class="close-btn">
          <i class="bi bi-x-lg"></i>
        </button>
      </div>

      <!-- Tabs -->
      <div class="admin-tabs">
        <button
          :class="['tab-btn', { active: activeTab === 'locations' }]"
          @click="activeTab = 'locations'"
        >
          Locations
        </button>
        <button
          :class="['tab-btn', { active: activeTab === 'images' }]"
          @click="activeTab = 'images'"
        >
          Images
        </button>
      </div>

      <!-- Content -->
      <div class="admin-content">
        <!-- Locations Tab -->
        <div v-if="activeTab === 'locations'" class="tab-content">
          <h3>Manage Locations</h3>
          
          <!-- Add New Location Form -->
          <div class="form-section">
            <h4>Add New Location</h4>
            <form @submit.prevent="addNewLocation">
              <div class="form-group">
                <label>Location Name *</label>
                <input v-model="newLocation.name" type="text" required />
              </div>
              <div class="form-group">
                <label>Description</label>
                <textarea v-model="newLocation.description"></textarea>
              </div>
              <div class="form-row">
                <div class="form-group">
                  <label>Latitude *</label>
                  <input v-model.number="newLocation.latitude" type="number" step="0.0001" required />
                </div>
                <div class="form-group">
                  <label>Longitude *</label>
                  <input v-model.number="newLocation.longitude" type="number" step="0.0001" required />
                </div>
              </div>
              <button type="submit" class="btn-primary" :disabled="loading">
                {{ loading ? 'Adding...' : 'Add Location' }}
              </button>
            </form>
          </div>

          <!-- Locations List -->
          <div class="list-section">
            <h4>Existing Locations ({{ locations.length }})</h4>
            <div class="locations-list">
              <div v-for="loc in locations" :key="loc.id" class="location-item">
                <div class="location-info">
                  <h5>{{ loc.name }}</h5>
                  <p>{{ loc.desc }}</p>
                  <small>{{ loc.coords[1] }}, {{ loc.coords[0] }}</small>
                  <p class="image-count">{{ loc.img?.length || 0 }} images</p>
                </div>
                <div class="location-actions">
                  <button @click="selectLocationForImages(loc)" class="btn-secondary">
                    <i class="bi bi-images"></i> Manage Images
                  </button>
                  <button @click="deleteLocationConfirm(loc.id)" class="btn-danger">
                    <i class="bi bi-trash"></i> Delete
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Images Tab -->
        <div v-if="activeTab === 'images'" class="tab-content">
          <h3>Manage Images</h3>
          
          <div v-if="!selectedLocation" class="no-selection">
            <p>Select a location from the Locations tab to manage its images.</p>
          </div>

          <div v-else>
            <div class="selected-location">
              <h4>{{ selectedLocation.name }}</h4>
              <button @click="selectedLocation = null" class="btn-text">← Back to locations</button>
            </div>

            <!-- Image Upload -->
            <div class="form-section">
              <h4>Upload Images</h4>
              <div class="upload-area" @dragover="dragOver = true" @dragleave="dragOver = false" @drop="handleDrop">
                <input
                  type="file"
                  multiple
                  accept="image/*"
                  @change="handleFileSelect"
                  ref="fileInput"
                  style="display: none"
                />
                <button type="button" @click="$refs.fileInput.click()" class="btn-primary">
                  <i class="bi bi-cloud-arrow-up"></i> Choose Images or Drag & Drop
                </button>
                <div v-if="selectedFiles.length > 0" class="file-list">
                  <p>{{ selectedFiles.length }} file(s) selected</p>
                  <ul>
                    <li v-for="file in selectedFiles" :key="file.name">{{ file.name }}</li>
                  </ul>
                  <button @click="uploadImages" class="btn-primary" :disabled="uploading">
                    {{ uploading ? 'Uploading...' : 'Upload Selected Images' }}
                  </button>
                </div>
              </div>
            </div>

            <!-- Images List -->
            <div class="list-section">
              <h4>Images for {{ selectedLocation.name }} ({{ selectedLocation.img?.length || 0 }})</h4>
              <div v-if="selectedLocation.img?.length === 0" class="empty-state">
                <p>No images yet. Upload your first image above!</p>
              </div>
              <div v-else class="images-grid">
                <div v-for="(img, idx) in selectedLocation.img" :key="idx" class="image-card">
                  <img :src="img" :alt="`Image ${idx + 1}`" />
                  <div class="image-actions">
                    <button @click="deleteImageConfirm(idx)" class="btn-danger-small">
                      <i class="bi bi-trash"></i>
                    </button>
                  </div>
                  <p class="image-order">{{ idx + 1 }}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Footer -->
      <div class="admin-footer">
        <button @click="closeAdmin" class="btn-secondary">Close</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import {
  fetchLocations,
  addLocation,
  deleteLocation,
  uploadLocationImage,
  deleteLocationImage
} from '../services/locationService.js'

const showAdmin = ref(false)
const activeTab = ref('locations')
const locations = ref([])
const selectedLocation = ref(null)
const loading = ref(false)
const uploading = ref(false)
const dragOver = ref(false)
const selectedFiles = ref([])
const fileInput = ref(null)

const newLocation = ref({
  name: '',
  description: '',
  latitude: 4.5884,
  longitude: 101.1215
})

// Expose toggle function for parent
defineExpose({
  toggleAdmin: () => {
    showAdmin.value = !showAdmin.value
  }
})

async function loadLocations() {
  try {
    locations.value = await fetchLocations()
  } catch (err) {
    console.error('Failed to load locations:', err)
    alert('Error loading locations')
  }
}

async function addNewLocation() {
  if (!newLocation.value.name || newLocation.value.latitude === null || newLocation.value.longitude === null) {
    alert('Please fill in all required fields')
    return
  }

  loading.value = true
  try {
    await addLocation(
      newLocation.value.name,
      newLocation.value.description,
      newLocation.value.latitude,
      newLocation.value.longitude
    )
    alert('Location added successfully!')
    newLocation.value = {
      name: '',
      description: '',
      latitude: 4.5884,
      longitude: 101.1215
    }
    await loadLocations()
  } catch (err) {
    console.error('Error adding location:', err)
    alert('Error adding location: ' + err.message)
  } finally {
    loading.value = false
  }
}

async function deleteLocationConfirm(id) {
  if (confirm('Are you sure you want to delete this location?')) {
    try {
      await deleteLocation(id)
      alert('Location deleted successfully!')
      await loadLocations()
    } catch (err) {
      console.error('Error deleting location:', err)
      alert('Error deleting location')
    }
  }
}

function selectLocationForImages(loc) {
  selectedLocation.value = loc
  activeTab.value = 'images'
}

function handleFileSelect(e) {
  selectedFiles.value = Array.from(e.target.files)
}

function handleDrop(e) {
  e.preventDefault()
  dragOver.value = false
  selectedFiles.value = Array.from(e.dataTransfer.files).filter(f => f.type.startsWith('image/'))
}

async function uploadImages() {
  if (!selectedLocation.value || selectedFiles.value.length === 0) {
    alert('Please select files to upload')
    return
  }

  uploading.value = true
  try {
    for (const file of selectedFiles.value) {
      await uploadLocationImage(selectedLocation.value.id, file)
    }
    alert('Images uploaded successfully!')
    selectedFiles.value = []
    await loadLocations()
    // Update selected location
    const updated = locations.value.find(l => l.id === selectedLocation.value.id)
    if (updated) {
      selectedLocation.value = updated
    }
  } catch (err) {
    console.error('Error uploading images:', err)
    alert('Error uploading images: ' + err.message)
  } finally {
    uploading.value = false
  }
}

async function deleteImageConfirm(idx) {
  if (confirm('Are you sure you want to delete this image?')) {
    try {
      // Note: This requires tracking image IDs. For now, we'll reload data
      alert('Image deletion requires additional implementation')
      // TODO: Implement proper image deletion
    } catch (err) {
      console.error('Error deleting image:', err)
      alert('Error deleting image')
    }
  }
}

function closeAdmin() {
  showAdmin.value = false
}

// Load locations when component is mounted
loadLocations()
</script>

<style scoped>
.admin-panel {
  position: fixed;
  z-index: 9000;
}

.admin-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.5);
  z-index: 9001;
}

.admin-modal {
  position: fixed;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 90%;
  max-width: 900px;
  height: 80vh;
  background: white;
  border-radius: 12px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
  display: flex;
  flex-direction: column;
  z-index: 9002;
  overflow: hidden;
}

.admin-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px;
  border-bottom: 1px solid #e5e7eb;
}

.admin-header h2 {
  margin: 0;
  font-size: 24px;
  font-weight: 700;
}

.close-btn {
  background: none;
  border: none;
  font-size: 24px;
  cursor: pointer;
  padding: 0;
}

.admin-tabs {
  display: flex;
  gap: 0;
  border-bottom: 1px solid #e5e7eb;
  background: #f9fafb;
}

.tab-btn {
  flex: 1;
  padding: 12px;
  border: none;
  background: none;
  cursor: pointer;
  font-size: 14px;
  font-weight: 500;
  border-bottom: 2px solid transparent;
  transition: all 0.2s;
}

.tab-btn:hover {
  background: #f3f4f6;
}

.tab-btn.active {
  border-bottom-color: #3b82f6;
  color: #3b82f6;
}

.admin-content {
  flex: 1;
  overflow-y: auto;
  padding: 20px;
}

.tab-content h3 {
  margin-top: 0;
  margin-bottom: 20px;
  font-size: 20px;
}

.form-section,
.list-section {
  margin-bottom: 30px;
}

.form-section h4,
.list-section h4 {
  margin-top: 0;
  margin-bottom: 15px;
  font-size: 16px;
  font-weight: 600;
}

.form-group {
  margin-bottom: 15px;
}

.form-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 15px;
}

.form-group label {
  display: block;
  margin-bottom: 5px;
  font-weight: 500;
  font-size: 14px;
}

.form-group input,
.form-group textarea {
  width: 100%;
  padding: 8px 12px;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  font-family: inherit;
  font-size: 14px;
}

.form-group input:focus,
.form-group textarea:focus {
  outline: none;
  border-color: #3b82f6;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}

.btn-primary,
.btn-secondary,
.btn-danger {
  padding: 8px 16px;
  border: none;
  border-radius: 6px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-primary {
  background: #3b82f6;
  color: white;
}

.btn-primary:hover:not(:disabled) {
  background: #2563eb;
}

.btn-primary:disabled {
  background: #9ca3af;
  cursor: not-allowed;
}

.btn-secondary {
  background: #e5e7eb;
  color: #1f2937;
}

.btn-secondary:hover {
  background: #d1d5db;
}

.btn-danger {
  background: #ef4444;
  color: white;
}

.btn-danger:hover {
  background: #dc2626;
}

.btn-text {
  background: none;
  border: none;
  color: #3b82f6;
  cursor: pointer;
  text-decoration: underline;
  padding: 0;
  font-size: 14px;
}

.locations-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.location-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 15px;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  gap: 15px;
}

.location-info h5 {
  margin: 0 0 5px 0;
  font-size: 15px;
}

.location-info p {
  margin: 0;
  font-size: 13px;
  color: #6b7280;
}

.image-count {
  margin-top: 5px !important;
  font-weight: 500 !important;
  color: #3b82f6 !important;
}

.location-actions {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  justify-content: flex-end;
}

.location-actions button {
  padding: 6px 12px;
  font-size: 13px;
}

.upload-area {
  border: 2px dashed #d1d5db;
  border-radius: 8px;
  padding: 30px;
  text-align: center;
  transition: all 0.2s;
  background: #f9fafb;
}

.upload-area:hover {
  border-color: #3b82f6;
  background: #f0f9ff;
}

.file-list {
  margin-top: 15px;
  text-align: left;
}

.file-list ul {
  list-style: none;
  padding: 0;
  margin: 10px 0;
  max-height: 200px;
  overflow-y: auto;
}

.file-list li {
  padding: 5px;
  font-size: 13px;
  color: #6b7280;
}

.images-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
  gap: 15px;
}

.image-card {
  position: relative;
  aspect-ratio: 1;
  border-radius: 8px;
  overflow: hidden;
  border: 1px solid #e5e7eb;
}

.image-card img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.image-card .image-actions {
  position: absolute;
  top: 5px;
  right: 5px;
  opacity: 0;
  transition: opacity 0.2s;
}

.image-card:hover .image-actions {
  opacity: 1;
}

.btn-danger-small {
  background: #ef4444;
  color: white;
  border: none;
  border-radius: 4px;
  padding: 4px 8px;
  cursor: pointer;
  font-size: 12px;
}

.btn-danger-small:hover {
  background: #dc2626;
}

.image-order {
  position: absolute;
  bottom: 5px;
  left: 5px;
  background: rgba(0, 0, 0, 0.7);
  color: white;
  padding: 2px 6px;
  border-radius: 4px;
  font-size: 12px;
  margin: 0;
}

.empty-state {
  padding: 40px;
  text-align: center;
  color: #9ca3af;
}

.no-selection {
  padding: 40px;
  text-align: center;
  color: #9ca3af;
}

.selected-location {
  margin-bottom: 20px;
  padding-bottom: 15px;
  border-bottom: 1px solid #e5e7eb;
}

.selected-location h4 {
  margin: 0 0 10px 0;
}

.admin-footer {
  padding: 15px 20px;
  border-top: 1px solid #e5e7eb;
  text-align: right;
}

@media (max-width: 768px) {
  .admin-modal {
    width: 95%;
    height: 90vh;
  }

  .form-row {
    grid-template-columns: 1fr;
  }

  .location-item {
    flex-direction: column;
    align-items: flex-start;
  }

  .location-actions {
    width: 100%;
    justify-content: flex-start;
  }
}
</style>
