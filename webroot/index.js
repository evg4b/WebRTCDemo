// html elements
const startBtn = document.getElementById('start');
const localSdp = document.getElementById('localSdp');
const remoteSdp = document.getElementById('remoteSdp');
const localVideo = document.getElementById('localVideo');
const remoteVideo = document.getElementById('remoteVideo');
const connectionState = document.getElementById('connection-state');
const startButton = document.getElementById('startButton');
const callButton = document.getElementById('callButton');
const hangupButton = document.getElementById('hangupButton');

// web sockets connections
const host = document.location.host;
const socket = new WebSocket(`ws://${host}/ws`);

// create connection with 
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

socket.addEventListener('open', () => {
    trace(`WebSocket connection was opened with host: ${host}`);
});

socket.addEventListener('error', (event) => {
    trace(`WebSocket connection returns error`);
    console.error(event);
});

socket.addEventListener('message', async (event) => {
    try {
        const { type, data } = JSON.parse(event.data);
        trace(`From web socket was given '${type}' message: ${data}`)
        switch (type) {
            case 'offer':
                return receiveOffer(data);
            case 'answer':
                return receiveAnswer(data);
            case 'icecandidate':
                return receiveIceCandidate(data)
        }
    } catch (e) {
        trace(`Error parse ${event.data}`)
    }
});

const receiveOffer = async (offer) => {
    connection.setRemoteDescription(offer);
    const answer = await connection.createAnswer()
    connection.setLocalDescription(answer);

    remoteSdp.value = offer.sdp;
    localSdp.innerText = answer.sdp;
    sendMessage('answer', answer)
}

const receiveAnswer = async (answer) => {
    connection.setRemoteDescription(answer);
    remoteSdp.value = answer.sdp;
}

const receiveIceCandidate = async (iceCandidate) => {
    const newIceCandidate = new RTCIceCandidate(iceCandidate);
    await connection.addIceCandidate(newIceCandidate);
    trace(`Added ICE candidate:\n` + `${newIceCandidate.candidate}.`);
}

// Define action buttons.
// Set up initial action buttons status: disable call and hangup.
// callButton.disabled = true;
hangupButton.disabled = true;

// Add click event handlers for buttons.
startButton.addEventListener('click', startAction);
callButton.addEventListener('click', callAction);
// hangupButton.addEventListener('click', hangupAction);

const mediaStreamConstraints = {
    video: true,
};

// Handles start button action: creates local MediaStream.
function startAction() {
    startButton.disabled = true;
    if (navigator.mediaDevices) {
        navigator.mediaDevices.getUserMedia(mediaStreamConstraints)
            .then(gotLocalMediaStream)
            .catch(handleLocalMediaStreamError);
    }
    trace('Requesting local stream.');
}

const offerOptions = {
    offerToReceiveVideo: 1,
};

var localStream = null;

// Handles call button action: creates peer connection.
function callAction() {
    callButton.disabled = true;
    hangupButton.disabled = false;

    console.trace('Starting call.')
    startTime = window.performance.now();

    let videoTracks = [];
    let audioTracks = [];

    if (localStream) {
        // Get local media stream tracks.
        videoTracks = localStream.getVideoTracks();
        audioTracks = localStream.getAudioTracks();
    }

    if (videoTracks.length > 0) {
        trace(`Using video device: ${videoTracks[0].label}.`);
    }
    if (audioTracks.length > 0) {
        trace(`Using audio device: ${audioTracks[0].label}.`);
    }

    connection.addEventListener('icecandidate', handleConnection);
    connection.addEventListener('iceconnectionstatechange', handleConnectionChange);


    if (localStream) {
        connection.addStream(localStream);
    }

    trace('Added local stream to connection.');

    trace('connection createOffer start.');
    connection.createOffer(offerOptions)
        .then(createdOffer)
        .catch(setSessionDescriptionError);
}

function handleConnection(event) {
    const iceCandidate = event.candidate;
    if (iceCandidate) {
        sendICE(iceCandidate);
    }
}

