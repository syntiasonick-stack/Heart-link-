// ---------------- Supabase Connection ----------------
const SUPABASE_URL = "https://bbtmkndehvmqxdapyvkk.supabase.co";
const SUPABASE_KEY = "sb_publishable__8Y7oBonCf3dXBVQVDFCuA_FXYHjht8";
const supabase = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// ---------------- Elements ----------------
const authContainer = document.getElementById("authContainer");
const chatContainer = document.getElementById("chatContainer");
const emailInput = document.getElementById("emailInput");
const passwordInput = document.getElementById("passwordInput");
const authMessage = document.getElementById("authMessage");
const messageInput = document.getElementById("messageInput");
const chatBox = document.getElementById("chatBox");
const coinDisplay = document.getElementById("coinCount");

// Marketplace elements
const itemsList = document.getElementById("itemsList");
const itemNameInput = document.getElementById("itemName");
const itemDescInput = document.getElementById("itemDesc");
const itemPriceInput = document.getElementById("itemPrice");

// ---------------- User state ----------------
let currentUser = null;
let coins = 0;

// ---------------- Session Persistence ----------------
async function checkSession() {
    const { data: { session } } = await supabase.auth.getSession();
    if(session && session.user){
        currentUser = session.user;
        authContainer.style.display = "none";
        chatContainer.style.display = "block";
        await loadUserCoins();
        await loadMessages();
        subscribeMessages();
        loadItems();
    }
}
checkSession();

// ---------------- Sign Up ----------------
async function signUp() {
    const email = emailInput.value.trim();
    const password = passwordInput.value.trim();
    if(!email || !password){ authMessage.textContent = "Enter email and password"; return; }

    const { data, error } = await supabase.auth.signUp({ email, password });
    if(error){ authMessage.textContent = error.message; return; }

    await supabase.from("users").insert([{ id: data.user.id, email, coins: 100 }]);
    authMessage.textContent = "Sign up successful! Check email.";
}

// ---------------- Sign In ----------------
async function signIn() {
    const email = emailInput.value.trim();
    const password = passwordInput.value.trim();
    if(!email || !password){ authMessage.textContent = "Enter email and password"; return; }

    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if(error){ authMessage.textContent = error.message; return; }

    currentUser = data.user;
    authContainer.style.display = "none";
    chatContainer.style.display = "block";

    await loadUserCoins();
    await loadMessages();
    subscribeMessages();
    loadItems();
}

// ---------------- Load Coins ----------------
async function loadUserCoins() {
    const { data, error } = await supabase
        .from("users")
        .select("coins")
        .eq("id", currentUser.id)
        .single();
    coins = (error || !data.coins) ? 100 : data.coins;
    coinDisplay.textContent = coins;
}

// ---------------- Update Coins ----------------
async function updateCoins() {
    await supabase.from("users").update({ coins }).eq("id", currentUser.id);
    coinDisplay.textContent = coins;
}

// ---------------- Load Messages ----------------
async function loadMessages() {
    const { data: messages, error } = await supabase.from("messages").select("*").order('created_at', { ascending:true });
    if(error){ console.error(error); return; }
    chatBox.innerHTML = "";
    messages.forEach(msg => addMessageToChat(msg));
}

// ---------------- Add Message to Chat ----------------
function addMessageToChat(msg){
    const div = document.createElement("div");
    const time = new Date(msg.created_at).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'});
    const author = (msg.user_id === currentUser.id) ? "You" : msg.user_id;
    div.textContent = `[${time}] ${author}: ${msg.text}`;
    if(msg.user_id === currentUser.id) div.style.fontWeight="bold";
    chatBox.appendChild(div);
    chatBox.scrollTop = chatBox.scrollHeight;
}

// ---------------- Real-time Subscription ----------------
function subscribeMessages() {
    supabase
        .from('messages')
        .on('INSERT', payload => addMessageToChat(payload.new))
        .subscribe();
}

// ---------------- Send Message ----------------
async function sendMessage() {
    const text = messageInput.value.trim();
    if(!text){ alert("Type a message first"); return; }
    if(coins <= 0){ alert("No coins left!"); return; }

    coins--;
    await updateCoins();

    await supabase.from("messages").insert([{ text, user_id: currentUser.id }]);
    messageInput.value = "";
}

// ---------------- Load Marketplace Items ----------------
async function loadItems() {
    const { data: items, error } = await supabase.from('items').select('*').order('created_at', { ascending:true });
    if(error){ console.error(error); return; }

    itemsList.innerHTML = "";
    items.forEach(item => {
        const div = document.createElement("div");
        div.style.border="1px solid #ddd"; div.style.padding="10px"; div.style.marginBottom="10px";
        div.innerHTML = `<strong>${item.name}</strong> - ${item.price} coins<br>${item.description}<br>
                         <button onclick="buyItem(${item.id}, ${item.price})">Buy</button>`;
        itemsList.appendChild(div);
    });
}

// ---------------- Sell Item ----------------
async function sellItem() {
    const name = itemNameInput.value.trim();
    const desc = itemDescInput.value.trim();
    const price = parseInt(itemPriceInput.value);

    if(!name || !desc || isNaN(price) || price<=0){ alert("Fill all fields correctly"); return; }

    await supabase.from("items").insert([{ name, description: desc, price, seller_id: currentUser.id }]);

    itemNameInput.value=""; itemDescInput.value=""; itemPriceInput.value="";
    loadItems();
}

// ---------------- Buy Item ----------------
async function buyItem(itemId, itemPrice){
    if(coins < itemPrice){ alert("Not enough coins"); return; }
    coins -= itemPrice; await updateCoins();
    await supabase.from("items").delete().eq("id", itemId);
    alert("Purchase successful!");
    loadItems();
}
