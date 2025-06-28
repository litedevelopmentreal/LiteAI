// public/script.js

// Backend servisimiz ile aynı domain ve port üzerinde çalışacağımız için
// API isteği göreceli bir URL'ye (örn: /api/chat) yapılabilir.
// Tarayıcı otomatik olarak doğru host ve portu kullanacaktır.
const API_BASE_PATH = '/api'; // Backend endpoint'lerimizin başlangıç yolu

const chatWindow = document.getElementById('chat-window');
const chatForm = document.getElementById('chat-form');
const userInput = document.getElementById('user-input');
const sendButton = document.getElementById('send-button');
const spinner = document.querySelector('.spinner');
const welcomeMessage = document.querySelector('.welcome-message');

// Markdown dönüştürücü (index.html'de CDN'den çekiliyor)
const md = new markdownit();

// Sohbet geçmişini localStorage'dan yükle
let messages = JSON.parse(localStorage.getItem('chatHistory')) || [];

// Sohbet geçmişini ekrana bas
function renderMessages() {
    chatWindow.innerHTML = ''; // Mevcut mesajları temizle

    if (messages.length === 0) {
        welcomeMessage.style.display = 'flex'; // Hoş geldin mesajını göster
    } else {
        welcomeMessage.style.display = 'none'; // Hoş geldin mesajını gizle
        messages.forEach(msg => {
            const messageElement = document.createElement('div');
            messageElement.classList.add('message', msg.sender);

            const bubble = document.createElement('div');
            bubble.classList.add('message-bubble');

            if (msg.sender === 'ai') {
                bubble.innerHTML = md.render(msg.text); // Markdown'ı HTML'e çevir
            } else {
                bubble.textContent = msg.text;
            }

            messageElement.appendChild(bubble);
            chatWindow.appendChild(messageElement);
        });
    }

    // Sohbet penceresini en alta kaydır
    chatWindow.scrollTop = chatWindow.scrollHeight;
}

// Sohbeti localStorage'a kaydet
function saveChatHistory() {
    localStorage.setItem('chatHistory', JSON.stringify(messages));
}

// Mesaj gönderme fonksiyonu
async function sendMessage(event) {
    event.preventDefault(); // Formun varsayılan gönderimini engelle

    const userMessage = userInput.value.trim();
    if (!userMessage) return; // Boş mesaj gönderme

    // Kullanıcının mesajını ekle
    messages.push({ sender: 'user', text: userMessage });
    saveChatHistory();
    renderMessages();
    userInput.value = ''; // Giriş alanını temizle

    // Gönderme düğmesini devre dışı bırak ve spinner'ı göster
    sendButton.disabled = true;
    spinner.style.display = 'inline-block';
    sendButton.textContent = ''; // Buton metnini gizle
    sendButton.appendChild(spinner); // Spinner'ı butona ekle

    try {
        // Kendi backend servisimize istek atıyoruz
        const response = await fetch(`${API_BASE_PATH}/chat`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ message: userMessage }), // Mesajı backend'e gönder
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(`Backend hatası: ${response.status} - ${errorData.error || 'Bilinmeyen hata'}`);
        }

        const data = await response.json();
        const aiResponse = data.choices[0]?.message?.content || "Üzgünüm, bir yanıt alamadım.";

        messages.push({ sender: 'ai', text: aiResponse });
        saveChatHistory();
        renderMessages();

    } catch (error) {
        console.error('API çağrısında hata:', error);
        messages.push({ sender: 'ai', text: 'Üzgünüm, bir hata oluştu. Lütfen tekrar deneyin.' });
        saveChatHistory();
        renderMessages();
    } finally {
        // Gönderme düğmesini tekrar etkinleştir ve spinner'ı gizle
        sendButton.disabled = false;
        spinner.style.display = 'none';
        sendButton.textContent = 'Gönder'; // Buton metnini geri getir
    }
}

// Olay dinleyicileri
chatForm.addEventListener('submit', sendMessage);

// Sayfa yüklendiğinde mesajları render et
document.addEventListener('DOMContentLoaded', renderMessages);