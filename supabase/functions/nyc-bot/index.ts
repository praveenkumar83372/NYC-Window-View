import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const BOT_TOKEN = "8388212435:AAHuhQ7XSf4eJKxswzyW0yk5ALEYV-x4I7U"
const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? ""
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ""

serve(async (req) => {
  try {
    const { message } = await req.json()

    if (message?.video) {
      const fileId = message.video.file_id
      const chatId = message.chat.id

      // 1. Get File Path from Telegram
      const fileRes = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/getFile?file_id=${fileId}`)
      const { result } = await fileRes.json()
      
      if (!result?.file_path) throw new Error("Could not get file path")

      // 2. Download Video
      const videoRes = await fetch(`https://api.telegram.org/file/bot${BOT_TOKEN}/${result.file_path}`)
      const videoBlob = await videoRes.blob()

      // 3. Upload to Supabase Storage (Service Role Key required for bypass)
      const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
      const storagePath = `shorts/${fileId}.mp4`
      
      const { error: uploadError } = await supabase.storage
        .from('nyc-videos')
        .upload(storagePath, videoBlob, { contentType: 'video/mp4', upsert: true })

      if (uploadError) throw uploadError

      // 4. Get Public URL and Insert into Playlist Table
      const { data: { publicUrl } } = supabase.storage.from('nyc-videos').getPublicUrl(storagePath)
      await supabase.from('playlist').insert({ url: publicUrl })

      // 5. Success Reply
      await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          chat_id: chatId, 
          text: "🗽 Walking Engine: Video synced to cloud. It will stream at the next Peak Time!" 
        })
      })
    }
  } catch (err) {
    console.error(err)
  }

  return new Response(JSON.stringify({ ok: true }), { headers: { "Content-Type": "application/json" } })
})