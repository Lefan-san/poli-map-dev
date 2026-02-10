<template>
  <div class="w-full h-screen bg-gray-100">
    <!-- Admin Button -->
    <button
      @click="$refs.adminPanel.toggleAdmin()"
      class="admin-button"
      title="Admin Dashboard"
    >
      <i class="bi bi-gear-fill"></i>
    </button>

    <!-- Admin Panel -->
    <AdminPanel ref="adminPanel" @locations-updated="handleLocationsUpdated" />

    <!-- Map Container -->
    <div id="map" class="w-full h-full"></div>

    <!-- Info Panel -->
    <div
      v-if="showPanel"
      class="absolute top-4 left-4 w-80 bg-white/90 backdrop-blur-md rounded-2xl shadow-2xl z-[2000] overflow-hidden transition-all duration-300 border border-white/20"
    >
      <!-- Image Section -->
      <div class="relative group" v-if="currentLocation && currentLocation.img && currentLocation.img.length > 0">
        <!-- Close Button -->
        <div
          @click="closePanel"
          class="absolute top-3 right-3 bg-white/80 backdrop-blur-sm rounded-full w-8 h-8 flex items-center justify-center cursor-pointer shadow-sm hover:bg-white z-10 transition-colors"
        >
          <i class="bi bi-x-lg text-slate-800 text-sm"></i>
        </div>

        <!-- Main Image -->
        <img
          :src="currentLocation.img[currentImageIndex]"
          @click="openModal"
          class="w-full h-48 object-cover transition-transform duration-500 hover:scale-105 cursor-pointer"
          alt="Campus"
        />

        <!-- Image Navigation Arrows -->
        <div class="absolute bottom-3 right-3 flex gap-2">
          <button
            @click="prevImage"
            class="bg-black/40 hover:bg-black/60 text-white p-2 rounded-full backdrop-blur-sm transition-all"
          >
            <i class="bi bi-chevron-left text-lg"></i>
          </button>
          <button
            @click="nextImage"
            class="bg-black/40 hover:bg-black/60 text-white p-2 rounded-full backdrop-blur-sm transition-all"
          >
            <i class="bi bi-chevron-right text-lg"></i>
          </button>
        </div>
      </div>

      <!-- Info Section -->
      <div class="p-5" v-if="currentLocation">
        <h5 class="text-xl font-extrabold text-slate-900 mb-2 leading-tight">
          {{ currentLocation.name }}
        </h5>
        <p class="text-slate-600 text-sm leading-relaxed">
          {{ currentLocation.desc }}
        </p>

        <button
          @click="openGoogleMaps"
          class="mt-4 w-full bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-xl text-sm font-semibold transition-colors flex items-center justify-center gap-2"
        >
          <i class="bi bi-geo-alt"></i> View in Google Maps
        </button>
      </div>
    </div>

    <!-- Image Modal -->
    <div
      v-if="showModal"
      class="modal-overlay"
      @click="closeModal"
    >
      <span
        @click.stop="closeModal"
        class="modal-close"
      >
        <i class="bi bi-x-lg"></i>
      </span>
      <button
        @click.stop="prevImage"
        class="modal-nav-btn prev"
      >
        <i class="bi bi-chevron-left"></i>
      </button>
      <img
        :src="currentLocation.img[currentImageIndex]"
        @click.stop
        class="modal-img-content"
        alt="Full size"
      />
      <button
        @click.stop="nextImage"
        class="modal-nav-btn next"
      >
        <i class="bi bi-chevron-right"></i>
      </button>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import AdminPanel from './components/AdminPanel.vue'
import { fetchLocations } from './services/locationService.js'
import './style.css'

// Reactive state
const currentIndex = ref(-1)
const currentImageIndex = ref(0)
const showPanel = ref(false)
const showModal = ref(false)
const markerObjects = ref([])
const locations = ref([])
const adminPanel = ref(null)
let map

const currentLocation = computed(() => {
  return currentIndex.value >= 0 ? locations.value[currentIndex.value] : null
})

onMounted(async () => {
  try {
    locations.value = await fetchLocations()
    initializeMap()
  } catch (err) {
    console.error('Failed to load locations:', err)
  }
})

