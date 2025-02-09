import { useRef, useState } from "react";
import { useChatStore } from "../store/useChatStore";
import { Image, Send, X, Video, Loader2 } from "lucide-react";
import toast from "react-hot-toast";
import imageCompression from "browser-image-compression";

const MessageInput = () => {
  const [text, setText] = useState("");
  const [mediaPreview, setMediaPreview] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef(null);
  const { sendMessage } = useChatStore();

  const handleMediaChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!file.type.startsWith("image/") && !file.type.startsWith("video/")) {
      toast.error("Please select an image or video file");
      return;
    }

    setIsUploading(true);

    try {
      let compressedFile = file;
      if (file.type.startsWith("image/")) {
        const options = {
          maxSizeMB: 10,
          useWebWorker: true,
        };
        compressedFile = await imageCompression(file, options);
      }

      const reader = new FileReader();
      reader.onloadend = () => {
        setMediaPreview({ type: file.type, src: reader.result });
        setIsUploading(false);
      };
      reader.readAsDataURL(compressedFile);
    } catch (error) {
      console.error("Error processing media", error);
      toast.error("Failed to process media");
      setIsUploading(false);
    }
  };

  const removeMedia = () => {
    setMediaPreview(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!text.trim() && !mediaPreview) return; // Prevent empty message send
    
    if (isUploading) return; // Prevent sending while uploading
  
    setIsUploading(true);
    try {
      await sendMessage({
        text: text.trim() || null, // Ensure text is either a valid string or explicitly null
        image: mediaPreview?.type.startsWith("image/") ? mediaPreview.src : null,
        video: mediaPreview?.type.startsWith("video/") ? mediaPreview.src : null,
      });
  
      setText(""); // Clear text input
      setMediaPreview(null); // Clear media
      if (fileInputRef.current) fileInputRef.current.value = "";
    } catch (error) {
      console.error("Failed to send message:", error);
      toast.error("Failed to send message");
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="p-4 w-full">
      {mediaPreview && (
        <div className="mb-3 flex items-center gap-2">
          <div className="relative">
            {mediaPreview.type.startsWith("image/") ? (
              <img
                src={mediaPreview.src}
                alt="Preview"
                className="w-20 h-20 object-cover rounded-lg border border-zinc-700"
              />
            ) : (
              <video
                src={mediaPreview.src}
                className="w-20 h-20 object-cover rounded-lg border border-zinc-700"
                controls
              />
            )}
            <button
              onClick={removeMedia}
              className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-base-300 flex items-center justify-center"
              type="button"
            >
              <X className="size-3" />
            </button>
          </div>
        </div>
      )}

      <form onSubmit={handleSendMessage} className="flex items-center gap-2">
        <div className="flex-1 flex gap-2">
          <input
            type="text"
            className="w-full input input-bordered rounded-lg input-sm sm:input-md"
            placeholder="Type a message..."
            value={text}
            onChange={(e) => setText(e.target.value)}
            disabled={isUploading}
          />
          <input
            type="file"
            accept="image/*,video/*"
            className="hidden"
            ref={fileInputRef}
            onChange={handleMediaChange}
            disabled={isUploading}
          />
          <button
            type="button"
            className={`hidden sm:flex btn btn-circle ${isUploading ? "opacity-50" : "text-zinc-400"}`}
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
          >
            {mediaPreview?.type.startsWith("video/") ? <Video size={20} /> : <Image size={20} />}
          </button>
        </div>
        <button
          type="submit"
          className="btn btn-sm btn-circle"
          disabled={(!text.trim() && !mediaPreview) || isUploading}
        >
          {isUploading ? <Loader2 className="animate-spin" size={22} /> : <Send size={22} />}
        </button>
      </form>
    </div>
  );
};

export default MessageInput;