const fs = require("fs-extra");

module.exports = {
	config: {
		name: "manageprefix",
		aliases: ["mp"],
		version: "2.4.61",
		author: "ST | Sheikh Tamim",
		countDown: 5,
		role: 2, // Admin only
		description: "Manage prefix settings for the bot",
		category: "admin",
		guide: {
			en: "   {pn} status - Show current prefix settings\n" +
				"   {pn} global <true|false> - Enable/disable global prefix requirement\n" +
				"   {pn} admin <true|false> - Enable/disable admin prefix requirement\n" +
				"   {pn} adduid <uid> - Add specific UID to no-prefix list\n" +
				"   {pn} removeuid <uid> - Remove specific UID from no-prefix list\n" +
				"   {pn} listuid - List all specific UIDs in no-prefix list"
		}
	},

	onStart: async function ({ message, args }) {
		const config = global.GoatBot.config;
		
		if (!args[0]) {
			return message.reply(
				"🔧 **Prefix Management Help**\n\n" +
				"📌 Available commands:\n" +
				"• mp status - Show current prefix settings\n" +
				"• mp global <true|false> - Enable/disable global prefix\n" +
				"• mp admin <true|false> - Enable/disable admin prefix\n" +
				"• mp adduid <uid> - Add UID to no-prefix list\n" +
				"• mp removeuid <uid> - Remove UID from no-prefix list\n" +
				"• mp listuid - List UIDs in no-prefix list"
			);
		}

		// Check if user is admin
		const adminBot = config.adminBot || [];
		const senderID = message.senderID || event.senderID;
		
		if (!adminBot.includes(senderID)) {
			return message.reply("❌ This command is only for bot administrators.");
		}

		switch (args[0].toLowerCase()) {
			case "status": {
				const globalPrefix = config.usePrefix?.enable ? "✅ Enabled" : "❌ Disabled";
				const adminPrefix = config.usePrefix?.adminUsePrefix?.enable ? "✅ Enabled" : "❌ Disabled";
				const specificUids = config.usePrefix?.adminUsePrefix?.specificUids || [];
				const uidsList = specificUids.length > 0 
					? specificUids.join(", ") 
					: "None";

				return message.reply(
					`🔧 **Prefix Settings Status**\n\n` +
					`📌 Global Prefix Required: ${globalPrefix}\n` +
					`👑 Admin Prefix Required: ${adminPrefix}\n` +
					`👥 Specific UIDs (No Prefix): ${uidsList}\n\n` +
					`ℹ️ Current Prefix: "${config.prefix || "!"}"`
				);
			}

			case "global": {
				if (!args[1] || !["true", "false"].includes(args[1].toLowerCase())) {
					return message.reply("❌ Please specify 'true' or 'false' for global prefix setting.\nExample: `mp global true`");
				}
				
				const newValue = args[1].toLowerCase() === "true";
				config.usePrefix = config.usePrefix || {};
				config.usePrefix.enable = newValue;
				
				// Save config
				await this.saveConfig(config);
				
				return message.reply(`✅ Global prefix requirement has been ${newValue ? "enabled" : "disabled"}.`);
			}

			case "admin": {
				if (!args[1] || !["true", "false"].includes(args[1].toLowerCase())) {
					return message.reply("❌ Please specify 'true' or 'false' for admin prefix setting.\nExample: `mp admin false`");
				}
				
				const newValue = args[1].toLowerCase() === "true";
				config.usePrefix = config.usePrefix || {};
				config.usePrefix.adminUsePrefix = config.usePrefix.adminUsePrefix || {};
				config.usePrefix.adminUsePrefix.enable = newValue;
				
				// Save config
				await this.saveConfig(config);
				
				return message.reply(`✅ Admin prefix requirement has been ${newValue ? "enabled" : "disabled"}.`);
			}

			case "adduid": {
				if (!args[1]) {
					return message.reply("❌ Please provide a UID to add to the no-prefix list.\nExample: `mp adduid 100000000000000`");
				}
				
				const uid = args[1].trim();
				if (!/^\d+$/.test(uid)) {
					return message.reply("❌ Invalid UID format. UID should contain only numbers.");
				}
				
				config.usePrefix = config.usePrefix || {};
				config.usePrefix.adminUsePrefix = config.usePrefix.adminUsePrefix || {};
				config.usePrefix.adminUsePrefix.specificUids = config.usePrefix.adminUsePrefix.specificUids || [];
				
				if (!config.usePrefix.adminUsePrefix.specificUids.includes(uid)) {
					config.usePrefix.adminUsePrefix.specificUids.push(uid);
					
					// Save config
					await this.saveConfig(config);
					
					return message.reply(`✅ UID \`${uid}\` has been added to the no-prefix list.`);
				} else {
					return message.reply(`⚠️ UID \`${uid}\` is already in the no-prefix list.`);
				}
			}

			case "removeuid": {
				if (!args[1]) {
					return message.reply("❌ Please provide a UID to remove from the no-prefix list.\nExample: `mp removeuid 100000000000000`");
				}
				
				const uid = args[1].trim();
				config.usePrefix = config.usePrefix || {};
				config.usePrefix.adminUsePrefix = config.usePrefix.adminUsePrefix || {};
				config.usePrefix.adminUsePrefix.specificUids = config.usePrefix.adminUsePrefix.specificUids || [];
				
				const index = config.usePrefix.adminUsePrefix.specificUids.indexOf(uid);
				if (index > -1) {
					config.usePrefix.adminUsePrefix.specificUids.splice(index, 1);
					
					// Save config
					await this.saveConfig(config);
					
					return message.reply(`✅ UID \`${uid}\` has been removed from the no-prefix list.`);
				} else {
					return message.reply(`⚠️ UID \`${uid}\` is not in the no-prefix list.`);
				}
			}

			case "listuid": {
				config.usePrefix = config.usePrefix || {};
				config.usePrefix.adminUsePrefix = config.usePrefix.adminUsePrefix || {};
				const uids = config.usePrefix.adminUsePrefix.specificUids || [];
				
				if (uids.length === 0) {
					return message.reply("📝 No specific UIDs are currently in the no-prefix list.");
				}
				
				return message.reply(
					`📝 **Specific UIDs (No Prefix Required):**\n\n` +
					`${uids.map((uid, index) => `${index + 1}. \`${uid}\``).join("\n")}\n\n` +
					`Total: ${uids.length} UID(s)`
				);
			}

			default:
				return message.reply("❌ Invalid action. Use 'status', 'global', 'admin', 'adduid', 'removeuid', or 'listuid'.");
		}
	},

	// Helper function to save config
	saveConfig: async function (config) {
		try {
			const configPath = global.client?.dirConfig || require("path").join(__dirname, "../../config.json");
			await fs.writeFile(configPath, JSON.stringify(config, null, 2));
			
			// Reload config
			delete require.cache[require.resolve(configPath)];
			global.GoatBot.config = require(configPath);
			
			return true;
		} catch (error) {
			console.error("Error saving config:", error);
			throw new Error("Failed to save configuration.");
		}
	}
};
