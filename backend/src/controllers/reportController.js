const db = require('../config/db');

// 1. Comprehensive Financial Profit & Loss Statement
exports.getProfitAndLoss = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    let dateFilter = '';
    const params = [];

    if (startDate && endDate) {
      dateFilter = ` AND DATE(sale_date) >= DATE(?) AND DATE(sale_date) <= DATE(?)`;
      params.push(startDate, endDate);
    }

    // Revenue & COGS from Completed Sales
    const salesAgg = await db.query(`
      SELECT 
        COUNT(s.id) AS total_invoices,
        COALESCE(SUM(s.subtotal), 0) AS gross_sales,
        COALESCE(SUM(s.discount_amount), 0) AS total_discounts,
        COALESCE(SUM(s.vat_amount), 0) AS total_vat,
        COALESCE(SUM(s.total_amount), 0) AS net_revenue
      FROM sales s
      WHERE s.status != 'cancelled' ${dateFilter}
    `, params);

    // COGS
    let cogsDateFilter = '';
    const cogsParams = [];
    if (startDate && endDate) {
      cogsDateFilter = ` AND DATE(s.sale_date) >= DATE(?) AND DATE(s.sale_date) <= DATE(?)`;
      cogsParams.push(startDate, endDate);
    }

    const cogsAgg = await db.query(`
      SELECT 
        COALESCE(SUM(si.quantity * si.unit_cost), 0) AS total_cogs
      FROM sale_items si
      JOIN sales s ON si.sale_id = s.id
      WHERE s.status != 'cancelled' ${cogsDateFilter}
    `, cogsParams);

    // Total Returns & Refunds
    let retDateFilter = '';
    const retParams = [];
    if (startDate && endDate) {
      retDateFilter = ` AND DATE(return_date) >= DATE(?) AND DATE(return_date) <= DATE(?)`;
      retParams.push(startDate, endDate);
    }
    const returnsAgg = await db.query(`
      SELECT COALESCE(SUM(total_refund_amount), 0) AS total_refunds FROM returns WHERE status = 'approved' ${retDateFilter}
    `, retParams);

    // Expenses
    let expDateFilter = '';
    const expParams = [];
    if (startDate && endDate) {
      expDateFilter = ` AND expense_date >= ? AND expense_date <= ?`;
      expParams.push(startDate, endDate);
    }
    const expenseAgg = await db.query(`
      SELECT 
        COALESCE(SUM(amount), 0) AS total_expenses
      FROM expenses
      WHERE 1=1 ${expDateFilter}
    `, expParams);

    // Expense breakdown by category
    const expenseByCategory = await db.query(`
      SELECT category, SUM(amount) AS total_amount
      FROM expenses
      WHERE 1=1 ${expDateFilter}
      GROUP BY category
    `, expParams);

    const revenue = parseFloat(salesAgg.rows[0].net_revenue) - parseFloat(returnsAgg.rows[0].total_refunds);
    const cogs = parseFloat(cogsAgg.rows[0].total_cogs);
    const grossProfit = Math.max(0, revenue - cogs);
    const totalExpenses = parseFloat(expenseAgg.rows[0].total_expenses);
    const netProfit = grossProfit - totalExpenses;
    const grossMarginPct = revenue > 0 ? ((grossProfit / revenue) * 100).toFixed(2) : 0;
    const netMarginPct = revenue > 0 ? ((netProfit / revenue) * 100).toFixed(2) : 0;

    res.json({
      success: true,
      data: {
        summary: {
          grossSales: parseFloat(salesAgg.rows[0].gross_sales),
          discounts: parseFloat(salesAgg.rows[0].total_discounts),
          returns: parseFloat(returnsAgg.rows[0].total_refunds),
          netRevenue: revenue,
          cogs,
          grossProfit,
          grossMarginPct: Number(grossMarginPct),
          totalExpenses,
          netProfit,
          netMarginPct: Number(netMarginPct),
          vatCollected: parseFloat(salesAgg.rows[0].total_vat),
          invoiceCount: salesAgg.rows[0].total_invoices
        },
        expenseBreakdown: expenseByCategory.rows
      }
    });
  } catch (err) {
    console.error('P&L report error:', err);
    res.status(500).json({ success: false, message: 'Failed to generate financial report' });
  }
};

