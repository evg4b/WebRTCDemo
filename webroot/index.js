const currentId = `f${(~~(Math.random() * 1e8)).toString(16)}`;
const socked = new WebSocket("ws://172.20.40.91:8010/ws")
const startBtn = document.getElementById('start');
const localSdp = document.getElementById('localSdp');
const remoteSdp = document.getElementById('remoteSdp');

const connection = new RTCPeerConnection({
    iceServers: [
        { url: 'stun:stun.l.google.com:19302' },
        { url: 'stun:stun1.l.google.com:19302' },
        { url: 'stun:stun2.l.google.com:19302' },
        { url: 'stun:stun3.l.google.com:19302' },
        { url: 'stun:stun4.l.google.com:19302' },
        { url: 'stun:stun01.sipphone.com' },
        { url: 'stun:stun.ekiga.net' },
        { url: 'stun:stun.fwdnet.net' },
        { url: 'stun:stun.ideasip.com' },
        { url: 'stun:stun.iptel.org' },
        { url: 'stun:stun.rixtelecom.se' },
        { url: 'stun:stun.schlund.de' },
        { url: 'stun:stunserver.org' },
        { url: 'stun:stun.softjoys.com' },
        { url: 'stun:stun.voiparound.com' },
        { url: 'stun:stun.voipbuster.com' },
        { url: 'stun:stun.voipstunt.com' },
        { url: 'stun:stun.voxgratia.org' },
        { url: 'stun:stun.xten.com' },
    ]
});

socked.onopen = () => {
    console.log("OPEN")
}




let ddd = false;
socked.onerror = (event) => {
    console.log("ERROR", event)
}

socked.onmessage = (event) => {
    console.log(event);
    const { id, type, data } = JSON.parse(event.data);
    if (id != currentId) {
        handle(type, data)
    }
}


async function handle(type, data) {
    switch (type) {
        case 'offer':
            remoteSdp.value = data.sdp;
            connection.setRemoteDescription(data);
            const answer = await connection.createAnswer()
            connection.setLocalDescription(answer);
            localSdp.value = answer.sdp;
            sendMessage('answer', answer)
            ddd = true;
            break;
        case 'answer':
            connection.setRemoteDescription(data);
            remoteSdp.value = data.sdp;
            ddd = true;
            break;
        case 'ice':
            connection.addIceCandidate(data);
            break;
    }
}

var ch = connection.createDataChannel('demo');

startBtn.addEventListener('click', async () => {
    var offer = await connection.createOffer();
    connection.setLocalDescription(offer);
    localSdp.value = offer.sdp;
    sendMessage('offer', offer);
});

connection.onicecandidate = async (event) => {
    if (event.candidate && ddd) {
        // sendMessage('ice', event.candidate)
    }
}

ch.onopen = () => alert("УРААА")

ch.onmessage = console.log
console.log(connection)
console.log(ch)

function sendMessage(type, data) {
    socked.send(JSON.stringify({ type, data, id: currentId }))
}
