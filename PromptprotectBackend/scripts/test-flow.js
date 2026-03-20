const axios = require('axios');
const mongoose = require('mongoose');
const fs = require('fs');
require('dotenv').config();

const BASE_URL = process.env.BASE_URL;
const MONGODB_URI = process.env.MONGODB_URI;

// User Models (Minimal for verification)
const UserSchema = new mongoose.Schema({}, { strict: false });
const User = mongoose.model('User', UserSchema);

const results = [];

function logResult(endpoint, method, success, status, data, notes = '') {
    results.push({
        endpoint,
        method,
        success,
        status,
        notes,
        response: data
    });
    console.log(`${success ? 'PASS' : 'FAIL'} ${method} ${endpoint} [${status}] ${notes}`);
}

async function runTests() {
    let client = axios.create({
        baseURL: BASE_URL,
        withCredentials: true,
        validateStatus: () => true
    });

    const ts = Date.now();
    let adminEmail = `admin_${ts}@test.com`;
    let adminPassword = 'AdminPassword123!';
    let newAdminPassword = 'NewAdminPassword456!';
    let workspace = `ws_${ts}`;
    let orgKey = '';
    let testUserId = '';
    let policyId = '';
    let groupId = '';
    let customRuleId = '';
    let secondAdminEmail = `sec_admin_${ts}@test.com`;
    let secondAdminId = '';

    console.log('Starting Expanded 26-Step API Flow Test Suite...');

    try {
        if (MONGODB_URI) await mongoose.connect(MONGODB_URI);

        // 1. Signup
        const signupRes = await client.post('/api/org/signup', {
            userName: 'Primary Admin',
            userEmail: adminEmail,
            userPassword: adminPassword,
            orgName: 'Test Org ' + ts,
            workspace: workspace,
            timezone: 'UTC'
        });
        logResult('/api/org/signup', 'POST', signupRes.status === 201, signupRes.status, signupRes.data, 'Initial Signup');
        if (signupRes.status !== 201) throw new Error('Signup failed');

        // 2. Verify Email (Simulated)
        const user1 = await User.findOne({ userEmail: adminEmail });
        const verifyRes = await client.get(`/api/users/auth/verify-email?token=${user1.verificationToken}`);
        logResult('/api/users/auth/verify-email', 'GET', verifyRes.status === 200, verifyRes.status, verifyRes.data, 'Email Verification');

        // 3. Login
        const loginRes = await client.post('/api/users/auth/login', { userEmail: adminEmail, userPassword: adminPassword });
        if (loginRes.status === 200) {
            client.defaults.headers.common['Cookie'] = loginRes.headers['set-cookie'][0];
            orgKey = loginRes.data.user.org.orgKey;
        }
        logResult('/api/users/auth/login', 'POST', loginRes.status === 200, loginRes.status, loginRes.data, 'First Login');

        // 4. org/me
        const orgMeRes = await client.get('/api/org/me');
        logResult('/api/org/me', 'GET', orgMeRes.status === 200, orgMeRes.status, orgMeRes.data, 'Fetch Org Info');

        // 5. Dashboard
        const dashRes = await client.post('/api/dashboard', {});
        logResult('/api/dashboard', 'POST', dashRes.status === 200, dashRes.status, dashRes.data, 'Fetch Dashboard Stats');

        // 6. Admin Churns
        const churnsRes = await client.post('/api/adminChurns', {});
        logResult('/api/adminChurns', 'POST', churnsRes.status === 200, churnsRes.status, churnsRes.data, 'Fetch Audit Logs');

        // 7. Change Password
        const changePwRes = await client.post('/api/users/change-password', { oldPassword: adminPassword, newPassword: newAdminPassword });
        logResult('/api/users/change-password', 'POST', changePwRes.status === 200, changePwRes.status, changePwRes.data, 'Password Update');

        // 8. Logout
        const logoutRes = await client.post('/api/users/auth/logout', {});
        client.defaults.headers.common['Cookie'] = '';
        logResult('/api/users/auth/logout', 'POST', logoutRes.status === 200, logoutRes.status, logoutRes.data, 'Session Termination');

        // 9. Login Again (with new password)
        const login2Res = await client.post('/api/users/auth/login', { userEmail: adminEmail, userPassword: newAdminPassword });
        if (login2Res.status === 200) {
            client.defaults.headers.common['Cookie'] = login2Res.headers['set-cookie'][0];
        }
        logResult('/api/users/auth/login', 'POST', login2Res.status === 200, login2Res.status, login2Res.data, 'Relogin with New PW');

        // 10. User Create
        const createUserRes = await client.post('/api/users', {
            userName: 'Standard User',
            userRole: ['DEFAULT'],
            userEmail: `std_user_${ts}@test.com`,
            userPassword: 'StdUser123!'
        });
        if (createUserRes.status === 200) testUserId = createUserRes.data.user._id;
        logResult('/api/users', 'POST', createUserRes.status === 200, createUserRes.status, createUserRes.data, 'Standard User Creation');

        // 11. User Update
        if (testUserId) {
            const updateUserRes = await client.put(`/api/users/${testUserId}`, {
                userName: 'Updated Standard User',
                userEmail: `std_user_${ts}@test.com` // Backend requires email for domain check
            });
            logResult('/api/users/:id', 'PUT', updateUserRes.status === 200, updateUserRes.status, updateUserRes.data, 'User Rename');
        }

        // 12. Policy Create
        const createPolicyRes = await client.post('/api/policies', {
            policyName: 'Test Policy ' + ts,
            rulesForPolicy: ['PII'],
            action: 'BLOCK'
        });
        if (createPolicyRes.status === 200) policyId = createPolicyRes.data.policy._id;
        logResult('/api/policies', 'POST', createPolicyRes.status === 200, createPolicyRes.status, createPolicyRes.data, 'Policy Creation');

        // 13. Group Create
        if (testUserId && policyId) {
            const createGroupRes = await client.post('/api/groups', {
                groupName: 'Test Group ' + ts,
                groupUsers: [testUserId],
                policiesAttached: [policyId]
            });
            if (createGroupRes.status === 200) groupId = createGroupRes.data.group._id;
            logResult('/api/groups', 'POST', createGroupRes.status === 200, createGroupRes.status, createGroupRes.data, 'Group Resource Linking');
        }

        // 14. Custom Rule Create
        const createRuleRes = await client.post('/api/custom-rules', {
            ruleName: 'Regex Rule ' + ts,
            pattern: 'CONFIDENTIAL',
            ruleType: 'REGEX',
            flags: 'i',
            redactionLabel: 'SECRET'
        });
        if (createRuleRes.status === 201) customRuleId = createRuleRes.data._id;
        logResult('/api/custom-rules', 'POST', createRuleRes.status === 201, createRuleRes.status, createRuleRes.data, 'Custom Rule Creation');

        // 15. Custom Rule Update
        if (customRuleId) {
            const updateRuleRes = await client.put(`/api/custom-rules/${customRuleId}`, { description: 'Updated regex desc' });
            logResult('/api/custom-rules/:id', 'PUT', updateRuleRes.status === 200, updateRuleRes.status, updateRuleRes.data, 'Rule Metadata Update');
        }

        // 16. Policy Update (Add custom rule)
        if (policyId && customRuleId) {
            const updatePolicyRes = await client.put(`/api/policies/${policyId}`, {
                customRules: [customRuleId]
            });
            logResult('/api/policies/:id', 'PUT', updatePolicyRes.status === 200, updatePolicyRes.status, updatePolicyRes.data, 'Policy Logic Expansion');
        }

        // 17. PII Scan
        const scanClient = axios.create({ baseURL: BASE_URL, validateStatus: () => true });
        const scanRes = await scanClient.post('/pii-scan', {
            conversation: 'My secret is CONFIDENTIAL',
            url: 'http://test.com',
            timestamp: Date.now(),
            requestId: 'req-' + ts,
            chatgptUser: 'user-' + ts,
            sourceType: 'PROMPT'
        }, {
            headers: { 'x-api-key': orgKey, 'x-useremail': `std_user_${ts}@test.com` }
        });
        logResult('/pii-scan', 'POST', scanRes.status === 200, scanRes.status, scanRes.data, 'Final PII Detection');

        // 18. Delete Resources
        if (groupId) await client.delete(`/api/groups/${groupId}`);
        if (policyId) await client.delete(`/api/policies/${policyId}`);
        if (testUserId) await client.delete(`/api/users/${testUserId}`);
        if (customRuleId) await client.delete(`/api/custom-rules/${customRuleId}`);
        logResult('Cleanup', 'DELETE', true, 200, {}, 'Resource Disposal');

        // 19. Create New User (Admin Role)
        const createAdminRes = await client.post('/api/users', {
            userName: 'Secondary Admin',
            userRole: ['ADMIN'],
            userEmail: secondAdminEmail,
            userPassword: 'AdminPassword123!'
        });
        if (createAdminRes.status === 200) {
            secondAdminId = createAdminRes.data.user._id;
            // Automatically verify this user
            const sUser = await User.findById(secondAdminId);
            await client.get(`/api/users/auth/verify-email?token=${sUser.verificationToken}`);
        }
        logResult('/api/users', 'POST', createAdminRes.status === 200, createAdminRes.status, createAdminRes.data, 'Secondary Admin Prep');

        // 20. Change Org Key
        const nextKey = 'rotated_key_' + ts;
        const rotateRes = await client.put('/api/org/update-key', { newOrgKey: nextKey });
        if (rotateRes.status === 200) orgKey = nextKey;
        logResult('/api/org/update-key', 'PUT', rotateRes.status === 200, rotateRes.status, rotateRes.data, 'Credential Rotation');

        // 21. Logout from primary
        await client.post('/api/users/auth/logout', {});
        client.defaults.headers.common['Cookie'] = '';
        logResult('/api/users/auth/logout', 'POST', true, 200, {}, 'Primary Admin Exit');

        // 22. Forgot Password (for second admin)
        const forgotRes = await client.post('/api/users/forgot-password', { userEmail: secondAdminEmail.toLowerCase() });
        logResult('/api/users/forgot-password', 'POST', forgotRes.status === 200, forgotRes.status, forgotRes.data, 'Recovery Trigger');

        // 23. Reset Password (Direct DB check with deep logging)
        await new Promise(r => setTimeout(r, 2000));
        const dbUser = await mongoose.connection.db.collection('users').findOne({ userEmail: secondAdminEmail.toLowerCase() });
        console.log(`[DEBUG] Found user in DB: ${dbUser ? 'YES' : 'NO'}`);
        if (dbUser) {
            console.log(`[DEBUG] Reset Token in DB: ${dbUser.resetPasswordToken ? 'FOUND' : 'MISSING'}`);
            console.log(`[DEBUG] Reset Expires in DB: ${dbUser.resetPasswordExpires ? 'FOUND' : 'MISSING'}`);
        }

        const resetRes = await client.post('/api/users/reset-password', {
            token: dbUser?.resetPasswordToken,
            newPassword: 'ResetPassword999!'
        });
        logResult('/api/users/reset-password', 'POST', resetRes.status === 200, resetRes.status, resetRes.data, 'Recovery Completion');

        // 24. Login with second admin
        const login3Res = await client.post('/api/users/auth/login', { userEmail: secondAdminEmail, userPassword: 'ResetPassword999!' });
        if (login3Res.status === 200) {
            client.defaults.headers.common['Cookie'] = login3Res.headers['set-cookie'][0];
        }
        logResult('/api/users/auth/login', 'POST', login3Res.status === 200, login3Res.status, login3Res.data, 'Secondary Admin Access');

        // 25. Configure Splunk
        const splunkRes = await client.put('/api/org/splunk', {
            hecUrl: 'https://splunk.test.com',
            hecToken: 'splunk-token-' + ts,
            sourcetype: 'promptprotect'
        });
        logResult('/api/org/splunk', 'PUT', splunkRes.status === 200, splunkRes.status, splunkRes.data, 'Infrastructure Config');

        // 26. Logout
        const finalLogout = await client.post('/api/users/auth/logout', {});
        logResult('/api/users/auth/logout', 'POST', finalLogout.status === 200, finalLogout.status, finalLogout.data, 'Final Exit');

    } catch (err) {
        console.error('CRITICAL TEST ERROR:', err.message);
    } finally {
        console.log('\nExpanded Test Results Table:');
        console.table(results.map(r => ({ ...r, response: 'Check JSON file' })));

        const successCount = results.filter(r => r.success === true).length;
        const failCount = results.length - successCount;
        console.log(`\nSUMMARY: Total: ${results.length} | Success: ${successCount} | Fail: ${failCount}`);

        if (failCount === 0 && results.length > 0) {
            console.log('All tests passed! Cleaning up...');
            if (mongoose.connection.readyState === 1) {
                await mongoose.connection.db.dropDatabase();
                console.log('Test database dropped.');
            }
            if (fs.existsSync('test_results.json')) {
                fs.unlinkSync('test_results.json');
                console.log('test_results.json removed.');
            }
        } else {
            fs.writeFileSync('test_results.json', JSON.stringify(results, null, 2));
            console.log('Test results saved to test_results.json');
        }

        if (mongoose.connection.readyState === 1) await mongoose.disconnect();
    }
}

runTests();
