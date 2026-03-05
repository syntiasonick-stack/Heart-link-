// ---------------- Supabase Connection ----------------
const SUPABASE_URL = "https://bbtmkndehvmqxdapyvkk.supabase.co";
const SUPABASE_KEY = "sb_publishable__8Y7oBonCf3dXBVQVDFCuA_FXYHjht8";
const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// ---------------- Elements ----------------
const authContainer = document.getElementById("authContainer");
const chatContainer = document.getElementById("chatContainer");
const emailInput = document.getElementById("emailInput");
const passwordInput = document.getElementById("passwordInput");
const authMessage = document.getElementById("authMessage");
const messageInput = document.getElementById("messageInput");
const chatBox = document.getElementById("chatBox");
const coinDisplay = document.getElementById("coinCount");

// ---------------- Coins Setup ----------------
let coins = 100;
coinDisplay.innerText = coins;

// ---------------- User state ----------------
let currentUser = null;

// ---------------- Sign Up ----------------
async function signUp() {
    const email = emailInput.value.trim();
    const password = passwordInput.value.trim();

    if(!email || !password) {
        authMessage.textContent = "Please enter email and password.";
        return;
    }

    const { data, error } = await supabaseClient.auth.signUp({
        email: email,
        password: password
    });

    if(error) {
        authMessage.textContent = error.message;
    } else {
        authMessage.textContent = "Sign up successful! Check your email for confirmation.";
    }
}

// ---------------- Sign In ----------------
async function signIn() {
    const email = emailInput.value.trim();
    const password = passwordInput.value.trim();

    if(!email || !password) {
        authMessage.textContent = "Please enter email and password.";
        return;
    }

    const { data, error } = await supabaseClient.auth.signInWithPassword({
        email: email,
        password: password
    });

    if(error) {
        authMessage.textContent = error.message;
    } else {
        currentUser = data.user;
        authMessage.textContent = "Login successful!";
        authContainer.style.display = "none";
        chatContainer.style.display = "block";
        loadUserCoins();
        loadMessages();
        subscribeMessages();
    }
}

// ---------------- Load User Coins ----------------
async function loadUserCoins() {
    // Optional: If you want to store coins in DB, fetch from 'users' table
    coinDisplay.textContent = coins;
}

// ---------------- Load Messages ----------------
async function loadMessages() {
    if(!currentUser) return;

    const { data, error } = await supabaseClient
        .from("messages")
        .select("*")
        .eq("user_id", currentUser.id)
        .order("id", { ascending: true });

    if(error){
        console.error("Error loading messages:", error);
        return;
    }

    chatBox.innerHTML = "";
    data.forEach(msg => {
        const newMessage = document.createElement("div");
        newMessage.textContent = msg.text;
        chatBox.appendChild(newMessage);
    });

    chatBox.scrollTop = chatBox.scrollHeight;
}

// ---------------- Real-time Subscription ----------------
function subscribeMessages() {
    if(!currentUser) return;

    supabaseClient
        .channel(`public:messages:user_${currentUser.id}`)
        .on('postgres_changes', { 
            event: 'INSERT', 
            schema: 'public', 
            table: 'messages', 
            filter: `user_id=eq.${currentUser.id}` 
        }, payload => {
            const newMessage = document.createElement("div");
            newMessage.textContent = payload.new.text;
            chatBox.appendChild(newMessage);
            chatBox.scrollTop = chatBox.scrollHeight;
        })
        .subscribe();
}

// ---------------- Send Message ----------------
async function sendMessage() {
    if(!currentUser) return;

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

    // Show message instantly
    const newMessage = document.createElement("div");
    newMessage.textContent = message;
    chatBox.appendChild(newMessage);
    chatBox.scrollTop = chatBox.scrollHeight;

    // Clear input
    messageInput.value = "";

    // Insert into Supabase with user_id
    const { data, error } = await supabaseClient
        .from("messages")
        .insert([{ text: message, user_id: currentUser.id }]);

    if(error){
        console.error("Error saving message:", error);
        alert("Failed to send message to Supabase.");
    } else {
        console.log("Message saved:", data);
    }
}
