// Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyAh_PySftXqGq3ZjXy7vAG6H-Pj59JCHis",
    authDomain: "arsi-5a121.firebaseapp.com",
    databaseURL: "https://arsi-5a121-default-rtdb.firebaseio.com",
    projectId: "arsi-5a121",
    storageBucket: "arsi-5a121.firebasestorage.app",
    messagingSenderId: "121976403009",
    appId: "1:121976403009:web:6b88b2a79b8a9946cf42c0"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const database = firebase.database();

// Price constants
const PRICES = {
    normal: 100,    // Rs.100 per meter
    resine: 120,    // Rs.120 per meter
    white: 150      // Rs.150 per meter
};
const GST_RATE = 0.18; // 18%
const CRIMPING_CHARGE = 250; // Rs.250 per quantity

// DOM Elements
const loginPage = document.getElementById('login-page');
const dashboardPage = document.getElementById('dashboard-page');
const orderPage = document.getElementById('order-page');
const mainNav = document.getElementById('main-nav');
const navDashboard = document.getElementById('nav-dashboard');
const navOrders = document.getElementById('nav-orders');
const navReports = document.getElementById('nav-reports');
const navLogout = document.getElementById('nav-logout');
const loginForm = document.getElementById('login-form');
const orderForm = document.getElementById('order-form');
const exportExcelBtn = document.getElementById('export-excel-btn');


// Silent connection monitoring (no alerts)
database.ref('.info/connected').on('value', (snapshot) => {
    console.log(snapshot.val() ? "Firebase connected" : "Firebase disconnected");
});

// Handle login with specific error messages
async function handleLogin(e) {
    e.preventDefault();
    
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;
    const loginBtn = loginForm.querySelector('button[type="submit"]');
    const errorElement = document.getElementById('login-error');
    
    // Clear previous errors
    errorElement.classList.add('hidden');
    errorElement.textContent = '';
    
    if (!username || !password) {
        errorElement.textContent = "Please enter both username and password";
        errorElement.classList.remove('hidden');
        return;
    }

    // Show loading state
    const originalText = loginBtn.innerHTML;
    loginBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Logging in...';
    loginBtn.disabled = true;

    try {
        await auth.signInWithEmailAndPassword(username, password);
    } catch (error) {
        console.error("Login error:", error);
        errorElement.textContent = "Enter valid username or password";
        errorElement.classList.remove('hidden');
    } finally {
        loginBtn.innerHTML = originalText;
        loginBtn.disabled = false;
    }
}

// Initialize the application
function initApp() {
    // Handle button selection
    document.querySelectorAll('.btn-group').forEach(group => {
        group.addEventListener('click', (e) => {
            if (e.target.classList.contains('btn')) {
                group.querySelectorAll('.btn').forEach(btn => {
                    btn.classList.remove('selected');
                });
                e.target.classList.add('selected');
            }
        });
    });

    // Navigation handlers
    navDashboard.addEventListener('click', (e) => {
        e.preventDefault();
        showDashboard();
    });

    navOrders.addEventListener('click', (e) => {
        e.preventDefault();
        showOrderForm();
    });

    navReports.addEventListener('click', (e) => {
        e.preventDefault();
        exportToExcel();
    });

    navLogout.addEventListener('click', (e) => {
        e.preventDefault();
        logoutUser();
    });

    

    // Form submissions
    loginForm.addEventListener('submit', handleLogin);
    orderForm.addEventListener('submit', handleOrderSubmit);

    // Export button
    exportExcelBtn.addEventListener('click', exportToExcel);

    // Initialize auth state listener
    auth.onAuthStateChanged(handleAuthStateChange);
}

// Handle authentication state changes
function handleAuthStateChange(user) {
    if (user) {
        console.log("User logged in:", user.uid);
        mainNav.classList.remove('hidden');
        loginPage.classList.add('hidden');
        showDashboard();
        loadDashboardData();
        loadRecentOrders();
    } else {
        console.log("User logged out");
        mainNav.classList.add('hidden');
        loginPage.classList.remove('hidden');
        dashboardPage.classList.add('hidden');
        orderPage.classList.add('hidden');
    }
}

// Show dashboard page
function showDashboard() {
    dashboardPage.classList.remove('hidden');
    orderPage.classList.add('hidden');
    document.title = "Dashboard - SRE Vinayagaa Roofing";
    loadDashboardData();
}

