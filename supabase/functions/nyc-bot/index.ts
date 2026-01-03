import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const BOT_TOKEN = "8388212435:AAHuhQ7XSf4eJKxswzyW0yk5ALEYV-x4I7U"
const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? ""
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY') ?? ""

serve(async (req) => {
  const { message } = await req.json()

  // Only process if it's a video
  if (message?.video) {
    const fileId = message.video.file_id
    
    // 1. Get File Path from Telegram
    const fileRes = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/getFile?file_id=${fileId}`)
    const { result } = await fileRes.json()
    const filePath = result.file_path

    // 2. Download Video
    const videoRes = await fetch(`https://api.telegram.org/file/bot${BOT_TOKEN}/${filePath}`)
    const videoBlob = await videoRes.blob()

    // 3. Upload to Supabase Storage
    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
    const storagePath = `shorts/${fileId}.mp4`
    
    const { data, error } = await supabase.storage
      .from('nyc-videos')
      .upload(storagePath, videoBlob, { contentType: 'video/mp4', upsert: true })

    if (data) {
      const { data: { publicUrl } } = supabase.storage.from('nyc-videos').getPublicUrl(storagePath)
      
      // 4. Insert into Playlist Table
      await supabase.from('playlist').insert({ url: publicUrl })

      // 5. Reply to Telegram
      await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id: message.chat.id, text: "🗽 Cloud Sync Complete! Video is now in the 24/7 loop." })
      })
    }
  }

  return new Response(JSON.stringify({ ok: true }), { headers: { "Content-Type": "application/json" } })
})