// public/script.js

// Backend servisimiz ile aynı domain ve port üzerinde çalışacağımız için
// API isteği göreceli bir URL'ye (örn: /api/chat) yapılabilir.
// Tarayıcı otomatik olarak doğru host ve portu kullanacaktır.
const API_BASE_PATH = '/api'; // Backend endpoint'lerimizin başlangıç yolu

const chatWindow = document.getElementById('chat-window');
const chatHistoryWindow = document.getElementById('chat-history-window');
const chatForm = document.getElementById('chat-form');
const userInput = document.getElementById('user-input');
const sendButton = document.getElementById('send-button');
const spinner = document.querySelector('.spinner');
const welcomeMessage = document.querySelector('.welcome-message');

const showChatButton = document.getElementById('show-chat-button');
const showHistoryButton = document.getElementById('show-history-button');
const clearHistoryButton = document.getElementById('clear-history-button');
const historyList = document.getElementById('history-list');

// Markdown dönüştürücü (index.html'de CDN'den çekiliyor)
const md = new markdownit();

// Sohbet geçmişini localStorage'dan yükle
// Her bir sohbet, mesaj dizilerinden oluşan bir array'dir.
let allChats = JSON.parse(localStorage.getItem('allChats')) || [];
let currentChatIndex = -1; // -1: Yeni sohbet, >=0: Mevcut sohbetin indeksi
let messages = []; // Mevcut sohbetin mesajları

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
function saveCurrentChat() {
    if (messages.length === 0) return; // Boş sohbeti kaydetme

    if (currentChatIndex === -1) {
        // Yeni bir sohbetse, yeni bir giriş oluştur
        allChats.push({
            id: Date.now(), // Benzersiz ID
            date: new Date().toISOString(), // Oluşturulma tarihi
            messages: messages, // Sohbetin mesajları
            firstMessagePreview: messages[0] ? messages[0].text.substring(0, 100) + (messages[0].text.length > 100 ? '...' : '') : 'Boş Sohbet'
        });
        currentChatIndex = allChats.length - 1; // Yeni sohbetin indeksini ayarla
    } else {
        // Mevcut sohbeti güncelle
        allChats[currentChatIndex].messages = messages;
        allChats[currentChatIndex].firstMessagePreview = messages[0] ? messages[0].text.substring(0, 100) + (messages[0].text.length > 100 ? '...' : '') : 'Boş Sohbet';
    }
    localStorage.setItem('allChats', JSON.stringify(allChats));
    renderHistoryList(); // Sohbetler listesini güncelle
}

// Sohbet Geçmişi Listesini Render Et
function renderHistoryList() {
    historyList.innerHTML = '';
    if (allChats.length === 0) {
        const noHistoryLi = document.createElement('li');
        noHistoryLi.classList.add('no-history-message');
        noHistoryLi.textContent = 'Henüz sohbet geçmişiniz yok.';
        historyList.appendChild(noHistoryLi);
        return;
    }

    // Tarihe göre ters sırala (en yenisi en üstte)
    const sortedChats = [...allChats].sort((a, b) => new Date(b.date) - new Date(a.date));

    sortedChats.forEach((chat) => {
        const listItem = document.createElement('li');
        listItem.dataset.chatId = chat.id; // Sohbet ID'sini sakla

        const chatContentDiv = document.createElement('div');
        chatContentDiv.classList.add('history-content');
        chatContentDiv.textContent = chat.firstMessagePreview;
        
        const chatDateSpan = document.createElement('span');
        chatDateSpan.classList.add('history-date');
        chatDateSpan.textContent = new Date(chat.date).toLocaleDateString('tr-TR', {
            year: 'numeric', month: 'numeric', day: 'numeric',
            hour: '2-digit', minute: '2-digit'
        });

        const deleteButton = document.createElement('button');
        deleteButton.textContent = 'Sil';
        deleteButton.classList.add('delete-history-item-button');
        deleteButton.onclick = (e) => {
            e.stopPropagation(); // li tıklamasını engelle
            deleteSingleChat(chat.id);
        };

        listItem.appendChild(chatContentDiv);
        listItem.appendChild(chatDateSpan);
        listItem.appendChild(deleteButton);
        historyList.appendChild(listItem);

        // Tıklama olayı ile sohbeti yükle
        listItem.addEventListener('click', () => loadChat(chat.id));
    });
}

// Tek bir sohbeti silme fonksiyonu
function deleteSingleChat(chatId) {
    if (!confirm('Bu sohbeti silmek istediğinizden emin misiniz?')) {
        return;
    }

    const initialChatCount = allChats.length;
    allChats = allChats.filter(chat => chat.id !== chatId);
    
    // Eğer silme işlemi gerçekleştiyse
    if (allChats.length < initialChatCount) {
        localStorage.setItem('allChats', JSON.stringify(allChats));
        renderHistoryList(); // Listeyi güncelle

        // Eğer silinen sohbet mevcut sohbet ise veya mevcut sohbet artık yoksa, yeni bir sohbete geç
        if (currentChatIndex !== -1 && !allChats[currentChatIndex] || (allChats[currentChatIndex] && allChats[currentChatIndex].id === chatId)) {
            startNewChat();
        } else if (allChats.length > 0) {
            // Eğer mevcut sohbet silinmediyse ve hala sohbetler varsa, mevcut indeksi kontrol et
            // Silinen elemandan dolayı indeksler kaymış olabilir.
            // En basit çözüm: mevcut sohbete devam et veya en sonuncuyu aç
            if (currentChatIndex >= allChats.length) {
                currentChatIndex = allChats.length - 1; // Son sohbeti seç
            }
            if (currentChatIndex !== -1) {
                 messages = allChats[currentChatIndex].messages;
                 renderMessages();
            } else {
                 startNewChat(); // Eğer currentChatIndex -1 olduysa (yani hiç sohbet kalmadıysa)
            }
        } else {
            // Hiç sohbet kalmadıysa yeni sohbet başlat
            startNewChat(); 
        }
    }
}


