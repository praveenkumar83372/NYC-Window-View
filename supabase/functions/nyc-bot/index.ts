import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const BOT_TOKEN = "8388212435:AAHuhQ7XSf4eJKxswzyW0yk5ALEYV-x4I7U"

serve(async (req) => {
  try {
    const payload = await req.json()
    const message = payload.message

    if (message?.video) {
      const fileId = message.video.file_id
      const chatId = message.chat.id

      // 1. Get File Path from Telegram
      const fileRes = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/getFile?file_id=${fileId}`)
      const { result } = await fileRes.json()
      
      // 2. Download and Upload to Storage
      const videoRes = await fetch(`https://api.telegram.org/file/bot${BOT_TOKEN}/${result.file_path}`)
      const videoBlob = await videoRes.blob()

      const supabase = createClient(
        Deno.env.get('SUPABASE_URL') ?? "", 
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ""
      )
      
      const storagePath = `shorts/${fileId}.mp4`
      await supabase.storage.from('nyc-videos').upload(storagePath, videoBlob, { contentType: 'video/mp4', upsert: true })

      // 3. Update Playlist
      const { data: { publicUrl } } = supabase.storage.from('nyc-videos').getPublicUrl(storagePath)
      await supabase.from('playlist').insert({ url: publicUrl })

      // 4. Confirmation Reply
      await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id: chatId, text: "🗽 NYC Engine: Video synced! It will be cropped to 9:16 and streamed shortly." })
      })
    }
  } catch (err) { console.error(err) }
  return new Response(JSON.stringify({ ok: true }))
})