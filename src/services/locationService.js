import { supabase } from '../supabaseClient.js'
import { locations as fallbackLocations } from '../locations.js'

export async function fetchLocations() {
  try {
    // Check if Supabase is configured
    if (!import.meta.env.VITE_SUPABASE_URL) {
      console.log('Using fallback locations (Supabase not configured)')
      return fallbackLocations
    }

    const { data, error } = await supabase
      .from('locations')
      .select('*, location_images(*)')
      .order('id')

    if (error) {
      console.error('Error fetching locations from Supabase:', error)
      return fallbackLocations
    }

    if (!data || data.length === 0) {
      console.log('No locations in Supabase, using fallback data')
      return fallbackLocations
    }

    // Transform Supabase data to match expected format
    return data.map(loc => ({
      id: loc.id,
      name: loc.name,
      coords: [loc.longitude, loc.latitude],
      desc: loc.description || '',
      img: loc.location_images
        ?.sort((a, b) => (a.image_order || 0) - (b.image_order || 0))
        ?.map(img => img.image_url) || []
    }))
  } catch (err) {
    console.error('Exception fetching locations:', err)
    return fallbackLocations
  }
}

export async function addLocation(name, description, latitude, longitude) {
  try {
    const { data, error } = await supabase
      .from('locations')
      .insert([
        {
          name,
          description,
          latitude,
          longitude
        }
      ])
      .select()

    if (error) throw error
    return data?.[0]
  } catch (err) {
    console.error('Error adding location:', err)
    throw err
  }
}

export async function updateLocation(id, name, description, latitude, longitude) {
  try {
    const { data, error } = await supabase
      .from('locations')
      .update({
        name,
        description,
        latitude,
        longitude,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()

    if (error) throw error
    return data?.[0]
  } catch (err) {
    console.error('Error updating location:', err)
    throw err
  }
}

export async function deleteLocation(id) {
  try {
    const { error } = await supabase
      .from('locations')
      .delete()
      .eq('id', id)

    if (error) throw error
  } catch (err) {
    console.error('Error deleting location:', err)
    throw err
  }
}

export async function uploadLocationImage(locationId, file) {
  try {
    const fileExt = file.name.split('.').pop()
    const fileName = `${locationId}/${Date.now()}.${fileExt}`

    const { error: uploadError } = await supabase.storage
      .from('location-images')
      .upload(fileName, file)

    if (uploadError) throw uploadError

    // Get public URL
    const { data } = supabase.storage
      .from('location-images')
      .getPublicUrl(fileName)

    // Count existing images for this location to set order
    const { data: existingImages } = await supabase
      .from('location_images')
      .select('image_order')
      .eq('location_id', locationId)

    const nextOrder = (existingImages?.length || 0)

    // Add image record to database
    const { data: imageData, error: dbError } = await supabase
      .from('location_images')
      .insert([
        {
          location_id: locationId,
          image_url: data.publicUrl,
          image_order: nextOrder
        }
      ])
      .select()

    if (dbError) throw dbError

    return imageData?.[0]
  } catch (err) {
    console.error('Error uploading image:', err)
    throw err
  }
}

export async function deleteLocationImage(imageId) {
  try {
    const { error } = await supabase
      .from('location_images')
      .delete()
      .eq('id', imageId)

    if (error) throw error
  } catch (err) {
    console.error('Error deleting image:', err)
    throw err
  }
}

export async function reorderImages(locationId, images) {
  try {
    const updates = images.map((img, index) => ({
      id: img.id,
      image_order: index
    }))

    for (const update of updates) {
      const { error } = await supabase
        .from('location_images')
        .update({ image_order: update.image_order })
        .eq('id', update.id)

      if (error) throw error
    }
  } catch (err) {
    console.error('Error reordering images:', err)
    throw err
  }
}
