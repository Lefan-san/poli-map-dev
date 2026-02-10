# Poli-Map - Leaflet.js with Supabase

A dynamic campus map application built with Vue 3, Leaflet.js, and Supabase for real-time content management.

## Features

✨ **Dynamic Location Management** - Add, edit, delete locations without code changes
📸 **Image Management** - Upload unlimited images per location
🗺️ **Interactive Map** - Built with Leaflet.js (open-source)
⚙️ **Admin Dashboard** - Manage all content through a web interface
🔄 **Real-time Updates** - Changes appear immediately on the map

## Setup Instructions

### 1. Install Dependencies

```bash
npm install
```

### 2. Create Supabase Project

1. Go to [https://supabase.com](https://supabase.com) and sign up
2. Create a new project
3. Note your **Project URL** and **Anon Public Key**

### 3. Create Database Tables

In your Supabase project, go to **SQL Editor** and run the following SQL:

```sql
-- Create locations table
CREATE TABLE locations (
  id bigint primary key generated always as identity,
  name text not null,
  description text,
  latitude float not null,
  longitude float not null,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- Create location_images table
CREATE TABLE location_images (
  id bigint primary key generated always as identity,
  location_id bigint not null references locations(id) on delete cascade,
  image_url text not null,
  order int default 0,
  created_at timestamp with time zone default now()
);

-- Create indexes for better performance
CREATE INDEX idx_location_images_location_id ON location_images(location_id);
```

### 4. Create Storage Bucket

1. Go to **Storage** in your Supabase dashboard
2. Create a new bucket named `location-images`
3. Set it to **Public** access
4. Click **Policies** and add a policy allowing public read access

### 5. Configure Environment Variables

1. Copy `.env.example` to `.env`
2. Fill in your Supabase credentials:

```bash
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key_here
```

### 6. Run the Application

```bash
npm run dev
```

Visit `http://localhost:5173` and look for the **⚙️ gear icon** in the top-right corner to access the admin dashboard.

## Admin Dashboard Usage

### Adding Locations

1. Click the gear icon (⚙️) to open the admin dashboard
2. Go to the **Locations** tab
3. Fill in:
   - **Location Name** (required)
   - **Description** (optional)
   - **Latitude** and **Longitude** (required)
4. Click **Add Location**

**Getting Coordinates:**
- Use [Google Maps](https://maps.google.com) or [OpenStreetMap](https://www.openstreetmap.org)
- Right-click on the location → copy the coordinates

### Managing Images

1. In the **Locations** tab, click **Manage Images** for a location
2. The **Images** tab will open with that location selected
3. Upload images by:
   - Clicking the blue upload button, OR
   - Dragging and dropping files
4. Images appear on the map immediately after upload

### Deleting Locations & Images

- **Delete Location**: Click the red **Delete** button (removes all images too)
- **Delete Image**: Click on an image thumbnail and click the **X** button

## File Structure

```
src/
├── App.vue                          # Main app component
├── components/
│   └── AdminPanel.vue               # Admin dashboard
├── services/
│   └── locationService.js           # Supabase queries
├── supabaseClient.js                # Supabase config
├── locations.js                     # Fallback data
├── main.js                          # Vue entry point
└── style.css                        # Global styles

.env                                 # Environment variables (git ignored)
.env.example                         # Template for .env
```

## How It Works

### Data Flow

1. **On App Load**:
   - Fetches all locations from Supabase
   - Creates Leaflet markers on the map
   - Falls back to hardcoded data if Supabase unavailable

2. **When You Upload Images**:
   - Image uploaded to Supabase Storage
   - Metadata saved to `location_images` table
   - Page automatically refreshes to show new images

3. **When You Add a Location**:
   - Location saved to `locations` table
   - Map reloads and displays new marker

### Technology Stack

- **Frontend**: Vue 3 + Vite
- **Map**: Leaflet.js + OpenStreetMap tiles
- **Backend**: Supabase (PostgreSQL + Storage)
- **Styling**: Tailwind CSS + Bootstrap Icons

## Fallback Behavior

If Supabase credentials aren't configured, the app uses hardcoded locations from `src/locations.js`. This allows development without Supabase setup.

## Environment Variables

| Variable | Required | Example |
|----------|----------|---------|
| `VITE_SUPABASE_URL` | Yes | `https://abcdef.supabase.co` |
| `VITE_SUPABASE_ANON_KEY` | Yes | `your_very_long_key_here` |

## Troubleshooting

### Admin Panel Not Loading
- Check browser console for errors
- Verify Supabase credentials in `.env`
- Ensure Supabase tables exist

### Images Not Uploading
- Check Supabase Storage bucket exists and is public
- Verify CORS settings in Supabase
- Check browser file size limits

### Map Not Showing Locations
- Open browser DevTools Console
- Check if locations are being fetched
- Verify coordinates are in correct format: `[latitude, longitude]`

### Changes Not Appearing on Map
- Refresh the browser
- Check admin dashboard for errors
- Verify locations were saved to Supabase

## Production Deployment

### Before Deploying

1. Create a `.env.production` file with production Supabase credentials
2. Run `npm run build` to create optimized build
3. Ensure `.env` files are in `.gitignore` (they already are)

### Deploy to Vercel/Netlify

```bash
npm run build  # Creates dist/ folder
```

Then push to your hosting platform.

## Security Notes

⚠️ **Important**: The Supabase anon key is public. For production:
1. Enable Row Level Security (RLS) in Supabase
2. Set up proper auth if needed
3. Restrict bucket access with RLS policies

Example RLS policy for read-only access:
```sql
CREATE POLICY "Anyone can read locations"
  ON locations FOR SELECT
  USING (true);
```

## Support

For issues:
- Check Supabase documentation: https://supabase.com/docs
- Leaflet documentation: https://leafletjs.com/
- Vue documentation: https://vuejs.org/

## License

MIT
