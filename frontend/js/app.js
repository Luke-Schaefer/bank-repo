// Configuration
const API_URL = 'http://localhost:5001/api';
let currentUser = null;
let currentSession = null;

// UI Elements
const loginScreen = document.getElementById('loginScreen');
const pinScreen = document.getElementById('pinScreen');
const dashboardScreen = document.getElementById('dashboardScreen');
const loginForm = document.getElementById('loginForm');
const pinForm = document.getElementById('pinForm');
const transferForm = document.getElementById('transferForm');

// Event Listeners
document.addEventListener('DOMContentLoaded', () => {
  loginForm.addEventListener('submit', handleLogin);
  pinForm.addEventListener('submit', handlePinSubmit);
  transferForm.addEventListener('submit', handleTransfer);
  document.getElementById('pin').addEventListener('input', updatePinDisplay);
});

// Update PIN display
function updatePinDisplay() {
  const pin = document.getElementById('pin').value;
  const dots = Array(4).fill('•').map((dot, i) => (i < pin.length ? '•' : '•')).join(' ');
  document.getElementById('pinDots').textContent = dots;
}

// Handle Login
async function handleLogin(e) {
  e.preventDefault();
  
  const username = document.getElementById('username').value;
  const password = document.getElementById('password').value;
  const errorDiv = document.getElementById('loginError');
  
  // Clear previous errors
  errorDiv.classList.remove('show');
  errorDiv.textContent = '';
  
  try {
    const response = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    });
    
    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.error || 'Login failed');
    }
    
    // Store current user and show PIN screen
    currentUser = { username, ...data.user };
    showPinScreen(username);
  } catch (error) {
    console.error('Login error:', error);
    errorDiv.textContent = error.message;
    errorDiv.classList.add('show');
  }
}

// Show PIN Screen
function showPinScreen(username) {
  document.getElementById('pinUsername').textContent = `Welcome, ${username}!`;
  document.getElementById('pin').value = '';
  document.getElementById('pinDots').textContent = '• • • •';
  
  loginScreen.classList.remove('active');
  pinScreen.classList.add('active');
}

// Handle PIN Submit
async function handlePinSubmit(e) {
  e.preventDefault();
  
  const pin = document.getElementById('pin').value;
  const errorDiv = document.getElementById('pinError');
  
  if (pin.length !== 4) {
    errorDiv.textContent = 'PIN must be 4 digits';
    errorDiv.classList.add('show');
    return;
  }
  
  errorDiv.classList.remove('show');
  errorDiv.textContent = '';
  
  try {
    const response = await fetch(`${API_URL}/auth/validate-pin`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        username: currentUser.username, 
        pin 
      }),
    });
    
    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.error || 'PIN validation failed');
    }
    
    // Store session and show dashboard
    currentSession = data.token;
    currentUser = data.user;
    showDashboard();
  } catch (error) {
    console.error('PIN error:', error);
    errorDiv.textContent = error.message;
    errorDiv.classList.add('show');
  }
}

// Show Dashboard
function showDashboard() {
  pinScreen.classList.remove('active');
  dashboardScreen.classList.add('active');
  
  // Update dashboard info
  document.getElementById('dashboardUsername').textContent = currentUser.username;
  document.getElementById('accountNumber').textContent = `Account: ${currentUser.accountNumber}`;
  document.getElementById('detailAccountNumber').textContent = currentUser.accountNumber;
  updateBalance();
  updateLastLogin();
  showTab('overview');
}

// Update Balance Display
function updateBalance() {
  const balance = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(currentUser.accountBalance || 0);
  
  document.getElementById('displayBalance').textContent = balance;
}

// Update Last Login
function updateLastLogin() {
  const now = new Date();
  document.getElementById('lastLogin').textContent = now.toLocaleString();
}

// Show Tab
function showTab(tabName) {
  // Hide all tabs
  document.querySelectorAll('.tab').forEach((tab) => tab.classList.remove('active'));
  
  // Remove active class from nav links
  document.querySelectorAll('.nav-link').forEach((link) => link.classList.remove('active'));
  
  // Show selected tab
  document.getElementById(`${tabName}Tab`).classList.add('active');
  
  // Add active class to clicked link
  event.target.classList.add('active');
}

