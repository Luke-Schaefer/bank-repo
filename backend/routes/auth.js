const express = require('express');
const fs = require('fs');
const path = require('path');
const router = express.Router();

// Path to user data file
const usersDataPath = path.join(__dirname, '../data/users.json');

// Initialize users data file if it doesn't exist
function initializeUsersFile() {
  if (!fs.existsSync(usersDataPath)) {
    const defaultUsers = [
      {
        id: 2,
        username: 'john',
        password: 'john',
        pin: '1234',
        accountBalance: 10000,
        accountNumber: '1009876543',
        email: 'john@bank.com',
      },
            {
        id: 3,
        username: 'jane',
        password: 'jane',
        pin: '5678',
        accountBalance: 15000,
        accountNumber: '1001234567',
        email: 'jane@bank.com',
      },
    ];
    fs.writeFileSync(usersDataPath, JSON.stringify(defaultUsers, null, 2));
  }
}

// Load users from file
function loadUsers() {
  initializeUsersFile();
  const data = fs.readFileSync(usersDataPath, 'utf-8');
  return JSON.parse(data);
}

// Save users to file
function saveUsers(users) {
  fs.writeFileSync(usersDataPath, JSON.stringify(users, null, 2));
}

// Login endpoint
router.post('/login', (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res
        .status(400)
        .json({ error: 'Username and password are required' });
    }

    // Load users
    const users = loadUsers();
    const user = users.find((u) => u.username === username);

    if (!user || user.password !== password) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Return user info (excluding password)
    return res.json({
      success: true,
      user: {
        id: user.id,
        username: user.username,
        accountNumber: user.accountNumber,
        email: user.email,
        accountBalance: user.accountBalance,
      },
      message: 'Login successful. Please enter your PIN.',
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Login failed' });
  }
});

// PIN validation endpoint
router.post('/validate-pin', (req, res) => {
  try {
    const { username, pin } = req.body;

    if (!username || !pin) {
      return res.status(400).json({ error: 'Username and PIN are required' });
    }

    // Load users
    const users = loadUsers();
    const user = users.find((u) => u.username === username);

    if (!user) {
      return res.status(401).json({ error: 'User not found' });
    }

    if (user.pin !== pin) {
      return res.status(401).json({ error: 'Invalid PIN' });
    }

    // Generate session token (in production, use JWT)
    const token = Buffer.from(`${username}:${Date.now()}`).toString('base64');

    return res.json({
      success: true,
      token,
      user: {
        id: user.id,
        username: user.username,
        accountNumber: user.accountNumber,
        accountBalance: user.accountBalance,
        email: user.email,
      },
      message: 'PIN validated successfully. You are now logged in.',
    });
  } catch (error) {
    console.error('PIN validation error:', error);
    res.status(500).json({ error: 'PIN validation failed' });
  }
});

// Transfer money endpoint
router.post('/transfer', (req, res) => {
  try {
    const { username, amount, recipientAccount, token } = req.body;

    if (!username || !amount || !recipientAccount || !token) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Load users
    let users = loadUsers();
    const senderIndex = users.findIndex((u) => u.username === username);

    if (senderIndex === -1) {
      return res.status(404).json({ error: 'Sender not found' });
    }

    const recipientIndex = users.findIndex(
      (u) => u.accountNumber === recipientAccount
    );
    const transferAmount = parseFloat(amount);
    
    // Process transfer
    users[senderIndex].accountBalance -= transferAmount;
    users[recipientIndex].accountBalance += transferAmount;

    // Save updated users
    saveUsers(users);

    return res.json({
      success: true,
      message: 'Transfer completed successfully',
      newBalance: users[senderIndex].accountBalance,
      transaction: {
        from: users[senderIndex].accountNumber,
        to: recipientAccount,
        amount: amount,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error('Transfer error:', error);
    res.status(500).json({ error: 'Transfer failed' });
  }
});

// Deposit money endpoint
router.post('/deposit', (req, res) => {
  try {
    const { username, amount, token } = req.body;

    if (!username || !amount || !token) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Load users
    let users = loadUsers();
    const userIndex = users.findIndex((u) => u.username === username);

    if (userIndex === -1) {
      return res.status(404).json({ error: 'User not found' });
    }

    const depositAmount = parseFloat(amount);
    if (isNaN(depositAmount) || depositAmount <= 0) {
      return res.status(400).json({ error: 'Invalid deposit amount' });
    }

    return res.json({
      success: true,
      message: 'Deposit completed successfully',
      newBalance: users[userIndex].accountBalance,
      transaction: {
        type: 'deposit',
        amount: depositAmount,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error('Deposit error:', error);
    res.status(500).json({ error: 'Deposit failed' });
  }
});

// Get account details endpoint
router.get('/account/:username', (req, res) => {
  try {
    const { username } = req.params;
    const users = loadUsers();
    const user = users.find((u) => u.username === username);

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    return res.json({
      id: user.id,
      username: user.username,
      accountNumber: user.accountNumber,
      accountBalance: user.accountBalance,
      email: user.email,
    });
  } catch (error) {
    console.error('Account details error:', error);
    res.status(500).json({ error: 'Failed to fetch account details' });
  }
});

// Reset PIN endpoint
router.post('/reset-pin', (req, res) => {
  try {
    const { username, oldPin, newPin } = req.body;

    if (!username || !oldPin || !newPin) {
      return res
        .status(400)
        .json({ error: 'Username, old PIN, and new PIN are required' });
    }

    // Load users
    let users = loadUsers();
    const userIndex = users.findIndex((u) => u.username === username);

    if (userIndex === -1) {
      return res.status(404).json({ error: 'User not found' });
    }

    const user = users[userIndex];

    const storedPin = parseInt(user.pin);
    if (oldPin !== String(storedPin)) {
      return res.status(401).json({ error: 'Current PIN is incorrect' });
    }

    users[userIndex].pin = newPin;
    saveUsers(users);

    return res.json({
      success: true,
      message: 'PIN reset successfully',
    });
  } catch (error) {
    console.error('Reset PIN error:', error);
    res.status(500).json({ error: 'PIN reset failed' });
  }
});

// Initialize users file on startup
initializeUsersFile();

module.exports = router;
