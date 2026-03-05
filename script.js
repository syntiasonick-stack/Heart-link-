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

// ---------------- User state ----------------
let currentUser = null;
let coins = 0;

// ---------------- Sign Up ----------------
async function signUp() {
    const email = emailInput.value.trim();
    const password = passwordInput.value.trim();

    if(!email || !password) {
        authMessage.textContent = "Please enter email and password.";
        return;
    }

    const { data, error } = await supabaseClient.auth.signUp({ email, password });

    if(error) {
        authMessage.textContent = error.message;
        return;
    }

    // Create user record in "users" table with 100 coins
    await supabaseClient.from("users").insert([
        { id: data.user.id, email: email, coins: 100 }
    ]);

    authMessage.textContent = "Sign up successful! Check your email for confirmation.";
}

// ---------------- Sign In ----------------
async function signIn() {
    const email = emailInput.value.trim();
    const password = passwordInput.value.trim();

    if(!email || !password) {
        authMessage.textContent = "Please enter email and password.";
        return;
    }

    const { data, error } = await supabaseClient.auth.signInWithPassword({ email, password });

    if(error) {
        authMessage.textContent = error.message;
        return;
    }

    currentUser = data.user;
    authMessage.textContent = "Login successful!";
    authContainer.style.display = "none";
    chatContainer.style.display = "block";

    await loadUserCoins();
    await loadMessages();
    subscribeMessages();
}

// ---------------- Load User Coins ----------------
async function loadUserCoins() {
    const { data, error } = await supabaseClient
        .from("users")
        .select("coins")
        .eq("id", currentUser.id)
        .single();

    if(error){
        console.error("Error loading coins:", error);
        coins = 100;
    } else {
        coins = data.coins || 100;
    }

    coinDisplay.textContent = coins;
}

// ---------------- Update Coins ----------------
async function updateCoins() {
    await supabaseClient
        .from("users")
        .update({ coins })
        .eq("id", currentUser.id);
    coinDisplay.textContent = coins;
}

// ---------------- Load Messages ----------------
async function loadMessages() {
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
    const message = messageInput.value.trim();

    if(message === ""){
        alert("Type a message first!");
        return;
    }

    if(coins <= 0){
        alert("You have no coins left. Buy more coins.");
        return;
    }

    // Deduct a coin and update DB
    coins--;
    await updateCoins();

    // Show message instantly
    const newMessage = document.createElement("div");
    newMessage.textContent = message;
    chatBox.appendChild(newMessage);
    chatBox.scrollTop = chatBox.scrollHeight;

    messageInput.value = "";

    // Save message with user_id
    const { error } = await supabaseClient
        .from("messages")
        .insert([{ text: message, user_id: currentUser.id }]);

    if(error){
        console.error("Error saving message:", error);
        alert("Failed to send message.");
    }
}
