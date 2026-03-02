const axios = require('axios');

exports.parseTransaction = async (req, res) => {
    const { text } = req.body;
    if (!text) {
        return res.status(400).json({ error: 'Text input is required' });
    }

    const apiKey = process.env.DEEPSEEK_API_KEY;
    if (!apiKey) {
        return res.status(500).json({ error: 'DeepSeek API Key is not configured on the server.' });
    }

    const systemPrompt = `คุณเป็น AI ผู้ช่วยลงบัญชีรับจ่าย
หน้าที่ของคุณ: อ่านข้อความที่ผู้ใช้พูด และดึงข้อมูลธุรกรรมมาจัดรูปแบบเป็น JSON เท่านั้น
กติกา:
1. "type": ต้องเป็น "expense" (รายจ่าย) หรือ "income" (รายรับ)
2. "amount": ตัวเลขยอดเงิน ห้ามมีลูกน้ำ (comma)
3. "category": หมวดหมู่สั้นๆ เช่น "อาหาร", "เดินทาง", "ช้อปปิ้ง", "เงินเดือน"
4. "note": ชื่อรายการ

ตัวอย่าง Input: "กินชาไข่มุก 65 บาท"
Output JSON:
{"type": "expense", "amount": 65, "category": "ค่าอาหาร/เครื่องดื่ม", "note": "ชาไข่มุก"}

ห้ามตอบอย่างอื่นนอกจาก JSON ล้วนๆ`;

    try {
        const response = await axios.post(
            'https://api.deepseek.com/v1/chat/completions',
            {
                model: 'deepseek-chat',
                messages: [
                    { role: 'system', content: systemPrompt },
                    { role: 'user', content: text }
                ],
                temperature: 0.1
            },
            {
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${apiKey}`
                }
            }
        );

        const aiContent = response.data.choices[0].message.content.trim();

        // Attempt to extract purely JSON array/object from AI response safely
        let jsonResult;
        try {
            let cleanStr = aiContent.replace(/```json/gi, '').replace(/```/g, '').trim();
            jsonResult = JSON.parse(cleanStr);
        } catch (e) {
            throw new Error('AI returned malformed JSON: ' + aiContent);
        }

        res.json(jsonResult);

    } catch (error) {
        console.error('DeepSeek Error:', error.response?.data || error.message);
        res.status(500).json({ error: 'Failed to process text with DeepSeek API' });
    }
};