// 2. Sales Analytics by Period (Daily, Weekly, Monthly)
exports.getSalesByPeriod = async (req, res) => {
  try {
    const { period = 'monthly' } = req.query; // 'daily', 'weekly', 'monthly'

    let sql = '';
    if (period === 'daily') {
      sql = `
        SELECT 
          DATE(sale_date) AS period_label,
          COUNT(id) AS order_count,
          SUM(total_amount) AS revenue,
          SUM(vat_amount) AS tax
        FROM sales
        WHERE status != 'cancelled'
        GROUP BY DATE(sale_date)
        ORDER BY period_label DESC
        LIMIT 30
      `;
    } else {
      sql = `
        SELECT 
          strftime('%Y-%m', sale_date) AS period_label,
          COUNT(id) AS order_count,
          SUM(total_amount) AS revenue,
          SUM(vat_amount) AS tax
        FROM sales
        WHERE status != 'cancelled'
        GROUP BY period_label
        ORDER BY period_label DESC
        LIMIT 12
      `;
    }

    const result = await db.query(sql);
    res.json({ success: true, data: result.rows });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Error retrieving sales analytics' });
  }
};

// 3. Best-Selling vs Slow-Moving Products
exports.getProductPerformance = async (req, res) => {
  try {
    // Best Selling
    const bestSelling = await db.query(`
      SELECT 
        p.id, p.name, p.sku, p.quantity AS current_stock, p.selling_price, p.image_url,
        c.name AS category_name,
        COALESCE(SUM(si.quantity), 0) AS units_sold,
        COALESCE(SUM(si.total), 0) AS total_revenue,
        COALESCE(SUM(si.quantity * (si.unit_price - si.unit_cost)), 0) AS total_profit
      FROM products p
      LEFT JOIN sale_items si ON p.id = si.product_id
      LEFT JOIN categories c ON p.category_id = c.id
      GROUP BY p.id
      HAVING units_sold > 0
      ORDER BY units_sold DESC
      LIMIT 10
    `);

    // Slow moving (or zero sales)
    const slowMoving = await db.query(`
      SELECT 
        p.id, p.name, p.sku, p.quantity AS current_stock, p.selling_price, p.shelf_location,
        c.name AS category_name,
        COALESCE(SUM(si.quantity), 0) AS units_sold
      FROM products p
      LEFT JOIN sale_items si ON p.id = si.product_id
      LEFT JOIN categories c ON p.category_id = c.id
      GROUP BY p.id
      ORDER BY units_sold ASC, p.quantity DESC
      LIMIT 10
    `);

    res.json({
      success: true,
      data: {
        bestSelling: bestSelling.rows,
        slowMoving: slowMoving.rows
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to retrieve product performance' });
  }
};

// 4. Stock Movement Audit Ledger
exports.getStockMovementReport = async (req, res) => {
  try {
    const { product_id, type, limit = 50 } = req.query;
    let sql = `
      SELECT 
        sm.*,
        p.name AS product_name,
        p.sku,
        u.name AS user_name
      FROM stock_movements sm
      JOIN products p ON sm.product_id = p.id
      JOIN users u ON sm.user_id = u.id
      WHERE 1=1
    `;
    const params = [];

    if (product_id) {
      sql += ` AND sm.product_id = ?`;
      params.push(product_id);
    }
    if (type) {
      sql += ` AND sm.movement_type = ?`;
      params.push(type);
    }

    sql += ` ORDER BY sm.created_at DESC LIMIT ?`;
    params.push(parseInt(limit, 10));

    const result = await db.query(sql, params);
    res.json({ success: true, count: result.rows.length, data: result.rows });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to retrieve stock movement ledger' });
  }
};

// 5. Cash Flow Summary
exports.getCashFlow = async (req, res) => {
  try {
    // Inflows (Payments from sales)
    const inflowRes = await db.query(`
      SELECT 
        payment_method,
        SUM(amount) AS total_amount,
        COUNT(id) AS transaction_count
      FROM payments
      GROUP BY payment_method
    `);

    // Outflows (Purchases paid + Expenses)
    const expenseRes = await db.query(`
      SELECT 
        payment_method,
        SUM(amount) AS total_amount
      FROM expenses
      GROUP BY payment_method
    `);

    const purchasePaidRes = await db.query(`
      SELECT COALESCE(SUM(paid_amount), 0) AS total_paid FROM purchases
    `);

    let totalInflow = 0;
    inflowRes.rows.forEach(r => totalInflow += parseFloat(r.total_amount));

    let totalExpenses = 0;
    expenseRes.rows.forEach(r => totalExpenses += parseFloat(r.total_amount));
    const totalPurchasesPaid = parseFloat(purchasePaidRes.rows[0].total_paid);
    const totalOutflow = totalExpenses + totalPurchasesPaid;

    res.json({
      success: true,
      data: {
        totalInflow,
        totalOutflow,
        netCashFlow: totalInflow - totalOutflow,
        inflowByMethod: inflowRes.rows,
        expensesByMethod: expenseRes.rows,
        purchasesDisbursed: totalPurchasesPaid
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Error calculating cash flow' });
  }
};