function initializeMap() {
  // Initialize Leaflet map
  map = L.map('map').setView([4.5884, 101.1215], 16)

  // Add base layer (OpenStreetMap)
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap contributors',
    maxZoom: 19,
  }).addTo(map)

  // Create markers for all locations
  locations.value.forEach((loc, index) => {
    // Create custom marker icon with HTML
    const markerIcon = L.divIcon({
      html: `
        <div class="custom-marker-content">
          <div class="marker-pulse"></div>
          <div class="relative flex items-center justify-center w-8 h-8 bg-blue-600 rounded-full border-2 border-white shadow-xl transition-transform duration-300 hover:scale-125 hover:bg-blue-500">
            <i class="bi bi-geo-alt-fill text-white text-sm"></i>
          </div>
        </div>
      `,
      className: 'custom-marker-wrapper',
      iconSize: [32, 32],
      iconAnchor: [16, 32],
      popupAnchor: [0, -32],
    })

    // Add marker to map with custom label on hover
    const marker = L.marker([loc.coords[1], loc.coords[0]], {
      icon: markerIcon,
      title: loc.name,
    }).addTo(map)

    // Create wrapper element for hover label
    const markerElement = marker.getElement()
    if (markerElement) {
      markerElement.classList.add('group')
      
      const labelDiv = document.createElement('div')
      labelDiv.className = 'marker-label'
      labelDiv.textContent = loc.name
      markerElement.appendChild(labelDiv)

      markerElement.addEventListener('click', (e) => {
        e.stopPropagation()
        showLocation(index)
      })
    }

    markerObjects.value.push({ marker, element: markerElement })
  })

  // Close panel when clicking on map
  map.on('click', () => {
    if (showPanel.value) {
      closePanel()
    }
  })
}

function showLocation(index) {
  currentIndex.value = index
  currentImageIndex.value = 0
  showPanel.value = true
  const loc = locations.value[index]
  
  // Use flyTo for smooth animation
  map.flyTo([loc.coords[1], loc.coords[0]], 17.5, {
    duration: 2,
  })
}

function closePanel() {
  showPanel.value = false
}

function nextImage(e) {
  if (e) e.stopPropagation()
  const loc = currentLocation.value
  if (loc && loc.img && loc.img.length > 0) {
    currentImageIndex.value = (currentImageIndex.value + 1) % loc.img.length
  }
}

function prevImage(e) {
  if (e) e.stopPropagation()
  const loc = currentLocation.value
  if (loc && loc.img && loc.img.length > 0) {
    currentImageIndex.value =
      (currentImageIndex.value - 1 + loc.img.length) % loc.img.length
  }
}

function openModal(e) {
  if (e) e.stopPropagation()
  showModal.value = true
}

function closeModal() {
  showModal.value = false
}

function openGoogleMaps() {
  if (currentLocation.value) {
    const { coords, name } = currentLocation.value
    const url = `https://www.google.com/maps/search/${encodeURIComponent(
      name,
    )}/@${coords[1]},${coords[0]},17z`
    window.open(url, '_blank')
  }
}

async function handleLocationsUpdated() {
  try {
    // Reload locations from Supabase
    locations.value = await fetchLocations()
    // Reinitialize map with new locations
    if (map) {
      map.remove()
    }
    markerObjects.value = []
    currentIndex.value = -1
    showPanel.value = false
    initializeMap()
  } catch (err) {
    console.error('Failed to reload locations:', err)
  }
}
</script>

<style scoped>
.modal-overlay {
  display: flex;
  position: fixed;
  z-index: 3000;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(0, 0, 0, 0.9);
  align-items: center;
  justify-content: center;
}

.modal-close {
  position: absolute;
  top: 20px;
  right: 30px;
  color: white;
  font-size: 40px;
  cursor: pointer;
  z-index: 3001;
}

.modal-img-content {
  width: 95vw;
  height: 85vh;
  object-fit: contain;
  border-radius: 12px;
}

.modal-nav-btn {
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  background: white;
  border: none;
  border-radius: 50%;
  width: 60px;
  height: 60px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  font-size: 30px;
  z-index: 3001;
  opacity: 0.8;
  transition: opacity 0.2s;
}

.modal-nav-btn:hover {
  opacity: 1;
}

.modal-nav-btn.prev {
  left: 30px;
}

.modal-nav-btn.next {
  right: 30px;
}

.admin-button {
  position: fixed;
  top: 20px;
  right: 20px;
  width: 48px;
  height: 48px;
  border-radius: 50%;
  background: #3b82f6;
  color: white;
  border: none;
  font-size: 20px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  box-shadow: 0 4px 12px rgba(59, 130, 246, 0.4);
  transition: all 0.2s;
}

.admin-button:hover {
  background: #2563eb;
  transform: scale(1.1);
  box-shadow: 0 6px 16px rgba(59, 130, 246, 0.6);
}

.admin-button:active {
  transform: scale(0.95);
}
</style>
