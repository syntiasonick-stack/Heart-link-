// ---------------- Supabase Connection ----------------
const SUPABASE_URL = "https://bbtmkndehvmqxdapyvkk.supabase.co";
const SUPABASE_KEY = "sb_publishable__8Y7oBonCf3dXBVQVDFCuA_FXYHjht8";

const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// ---------------- Coins Setup ----------------
let coins = 100;

// ---------------- Elements ----------------
const messageInput = document.getElementById("messageInput");
const chatBox = document.getElementById("chatBox");
const coinDisplay = document.getElementById("coinCount");

// Display initial coins
coinDisplay.innerText = coins;

// ---------------- Load previous messages ----------------
async function loadMessages() {
    const { data, error } = await supabaseClient
        .from("messages")
        .select("*")
        .order("id", { ascending: true });

    if(error){
        console.error("Error loading messages:", error);
        return;
    }

    chatBox.innerHTML = ""; // clear chat box
    data.forEach(msg => {
        const newMessage = document.createElement("div");
        newMessage.textContent = msg.text;
        chatBox.appendChild(newMessage);
    });

    chatBox.scrollTop = chatBox.scrollHeight;
}

// Call on page load
loadMessages();

// ---------------- Real-time subscription ----------------
supabaseClient
    .channel('public:messages') // real-time channel for messages
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, payload => {
        const msg = payload.new.text;
        const newMessage = document.createElement("div");
        newMessage.textContent = msg;
        chatBox.appendChild(newMessage);
        chatBox.scrollTop = chatBox.scrollHeight;
    })
    .subscribe();

// ---------------- Send Message ----------------
async function sendMessage() {
    const message = messageInput.value.trim();

    if(message === ""){
        alert("Type a message first!");
        return;
    }

    if(coins <= 0){
        alert("You have no coins left. Buy more coins.");
        return;
    }

    // Deduct 1 coin
    coins--;
    coinDisplay.innerText = coins;

    // Show message in chat box instantly
    const newMessage = document.createElement("div");
    newMessage.textContent = message;
    chatBox.appendChild(newMessage);
    chatBox.scrollTop = chatBox.scrollHeight;

    // Clear input
    messageInput.value = "";

    // Send message to Supabase
    const { data, error } = await supabaseClient
        .from("messages")
        .insert([{ text: message }]);

    if(error){
        console.error("Error saving message:", error);
        alert("Failed to send message to Supabase.");
    } else {
        console.log("Message saved:", data);
    }
}
