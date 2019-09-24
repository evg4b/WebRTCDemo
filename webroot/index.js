(async () => {
    const startBtn = document.getElementById('start');

    const connection = new RTCPeerConnection({
        iceServers: [{ url: 'turn:172.20.40.91:3478' }]
    });

    startBtn.addEventListener('click', async () => {
        console.log('start');
        startBtn.disabled = true;
        var offer = await connection.createOffer();

    });



    // const localSdp = document.getElementById('localSdp');
    // const localType = document.getElementById('localType');
    // const setRemote = document.getElementById('setRemote');
    // const remoteSdp = document.getElementById('remoteSdp');
    // const remoteType = document.getElementById('remoteType');

    // const connection = new RTCPeerConnection({
    //     iceServers: [{ url: 'turn:172.20.40.91:3478' }]
    // });
    // const offer = await connection.createOffer();
    // // connection.setLocalDescription(offer);
    // localType.value = offer.type;
    // localSdp.value = offer.sdp;


    // setRemote.addEventListener('click', async () => {
    //     var desc = new RTCSessionDescription({
    //         sdp: remoteSdp.value,
    //         type: remoteType.value
    //     });
    //     connection.setRemoteDescription(desc)
    //     var a = await connection.createAnswer()
    //     console.log(a);
    //     // var a = connection.createDataChannel('dasdas')
    //     // a.onopen = () => {
    //     //     console.log("OPEN")
    //     // }
    //     // a.send("sadsad");
    // })


})();