// Show order form page
function showOrderForm() {
    orderPage.classList.remove('hidden');
    dashboardPage.classList.add('hidden');
    document.title = "New Order - SRE Vinayagaa Roofing";
    loadRecentOrdersTable();
}

// Handle login form submission
async function handleLogin(e) {
    e.preventDefault();
    
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;
    const loginBtn = loginForm.querySelector('button[type="submit"]');
    
    if (!username || !password) {
        showAlert("Please enter both username and password", "error");
        return;
    }

    // Show loading state
    const originalText = loginBtn.innerHTML;
    loginBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Logging in...';
    loginBtn.disabled = true;

    try {
        await auth.signInWithEmailAndPassword(username, password);
        // Auth state change handler will take care of the rest
    } catch (error) {
        console.error("Login error:", error);
        let errorMessage = "Login failed. Please try again.";
        
        switch(error.code) {
            case 'auth/invalid-email':
                errorMessage = "Invalid email format";
                break;
            case 'auth/user-disabled':
                errorMessage = "This account has been disabled";
                break;
            case 'auth/user-not-found':
            case 'auth/wrong-password':
                errorMessage = "Invalid username or password";
                break;
            case 'auth/network-request-failed':
                errorMessage = "Network error. Please check your connection.";
                break;
        }
        
        showAlert(errorMessage, "error");
    } finally {
        loginBtn.innerHTML = originalText;
        loginBtn.disabled = false;
    }
}

// Handle order form submission
async function handleOrderSubmit(e) {
    e.preventDefault();
    
    try {
        // Verify authentication
        if (!auth.currentUser) {
            throw new Error("You have been logged out. Please login again.");
        }

        // Get form values with validation
        const length = parseFloat(document.getElementById('length').value);
        const quantity = parseInt(document.getElementById('quantity').value);
        const customerName = document.getElementById('customer-name').value.trim();
        const customerAddress = document.getElementById('customer-address').value.trim();

        // Validate inputs
        if (isNaN(length) || length <= 0) throw new Error("Please enter a valid length (must be greater than 0)");
        if (isNaN(quantity) || quantity <= 0) throw new Error("Please enter a valid quantity (must be greater than 0)");
        if (!customerName) throw new Error("Please enter customer name");
        if (!customerAddress) throw new Error("Please enter customer address");

        // Get selected values
        const sheetType = getSelectedValue('sheet-type');
        const sheetColor = getSelectedValue('sheet-color');
        const crimpingRequired = getSelectedValue('crimping');
        const paymentMethod = getSelectedValue('payment-method');

        // Create order object
        const order = {
            length,
            quantity,
            sheetType,
            sheetColor,
            crimpingRequired,
            customerName,
            customerAddress,
            paymentMethod,
            timestamp: new Date().toISOString(),
            userId: auth.currentUser.uid
        };

        // Show loading state
        const submitBtn = orderForm.querySelector('button[type="submit"]');
        const originalText = submitBtn.innerHTML;
        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Processing...';
        submitBtn.disabled = true;

        // Save to Firebase
        const orderRef = database.ref('orders').push();
        await orderRef.set(order);
        
        // Send data to ESP8266 (don't block on this)
        database.ref('esp8266/current').set({
            length,
            quantity,
            timestamp: order.timestamp,
            orderId: orderRef.key
        }).catch(espError => {
            console.warn("Failed to send to ESP8266:", espError);
        });

        // Generate and show bill
        generateBill({...order, id: orderRef.key}, customerName, customerAddress, paymentMethod);
        
        // Reset form
        orderForm.reset();
        document.querySelectorAll('.btn').forEach(btn => {
            btn.classList.remove('selected');
        });

        // Show success message
        showAlert("Order submitted successfully!", "success");

        // Reload recent orders
        loadRecentOrders();
        loadRecentOrdersTable();

    } catch (error) {
        console.error("Order submission error:", error);
        showAlert(`Error: ${error.message}`, "error");
    } finally {
        // Restore button state
        const submitBtn = orderForm.querySelector('button[type="submit"]');
        if (submitBtn) {
            submitBtn.innerHTML = '<i class="fas fa-paper-plane"></i> Submit Order';
            submitBtn.disabled = false;
        }
    }
}

