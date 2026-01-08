import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const BOT_TOKEN = "8388212435:AAHuhQ7XSf4eJKxswzyW0yk5ALEYV-x4I7U"

serve(async (req) => {
  const { message } = await req.json()
  if (message?.video) {
    const fileId = message.video.file_id
    const fileRes = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/getFile?file_id=${fileId}`)
    const { result } = await fileRes.json()
    const videoRes = await fetch(`https://api.telegram.org/file/bot${BOT_TOKEN}/${result.file_path}`)
    const videoBlob = await videoRes.blob()

    const supabase = createClient(Deno.env.get('SUPABASE_URL') ?? "", Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? "")
    const storagePath = `shorts/${fileId}.mp4`
    
    await supabase.storage.from('nyc-videos').upload(storagePath, videoBlob, { contentType: 'video/mp4', upsert: true })
    const { data: { publicUrl } } = supabase.storage.from('nyc-videos').getPublicUrl(storagePath)
    await supabase.from('playlist').insert({ url: publicUrl })
  }
  return new Response(JSON.stringify({ ok: true }))
})