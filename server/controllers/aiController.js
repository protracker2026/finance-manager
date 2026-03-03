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
2. "amount": ตัวเลขยอดเงิน ห้ามมีลูกน้ำ (comma) (ถ้าระบุจำนวนและราคาต่อหน่วย ให้คำนวณยอดเงินรวมมาเลย)
3. "category": หมวดหมู่สั้นๆ ให้พยายามจับคู่กับหมวดหมู่ต่อไปนี้: "อาหาร", "ขนม/ของหวาน", "ค่าเดินทาง", "ค่าที่พัก", "ค่าน้ำ-ไฟ", "ค่ามือถือ/เน็ต", "ค่ารักษาพยาบาล", "ช้อปปิ้ง", "ความบันเทิง", "การศึกษา", "ชำระหนี้", "เงินเดือน", "โบนัส", "งานฟรีแลนซ์", "ดอกเบี้ยรับ" (ถ้าไม่แน่ใจให้ใช้ "อื่นๆ")
4. "note": ชื่อรายการ
5. "quantity": จำนวน (ถ้ามี) ถ้าไม่มีให้เป็น null
6. "unitPrice": ราคาต่อหน่วย (ถ้ามี) ถ้าไม่มีให้เป็น null
7. "context": สำคัญมาก! ถ้าระบบฟังเสียงเพี้ยน เช่นได้ยินว่า "เครื่องบิน" แต่มูลค่าน้อย (เช่น 10-100 บาท) ให้คุณช่วยแก้ไขเป็น "ขึ้นวิน" หรือ "วินมอเตอร์ไซค์" ให้สมเหตุสมผลกับราคาด้วย
8. "number ambiguity": ระวังการอ่านตัวเลขติดกันในภาษาไทย เช่น "รอบสามสิบเก้าบาท" ผู้ใช้อาจหมายถึง "รอบที่ 3 ราคา 19 บาท" (ไม่ใช่รอบละ 39 หรือรอบที่ 39) ให้พิจารณาบริบทให้ดี
9. "multiple prices": ถ้าสิ่งของเดียวกันแต่ราคาแต่ละครั้งไม่เท่ากัน (เช่น "ขึ้นวินสองรอบ รอบแรกสิบบาท รอบสองสิบห้าบาท") ให้รวมยอดทั้งหมดไว้ใน amount เดียวกัน (25) และใส่ quantity ให้ถูกต้องตามจำนวน (เช่น 2) ส่วน unitPrice ให้เป็น null ห้ามหาค่าเฉลี่ยเด็ดขาด แล้วใส่รายละเอียดลงไปใน note แทน
10. "snacks and desserts": ถ้าเป็นอาหารประเภท ขนมขบเคี้ยว, น้ำหวาน, ชาไข่มุก, ขนมปัง, เค้ก ให้แยกเป็นหมวดหมู่ "ขนม/ของหวาน" ห้ามรวมกับ "อาหาร" คาวปกติเด็ดขาด

ตัวอย่าง Input: "กินชาไข่มุก 65 บาท"
Output JSON:
{"type": "expense", "amount": 65, "category": "ขนม/ของหวาน", "note": "ชาไข่มุก", "quantity": null, "unitPrice": null}

ตัวอย่าง Input: "หมูปิ้งห้าไม้ ไม้ละห้าบาท"
Output JSON:
{"type": "expense", "amount": 25, "category": "อาหาร", "note": "หมูปิ้ง", "quantity": 5, "unitPrice": 5}

ตัวอย่าง Input: "ขึ้นวินสองรอบ รอบแรกสิบบาท รอบสองสิบห้าบาท"
Output JSON:
{"type": "expense", "amount": 25, "category": "ค่าเดินทาง", "note": "ขึ้นวิน 2 รอบ (10, 15)", "quantity": 2, "unitPrice": null}

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
