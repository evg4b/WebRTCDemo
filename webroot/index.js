/* eslint-disable no-use-before-define */
/* eslint-disable no-console */
/* eslint-disable default-case */
// html elements
const localSdp = document.getElementById('localSdp');
const remoteSdp = document.getElementById('remoteSdp');
const localVideo = document.getElementById('localVideo');
const remoteVideo = document.getElementById('remoteVideo');
const connectionState = document.getElementById('connection-state');
const callButton = document.getElementById('callButton');
const hangupButton = document.getElementById('hangupButton');

// define helper functions
const trace = console.log;

function sendMessage(type, data) {
  socket.send(JSON.stringify({ type, data }));
}

// web sockets connections
const { host } = document.location;
const socket = new WebSocket(`ws://${host}/ws`);

socket.addEventListener('open', () => {
  trace(`WebSocket connection was opened with ${host}`);
});

socket.addEventListener('error', (event) => {
  trace(`WebSocket connection with ${host} returns error`);
  console.error(event);
});

socket.addEventListener('message', (event) => {
  try {
    const { type, data } = JSON.parse(event.data);
    trace(`From web socket was given '${type}' message: ${data}`);
    switch (type) {
      case 'offer':
        return receiveOffer(data);
      case 'answer':
        return receiveAnswer(data);
      case 'icecandidate':
        return receiveIceCandidate(data);
    }
  } catch (error) {
    trace(`Error parse ${event.data}`);
    console.error(error);
  }
});

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
  ],
});

const receiveOffer = async (offer) => {
  connection.setRemoteDescription(offer);
  const answer = await connection.createAnswer();
  connection.setLocalDescription(answer);
  sendMessage('answer', answer);

  remoteSdp.value = offer.sdp;
  localSdp.innerText = answer.sdp;
  if (!callButton.disabled) {
    callButton.innerText = 'Answer';
  }
};

const receiveAnswer = async (answer) => {
  connection.setRemoteDescription(answer);
  remoteSdp.value = answer.sdp;
};

const receiveIceCandidate = async (iceCandidate) => {
  const newIceCandidate = new RTCIceCandidate(iceCandidate);
  await connection.addIceCandidate(newIceCandidate);
  trace('Added ICE candidate:\n' + `${newIceCandidate.candidate}.`);
};

callButton.addEventListener('click', callAction);

let localStream = null;
let remoteStream = null;
(async () => {
  hangupButton.disabled = true;
  try {
    if (navigator.mediaDevices) {
      localStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      localVideo.srcObject = localStream;
      trace('Received local stream.');
      const videoTracks = localStream.getVideoTracks();
      const audioTracks = localStream.getAudioTracks();
      if (videoTracks.length > 0) {
        trace(`Using video device: ${videoTracks[0].label}.`);
      }
      if (audioTracks.length > 0) {
        trace(`Using audio device: ${audioTracks[0].label}.`);
      }
      callButton.disabled = false;
    }
  } catch (error) {
    trace('Reject local stream.');
  }
})();

// Handles call button action: creates peer connection.
function callAction() {
  callButton.disabled = true;
  hangupButton.disabled = false;

  trace('Starting call.');

  connection.addEventListener('icecandidate', handleConnection);
  connection.addEventListener('iceconnectionstatechange', handleConnectionChange);


  if (localStream) {
    connection.addStream(localStream);
  }

  trace('Added local stream to connection.');

  trace('connection createOffer start.');
  connection.createOffer({
    offerToReceiveAudio: true,
    offerToReceiveVideo: true,
  })
    .then(createdOffer)
    .catch(setSessionDescriptionError);
}

function handleConnection(event) {
  const iceCandidate = event.candidate;
  if (iceCandidate) {
    sendMessage('icecandidate', iceCandidate);
  }
}

// Logs changes to the connection state.
function handleConnectionChange(event) {
  const peerConnection = event.target;
  console.log('ICE state change event: ', event);
  trace(`${getPeerName(peerConnection)} ICE state: `
    + `${peerConnection.iceConnectionState}.`);
}

const getPeerName = () => 'onnection';

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

// Logs success when setting session description.
function setDescriptionSuccess(peerConnection, functionName) {
  trace(`${peerConnection} ${functionName} complete.`);
}

// Logs success when localDescription is set.
function setLocalDescriptionSuccess(peerConnection) {
  setDescriptionSuccess(peerConnection, 'setLocalDescription');
}

// Logs error when setting session description fails.
function setSessionDescriptionError(error) {
  trace(`Failed to create session description: ${error.toString()}.`);
}

connectionState.innerText = connection.connectionState;
connection.onconnectionstatechange = () => {
  connectionState.innerText = connection.connectionState;
};

connection.addEventListener('addstream', gotRemoteMediaStream);

function gotRemoteMediaStream(event) {
  const mediaStream = event.stream;
  remoteVideo.srcObject = mediaStream;
  remoteStream = mediaStream;
  trace('Remote peer connection received remote stream.');
}


