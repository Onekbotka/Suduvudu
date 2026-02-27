const fs = require("fs-extra");
const path = require("path");
const axios = require("axios");

module.exports = {
  config: {
    name: "lek",
    version: "1.1",
    author: "Muzan",
    countDown: 3,
    role: 2,
    shortDescription: "Generate 1 AI image from prompt (SeaArt)",
    longDescription: "Reply or use *lek (prompt) to generate 1 AI image via SeaArt.ai using cookies.",
    category: "ai",
    usage: "*lek (prompt)"
  },

  onStart: async function ({ api, event, args }) {
    try {
      let prompt = args.join(" ");
      if (!prompt && event.messageReply?.body) {
        prompt = event.messageReply.body;
      }

      if (!prompt) {
        return api.sendMessage(
          "⚠ Please provide a prompt.\nExample: *lek A cute anime girl",
          event.threadID,
          event.messageID
        );
      }

      // Check for "ratio"
      let ratio = null;
      const ratioMatch = prompt.match(/ratio\s*=\s*(\d+:\d+)/i);
      if (ratioMatch) ratio = ratioMatch[1];

      // All cookies together
      const cookieList = [
        "deviceId=b8b37bae-5e29-4596-bdc9-80b3d4777726",
        "__cf_bm=CZy1rfFc4ZlhZ5jBrhWrdn77ZIrdlPpxIPZPNU9Wvk0-1763100122-1.0.1.1-JAq1v3gS0DeIA2ShmS2SN3qosvmt4I4caTcpdG2sLWlFs5VtuBV_ipwCcnjhE32z0odPHBc64NWdZlyXb3Q7lkDlM4PIQOviMfgTYkc7zqM",
        "browserId=53806ebd2600b5068709401d30468e91",
        "enable_st_tavern=false",
        "enable_tavern=true",
        "enable_ai_video=true",
        "enable_ai_audio=true",
        "_fbp=fb.1.1763100159921.445653434213969235",
        "T=eyJhbGciOiJSUzUxMiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzZWEtYXJ0IiwiYXVkIjpbImxvZ2luIl0sImV4cCI6MTc2ODI4NDE3OSwiaWF0IjoxNzYzMTAwMTc5LCJqdGkiOiI4ODg2NjY5NDA2MzIzNTA3NyIsInBheWxvYWQiOnsiaWQiOiJmN2I4OWVhNDUzZDkwYWY0YmE4ODQ1ZDkzMTFlM2YyMyIsImVtYWlsIjoidHhja2lidXRzdWppbXV6YW5AZ21haWwuY29tIiwiY3JlYXRlX2F0IjoxNzU5NTcxODQ4MzIwLCJ0b2tlbl9zdGF0dXMiOjAsInN0YXR1cyI6MSwiaXNzIjoiIn19.J3Sj8sSqoIJA-gKoJTpSx1v-xuqMt1vCbxxgBOctgCFIu7vrPwfU_-RojYteJfz-R07zz0Oue71OYzHHt4OtcfjY7BmV-8I-9zQZCauxezJA562NDYbCN3f3szgbaBdXhrzcIDEoqGRvuL7oiuE2ZkCPans7T01b903pg9o8Ry_RcX-LG836JeX8rs6FtmH9AfcVvHxzdFWiKk2c3ltEnY7AS-V8rAR8_NvPKtytwa1b-0q3xhp8V7YDhBi6SNBeOrVy5aoz1xjesQtDV_Ta7QPzBNOXOgXnul7DdMIduMfj3YHn-EGO6zHQ4SBBBy39XbAkKQ5b7IBa6IA0DXjOgA",
        "lang=en",
        "g_state={\"i_t\":1763186579184,\"i_l\":0}",
        "X-Eyes=true",
        "_clck=106729g%5E2%5Eg10%5E0%5E2144",
        "pageId=ea150173-fe52-42b4-b718-21a815ddd5cf",
        "ttcsid_D1RGO0JC77U51PG3JE10=1763100166143::y4I_WyeyS6kFuQkj9YcH.1.1763100395106.0",
        "ttcsid=1763100166141::3y1LfvSaFSx4OZNZAYV1.1.1763100395108.0",
        "_ga_YDMZ43CD3E=GS2.1.s1763100124$o3$g1$t1763100395$j19$l0$h0",
        "_ga_4X5PK5P053=GS2.1.s1763100126$o6$g1$t1763100395$j19$l0$h0",
        "_clsk=1bebtwg%5E1763100396289%5E4%5E0%5Ez.clarity.ms%2Fcollect"
      ].join("; ");

      // Step 1: Create task
      const createRes = await axios.post(
        "https://www.seaart.ai/api/v1/task/v2/text-to-img",
        {
          model_no: "d8300cd33eb1ab8018baa6685ec4a7e9",
          model_ver_no: "698582bc31c3667af7169f1070e15607",
          channel_id: "",
          speed_type: 1,
          meta: {
            cfg_scale: 3.5,
            width: 688,
            height: 1024,
            n_iter: 1,
            prompt,
            seed: Math.floor(Math.random() * 999999999),
            steps: 25,
            sampler_name: "Euler",
            negative_prompt: "",
            lab_base: { conds: [] },
            lora_models: [],
            embeddings: [],
            generate: { anime_enhance: 2, mode: 0, gen_mode: 0, prompt_magic_mode: 2 }
          },
          ss: 52
        },
        { headers: { cookie: cookieList, "content-type": "application/json" } }
      );

      if (!createRes.data?.data?.id) {
        return api.sendMessage("🚫 Task creation failed. Cookies expired!", event.threadID, event.messageID);
      }

      const taskId = createRes.data.data.id;

      // Step 2: Poll until complete
      let imageUrl = null;

      for (let i = 0; i < 20; i++) {
        await new Promise(res => setTimeout(res, 3000));

        const statusRes = await axios.post(
          "https://www.seaart.ai/api/v1/task/batch-progress",
          { task_ids: [taskId] },
          { headers: { cookie: cookieList, "content-type": "application/json" } }
        );

        const item = statusRes.data?.data?.items?.[0]?.img_uris?.[0];
        if (item?.url) {
          imageUrl = item.url;
          break;
        }
      }

      if (!imageUrl) {
        return api.sendMessage("🚫 Task finished but image URL not found.", event.threadID, event.messageID);
      }

      // Step 3: Download & send
      const imgRes = await axios.get(imageUrl, { responseType: "arraybuffer" });
      const filePath = path.join(__dirname, `lek_${Date.now()}.webp`);
      fs.writeFileSync(filePath, imgRes.data);

      await api.sendMessage(
        {
          body: `✅ Generated image for prompt:\n"${prompt}"`,
          attachment: fs.createReadStream(filePath)
        },
        event.threadID,
        () => fs.unlinkSync(filePath),
        event.messageID
      );

    } catch (err) {
      console.log(err);
      api.sendMessage("🚫 Error generating image:\n" + err.message, event.threadID, event.messageID);
    }
  }
};
