import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Video } from "lucide-react";
import { useChatStore } from "../store/useChatStore";

const VideoCall = () => {
  const navigate = useNavigate();
  const { selectedUser } = useChatStore();
  const [isCalling, setIsCalling] = useState(false);

  useEffect(() => {
    const handleCall = () => {
      setIsCalling(true);
      setTimeout(() => setIsCalling(false), 3000); // Reset after 3 seconds
    };

    if (selectedUser) {
      handleCall();
    }
  }, [selectedUser]);

  const handleStartCall = () => {
    navigate("/videocall");
  };

  return (
    <button
      onClick={handleStartCall}
      className={`p-2 rounded-full hover:bg-gray-200 ${isCalling ? "animate-bounce" : ""}`}
    >
      <Video size={20} />
    </button>
  );
};

export default VideoCall;