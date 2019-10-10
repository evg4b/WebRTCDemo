// html elements
const localSdp = document.getElementById('localSdp');
const remoteSdp = document.getElementById('remoteSdp');
const localVideo = document.getElementById('localVideo');
const remoteVideo = document.getElementById('remoteVideo');
const connectionState = document.getElementById('connection-state');
const iceConnectionState = document.getElementById('ice-connection-state');
const callButton = document.getElementById('callButton');
const answerButton = document.getElementById('answerButton');
const hangupButton = document.getElementById('hangupButton');

// helpers
const sendMessage = (type, data) => {
  socket.send(JSON.stringify({ type, data }));
  console.log(`Sended '${type}' message to remote instance:`, data);
}

const hide = (element) => element.style.display = 'none';
const show = (element) => element.style.display = null;
const enable = (element) => element.disabled = false;
const disable = (element) => element.disabled = true;

// WebSocket connection and event handling
const { host } = document.location;
const socket = new WebSocket(`ws://${host}/ws`);

socket.addEventListener('open', () => {
  console.log(`WebSocket connection was opened with ${host}`);
});

socket.addEventListener('error', (event) => {
  console.error('WebSocket connection returns error', event);
});

socket.addEventListener('message', (event) => {
  try {
    const { type, data } = JSON.parse(event.data);
    console.log(`Was given '${type}' message from another instance`, data);
    switch (type) {
      case 'offer':
        return receiveOffer(data);
      case 'answer':
        return receiveAnswer(data);
      case 'icecandidate':
        return receiveIceCandidate(data);
    }
  } catch (error) {
    console.error('Error receiving data', event.data, error);
  }
});

// WebRTC connection and event handling
const offerOptions = {
  offerToReceiveAudio: true,
  offerToReceiveVideo: true,
};

const connection = new RTCPeerConnection({
  iceServers: [
    { url: 'stun:stun.l.google.com:19302' },
    { url: 'stun:stun1.l.google.com:19302' },
    { url: 'stun:stun2.l.google.com:19302' },
    { url: 'stun:stun3.l.google.com:19302' },
    { url: 'stun:stun4.l.google.com:19302' },
  ],
});

connection.addEventListener('icecandidate', (event) => {
  const iceCandidate = event.candidate;
  if (iceCandidate) {
    console.log('Founded new ICE candidate', iceCandidate);
    sendMessage('icecandidate', iceCandidate);
  }
});

connection.addEventListener('iceconnectionstatechange', (event) => {
  const peerConnection = event.target;
  console.log(`ICE connection state changed to: ${peerConnection.iceConnectionState}`);
  iceConnectionState.innerText = peerConnection.iceConnectionState;
  if (peerConnection.iceConnectionState == 'disconnected') {
    console.log('ICE connection gone, RTC connection will be closed');
    closeConnection(connection);
  }
});

connection.addEventListener('connectionstatechange', (event) => {
  const peerConnection = event.target;
  console.log(`RTC connection state changed to: ${peerConnection.connectionState}.`);
  connectionState.innerText = connection.connectionState;
});

connection.addEventListener('addstream', (event) => {
  remoteVideo.srcObject = event.stream;
  console.log('Connection received remote stream');
});

const receiveOffer = async (offer) => {
  try {
    connection.setRemoteDescription(offer);
    console.log('Set remote description as', offer);

    hide(callButton);
    show(answerButton);

    remoteSdp.value = offer.sdp;
  } catch (error) {
    console.error('Failed reviewing offer', error);
  }
};

const closeConnection = (peerConnection) => {
  peerConnection.close();
  console.log('RTC connection was closed');

  connectionState.innerText = peerConnection.connectionState;
  remoteVideo.srcObject = undefined;
  remoteSdp.value = '';
  disable(hangupButton);
}

const receiveAnswer = async (answer) => {
  connection.setRemoteDescription(answer);
  console.log('Set remote description as', answer);
  remoteSdp.value = answer.sdp;
};

const receiveIceCandidate = async (iceCandidate) => {
  const newIceCandidate = new RTCIceCandidate(iceCandidate);
  await connection.addIceCandidate(newIceCandidate);
  console.log('Added ICE candidate:', newIceCandidate);
};

// User actions
callButton.addEventListener('click', async () => {
  disable(callButton);
  enable(hangupButton);

  console.log('Starting call');
  try {
    if (localStream) {
      connection.addStream(localStream);
      console.log('Added local stream to connection');
    }

    const offer = await connection.createOffer(offerOptions);
    console.log('Created offer', offer);

    localSdp.innerText = offer.sdp;
    sendMessage('offer', offer);

    await connection.setLocalDescription(offer);
    console.log('Set local description as', offer);
  } catch (error) {
    console.error(error);
  }
});

answerButton.addEventListener('click', async () => {
  disable(answerButton);
  enable(hangupButton);

  console.log('Answer call');
  try {
    if (localStream) {
      console.log('Added local stream to connection');
      connection.addStream(localStream);
    }

    const answer = await connection.createAnswer(offerOptions);
    console.log('Created answer', answer);
    connection.setLocalDescription(answer);
    console.log('Set local description as', answer);

    localSdp.innerText = answer.sdp;
    sendMessage('answer', answer);
  } catch (error) {
    console.error(error);
  }
});

hangupButton.addEventListener('click', () => {
  console.log('Hang up');
  closeConnection(connection);
});

// init function
let localStream = null;
let remoteStream = null;
(async () => {
  hide(answerButton);
  disable(hangupButton);

  connectionState.innerText = connection.connectionState;
  iceConnectionState.innerText = connection.iceConnectionState;

  try {
    if (navigator.mediaDevices) {
      localStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      localVideo.srcObject = localStream;
      console.log('Received local stream');
      const videoTracks = localStream.getVideoTracks();
      const audioTracks = localStream.getAudioTracks();
      if (videoTracks.length > 0) {
        console.log(`Using video device: ${videoTracks[0].label}.`);
      }
      if (audioTracks.length > 0) {
        console.log(`Using audio device: ${audioTracks[0].label}.`);
      }
      callButton.disabled = false;
    }
  } catch (error) {
    console.log('Reject local stream', error);
  }
})();
