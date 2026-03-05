let coins = 20;

function sendMessage(){

const messageInput = document.getElementById("messageInput");
const chatBox = document.getElementById("chatBox");
const coinDisplay = document.getElementById("coinCount");

let message = messageInput.value;

if(message === ""){
alert("Type a message first");
return;
}

if(coins <= 0){
alert("You have no coins left. Buy more coins.");
return;
}

coins = coins - 1;

coinDisplay.innerText = coins;

let newMessage = document.createElement("div");
newMessage.innerText = message;

chatBox.appendChild(newMessage);

messageInput.value = "";

chatBox.scrollTop = chatBox.scrollHeight;

}
