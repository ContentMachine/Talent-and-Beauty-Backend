const https = require('https');

class PaystackService {
  constructor() {
    this.secretKey = process.env.PAYSTACK_SECRET_KEY;
    this.baseUrl = 'api.paystack.co';
  }

  async makeRequest(method, path, data = null) {
    return new Promise((resolve, reject) => {
      const options = {
        hostname: this.baseUrl,
        port: 443,
        path: path,
        method: method,
        headers: {
          Authorization: `Bearer ${this.secretKey}`,
          'Content-Type': 'application/json',
        },
      };

      const req = https.request(options, (res) => {
        let responseData = '';

        res.on('data', (chunk) => {
          responseData += chunk;
        });

        res.on('end', () => {
          try {
            const parsedData = JSON.parse(responseData);
            if (res.statusCode >= 200 && res.statusCode < 300) {
              resolve(parsedData);
            } else {
              reject(new Error(parsedData.message || 'Paystack request failed'));
            }
          } catch (error) {
            reject(error);
          }
        });
      });

      req.on('error', (error) => {
        reject(error);
      });

      if (data) {
        req.write(JSON.stringify(data));
      }

      req.end();
    });
  }

  async initializeTransaction(email, amount, metadata = {}) {
    const data = {
      email,
      amount: amount * 100,
      currency: 'NGN',
      metadata,
      callback_url: `${process.env.CLIENT_URL}/payment/verify`,
    };

    const response = await this.makeRequest('POST', '/transaction/initialize', data);
    return response.data;
  }

  async verifyTransaction(reference) {
    const response = await this.makeRequest('GET', `/transaction/verify/${reference}`);
    return response.data;
  }

  async chargeAuthorization(email, amount, authorizationCode, metadata = {}) {
    const data = {
      email,
      amount: amount * 100,
      authorization_code: authorizationCode,
      metadata,
    };

    const response = await this.makeRequest('POST', '/transaction/charge_authorization', data);
    return response.data;
  }

  async createRefund(reference, amount = null) {
    const data = { transaction: reference };
    if (amount) {
      data.amount = amount * 100;
    }

    const response = await this.makeRequest('POST', '/refund', data);
    return response.data;
  }

  async listBanks() {
    const response = await this.makeRequest('GET', '/bank');
    return response.data;
  }
}

module.exports = new PaystackService();