// Get selected value from button group
function getSelectedValue(groupId) {
    const selected = document.querySelector(`#${groupId} .btn.selected`);
    if (!selected) throw new Error(`Please select ${groupId.replace('-', ' ')}`);
    return selected.getAttribute('data-value');
}


function loadDashboardData() {
    // Show loading state
    const dashboardContainer = document.querySelector('.dashboard-container');
    const loadingIndicator = document.createElement('div');
    loadingIndicator.className = 'loading-spinner';
    dashboardContainer.appendChild(loadingIndicator);

    // Today's date for filtering
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayStr = today.toISOString();
    const monthStart = new Date(today.getFullYear(), today.getMonth(), 1).toISOString();

    // Get orders from Firebase
    database.ref('orders').orderByChild('timestamp').startAt(monthStart).once('value')
        .then((snapshot) => {
            let todayOrders = 0;
            let monthlyProduction = 0;
            let monthlyRevenue = 0;
            let yesterdayOrders = 0;
            let yesterdayProduction = 0;
            let yesterdayRevenue = 0;
            
            // For charts
            const dailyData = {};
            const typeDistribution = {
                normal: 0,
                resine: 0,
                white: 0
            };
           

            // Calculate yesterday's date
            const yesterday = new Date(today);
            yesterday.setDate(yesterday.getDate() - 1);
            const yesterdayStr = yesterday.toISOString().split('T')[0];

            snapshot.forEach((childSnapshot) => {
                const order = childSnapshot.val();
                const orderDate = new Date(order.timestamp);
                const dateKey = orderDate.toISOString().split('T')[0];
                
                const length = parseFloat(order.length) || 0;
                const quantity = parseInt(order.quantity) || 0;
                const rate = PRICES[order.sheetType] || 0;
                
                // Calculate order total
                let orderTotal = rate * length * quantity;
                if (order.crimpingRequired === 'yes') {
                    orderTotal += CRIMPING_CHARGE * quantity;
                }
                const orderWithGST = orderTotal + (orderTotal * GST_RATE);
                
                // Today's orders
                if (orderDate.toDateString() === today.toDateString()) {
                    todayOrders++;
                    monthlyProduction += length * quantity;
                    monthlyRevenue += orderWithGST;
                }
                
                // Yesterday's data for comparison
                if (dateKey === yesterdayStr) {
                    yesterdayOrders++;
                    yesterdayProduction += length * quantity;
                    yesterdayRevenue += orderWithGST;
                }
                
                // Monthly data
                if (orderDate.getMonth() === today.getMonth() && 
                    orderDate.getFullYear() === today.getFullYear()) {
                    // For daily trends chart
                    if (!dailyData[dateKey]) {
                        dailyData[dateKey] = {
                            production: 0,
                            revenue: 0,
                            orders: 0
                        };
                    }
                    dailyData[dateKey].production += length * quantity;
                    dailyData[dateKey].revenue += orderWithGST;
                    dailyData[dateKey].orders++;
                    
                    // For type distribution chart
                    typeDistribution[order.sheetType]++;
                }
            });

            // Update UI
            document.getElementById('today-orders').textContent = todayOrders;
            document.getElementById('monthly-production').textContent = `${monthlyProduction.toFixed(2)} meters`;
            document.getElementById('monthly-revenue').textContent = `₹${monthlyRevenue.toFixed(2)}`;
          

           
        })
        .catch((error) => {
            console.error("Error loading dashboard data:", error);
            showAlert("Failed to load dashboard data", "error");
        })
        .finally(() => {
            // Remove loading indicator
            if (dashboardContainer.contains(loadingIndicator)) {
                dashboardContainer.removeChild(loadingIndicator);
            }
        });
}


// Load recent orders for dashboard
function loadRecentOrders() {
    const ordersRef = database.ref('orders').orderByChild('timestamp').limitToLast(5);
    
    ordersRef.once('value')
        .then((snapshot) => {
            const ordersTable = document.getElementById('recent-orders-table').getElementsByTagName('tbody')[0];
            ordersTable.innerHTML = '';

            const orders = [];
            snapshot.forEach((childSnapshot) => {
                orders.unshift({
                    id: childSnapshot.key,
                    ...childSnapshot.val()
                });
            });

            orders.forEach((order) => {
                const row = ordersTable.insertRow();
                row.innerHTML = `
                    <td>${order.id.substring(0, 8)}...</td>
                    <td>${formatDate(order.timestamp)}</td>
                    <td>${order.customerName || 'N/A'}</td>
                    <td>${order.sheetType ? order.sheetType.charAt(0).toUpperCase() + order.sheetType.slice(1) : 'N/A'}</td>
                    <td>${order.length}m</td>
                    <td>${order.quantity}</td>
                    
                `;
            });
        })
        .catch((error) => {
            console.error("Error loading recent orders:", error);
            showAlert("Failed to load recent orders", "error");
        });
}