// Handle Transfer
async function handleTransfer(e) {
  e.preventDefault();
  
  const amount = parseFloat(document.getElementById('transferAmount').value);
  const recipientAccount = document.getElementById('transferRecipient').value;
  const description = document.getElementById('transferDescription').value;
  const errorDiv = document.getElementById('transferError');
  const successDiv = document.getElementById('transferSuccess');
  
  // Clear messages
  errorDiv.classList.remove('show');
  successDiv.classList.remove('show');
  errorDiv.textContent = '';
  successDiv.textContent = '';
  
  if (amount <= 0) {
    errorDiv.textContent = 'Please enter a valid amount';
    errorDiv.classList.add('show');
    return;
  }
  
  try {  
    // Process transfer
    const response = await fetch(`${API_URL}/auth/transfer`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: currentUser.username,
        amount,
        recipientAccount,
        token: currentSession,
      }),
    });
    
    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.error || 'Transfer failed');
    }
    
    // Update balance and show success
    currentUser.accountBalance = data.newBalance;
    updateBalance();
    
    successDiv.textContent = `✓ Transfer of $${amount.toFixed(2)} to ${recipientAccount} completed successfully!`;
    successDiv.classList.add('show');
    
    // Reset form
    transferForm.reset();
    
    // Add to transaction history
    addTransaction('Transfer', -amount, `To: ${recipientAccount}`);
  } catch (error) {
    console.error('Transfer error:', error);
    errorDiv.textContent = error.message;
    errorDiv.classList.add('show');
  }
}

// Add Transaction
function addTransaction(type, amount, description) {
  const transactionsList = document.getElementById('transactionsList');
  
  // Remove "no data" message if present
  const noData = transactionsList.querySelector('.no-data');
  if (noData) {
    noData.remove();
  }
  
  const transaction = document.createElement('div');
  transaction.className = 'transaction-item';
  
  const amountClass = amount < 0 ? 'debit' : 'credit';
  const sign = amount < 0 ? '- ' : '+ ';
  const now = new Date();
  
  transaction.innerHTML = `
    <div class="transaction-info">
      <div class="transaction-type">${type}</div>
      <div class="transaction-date">${description} - ${now.toLocaleString()}</div>
    </div>
    <div class="transaction-amount ${amountClass}">
      ${sign}$${Math.abs(amount).toFixed(2)}
    </div>
  `;
  
  transactionsList.insertBefore(transaction, transactionsList.firstChild);
}

// Go Back from PIN Screen
function goBack() {
  pinScreen.classList.remove('active');
  loginScreen.classList.add('active');
  
  // Clear form
  document.getElementById('loginForm').reset();
  currentUser = null;
}

// Logout
function logout() {
  if (confirm('Are you sure you want to logout?')) {
    currentUser = null;
    currentSession = null;
    
    // Clear forms
    document.getElementById('loginForm').reset();
    document.getElementById('pinForm').reset();
    document.getElementById('transferForm').reset();
    document.getElementById('transactionsList').innerHTML = '<p class="no-data">No transactions yet</p>';
    
    // Reset UI
    document.getElementById('pinError').classList.remove('show');
    document.getElementById('loginError').classList.remove('show');
    document.getElementById('transferError').classList.remove('show');
    document.getElementById('transferSuccess').classList.remove('show');
    
    // Show login screen
    dashboardScreen.classList.remove('active');
    pinScreen.classList.remove('active');
    loginScreen.classList.add('active');
  }
}

// Show Reset PIN Modal
function showResetPinModal() {
  const modal = document.getElementById('resetPinModal');
  modal.style.display = 'block';
  document.getElementById('resetPinForm').addEventListener('submit', handleResetPin);
}

// Close Reset PIN Modal
function closeResetPinModal() {
  const modal = document.getElementById('resetPinModal');
  modal.style.display = 'none';
  document.getElementById('resetPinForm').reset();
  document.getElementById('modalResetPinError').classList.remove('show');
  document.getElementById('modalResetPinError').textContent = '';
}

// Handle Reset PIN
async function handleResetPin(e) {
  e.preventDefault();
  
  const currentPin = document.getElementById('currentPin').value;
  const newPin = document.getElementById('newPin').value;
  const confirmPin = document.getElementById('confirmPin').value;
  const errorDiv = document.getElementById('modalResetPinError');
  
  // Clear previous errors
  errorDiv.classList.remove('show');
  errorDiv.textContent = '';
  
  // Validate new PIN and confirm PIN match
  if (newPin !== confirmPin) {
    errorDiv.textContent = 'New PINs do not match';
    errorDiv.classList.add('show');
    return;
  }
  
  try {
    const response = await fetch(`${API_URL}/auth/reset-pin`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: currentUser.username,
        oldPin: currentPin,
        newPin: newPin,
      }),
    });
    
    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.error || 'PIN reset failed');
    }
    
    // Show success message
    const successDiv = document.getElementById('resetPinSuccess');
    successDiv.textContent = '✓ PIN reset successfully!';
    successDiv.classList.add('show');
    
    // Close modal after 2 seconds
    setTimeout(() => {
      closeResetPinModal();
      successDiv.classList.remove('show');
      successDiv.textContent = '';
    }, 2000);
  } catch (error) {
    console.error('Reset PIN error:', error);
    errorDiv.textContent = error.message;
    errorDiv.classList.add('show');
  }
}

// Close modal when clicking outside of it
window.onclick = function(event) {
  const modal = document.getElementById('resetPinModal');
  if (event.target === modal) {
    closeResetPinModal();
  }
};

// Initialize on page load
window.addEventListener('load', () => {
  console.log('🏦 Banking Application loaded');
  console.log(`API URL: ${API_URL}`);
});
