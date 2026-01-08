import telebot
import requests
import os

# 1. YOUR CREDENTIALS
SUPABASE_URL = "https://ofqbyabbjpincectjdya.supabase.co"
SUPABASE_KEY = "sb_publishable_y4EN0CeCLGkenpubyf4tcg_8vj4PVcn" 
BOT_TOKEN = "8388212435:AAHuhQ7XSf4eJKxswzyW0yk5ALEYV-x4I7U"

bot = telebot.TeleBot(BOT_TOKEN)

@bot.message_handler(content_types=['video'])
def handle_walking_video(message):
    bot.reply_to(message, "🗽 NYC Walking Engine: Sending to Cloud...")
    
    # Download from Telegram
    file_info = bot.get_file(message.video.file_id)
    file_url = f"https://api.telegram.org/file/bot{bot.token}/{file_info.file_path}"
    video_data = requests.get(file_url).content
    
    # Upload to Supabase Storage
    file_name = f"{message.video.file_id}.mp4"
    storage_url = f"{SUPABASE_URL}/storage/v1/object/nyc-videos/shorts/{file_name}"
    
    headers = {
        "Authorization": f"Bearer {SUPABASE_KEY}",
        "apikey": SUPABASE_KEY,
        "Content-Type": "video/mp4"
    }
    
    upload_res = requests.post(storage_url, headers=headers, data=video_data)
    
    if upload_res.status_code == 200:
        public_url = f"{SUPABASE_URL}/storage/v1/object/public/nyc-videos/shorts/{file_name}"
        
        # Save link to the 'playlist' table
        db_url = f"{SUPABASE_URL}/rest/v1/playlist"
        requests.post(db_url, headers=headers, json={"url": public_url})
        
        bot.reply_to(message, "✅ Successfully added to the Walking Playlist!")
    else:
        bot.reply_to(message, f"❌ Error: {upload_res.text}")

print("NYC Walking Bot is listening...")
bot.polling()