// Load orders for order page table
function loadRecentOrdersTable() {
    const ordersRef = database.ref('orders').orderByChild('timestamp').limitToLast(10);
    
    ordersRef.once('value')
        .then((snapshot) => {
            const ordersTable = document.getElementById('orders-table').getElementsByTagName('tbody')[0];
            ordersTable.innerHTML = '';

            const orders = [];
            snapshot.forEach((childSnapshot) => {
                orders.unshift({
                    id: childSnapshot.key,
                    ...childSnapshot.val()
                });
            });

            orders.forEach((order) => {
                const rate = PRICES[order.sheetType] || 0;
                const length = parseFloat(order.length) || 0;
                const quantity = parseInt(order.quantity) || 0;
                
                let total = rate * length * quantity;
                if (order.crimpingRequired === 'yes') {
                    total += CRIMPING_CHARGE * quantity;
                }
                total += total * GST_RATE;

                const row = ordersTable.insertRow();
                row.innerHTML = `
                    <td>${order.id.substring(0, 6)}...</td>
                    <td>${formatDate(order.timestamp).split(',')[0]}</td>
                    <td>${order.customerName || 'N/A'}</td>
                    <td>${order.sheetType ? order.sheetType.charAt(0).toUpperCase() + order.sheetType.slice(1) : 'N/A'}</td>
                    <td>${order.length}m</td>
                    <td>${order.quantity}</td>
                    <td>₹${total.toFixed(2)}</td>
                    <td>
                        <button class="action-btn small" onclick="reprintBill('${order.id}')">
                            <i class="fas fa-print"></i> Print
                        </button>
                    </td>
                `;
            });
        })
        .catch((error) => {
            console.error("Error loading orders table:", error);
            showAlert("Failed to load orders", "error");
        });
}

// Export orders to Excel
function exportToExcel() {
    // Show loading state
    const originalText = exportExcelBtn.innerHTML;
    exportExcelBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Exporting...';
    exportExcelBtn.disabled = true;

    // Get all orders from Firebase
    database.ref('orders').once('value')
        .then((snapshot) => {
            const orders = [];
            
            // Convert Firebase snapshot to array with proper formatting
            snapshot.forEach((childSnapshot) => {
                const orderData = childSnapshot.val();
                const order = {
                    'Order ID': childSnapshot.key,
                    'Date': new Date(orderData.timestamp).toLocaleDateString('en-IN'),
                    'Customer': orderData.customerName || '',
                    'Sheet Type': orderData.sheetType.toUpperCase(),
                    'Sheet Color': orderData.sheetColor.toUpperCase(),
                    'Length (m)': parseFloat(orderData.length),
                    'Quantity': parseInt(orderData.quantity),
                    'Crimping': orderData.crimpingRequired === 'yes' ? 'Yes' : 'No',
                    'Base Price (₹)': (PRICES[orderData.sheetType] * orderData.length * orderData.quantity).toFixed(2),
                    'Crimping Charge (₹)': orderData.crimpingRequired === 'yes' ? (CRIMPING_CHARGE * orderData.quantity).toFixed(2) : '0.00',
                    'Subtotal (₹)': '',
                    'GST (18%) (₹)': '',
                    'Total (₹)': ''
                };
                
                // Calculate financials
                const subtotal = parseFloat(order['Base Price (₹)']) + 
                               (orderData.crimpingRequired === 'yes' ? parseFloat(order['Crimping Charge (₹)']) : 0);
                const gst = subtotal * GST_RATE;
                const total = subtotal + gst;
                
                order['Subtotal (₹)'] = subtotal.toFixed(2);
                order['GST (18%) (₹)'] = gst.toFixed(2);
                order['Total (₹)'] = total.toFixed(2);
                
                orders.push(order);
            });

            if (orders.length === 0) {
                throw new Error("No orders found to export");
            }
            
            // Create Excel workbook
            const wb = XLSX.utils.book_new();
            const ws = XLSX.utils.json_to_sheet(orders);
            
            // Set column widths
            const wscols = [
                {wch: 20}, {wch: 12}, {wch: 15}, {wch: 12}, 
                {wch: 12}, {wch: 10}, {wch: 10}, {wch: 10},
                {wch: 15}, {wch: 15}, {wch: 15}, {wch: 15}, {wch: 15}
            ];
            ws['!cols'] = wscols;
            
            // Add worksheet to workbook
            XLSX.utils.book_append_sheet(wb, ws, "Orders");
            
            // Generate Excel file and download
            const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
            XLSX.writeFile(wb, `Roofing_Orders_${dateStr}.xlsx`);
        })
        .catch((error) => {
            console.error("Export error:", error);
            showAlert(`Export failed: ${error.message}`, "error");
        })
        .finally(() => {
            // Restore button state
            exportExcelBtn.innerHTML = originalText;
            exportExcelBtn.disabled = false;
        });
}