const sendICE = throttle(SendCandidate, 500);

function SendCandidate(iceCandidate) {
    sendMessage('icecandidate', iceCandidate);
}

// Logs that the connection succeeded.
function handleConnectionSuccess(peerConnection) {
    trace(`${getPeerName(peerConnection)} addIceCandidate success.`);
};

// Logs that the connection failed.
function handleConnectionFailure(peerConnection, error) {
    trace(`${getPeerName(peerConnection)} failed to add ICE Candidate:\n` +
        `${error.toString()}.`);
}

// Logs changes to the connection state.
function handleConnectionChange(event) {
    const peerConnection = event.target;
    console.log('ICE state change event: ', event);
    trace(`${getPeerName(peerConnection)} ICE state: ` +
        `${peerConnection.iceConnectionState}.`);
}

const getPeerName = () => 'onnection'

function createdOffer(description) {
    trace(`Offer from connection:\n${description.sdp}`);

    localSdp.innerText = description.sdp;
    sendMessage('offer', description);

    trace('connection setLocalDescription start.');
    connection.setLocalDescription(description)
        .then(() => {
            setLocalDescriptionSuccess(connection);
        }).catch(setSessionDescriptionError);
}

// Handles error by logging a message to the console.
function handleLocalMediaStreamError(error) {
    trace(`navigator.getUserMedia error: ${error.toString()}.`);
}

// Logs success when setting session description.
function setDescriptionSuccess(peerConnection, functionName) {
    trace(`${peerConnection} ${functionName} complete.`);
}

// Logs success when localDescription is set.
function setLocalDescriptionSuccess(peerConnection) {
    setDescriptionSuccess(peerConnection, 'setLocalDescription');
}

// Logs success when remoteDescription is set.
function setRemoteDescriptionSuccess(peerConnection) {
    setDescriptionSuccess(peerConnection, 'setRemoteDescription');
}
// Logs error when setting session description fails.
function setSessionDescriptionError(error) {
    trace(`Failed to create session description: ${error.toString()}.`);
}

// Sets the MediaStream as the video element src.
function gotLocalMediaStream(mediaStream) {
    localVideo.srcObject = mediaStream;
    localStream = mediaStream;
    trace('Received local stream.');
    callButton.disabled = false;  // Enable call button.
}

function throttle(func, ms) {

    let isThrottled = false,
        savedArgs = [],
        savedThis;

    function wrapper() {
        savedArgs.push(arguments[0]);
        if (isThrottled) { // (2)
            savedThis = this;
            return;
        }

        func.apply(this, savedArgs); // (1)
        savedArgs = []
        isThrottled = true;

        setTimeout(function () {
            isThrottled = false; // (3)
            if (savedArgs.length > 0) {
                wrapper.apply(savedThis, savedArgs);
                savedArgs = [];
                savedThis = null;
            }
        }, ms);
    }

    return wrapper;
}



connectionState.innerText = connection.connectionState;
connection.onconnectionstatechange = () => {
    connectionState.innerText = connection.connectionState
};



connection.addEventListener('addstream', gotRemoteMediaStream);;

function gotRemoteMediaStream(event) {
    const mediaStream = event.stream;
    remoteVideo.srcObject = mediaStream;
    remoteStream = mediaStream;
    trace('Remote peer connection received remote stream.');
}

var ch = connection.createDataChannel('demo');

ch.onopen = () => {
    ch.send("dfsdfsdfdfsdfsdfdfsdfsdfdfsdfsdfdfsdfsdfdfsdfsdfdfsdfsdfdfsdfsdfdfsdfsdfdfsdfsdfdfsdfsdfdfsdfsdfdfsdfsdfdfsdfsdfdfsdfsdfdfsdfsdf")
}

ch.onmessage = console.log
ch.addEventListener('onmessage', console.warn);
ch.addEventListener('bufferedamountlow', console.warn);

function sendMessage(type, data) {
    socket.send(JSON.stringify({ type, data }))
}

const trace = console.log;