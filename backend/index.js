// backend/index.js
require('dotenv').config(); // .env dosyasını oku

const express = require('express');
const cors = require('cors');
const path = require('path'); // Statik dosyaları sunmak için
const app = express();
const PORT = process.env.PORT || 3000; // Render veya yerel için port

// Güvenlik için izin verilen origin'i belirtmek en iyisidir.
// Geliştirme ortamında her şeye izin veriyoruz.
// Production'da kendi Render URL'si otomatik olarak aynı origin olacağı için CORS sorun olmaz.
// Yine de frontend'in dışarıdan eriştiği durumlara karşı bir güvenlik katmanı ekleyebiliriz.
// Eğer tek servis olarak çalışıyorsa, bu CORS ayarı genellikle daha az kritiktir çünkü
// frontend ve backend aynı sunucuda ve aynı portta olacaktır.
app.use(cors()); // Basitlik için tüm CORS isteklerine izin veriyoruz

app.use(express.json()); // JSON body parsing için

// Statik dosyaları sun (public klasöründeki HTML, CSS, JS)
// Express, bu dizindeki dosyaları doğrudan URL'den erişilebilir kılar
app.use(express.static(path.join(__dirname, '../public')));

// Groq API anahtarını .env dosyasından al
const GROQ_API_KEY = process.env.GROQ_API_KEY;

// Groq API anahtarının mevcut olup olmadığını kontrol et
if (!GROQ_API_KEY) {
    console.error('HATA: GROQ_API_KEY ortam değişkeni ayarlanmamış.');
    // Render'da bu hatayı alırsanız, ortam değişkenini doğru ayarladığınızdan emin olun.
    // process.exit(1); // Production'da bu satırı kullanabilirsiniz.
}

// Sohbet proxy endpoint'i
app.post('/api/chat', async (req, res) => {
    const { message } = req.body;

    if (!message) {
        return res.status(400).json({ error: 'Mesaj boş olamaz.' });
    }

    if (!GROQ_API_KEY) {
        return res.status(500).json({ error: 'API anahtarı bulunamadı. Lütfen sunucu ayarlarını kontrol edin.' });
    }

    try {
        const groqResponse = await fetch('https://api.groq.com/openai/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${GROQ_API_KEY}`, // API anahtarı backend'de güvenle kullanılıyor
            },
            body: JSON.stringify({
                messages: [{ role: 'user', content: message }],
                model: 'llama3-8b-8192', // Kullanmak istediğiniz Groq modelini belirtin
                temperature: 0.7,
                max_tokens: 2000,
            }),
        });

        if (!groqResponse.ok) {
            const errorText = await groqResponse.text();
            console.error('Groq API\'sinden hata:', groqResponse.status, errorText);
            return res.status(groqResponse.status).json({ error: 'Groq API hatası', details: errorText });
        }

        const data = await groqResponse.json();
        res.json(data); // Groq'tan gelen yanıtı doğrudan frontend'e ilet

    } catch (error) {
        console.error('Backend sunucusunda hata:', error);
        res.status(500).json({ error: 'Dahili sunucu hatası.' });
    }
});

// Sunucuyu başlat
app.listen(PORT, () => {
    console.log(`Lite AI Web Service http://localhost:${PORT} adresinde çalışıyor.`);
});