// Reprint bill for existing order
async function reprintBill(orderId) {
    try {
        const snapshot = await database.ref(`orders/${orderId}`).once('value');
        if (!snapshot.exists()) {
            throw new Error("Order not found");
        }
        
        const order = snapshot.val();
        generateBill({...order, id: orderId}, order.customerName, order.customerAddress, order.paymentMethod);
    } catch (error) {
        console.error("Error reprinting bill:", error);
        showAlert(`Failed to reprint bill: ${error.message}`, "error");
    }
}

// Logout user
function logoutUser() {
    auth.signOut().then(() => {
        showAlert("You have been logged out successfully", "success");
    }).catch((error) => {
        console.error("Logout error:", error);
        showAlert("Failed to logout. Please try again.", "error");
    });
}

// Helper function to format date
function formatDate(isoString) {
    const date = new Date(isoString);
    return date.toLocaleString('en-IN', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
    });
}

// Convert number to words for invoice
function numberToWords(num) {
    const units = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine'];
    const teens = ['Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
    const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
    const thousands = ['', 'Thousand', 'Lakh', 'Crore'];

    if (num === 0) return 'Zero';

    function convertToWords(n) {
        if (n < 10) return units[n];
        if (n < 20) return teens[n - 10];
        if (n < 100) return tens[Math.floor(n / 10)] + (n % 10 !== 0 ? ' ' + units[n % 10] : '');
        if (n < 1000) return units[Math.floor(n / 100)] + ' Hundred' + (n % 100 !== 0 ? ' ' + convertToWords(n % 100) : '');
        return '';
    }

    let wordResult = '';
    let place = 0;

    while (num > 0) {
        let chunk = num % 1000;
        if (chunk !== 0) {
            wordResult = convertToWords(chunk) + (thousands[place] ? ' ' + thousands[place] + ' ' : '') + wordResult;
        }
        num = Math.floor(num / 1000);
        place++;
    }

    return wordResult.trim();
}

// Generate bill/invoice
function generateBill(order, customerName, customerAddress, paymentMethod) {
    // Calculate amounts
    const rate = PRICES[order.sheetType];
    const quantity = parseFloat(order.quantity);
    const length = parseFloat(order.length);
    
    // Calculate base price
    let subtotal = rate * length * quantity;
    
    // Add crimping charge if required
    let crimpingCharge = 0;
    if (order.crimpingRequired === 'yes') {
        crimpingCharge = CRIMPING_CHARGE * quantity;
        subtotal += crimpingCharge;
    }
    
    // Calculate GST and total
    const gstAmount = subtotal * GST_RATE;
    const totalAmount = subtotal + gstAmount;
    
    // Create bill HTML
    const billHTML = `
    <div class="bill-container" id="bill-content" style="width: 21cm; height: 29.7cm; padding: 1cm; font-family: Arial; box-sizing: border-box;">
        <div style="display: flex; justify-content: space-between; margin-bottom: 10px;">
            <div style="width: 60%;">
                <h1 style="margin: 0; font-size: 24px;">SRE VINAYAGAA ROOFING PRODUCTS</h1>
                <p style="margin: 5px 0; font-size: 14px;">V Tech Color Roofing Sheet Manufacturers</p>
                <p style="margin: 5px 0; font-size: 12px;">65/3, ERODE MAIN ROAD, OPP. PALANISAMY COLLEGE, KARUKAMPALAYAM, PERUNDURAI, ERODE - 638 052 <br> Phone: +91 9942126768</p>
                <p style="margin: 5px 0; font-size: 12px;">GSTIN: 22AAAAA0000A1Z5</p>
            </div>
            <div style="text-align: right;">
                <h2 style="margin: 0; font-size: 20px; color: #2c3e50;">TAX INVOICE</h2>
                <p style="margin: 5px 0; font-size: 12px;"><strong>Invoice No:</strong> ${order.id}</p>
                <p style="margin: 5px 0; font-size: 12px;"><strong>Date:</strong> ${formatDate(order.timestamp)}</p>
            </div>
        </div>

        <div style="display: flex; margin: 15px 0; font-size: 12px;">
            <div style="width: 50%; padding-right: 10px;">
                <p style="margin: 2px 0; font-weight: bold;">BILL TO:</p>
                <p style="margin: 2px 0;">${customerName}</p>
                <p style="margin: 2px 0; white-space: pre-line;">${customerAddress}</p>
            </div>
            <div style="width: 50%;">
                <p style="margin: 2px 0;"><strong>Payment Method:</strong> ${paymentMethod.toUpperCase()}</p>
                <p style="margin: 2px 0;"><strong>HSN/SAC Code:</strong> 7210</p>
            </div>
        </div>

        <table style="width: 100%; border-collapse: collapse; margin: 10px 0; font-size: 12px;">
            <thead>
                <tr style="background-color: #f2f2f2;">
                    <th style="padding: 5px; border: 1px solid #ddd; text-align: left; width: 5%;">#</th>
                    <th style="padding: 5px; border: 1px solid #ddd; text-align: left; width: 45%;">Description</th>
                    <th style="padding: 5px; border: 1px solid #ddd; text-align: center; width: 10%;">Qty</th>
                    <th style="padding: 5px; border: 1px solid #ddd; text-align: center; width: 10%;">Length</th>
                    <th style="padding: 5px; border: 1px solid #ddd; text-align: right; width: 15%;">Rate (₹)</th>
                    <th style="padding: 5px; border: 1px solid #ddd; text-align: right; width: 15%;">Amount (₹)</th>
                </tr>
            </thead>
            <tbody>
                <tr>
                    <td style="padding: 5px; border: 1px solid #ddd; text-align: center;">1</td>
                    <td style="padding: 5px; border: 1px solid #ddd;">
                        ${order.sheetType.toUpperCase()} SHEET (${order.sheetColor.toUpperCase()})
                        <div style="font-size: 11px; color: #666;">HSN: 7210 | GST: 18%</div>
                    </td>
                    <td style="padding: 5px; border: 1px solid #ddd; text-align: center;">${quantity}</td>
                    <td style="padding: 5px; border: 1px solid #ddd; text-align: center;">${length}</td>
                    <td style="padding: 5px; border: 1px solid #ddd; text-align: right;">${rate.toFixed(2)}</td>
                    <td style="padding: 5px; border: 1px solid #ddd; text-align: right;">${(rate * length * quantity).toFixed(2)}</td>
                </tr>
                ${order.crimpingRequired === 'yes' ? `
                <tr>
                    <td style="padding: 5px; border: 1px solid #ddd; text-align: center;">2</td>
                    <td style="padding: 5px; border: 1px solid #ddd;">
                        CRIMPING SERVICE
                        <div style="font-size: 11px; color: #666;">SAC: 9987 | GST: 18%</div>
                    </td>
                    <td style="padding: 5px; border: 1px solid #ddd; text-align: center;">${quantity}</td>
                    <td style="padding: 5px; border: 1px solid #ddd; text-align: center;">-</td>
                    <td style="padding: 5px; border: 1px solid #ddd; text-align: right;">${CRIMPING_CHARGE.toFixed(2)}</td>
                    <td style="padding: 5px; border: 1px solid #ddd; text-align: right;">${crimpingCharge.toFixed(2)}</td>
                </tr>
                ` : ''}
                <tr>
                    <td colspan="5" style="padding: 5px; border: 1px solid #ddd; text-align: right; font-weight: bold;">Subtotal:</td>
                    <td style="padding: 5px; border: 1px solid #ddd; text-align: right;">${subtotal.toFixed(2)}</td>
                </tr>
                <tr>
                    <td colspan="5" style="padding: 5px; border: 1px solid #ddd; text-align: right; font-weight: bold;">GST (18%):</td>
                    <td style="padding: 5px; border: 1px solid #ddd; text-align: right;">${gstAmount.toFixed(2)}</td>
                </tr>
                <tr style="background-color: #f2f2f2;">
                    <td colspan="5" style="padding: 5px; border: 1px solid #ddd; text-align: right; font-weight: bold;">Total Amount:</td>
                    <td style="padding: 5px; border: 1px solid #ddd; text-align: right; font-weight: bold;">${totalAmount.toFixed(2)}</td>
                </tr>
            </tbody>
        </table>

        <div style="margin-top: 10px; font-size: 11px; text-align: center;">
            <p>Amount in Words: ${numberToWords(Math.floor(totalAmount))} Rupees Only</p>
        </div>

        <div style="display: flex; justify-content: space-between; margin-top: 20px; font-size: 11px;">
            <div style="width: 50%;">
                <p style="font-weight: bold; margin-bottom: 5px;">Terms & Conditions:</p>
                <ul style="margin: 0; padding-left: 15px;">
                    <li>Payment due within 15 days</li>
                    <li>Warranty as per company policy</li>
                    <li>Subject to Chennai jurisdiction</li>
                </ul>
            </div>

          <div style="width: 40%; text-align: right; margin-left: auto;">
          <p style="font-weight: bold; margin-bottom: 10px;">For SRE VINAYAGAA ROOFING PRODUCTS</p>
    
     <div style="display: inline-block; text-align: right; margin-top: 5px;">
        <p style="margin-bottom: 2px; line-height: 1;">Authorized Signatory:</p>
        <img src="Assets/S.png" alt="Signature" style="width: 150px; height: auto; display: block; margin-bottom: 2px;">
        <p style="font-weight: bold; margin-top: 0;">Syed Mohammed Sathiq S</p>
     </div>
    </div>
        </div>

        <div style="margin-top: 15px; text-align: center; font-size: 10px;">
            <p>Thank you for your business!</p>
            <p>&copy; ${new Date().getFullYear()} SRE Vinayagaa Roofing Products</p>
        </div>
    </div>
    `;

    // Create a new window for the bill with print-specific styles
    const billWindow = window.open('', '_blank');
    billWindow.document.write(`
        <!DOCTYPE html>
        <html>
            <head>
                <title>Invoice ${order.id}</title>
                <style>
                    @page {
                        size: A4;
                        margin: 0;
                    }
                    body {
                        margin: 0;
                        padding: 0;
                        font-family: Arial;
                        -webkit-print-color-adjust: exact;
                    }
                    .bill-container {
                        width: 21cm;
                        height: 29.7cm;
                        padding: 1cm;
                        box-sizing: border-box;
                    }
                    table {
                        width: 100%;
                        border-collapse: collapse;
                    }
                    th, td {
                        border: 1px solid #ddd;
                        padding: 5px;
                    }
                    th {
                        background-color: #f2f2f2 !important;
                    }
                </style>
            </head>
            <body onload="window.print(); setTimeout(() => window.close(), 100);">
                ${billHTML}
            </body>
        </html>
    `);

    billWindow.document.close();
}

// Show alert message
function showAlert(message, type = 'info') {
    // Remove any existing alerts
    const existingAlert = document.querySelector('.alert');
    if (existingAlert) {
        existingAlert.remove();
    }

    // Create alert element
    const alert = document.createElement('div');
    alert.className = `alert alert-${type}`;
    alert.innerHTML = `
        <span>${message}</span>
        <button class="close-btn">&times;</button>
    `;

    // Add to body
    document.body.appendChild(alert);

    // Close button handler
    alert.querySelector('.close-btn').addEventListener('click', () => {
        alert.remove();
    });

    // Auto-remove after 5 seconds
    setTimeout(() => {
        if (alert.parentNode) {
            alert.remove();
        }
    }, 5000);
}

// Initialize the application when DOM is loaded
document.addEventListener('DOMContentLoaded', initApp);