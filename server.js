const express = require('express');
const axios = require('axios');
const fs = require('fs');
const app = express();

// تفعيل ميزات قراءة البيانات القادمة بشتى الطرق من اللعبة
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.text());

// 1. ضع هنا رابط الويب هوك (Webhook) الخاص بقناتك في الدسكورد
const DISCORD_WEBHOOK_URL = "https://discord.com/api/webhooks/1508784551542001778/KjE1sjSxaHvecI6yprDgTAIsyygwpgLW2fHNOFHiehQK52XAZo_nK4v6neYD5njAjUHa";

// 2. حدد هنا الحد الأقصى للاعبين في سيرفرك
const MAX_PLAYERS = "20"; 

const ID_FILE = "./message_id.txt";

const ACTIVE_EMBED_COLOR = 7487955; 
const OFFLINE_EMBED_COLOR = 15158332;

let offlineTimer = null;

function getSavedMessageId() {
    if (fs.existsSync(ID_FILE)) {
        return fs.readFileSync(ID_FILE, 'utf8').trim();
    }
    return null;
}

function saveMessageId(id) {
    fs.writeFileSync(ID_FILE, id, 'utf8');
}

// دالة مخصصة لإرسال حالة "السيرفر مغلق" للدسكورد تلقائياً
async function setServerOffline() {
    console.log("مرت 10 ثواني بدون إرسال.. جاري تحويل حالة السيرفر إلى مغلق تلقائياً.");
    const statusMessageId = getSavedMessageId();
    if (!statusMessageId) return;

    const embedPayload = {
        embeds: [{
            title: "<:milles_no:1351800650609983549> سيرفر مملكة الميلس | مغلق",
            description: "```diff\n- السيرفر مغلق الآن.. لا يوجد لاعبين في الداخل.```",
            color: OFFLINE_EMBED_COLOR,
            fields: [
                { 
                    name: "<:status_dnd:1351800660022136894> حالة السيرفر", 
                    value: "```diff\n- Offline / Closed```", 
                    inline: false 
                }
            ],
            footer: { 
                text: "نظام مراقبة مملكة الميلس"
            },
            timestamp: new Date()
        }]
    };

    try {
        await axios.patch(`${DISCORD_WEBHOOK_URL}/messages/${statusMessageId}`, embedPayload);
        console.log("تم تحديث الدسكورد بنجاح: السيرفر مغلق.");
    } catch (error) {
        console.error("حدث خطأ أثناء إغلاق السيرفر تلقائياً:", error.message);
    }
}

// دالة لإعادة تشغيل تايمر الأمان (إذا انقطع الاتصال 10 ثواني يعتبر مغلق)
function resetOfflineTimer() {
    if (offlineTimer) clearTimeout(offlineTimer);
    offlineTimer = setTimeout(() => {
        setServerOffline();
    }, 10000);
}

app.post('/update', async (req, res) => {
    console.log("استلمت طلب جديد من اللعبة...");
    
    resetOfflineTimer();

    let rawContent = "";

    if (req.body && req.body.content) {
        rawContent = req.body.content;
    } else if (typeof req.body === 'string') {
        rawContent = req.body;
    } else if (req.body && Object.keys(req.body).length > 0) {
        rawContent = Object.keys(req.body)[0];
    }

    console.log("النص المستلم من اللعبة: " + rawContent);

    let mapName = "غير معروف";
    let players = "0";
    let cars = "0";
    let weather = "صافي";
    let time = "00:00";

    if (rawContent) {
        if (rawContent.startsWith("content=")) {
            rawContent = rawContent.replace("content=", "");
        }
        
        const parts = rawContent.split(',');
        
        if (parts[0]) mapName = decodeURIComponent(parts[0].trim());
        if (parts[1]) players = decodeURIComponent(parts[1].trim());
        if (parts[2]) cars = decodeURIComponent(parts[2].trim());
        if (parts[3]) weather = decodeURIComponent(parts[3].trim());
        if (parts[4]) time = decodeURIComponent(parts[4].trim());
    }

    let embedTitle = "<:mts_logo:1351337891695165440> سيرفر مملكة الميلس";
    let embedDescription = "يتم تحديث الحالة تلقائياً ومباشرة من داخل اللعبة.";
    let embedColor = ACTIVE_EMBED_COLOR;
    let embedFields = [];

    if (players === "0" || players === 0 || players.trim() === "") {
        embedTitle = "<:milles_no:1351800650609983549> سيرفر مملكة الميلس | مغلق";
        embedDescription = "```diff\n- السيرفر مغلق الآن.. لا يوجد لاعبين في الداخل.```";
        embedColor = OFFLINE_EMBED_COLOR;
        embedFields = [
            { 
                name: "<:status_dnd:1351800660022136894> حالة السيرفر", 
                value: "```diff\n- Offline / Closed```", 
                inline: false 
            }
        ];
    } else {
        embedFields = [
            { 
                name: "<:milles_eye:1460960396222533713> الخريطة (Map)", 
                value: `\`\`\`yaml\n${mapName}\`\`\``, 
                inline: true 
            },
            { 
                name: "<:milles_members:1460962353486102589> اللاعبين المتواجدين", 
                value: `\`\`\`fix\n ${players} / ${MAX_PLAYERS}\`\`\``, 
                inline: true 
            },
            { 
                name: "<:milles_rocket:1460984933525749893> السيارات", 
                value: `\`\`\`md\n# ${cars} سيارة\`\`\``, 
                inline: true 
            },
            { 
                name: "<:milles_fire:1460928134135287808> الطقس الحالي", 
                value: `\`\`\` ${weather}\`\`\``, 
                inline: true 
            },
            { 
                name: "<:milles_clock:1460985293313282163> توقيت اللعبة", 
                value: `\`\`\` ${time}\`\`\``, 
                inline: true 
            },
            { 
                name: "<:milles_on:1460928529658023936> حالة الاتصال", 
                value: "```yaml\nشغال (Online)```", 
                inline: true 
            }
        ];
    }

    const embedPayload = {
        embeds: [{
            title: embedTitle,
            description: embedDescription,
            color: embedColor,
            fields: embedFields,
            footer: { 
                text: "نظام مراقبة مملكة الميلس" 
            },
            timestamp: new Date()
        }]
    };

    let statusMessageId = getSavedMessageId();

    try {
        if (!statusMessageId) {
            const response = await axios.post(`${DISCORD_WEBHOOK_URL}?wait=true`, embedPayload);
            statusMessageId = response.data.id;
            saveMessageId(statusMessageId);
            console.log("تم إنشاء إيمبد مملكة الميلس لأول مرة بنجاح.");
        } else {
            await axios.patch(`${DISCORD_WEBHOOK_URL}/messages/${statusMessageId}`, embedPayload);
            console.log(`تم التحديث بنجاح! ماب: ${mapName} | لاعبين: ${players}`);
        }
        
        res.status(204).end();
    } catch (error) {
        console.error("حدث خطأ أثناء الاتصال بالدسكورد:", error.message);
        if (error.response && error.response.status === 404) {
            if (fs.existsSync(ID_FILE)) fs.unlinkSync(ID_FILE);
        }
        res.status(500).send("Error");
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`وسيط مملكة الميلس شغال على بورت ${PORT}`));
