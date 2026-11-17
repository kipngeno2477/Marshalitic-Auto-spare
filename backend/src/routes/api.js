const express = require('express');
const router = express.Router();

const { authenticateToken, requireRoles } = require('../middleware/auth');

const authController = require('../controllers/authController');
const dashboardController = require('../controllers/dashboardController');
const productController = require('../controllers/productController');
const compatibilityController = require('../controllers/compatibilityController');
const posController = require('../controllers/posController');
const salesController = require('../controllers/salesController');
const purchaseController = require('../controllers/purchaseController');
const customerController = require('../controllers/customerController');
const supplierController = require('../controllers/supplierController');
const expenseController = require('../controllers/expenseController');
const reportController = require('../controllers/reportController');
const mpesaController = require('../controllers/mpesaController');
const userController = require('../controllers/userController');
const settingsController = require('../controllers/settingsController');

// 1. Auth
router.post('/auth/login', authController.login);
router.get('/auth/profile', authenticateToken, authController.getProfile);
router.post('/auth/change-password', authenticateToken, authController.changePassword);

// 2. Dashboard
router.get('/dashboard/stats', dashboardController.getDashboardStats);
router.post('/dashboard/toggle-status', authenticateToken, dashboardController.toggleShopStatus);

// 3. Products & Inventory
router.get('/products/valuation', productController.getValuation);
router.get('/products/categories', productController.getCategories);
router.post('/products/categories', authenticateToken, requireRoles('admin', 'manager'), productController.createCategory);
router.get('/products/brands', productController.getBrands);
router.get('/products', productController.getProducts);
router.get('/products/:id', productController.getProductById);
router.post('/products', authenticateToken, requireRoles('admin', 'manager', 'storekeeper'), productController.createProduct);
router.put('/products/:id', authenticateToken, requireRoles('admin', 'manager', 'storekeeper'), productController.updateProduct);
router.delete('/products/:id', authenticateToken, requireRoles('admin', 'manager'), productController.deleteProduct);
router.post('/products/:id/adjust-stock', authenticateToken, requireRoles('admin', 'manager', 'storekeeper'), productController.adjustStock);

// 4. Vehicle Compatibility
router.get('/vehicles/makes', compatibilityController.getVehicleMakes);
router.get('/vehicles/search', compatibilityController.searchByVehicle);
router.get('/vehicles', compatibilityController.getVehicles);
router.post('/vehicles', authenticateToken, requireRoles('admin', 'manager'), compatibilityController.createVehicle);
router.post('/vehicles/link', authenticateToken, requireRoles('admin', 'manager'), compatibilityController.linkCompatibility);

// 5. Point of Sale (POS)
router.get('/pos/products', posController.searchPosProducts);
router.post('/pos/validate', posController.validateCart);
router.post('/pos/checkout', authenticateToken, posController.checkout);

// 6. Sales
router.get('/sales', salesController.getSales);
router.get('/sales/:id', salesController.getSaleById);
router.post('/sales/returns', authenticateToken, requireRoles('admin', 'manager'), salesController.processReturn);

// 7. Purchases
router.get('/purchases', purchaseController.getPurchases);
router.get('/purchases/:id', purchaseController.getPurchaseById);
router.post('/purchases', authenticateToken, requireRoles('admin', 'manager', 'storekeeper'), purchaseController.createPurchase);
router.post('/purchases/:id/receive', authenticateToken, requireRoles('admin', 'manager', 'storekeeper'), purchaseController.receivePurchase);

// 8. Customers
router.get('/customers', customerController.getCustomers);
router.get('/customers/:id', customerController.getCustomerById);
router.post('/customers', authenticateToken, customerController.createCustomer);
router.put('/customers/:id', authenticateToken, customerController.updateCustomer);

// 9. Suppliers
router.get('/suppliers', supplierController.getSuppliers);
router.get('/suppliers/:id', supplierController.getSupplierById);
router.post('/suppliers', authenticateToken, requireRoles('admin', 'manager'), supplierController.createSupplier);
router.put('/suppliers/:id', authenticateToken, requireRoles('admin', 'manager'), supplierController.updateSupplier);

// 10. Expenses
router.get('/expenses', expenseController.getExpenses);
router.post('/expenses', authenticateToken, requireRoles('admin', 'manager'), expenseController.createExpense);
router.delete('/expenses/:id', authenticateToken, requireRoles('admin'), expenseController.deleteExpense);

// 11. Reports & Analytics
router.get('/reports/pnl', authenticateToken, requireRoles('admin', 'manager'), reportController.getProfitAndLoss);
router.get('/reports/sales-period', authenticateToken, requireRoles('admin', 'manager'), reportController.getSalesByPeriod);
router.get('/reports/products', authenticateToken, requireRoles('admin', 'manager'), reportController.getProductPerformance);
router.get('/reports/stock-movements', authenticateToken, requireRoles('admin', 'manager', 'storekeeper'), reportController.getStockMovementReport);
router.get('/reports/cashflow', authenticateToken, requireRoles('admin', 'manager'), reportController.getCashFlow);

// 12. M-Pesa Daraja
router.post('/mpesa/stkpush', mpesaController.initiateStkPush);
router.get('/mpesa/status/:checkoutRequestId', mpesaController.queryStkStatus);
router.post('/mpesa/callback', mpesaController.handleCallback);

// 13. Users & Audit Logs
router.get('/users/activity-logs', authenticateToken, requireRoles('admin', 'manager'), userController.getActivityLogs);
router.get('/users', authenticateToken, requireRoles('admin'), userController.getUsers);
router.post('/users', authenticateToken, requireRoles('admin'), userController.createUser);
router.put('/users/:id', authenticateToken, requireRoles('admin'), userController.updateUser);

// 14. Settings & Backups
router.get('/settings', settingsController.getSettings);
router.post('/settings', authenticateToken, requireRoles('admin'), settingsController.updateSettings);
router.post('/settings/backup', authenticateToken, requireRoles('admin'), settingsController.createBackup);

module.exports = router;
