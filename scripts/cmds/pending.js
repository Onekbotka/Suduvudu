const axios = require("axios"); // Included but not used in the logic, kept for compatibility
const fs = require("fs"); // Included but not used in the logic, kept for compatibility

module.exports = {
  config: {
    name: "pending",
    aliases: ["pen", "pend", "pe"],
    version: "2.0.2", // Updated version
    author: "♡ Nazrul ♡ + Fixed by Alamin",
    countDown: 5,
    role: 1,
    shortDescription: "Handle pending requests",
    longDescription: "Approve or reject pending user or group requests",
    category: "utility",
    guide: {
      en: "{pn} [user/thread/all]\nReply with group number(s) to approve\nType 'c' to cancel"
    }
  },

  // reply system compatible with ST bot
  onReply: async function ({ api, event, Reply }) {
    const { author, pending, messageID } = Reply;
    // Check if the reply is from the command sender (admin)
    if (String(event.senderID) !== String(author)) return;

    const { body, threadID } = event;

    // Cancel
    if (body.trim().toLowerCase() === "c") {
      try {
        await api.unsendMessage(messageID);
        return api.sendMessage("❌ Operation has been canceled!", threadID);
      } catch {
        return;
      }
    }

    // Parse indexes (handles multiple space-separated numbers like "1 3 5")
    const indexes = body.split(/\s+/)
      .map(s => Number(s.trim()))
      .filter(n => !isNaN(n) && n > 0 && n <= pending.length);

    if (indexes.length === 0) {
      return api.sendMessage("⚠️ Invalid input! Please reply with the correct number(s).", threadID);
    }

    let count = 0;
    // Approve groups in ascending order
    for (const idx of indexes.sort((a, b) => a - b)) {
      const group = pending[idx - 1];

      try {
        // 1. Send approval message to the group/user
        await api.sendMessage(
          `╭━「  𝐆𝐫𝐨𝐮𝐩 𝐀𝐩𝐩𝐫𝐨𝐯𝐞𝐝 」
┃ 𝐆𝐥𝐨𝐛𝐚𝐥 𝐏𝐫𝐞𝐟𝐢𝐱: ${global.GoatBot.config.prefix} 
┃ 𝐒𝐭𝐚𝐭𝐮𝐬: Connected 
╰━━━━━━━━━━━━━╮
╭─❍ 𝐁𝐨𝐭 𝐁𝐲: 𝐀𝐩𝐡𝐞𝐥𝐢𝐨𝐧🌊
┃ FB: m.facebook.com/star.boy.aphelion
╰━━━━━━━━━━━━━╯`,
          group.threadID
        );

        // 2. Change bot's nickname (Fixed syntax error)
        // Accessing global variables should be done safely
        const botNickname = global.GoatBot?.config?.nickNameBot || "[ / ] 𝘽𝙤𝙩 - 𝐀𝐩𝐡𝐞𝐥𝐢𝐨𝐧🌊🪶";
        
        await api.changeNickname(
          botNickname, // Fixed: removed template literal wrapper
          group.threadID,
          api.getCurrentUserID()
        );
        
        count++;
      } catch (err) {
        console.error(`Failed to approve thread ${group.threadID}:`, err.message);
      }
    }

    // 3. Cleanup: remove approved threads from the pending list (Fixed syntax error in cleanup loop)
    // Remove indices in descending order to avoid index shifting problems
    for (const idx of indexes.sort((a, b) => b - a)) {
      pending.splice(idx - 1, 1);
    }

    // 4. Send success message (Fixed syntax error in template literal)
    await api.unsendMessage(messageID); // Remove the original pending list message
    return api.sendMessage(
      `✅ | [ Successfully ] 🎉 Approved ${count} Groups/Users ✨!`, 
      threadID
    );
  },

  // onStart instead of onRun (for ST bot)
  onStart: async function ({ api, event, args, usersData }) {
    const { threadID, messageID, senderID } = event;
    const adminBot = global.GoatBot?.config?.adminBot; // Fixed: Safe access to global config

    // permission check
    // Assuming adminBot is an array of senderIDs
    if (!Array.isArray(adminBot) || !adminBot.includes(senderID)) {
      return api.sendMessage("❌ You have no permission to use this command!", threadID);
    }

    const type = args[0]?.toLowerCase();
    if (!type || !["user", "thread", "all"].includes(type)) {
      return api.sendMessage("Usage: `pending [user/thread/all]`", threadID);
    }

    try {
      // Fetch lists (using 100 as the limit as in original code)
      const spam = (await api.getThreadList(100, null, ["OTHER"])) || [];
      const pending = (await api.getThreadList(100, null, ["PENDING"])) || [];
      const list = [...spam, ...pending];
      let filteredList = [];

      if (type.startsWith("u")) filteredList = list.filter((t) => !t.isGroup);
      else if (type.startsWith("t")) filteredList = list.filter((t) => t.isGroup);
      else if (type === "all") filteredList = list;

      if (filteredList.length === 0)
        return api.sendMessage("✅ No pending requests found!", threadID);

      let msg = "";
      let index = 1;

      // Build the display list
      for (const single of filteredList) {
        // Fetch user name for 1:1 chats, or use thread name for groups
        const name = single.isGroup ? single.name : (await usersData.getName(single.threadID)) || "Unknown";
        
        // Fixed: Syntax error in string concatenation
        msg += `[ ${index} ] ${name} (${single.threadID})\n`; 
        index++;
      }

      // Fixed: Syntax error in template literal
      const finalMessage = 
        `✨ | [ Pending ${type.charAt(0).toUpperCase() + type.slice(1)} List ] ✨\n\n${msg}` +
        `\n🦋 Reply with the correct number(s) to approve!\n✨ Reply with "c" to Cancel.`;

      return api.sendMessage(
        finalMessage,
        threadID,
        (error, info) => {
          if (error) return console.error(error);
          
          // Set reply map
          global.GoatBot.onReply.set(info.messageID, {
            commandName: module.exports.config.name,
            messageID: info.messageID,
            author: senderID,
            pending: filteredList // Pass the list for processing in onReply
          });
        },
        messageID
      );
    } catch (error) {
      console.error("Pending fetch error:", error);
      return api.sendMessage(
        "⚠️ Failed to retrieve pending list. Please try again later.",
        threadID
      );
    }
  }
};
