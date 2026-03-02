export const AIModule = {
    async parseTransaction(text) {
        try {
            const response = await fetch('/api/ai/parse', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ text })
            });

            if (!response.ok) {
                throw new Error('ระบบ AI ตอบกลับผิดพลาด');
            }
            return await response.json();
        } catch (error) {
            console.error('AI Parse Error:', error);
            throw error;
        }
    }
};
