const axios = require('axios');

// Configurações da Blackcat do usuário
const BLACKCAT_API_KEY = 'sk_live_e83eb7792e98d74ecd8fbe18d5f816fc031f0a5acb1278e0a0e0b682fa10f0c3';

// Gerador de e-mail aleatório "válido"
function generateEmail(name) {
    const cleanName = (name || 'user').toLowerCase().replace(/[^a-z0-9]/g, '');
    const randomNum = Math.floor(1000 + Math.random() * 9000);
    const domains = ['gmail.com', 'outlook.com', 'hotmail.com', 'yahoo.com'];
    const domain = domains[Math.floor(Math.random() * domains.length)];
    return `${cleanName}${randomNum}@${domain}`;
}

module.exports = async (req, res) => {
    // Habilitar CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ success: false, message: 'Method not allowed' });
    }

    try {
        console.log('[API] Corpo recebido:', JSON.stringify(req.body, null, 2));

        const name = req.body.customerName || req.body.name || req.body.nome || req.body.customer?.name || 'Cliente';
        const cpf = req.body.customerCPF || req.body.cpf || req.body.document || req.body.customer?.document?.number || '00000000000';
        const phone = req.body.phone || req.body.telefone || req.body.whatsapp || req.body.customer?.phone || '00000000000';
        const amount = req.body.amount || req.body.value || req.body.valor || 20;

        console.log(`[API] Processando Pix Blackcat: ${name} | Valor: ${amount}`);

        const cleanCpf = (cpf || '').toString().replace(/\D/g, '');
        let cleanPhone = (phone || '').toString().replace(/\D/g, '');
        if (cleanPhone.length <= 11 && cleanPhone.length > 0) cleanPhone = '55' + cleanPhone;

        const email = generateEmail(name);

        let amountInCents = 0;
        if (typeof amount === 'string') {
            const match = amount.match(/\d+([.,]\d+)?/);
            if (match) {
                amountInCents = Math.round(parseFloat(match[0].replace(',', '.')) * 100);
            }
        } else {
            amountInCents = Math.round((amount || 0) * 100);
        }

        if (!amountInCents || amountInCents < 100) {
            amountInCents = 2000;
        }

        const payload = {
            amount: amountInCents,
            currency: "BRL",
            paymentMethod: "pix",
            items: [
                {
                    title: "Recarga Celular Online",
                    quantity: 1,
                    tangible: false
                }
            ],
            customer: {
                name: name,
                email: email,
                phone: cleanPhone,
                document: {
                    number: cleanCpf,
                    type: "cpf"
                }
            },
            pix: {
                expiresInDays: 1
            }
        };

        console.log('[API] Enviando para Blackcat...');

        const response = await axios.post('https://api.blackcatoficial.com/api/sales/create-sale', payload, {
            headers: {
                'Content-Type': 'application/json',
                'X-API-Key': BLACKCAT_API_KEY
            }
        });

        console.log('[API] Resposta Blackcat:', JSON.stringify(response.data, null, 2));

        if (!response.data || !response.data.success) {
            throw new Error(response.data?.message || 'Falha ao gerar PIX na Blackcat');
        }

        const transactionData = response.data.data;
        const pixCode = transactionData.paymentData?.copyPaste || '';
        const transactionId = transactionData.transactionId || '';

        res.json({
            pix: {
                qrcode: pixCode,
                qrcodeText: pixCode,
                payload: pixCode,
                paymentCode: pixCode
            },
            gatewayTransactionId: transactionId,
            id: transactionId,
            status: transactionData.status === 'PAID' ? 'paid' : 'pending',
            success: true
        });

    } catch (error) {
        console.error('[API] Erro ao criar transação:', error.response ? error.response.data : error.message);
        res.status(500).json({
            success: false,
            message: 'Erro ao gerar Pix.',
            error: error.response ? error.response.data : error.message
        });
    }
};
