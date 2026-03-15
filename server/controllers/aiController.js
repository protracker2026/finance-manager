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

    const now = new Date();
    // Thai Day names
    const thaiDays = ['อาทิตย์', 'จันทร์', 'อังคาร', 'พุธ', 'พฤหัสบดี', 'ศุกร์', 'เสาร์'];
    const dateContext = `Current Date: ${now.toISOString().split('T')[0]} (วัน${thaiDays[now.getDay()]})`;

    const systemPrompt = `คุณเป็น AI ผู้ช่วยลงบัญชีอัจฉริยะ (JSON only)
${dateContext}

Rules:
1. "type": "expense" หรือ "income"
2. "amount": ตัวเลข (คำนวณยอดรวมมาให้เลย)
3. "category": เลือกจาก: "อาหาร", "ขนม/ของหวาน", "ค่าเดินทาง", "ค่าที่พัก", "ค่าน้ำ-ไฟ", "ค่ามือถือ/เน็ต", "ค่ารักษาพยาบาล", "ช้อปปิ้ง", "ความบันเทิง", "การศึกษา", "ชำระหนี้", "เงินเดือน", "โบนัส", "งานฟรีแลนซ์", "ดอกเบี้ยรับ" (ถ้าไม่แน่ใจใช้ "อื่นๆ")
4. "note": ชื่อสินค้าหรือบริการสั้นๆ เท่านั้น ห้ามใส่คำขยาย จำนวน หรือ ราคาเข้าไปด้วย
5. "date": วิเคราะห์จากข้อความ (ISO format YYYY-MM-DD) หากไม่ระบุให้ใช้ ${now.toISOString().split('T')[0]}
   - "เมื่อวาน": ลดไป 1 วัน
   - "เมื่อมะรืน/วานซืน": ลดไป 2 วัน
   - "วันก่อน": ลดไป 1-2 วันตามบริบท
   - "วันนี้": ใช้ ${now.toISOString().split('T')[0]}
   - "อาทิตย์ที่แล้ว": ลดไป 7 วัน

Special Rules for Thai (STRICT):
- "น้ำ" 5 บาท/10 บาท -> note: "น้ำเปล่า", category: "อาหาร" (ไม่ใช่ค่าน้ำ-ไฟ)
- "ค่าน้ำ"/"บิลน้ำ" -> note: "ค่าน้ำ", category: "ค่าน้ำ-ไฟ"
- "ตำ 50" -> note: "ส้มตำ", category: "อาหาร"
- "เครื่องบิน" 20 บาท -> note: "วินมอเตอร์ไซค์", category: "ค่าเดินทาง"

Response MUST be a single JSON object. No chatter.
Example:
{"type": "expense", "amount": 65, "category": "อาหาร", "note": "ก๋วยเตี๋ยว", "quantity": 1, "unitPrice": 65, "date": "2026-03-14"}`;

    try {
        console.log('[AI Backend] Received text:', text);
        const response = await axios.post(
            'https://api.deepseek.com/v1/chat/completions',
            {
                model: 'deepseek-chat',
                messages: [
                    { role: 'system', content: systemPrompt },
                    { role: 'user', content: text }
                ],
                temperature: 0.0,
                response_format: { type: 'json_object' }
            },
            {
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${apiKey}`
                }
            }
        );

        let aiContent = response.data.choices[0].message.content.trim();
        console.log('[AI Backend] AI Raw Response:', aiContent);

        let jsonResult;
        try {
            const jsonMatch = aiContent.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                jsonResult = JSON.parse(jsonMatch[0]);
                // Ensure note has a fallback
                if (!jsonResult.note && text.length < 15) jsonResult.note = text.split(' ')[0];
                if (!jsonResult.note) jsonResult.note = 'รายการ AI';
            } else {
                throw new Error('No JSON found');
            }
        } catch (e) {
            console.error('[AI Backend] Parse Failure:', aiContent);
            throw new Error('AI returned invalid format');
        }

        res.json(jsonResult);

    } catch (error) {
        console.error('AI Controller Error:', error.response?.data || error.message);
        res.status(500).json({ error: 'Failed to process text' });
    }
};
