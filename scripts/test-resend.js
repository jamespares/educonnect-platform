require('dotenv').config();
const { Resend } = require('resend');

const resend = new Resend(process.env.RESEND_API_KEY);

console.log('\n🧪 Testing Resend Email Configuration\n');
console.log('=====================================\n');

async function testResend() {
    try {
        console.log('📧 Sending test email...');
        console.log(`From: EduConnect <team@educonnectchina.com>`);
        console.log(`To: ${process.env.EMAIL_TO || 'team@educonnectchina.com'}`);
        console.log(`API Key: ${process.env.RESEND_API_KEY ? '✓ Set' : '✗ Missing'}\n`);

        const data = await resend.emails.send({
            from: 'EduConnect <team@educonnectchina.com>',
            to: [process.env.EMAIL_TO || 'team@educonnectchina.com'],
            subject: 'Test Email from EduConnect',
            html: `
                <h2>🎉 Resend Integration Test</h2>
                <p>This is a test email to verify that Resend is working correctly with EduConnect.</p>
                <p><strong>Status:</strong> ✅ Email service is operational!</p>
                <hr>
                <p><small>Sent from EduConnect platform via Resend</small></p>
            `
        });

        console.log('✅ Email sent successfully!');
        console.log(`📨 Email ID: ${data.id}\n`);
        console.log('Check your inbox at:', process.env.EMAIL_TO || 'team@educonnectchina.com');

    } catch (error) {
        console.error('❌ Error sending email:', error.message);

        if (error.message.includes('Domain not found')) {
            console.log('\n⚠️  Domain Not Verified!');
            console.log('   You need to add and verify educonnectchina.com in Resend dashboard.');
            console.log('   Go to: https://resend.com/domains\n');
        } else if (error.message.includes('API key')) {
            console.log('\n⚠️  API Key Issue!');
            console.log('   Check that RESEND_API_KEY is set correctly in .env\n');
        }
    }
}

testResend();
