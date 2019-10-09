// html elements
const localSdp = document.getElementById('localSdp');
const remoteSdp = document.getElementById('remoteSdp');
const localVideo = document.getElementById('localVideo');
const remoteVideo = document.getElementById('remoteVideo');
const connectionState = document.getElementById('connection-state');
const iceConnectionState = document.getElementById('ice-connection-state');
const callButton = document.getElementById('callButton');
const hangupButton = document.getElementById('hangupButton');

// define helper functions
function sendMessage(type, data) {
  socket.send(JSON.stringify({ type, data }));
  console.log('Sended message to remote ')
}

// WebSocket connection
const { host } = document.location;
const socket = new WebSocket(`ws://${host}/ws`);

socket.addEventListener('open', () => {
  console.log(`WebSocket connection was opened with ${host}`);
});

socket.addEventListener('error', (event) => {
  console.error(`WebSocket connection returns error`, event);
});

socket.addEventListener('message', (event) => {
  try {
    const { type, data } = JSON.parse(event.data);
    console.log(`From web socket was given '${type}' message:`, data);
    switch (type) {
      case 'offer':
        return receiveOffer(data);
      case 'answer':
        return receiveAnswer(data);
      case 'icecandidate':
        return receiveIceCandidate(data);
    }
  } catch (error) {
    console.error(`Error parse`, event.data, error);
  }
});

// WebRTC connection
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
  console.log(`ICE state changed to: ${peerConnection.iceConnectionState}.`);
  iceConnectionState.innerText = peerConnection.iceConnectionState;
});

connection.addEventListener('connectionstatechange', (event) => {
  const peerConnection = event.target;
  console.log(`RTC state changed to: ${peerConnection.connectionState}.`);
  connectionState.innerText = connection.connectionState;
});

connection.addEventListener('addstream', (event) => {
  remoteVideo.srcObject = event.stream;
  console.log('Connection received remote stream');
});

const receiveOffer = async (offer) => {
  try {
    connection.setRemoteDescription(offer);
    const answer = await connection.createAnswer();
    connection.setLocalDescription(answer);
    sendMessage('answer', answer);

    remoteSdp.value = offer.sdp;
    localSdp.innerText = answer.sdp;
    if (!callButton.disabled) {
      callButton.innerText = 'Answer';
    }
  } catch (error) {
    console.error('Failed reviewing offer', error);
  }
};

const receiveAnswer = async (answer) => {
  connection.setRemoteDescription(answer);
  remoteSdp.value = answer.sdp;
};

const receiveIceCandidate = async (iceCandidate) => {
  const newIceCandidate = new RTCIceCandidate(iceCandidate);
  await connection.addIceCandidate(newIceCandidate);
  console.log('Added ICE candidate:\n' + `${newIceCandidate.candidate}.`);
};

callButton.addEventListener('click', async () => {
  callButton.disabled = true;
  hangupButton.disabled = false;

  try {
    console.log('Starting call');
    if (localStream) {
      console.log('Added local stream to connection');
      connection.addStream(localStream);
    }

    const offer = await connection.createOffer({
      offerToReceiveAudio: true,
      offerToReceiveVideo: true,
    });
    console.log('Created offer:', offer);

    localSdp.innerText = offer.sdp;
    sendMessage('offer', offer);

    await connection.setLocalDescription(offer);
    console.log('Set local description as offer', offer);
  } catch (error) {
    console.error(error);
  }
});

let localStream = null;
let remoteStream = null;
(async () => {
  connectionState.innerText = connection.connectionState;
  hangupButton.disabled = true;
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
