const axios = require('axios');

// Configurações da Blackcat do usuário
const BLACKCAT_API_KEY = 'sk_live_e83eb7792e98d74ecd8fbe18d5f816fc031f0a5acb1278e0a0e0b682fa10f0c3';

module.exports = async (req, res) => {
    // Habilitar CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    try {
        // O ID vem da query string: /api/check-status?id=TXN-xxx
        const transactionId = req.query.id;

        if (!transactionId) {
            return res.status(400).json({ success: false, message: 'ID da transação é obrigatório' });
        }

        const response = await axios.get(`https://api.blackcatoficial.com/api/sales/${transactionId}/status`, {
            headers: {
                'X-API-Key': BLACKCAT_API_KEY
            }
        });

        const status = response.data.data?.status;
        console.log(`[API] Status da transação ${transactionId}: ${status}`);

        res.json({
            success: true,
            status: status === 'PAID' ? 'paid' : 'pending',
            data: response.data
        });

    } catch (error) {
        console.error('[API] Erro ao verificar status:', error.message);
        res.status(500).json({ success: false, message: 'Erro ao verificar status' });
    }
};
