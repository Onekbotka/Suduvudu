const axios = require("axios");
const fs = require("fs-extra");
const path = require("path");

const apiUrl =
 "https://raw.githubusercontent.com/Saim-x69x/sakura/main/ApiUrl.json";

async function getApiUrl() {
 const res = await axios.get(apiUrl);
 return res.data.apiv5;
}

module.exports = {
 config: {
 name: "nanobanana",
 aliases: ["nb"],
 version: "1.0",
 author: "Saimx69x (API by Zetsu)",
 countDown: 5,
 role: 0,
 shortDescription: "Generate or edit images using NanoBanana",
 longDescription:
 "Generate a new image from a text prompt or edit an image by replying to it.",
 category: "ai image",
 guide:
 "{p}nanobanana <prompt>\n" +
 "{p}nanobanana <prompt> (reply to an image to edit it)"
 },

 onStart: async function ({ api, event, args, message }) {
 const repliedImage = event.messageReply?.attachments?.[0];
 const prompt = args.join(" ").trim();

 if (!prompt) {
 return message.reply(
 "Please provide a prompt.\n\nExamples:\n/nanobanana a cute anime girl\n/nanobanana make it cyberpunk (reply to an image)"
 );
 }

 const processingMsg = await message.reply("Processing your image....");

 const imgPath = path.join(
 __dirname,
 "cache",
 `${Date.now()}_nanobanana.png`
 );

 try {
 const BASE_URL = await getApiUrl();

 let apiURL = `${BASE_URL}/api/nano?prompt=${encodeURIComponent(prompt)}`;
 apiURL += `&seed=${Math.floor(Math.random() * 999999)}`;

 if (repliedImage && repliedImage.type === "photo") {
 apiURL += `&ref=${encodeURIComponent(repliedImage.url)}`;
 }

 const res = await axios.get(apiURL, {
 responseType: "arraybuffer",
 timeout: 180000
 });

 await fs.ensureDir(path.dirname(imgPath));
 await fs.writeFile(imgPath, Buffer.from(res.data));

 await api.unsendMessage(processingMsg.messageID);

 await message.reply({
 body: repliedImage
 ? `Image edited successfully.\nPrompt: ${prompt}`
 : `Image generated successfully.\nPrompt: ${prompt}`,
 attachment: fs.createReadStream(imgPath)
 });
 } catch (error) {
 console.error("NANOBANANA Error:", error?.response?.data || error.message);
 await api.unsendMessage(processingMsg.messageID);
 message.reply("Failed to process the image. Please try again later.");
 } finally {
 if (fs.existsSync(imgPath)) {
 await fs.remove(imgPath);
 }
 }
 }
};