// Sohbeti yükle
function loadChat(chatId) {
    const chatToLoad = allChats.find(chat => chat.id === chatId);
    if (chatToLoad) {
        currentChatIndex = allChats.indexOf(chatToLoad);
        messages = chatToLoad.messages;
        renderMessages();
        showChatView(); // Sohbet görünümüne geç
    }
}

// Yeni Sohbet Başlat
function startNewChat() {
    currentChatIndex = -1;
    messages = []; // Mesajları temizle
    userInput.value = ''; // Giriş alanını temizle
    renderMessages(); // Hoş geldin mesajını gösterir
    showChatView(); // Sohbet görünümüne geç
}


// Mesaj gönderme fonksiyonu
async function sendMessage(event) {
    event.preventDefault(); // Formun varsayılan gönderimini engelle

    const userMessage = userInput.value.trim();
    if (!userMessage) return; // Boş mesaj gönderme

    // Eğer yeni bir sohbet başlatılmamışsa, yeni bir tane başlat
    if (currentChatIndex === -1 && messages.length === 0) {
        // İlk mesaj olduğu için yeni bir sohbet oluşturulacak
        messages.push({ sender: 'user', text: userMessage });
        saveCurrentChat(); // İlk mesajla sohbeti kaydet
    } else {
        // Mevcut sohbete mesaj ekle
        messages.push({ sender: 'user', text: userMessage });
        saveCurrentChat(); // Mesajı ekledikten sonra mevcut sohbeti kaydet
    }
    
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
        saveCurrentChat(); // AI cevabı geldikten sonra kaydet
        renderMessages();

    } catch (error) {
        console.error('API çağrısında hata:', error);
        messages.push({ sender: 'ai', text: 'Üzgünüm, bir hata oluştu. Lütfen tekrar deneyin.' });
        saveCurrentChat(); // Hata olsa bile kaydet
        renderMessages();
    } finally {
        // Gönderme düğmesini tekrar etkinleştir ve spinner'ı gizle
        sendButton.disabled = false;
        spinner.style.display = 'none';
        sendButton.textContent = 'Gönder'; // Buton metnini geri getir
    }
}

// Sohbet görünümünü göster
function showChatView() {
    chatWindow.style.display = 'flex'; // Sohbet penceresini göster
    chatForm.style.display = 'flex'; // Sohbet giriş alanını göster
    chatHistoryWindow.style.display = 'none'; // Geçmiş penceresini gizle

    showChatButton.classList.add('active');
    showHistoryButton.classList.remove('active');
    userInput.focus(); // Sohbet görünümüne geçince inputa odaklan
}

// Sohbet geçmişi görünümünü göster
function showHistoryView() {
    chatWindow.style.display = 'none'; // Sohbet penceresini gizle
    chatForm.style.display = 'none'; // Sohbet giriş alanını gizle
    chatHistoryWindow.style.display = 'flex'; // Geçmiş penceresini göster

    showChatButton.classList.remove('active');
    showHistoryButton.classList.add('active');

    renderHistoryList(); // Geçmiş listesini yeniden yükle
}

// Tüm sohbetleri silme fonksiyonu
function clearAllChats() {
    if (confirm('Tüm sohbet geçmişinizi silmek istediğinizden emin misiniz? Bu işlem geri alınamaz.')) {
        localStorage.removeItem('allChats');
        allChats = [];
        startNewChat(); // Yeni bir sohbet başlat
        renderHistoryList(); // Geçmiş listesini güncelle
        alert('Tüm sohbet geçmişi başarıyla silindi.');
    }
}


// Olay dinleyicileri
chatForm.addEventListener('submit', sendMessage);
showChatButton.addEventListener('click', startNewChat); // Yeni sohbet başlatma mantığına uygun
showHistoryButton.addEventListener('click', showHistoryView);
clearHistoryButton.addEventListener('click', clearAllChats);


// Sayfa yüklendiğinde
document.addEventListener('DOMContentLoaded', () => {
    // Uygulama yüklendiğinde, en son sohbeti yükle veya yeni bir sohbet başlat
    if (allChats.length > 0) {
        currentChatIndex = allChats.length - 1; // En son eklenen sohbeti yükle
        messages = allChats[currentChatIndex].messages;
    } else {
        // Hiç sohbet yoksa, yeni bir sohbet başlatmak için gerekli değişkenleri ayarla
        currentChatIndex = -1;
        messages = [];
    }
    renderMessages(); // İlk yüklemede sohbet penceresini göster
    renderHistoryList(); // Geçmiş listesini ilk başta da render et
});
