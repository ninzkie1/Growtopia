import cloudinary from "../lib/cloudinary.js";
import Message from "../models/message.model.js";
import User from "../models/user.model.js";


export const getUsersForSidebar = async (req, res) => {
    try {
        const loggedInUser = req.user._id;
        const filteredUsers = await User.find({_id:{$ne:loggedInUser}}).select("-password");
        res.status(200).json(filteredUsers);
    } catch (error) {
        cosole.log("error in getUsersForSidebar controller", error.message);
        res.status(500).json({message: "Internal server error"});
        
    }
}
export const getMessages = async (req, res) => {
    try {
        const {id:userToChatId} = req.params;
        const myId = req.user._id;
        const messages = await Message.find({
            $or: [
                {senderId: myId, receiverId: userToChatId},
                {senderId: userToChatId, receiverId: myId},
            ],
        });
        res.status(200).json(messages);
    } catch (error) {
        console.log("error in getMessages controller", error.message);
        res.status(500).json({message: "Internal server error"});
    }
};
export const sendMessage = async (req, res) => {
    try {
        const {text,image,video} = req.body;
        const {id:receiverId} = req.params;
        const senderId = req.user._id;
        let imageUrl;
        if(image){
            const uploadResponse = await cloudinary.uploader.upload(image);
            imageUrl = uploadResponse.secure_url;
        }
        let videoUrl;
        if(video){
            const uploadResponse = await cloudinary.uploader.upload(video);
            videoUrl = uploadResponse.secure_url;
        }
        const newMessage = new Message({
            senderId,
            receiverId,
            text,
            image: imageUrl,
            video: videoUrl,
        });
        await newMessage.save();
        //realtime here later
        res.status(201).json(newMessage);
    } catch (error) {
        console.log("error in sendMessage controller", error.message);
        res.status(500).json({message: "Internal server error"});
        
    }
};