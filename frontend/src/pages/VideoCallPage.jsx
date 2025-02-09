import React, { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuthStore } from "../store/useAuthStore";
import { useChatStore } from "../store/useChatStore";
import { VideoOff, MicOff, Mic, Video, VideoOff as VideoOffIcon } from "lucide-react";
import toast from "react-hot-toast";

const VideoCallPage = () => {
  const { authUser, socket } = useAuthStore(); // Use global socket
  const { selectedUser, sendMessage } = useChatStore();
  const [isCalling, setIsCalling] = useState(true);
  const [isMuted, setIsMuted] = useState(false);
  const [isCameraOff, setIsCameraOff] = useState(false);
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const peerConnectionRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (!authUser || !selectedUser) return;
    if (!socket) return; // Don't create a new socket, use the global one

    socket.on("offer", async ({ offer, from }) => {
      if (from !== selectedUser._id) return;
      const peerConnection = createPeerConnection(from);
      await peerConnection.setRemoteDescription(new RTCSessionDescription(offer));
      const answer = await peerConnection.createAnswer();
      await peerConnection.setLocalDescription(answer);
      socket.emit("answer", { answer, to: from });
    });

    socket.on("answer", async ({ answer, from }) => {
      if (from !== selectedUser._id) return;
      const peerConnection = peerConnectionRef.current;
      await peerConnection.setRemoteDescription(new RTCSessionDescription(answer));
    });

    socket.on("ice-candidate", async ({ candidate, from }) => {
      if (from !== selectedUser._id) return;
      const peerConnection = peerConnectionRef.current;
      await peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
    });

    socket.on("call-ended", () => {
      endCall();
      toast.info("The call was ended by the other user.");
    });

    return () => {
      // Cleanup on unmount
      socket.off("offer");
      socket.off("answer");
      socket.off("ice-candidate");
      socket.off("call-ended");
    };
  }, [socket, selectedUser, authUser]);

  const createPeerConnection = (to) => {
    const peerConnection = new RTCPeerConnection({
      iceServers: [
        { urls: "stun:stun.l.google.com:19302" },
        { urls: "stun:stun1.l.google.com:19302" },
      ],
    });

    peerConnection.onicecandidate = (event) => {
      if (event.candidate) {
        socket.emit("ice-candidate", { candidate: event.candidate, to });
      }
    };

    peerConnection.ontrack = (event) => {
      remoteVideoRef.current.srcObject = event.streams[0];
    };

    peerConnectionRef.current = peerConnection;
    return peerConnection;
  };

  const startCall = async () => {
    if (!authUser || !selectedUser) return;
    if (!socket) return; // Ensure socket exists

    const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
    localVideoRef.current.srcObject = stream;

    const peerConnection = createPeerConnection(selectedUser._id);
    stream.getTracks().forEach((track) => peerConnection.addTrack(track, stream));

    const offer = await peerConnection.createOffer();
    await peerConnection.setLocalDescription(offer);
    socket.emit("offer", { offer, to: selectedUser._id });
  };

  const endCall = async () => {
    setIsCalling(false);

    // Close WebRTC Peer Connection
    if (peerConnectionRef.current) {
      peerConnectionRef.current.getSenders().forEach((sender) => {
        if (sender.track) sender.track.stop();
      });
      peerConnectionRef.current.close();
      peerConnectionRef.current = null;
    }

    // Stop & Clear Local Video Stream
    if (localVideoRef.current?.srcObject) {
      localVideoRef.current.srcObject.getTracks().forEach((track) => {
        track.stop(); // Stop video & audio tracks
      });
      localVideoRef.current.srcObject = null;
    }

    // Stop & Clear Remote Video Stream
    if (remoteVideoRef.current?.srcObject) {
      remoteVideoRef.current.srcObject.getTracks().forEach((track) => {
        track.stop();
      });
      remoteVideoRef.current.srcObject = null;
    }

    // Force release camera and microphone access
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      mediaStream.getTracks().forEach((track) => track.stop());
    } catch (error) {
      console.warn("Error releasing media devices:", error);
    }

    // Send Automatic Message Indicating Call End
    await sendMessage({
      text: `Call Ended at ${new Date().toLocaleTimeString()}`,
      image: null,
      video: null,
    });

    // Notify the other user that the call has ended
    socket.emit("call-ended", { to: selectedUser._id });

    // Display toast notification
    toast.success("Call ended successfully");

    // Navigate back to chat
    navigate(`/chat/${selectedUser._id}`);
  };

  const toggleMute = () => {
    const stream = localVideoRef.current.srcObject;
    stream.getAudioTracks().forEach((track) => (track.enabled = !track.enabled));
    setIsMuted(!isMuted);
  };

  const toggleCamera = () => {
    const stream = localVideoRef.current.srcObject;
    stream.getVideoTracks().forEach((track) => (track.enabled = !track.enabled));
    setIsCameraOff(!isCameraOff);
  };

  useEffect(() => {
    startCall();
  }, [authUser, selectedUser]);

  if (!authUser || !selectedUser) {
    return <div>Loading...</div>;
  }

  return (
    <div className="flex flex-col items-center p-4">
      {/* Video Container */}
      <div className="w-full max-w-lg h-64 sm:h-80 md:h-96 flex flex-col sm:flex-row justify-center gap-3 bg-gray-800 rounded-lg overflow-hidden shadow-lg">
        <video
          ref={localVideoRef}
          autoPlay
          playsInline
          muted
          className="w-full sm:w-1/2 h-full object-cover rounded-lg"
        />
        <video
          ref={remoteVideoRef}
          autoPlay
          playsInline
          className="w-full sm:w-1/2 h-full object-cover rounded-lg"
        />
      </div>

      {/* Call Controls */}
      <div className="mt-4 flex gap-4">
        {isCalling && (
          <>
            <button
              onClick={toggleMute}
              className="flex items-center gap-2 px-4 py-2 bg-gray-500 text-white rounded-lg shadow-lg hover:bg-gray-600"
            >
              {isMuted ? <MicOff size={20} /> : <Mic size={20} />}
            </button>
            <button
              onClick={toggleCamera}
              className="flex items-center gap-2 px-4 py-2 bg-gray-500 text-white rounded-lg shadow-lg hover:bg-gray-600"
            >
              {isCameraOff ? <VideoOffIcon size={20} /> : <Video size={20} />}
            </button>
            <button
              onClick={endCall}
              className="flex items-center gap-2 px-4 py-2 bg-red-500 text-white rounded-lg shadow-lg hover:bg-red-600"
            >
              <VideoOff size={20} /> End Call
            </button>
          </>
        )}
      </div>
    </div>
  );
};

export default VideoCallPage;