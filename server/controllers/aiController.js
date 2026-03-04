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

    const systemPrompt = `คุณเป็น AI ผู้ช่วยลงบัญชี (JSON only)
Rules:
1. "type": "expense" หรือ "income"
2. "amount": ตัวเลข (คำนวณยอดรวมมาให้เลย)
3. "category": เลือกจาก: "อาหาร", "ขนม/ของหวาน", "ค่าเดินทาง", "ค่าที่พัก", "ค่าน้ำ-ไฟ", "ค่ามือถือ/เน็ต", "ค่ารักษาพยาบาล", "ช้อปปิ้ง", "ความบันเทิง", "การศึกษา", "ชำระหนี้", "เงินเดือน", "โบนัส", "งานฟรีแลนซ์", "ดอกเบี้ยรับ" (ถ้าไม่แน่ใจใช้ "อื่นๆ")
4. "note": ชื่อสินค้าหรือบริการสั้นๆ เท่านั้น ห้ามใส่คำขยาย จำนวน หรือ ราคาเข้าไปด้วย (เช่น ถ้าผู้ใช้พูด "ก๋วยเตี๋ยว 2 จาน จานละ 50" คำตอบของ note คือ "ก๋วยเตี๋ยว" เฉยๆ)
5. "quantity": จำนวน (ตัวเลขเท่านั้น, null ถ้าไม่มี)
6. "unitPrice": ราคาต่อหน่วย (ตัวเลขเท่านั้น, null ถ้าไม่มี)
7. Context: แก้ไขคำเพี้ยน (เช่น "เครื่องบิน" -> "ขึ้นวิน" ถ้าราคาหลักสิบ)
8. Ambiguity: แยกแยะบริบทเลขไทย (เช่น "รอบสามสิบเก้าบาท" -> 19 บาท รอบ 3)
9. Multiple: ถ้าราคาหลายรอบให้ "amount" คือยอดรวมทั้งหมด, "quantity" คือจำนวนครั้ง, "note" ระบุแค่ชื่อสิ่งของ
10. Snacks: แยก "ขนม/ของหวาน" (น้ำหวาน, ชาไข่มุก) ออกจาก "อาหาร"

Response Format Example:
{"type": "expense", "amount": 65, "category": "ขนม/ของหวาน", "note": "ชาไข่มุก", "quantity": null, "unitPrice": null}`;

    try {
        const response = await axios.post(
            'https://api.deepseek.com/v1/chat/completions',
            {
                model: 'deepseek-chat',
                messages: [
                    { role: 'system', content: systemPrompt },
                    { role: 'user', content: text }
                ],
                temperature: 0.0
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
