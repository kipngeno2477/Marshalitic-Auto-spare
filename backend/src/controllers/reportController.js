const db = require('../config/db');

// 1. Comprehensive Financial Profit & Loss Statement
exports.getProfitAndLoss = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    const salesCol = db.getCollection('sales');
    const saleItemsCol = db.getCollection('sale_items');
    const returnsCol = db.getCollection('returns');
    const expensesCol = db.getCollection('expenses');

    // Filter for sales
    const salesMatch = { status: { $ne: 'cancelled' } };
    if (startDate || endDate) {
      salesMatch.sale_date = {};
      if (startDate) salesMatch.sale_date.$gte = startDate;
      if (endDate) salesMatch.sale_date.$lte = endDate + ' 23:59:59';
    }

    const salesAgg = await salesCol.aggregate([
      { $match: salesMatch },
      {
        $group: {
          _id: null,
          total_invoices: { $sum: 1 },
          gross_sales: { $sum: '$subtotal' },
          total_discounts: { $sum: '$discount_amount' },
          total_vat: { $sum: '$vat_amount' },
          net_revenue: { $sum: '$total_amount' }
        }
      }
    ]).toArray();

    const salesData = salesAgg[0] || {
      total_invoices: 0,
      gross_sales: 0,
      total_discounts: 0,
      total_vat: 0,
      net_revenue: 0
    };

    // COGS: find matching sale IDs
    const matchedSales = await salesCol.find(salesMatch, { projection: { id: 1 } }).toArray();
    const matchedSaleIds = matchedSales.map(s => s.id);

    let totalCogs = 0;
    if (matchedSaleIds.length > 0) {
      const cogsAgg = await saleItemsCol.aggregate([
        { $match: { sale_id: { $in: matchedSaleIds } } },
        {
          $group: {
            _id: null,
            total_cogs: { $sum: { $multiply: ['$quantity', '$unit_cost'] } }
          }
        }
      ]).toArray();
      if (cogsAgg.length > 0) {
        totalCogs = cogsAgg[0].total_cogs;
      }
    }

    // Returns
    const returnsMatch = { status: 'approved' };
    if (startDate || endDate) {
      returnsMatch.return_date = {};
      if (startDate) returnsMatch.return_date.$gte = startDate;
      if (endDate) returnsMatch.return_date.$lte = endDate + ' 23:59:59';
    }
    const returnsAgg = await returnsCol.aggregate([
      { $match: returnsMatch },
      { $group: { _id: null, total_refunds: { $sum: '$total_refund_amount' } } }
    ]).toArray();
    const totalRefunds = returnsAgg.length > 0 ? returnsAgg[0].total_refunds : 0;

    // Expenses
    const expensesMatch = {};
    if (startDate || endDate) {
      expensesMatch.expense_date = {};
      if (startDate) expensesMatch.expense_date.$gte = startDate;
      if (endDate) expensesMatch.expense_date.$lte = endDate;
    }
    const expensesAgg = await expensesCol.aggregate([
      { $match: expensesMatch },
      { $group: { _id: null, total_expenses: { $sum: '$amount' } } }
    ]).toArray();
    const totalExpenses = expensesAgg.length > 0 ? expensesAgg[0].total_expenses : 0;

    const expenseByCategory = await expensesCol.aggregate([
      { $match: expensesMatch },
      {
        $group: {
          _id: '$category',
          total_amount: { $sum: '$amount' }
        }
      },
      {
        $project: {
          _id: 0,
          category: '$_id',
          total_amount: 1
        }
      }
    ]).toArray();

    const revenue = parseFloat(salesData.net_revenue) - parseFloat(totalRefunds);
    const cogs = parseFloat(totalCogs);
    const grossProfit = Math.max(0, revenue - cogs);
    const netProfit = grossProfit - totalExpenses;
    const grossMarginPct = revenue > 0 ? ((grossProfit / revenue) * 100).toFixed(2) : 0;
    const netMarginPct = revenue > 0 ? ((netProfit / revenue) * 100).toFixed(2) : 0;

    res.json({
      success: true,
      data: {
        summary: {
          grossSales: parseFloat(salesData.gross_sales),
          discounts: parseFloat(salesData.total_discounts),
          returns: parseFloat(totalRefunds),
          netRevenue: revenue,
          cogs,
          grossProfit,
          grossMarginPct: Number(grossMarginPct),
          totalExpenses,
          netProfit,
          netMarginPct: Number(netMarginPct),
          vatCollected: parseFloat(salesData.total_vat),
          invoiceCount: salesData.total_invoices
        },
        expenseBreakdown: expenseByCategory
      }
    });
  } catch (err) {
    console.error('P&L report error:', err);
    res.status(500).json({ success: false, message: 'Failed to generate financial report' });
  }
};

// 2. Sales Analytics by Period
exports.getSalesByPeriod = async (req, res) => {
  try {
    const { period = 'monthly' } = req.query;
    const substrLength = period === 'daily' ? 10 : 7;
    const limit = period === 'daily' ? 30 : 12;

    const salesCol = db.getCollection('sales');
    const result = await salesCol.aggregate([
      { $match: { status: { $ne: 'cancelled' } } },
      {
        $project: {
          period_label: { $substr: ['$sale_date', 0, substrLength] },
          total_amount: 1,
          vat_amount: 1
        }
      },
      {
        $group: {
          _id: '$period_label',
          order_count: { $sum: 1 },
          revenue: { $sum: '$total_amount' },
          tax: { $sum: '$vat_amount' }
        }
      },
      { $sort: { _id: -1 } },
      { $limit: limit },
      {
        $project: {
          _id: 0,
          period_label: '$_id',
          order_count: 1,
          revenue: 1,
          tax: 1
        }
      }
    ]).toArray();

    res.json({ success: true, data: result });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Error retrieving sales analytics' });
  }
};

// 3. Best-Selling vs Slow-Moving Products
exports.getProductPerformance = async (req, res) => {
  try {
    const productsCol = db.getCollection('products');
    const saleItemsCol = db.getCollection('sale_items');
    const categoriesCol = db.getCollection('categories');

    const [products, categories, itemSales] = await Promise.all([
      productsCol.find({}, { projection: { _id: 0 } }).toArray(),
      categoriesCol.find({}, { projection: { id: 1, name: 1, _id: 0 } }).toArray(),
      saleItemsCol.aggregate([
        {
          $group: {
            _id: '$product_id',
            units_sold: { $sum: '$quantity' },
            total_revenue: { $sum: '$total' },
            total_profit: { $sum: { $multiply: ['$quantity', { $subtract: ['$unit_price', '$unit_cost'] }] } }
          }
        }
      ]).toArray()
    ]);

    const catMap = new Map(categories.map(c => [c.id, c.name]));
    const salesMap = new Map(itemSales.map(i => [i._id, i]));

    const performanceList = products.map(p => {
      const s = salesMap.get(p.id) || { units_sold: 0, total_revenue: 0, total_profit: 0 };
      return {
        id: p.id,
        name: p.name,
        sku: p.sku,
        current_stock: p.quantity,
        selling_price: p.selling_price,
        shelf_location: p.shelf_location || '',
        image_url: p.image_url || null,
        category_name: catMap.get(p.category_id) || '',
        units_sold: s.units_sold,
        total_revenue: s.total_revenue,
        total_profit: s.total_profit
      };
    });

    const bestSelling = performanceList
      .filter(p => p.units_sold > 0)
      .sort((a, b) => b.units_sold - a.units_sold)
      .slice(0, 10);

    const slowMoving = [...performanceList]
      .sort((a, b) => a.units_sold - b.units_sold || b.current_stock - a.current_stock)
      .slice(0, 10);

    res.json({
      success: true,
      data: {
        bestSelling,
        slowMoving
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
    const filter = {};

    if (product_id) {
      filter.product_id = Number(product_id);
    }
    if (type) {
      filter.movement_type = type;
    }

    const movementsCol = db.getCollection('stock_movements');
    const productsCol = db.getCollection('products');
    const usersCol = db.getCollection('users');

    const movements = await movementsCol
      .find(filter, { projection: { _id: 0 } })
      .sort({ created_at: -1, id: -1 })
      .limit(parseInt(limit, 10))
      .toArray();

    const productIds = [...new Set(movements.map(m => m.product_id).filter(Boolean))];
    const userIds = [...new Set(movements.map(m => m.user_id).filter(Boolean))];

    const [products, users] = await Promise.all([
      productsCol.find({ id: { $in: productIds } }, { projection: { id: 1, name: 1, sku: 1, _id: 0 } }).toArray(),
      usersCol.find({ id: { $in: userIds } }, { projection: { id: 1, name: 1, _id: 0 } }).toArray()
    ]);

    const prodMap = new Map(products.map(p => [p.id, p]));
    const userMap = new Map(users.map(u => [u.id, u.name]));

    const enriched = movements.map(m => {
      const p = prodMap.get(m.product_id) || {};
      return {
        ...m,
        product_name: p.name || '',
        sku: p.sku || '',
        user_name: userMap.get(m.user_id) || 'Staff'
      };
    });

    res.json({ success: true, count: enriched.length, data: enriched });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to retrieve stock movement ledger' });
  }
};

// 5. Cash Flow Summary
exports.getCashFlow = async (req, res) => {
  try {
    const paymentsCol = db.getCollection('payments');
    const expensesCol = db.getCollection('expenses');
    const purchasesCol = db.getCollection('purchases');

    const [inflows, expenseBreakdown, purchasesAgg] = await Promise.all([
      paymentsCol.aggregate([
        {
          $group: {
            _id: '$payment_method',
            total_amount: { $sum: '$amount' },
            transaction_count: { $sum: 1 }
          }
        },
        {
          $project: {
            _id: 0,
            payment_method: '$_id',
            total_amount: 1,
            transaction_count: 1
          }
        }
      ]).toArray(),
      expensesCol.aggregate([
        {
          $group: {
            _id: '$payment_method',
            total_amount: { $sum: '$amount' }
          }
        },
        {
          $project: {
            _id: 0,
            payment_method: '$_id',
            total_amount: 1
          }
        }
      ]).toArray(),
      purchasesCol.aggregate([
        { $group: { _id: null, total_paid: { $sum: '$paid_amount' } } }
      ]).toArray()
    ]);

    let totalInflow = 0;
    inflows.forEach(r => totalInflow += parseFloat(r.total_amount));

    let totalExpenses = 0;
    expenseBreakdown.forEach(r => totalExpenses += parseFloat(r.total_amount));

    const totalPurchasesPaid = purchasesAgg.length > 0 ? parseFloat(purchasesAgg[0].total_paid) : 0;
    const totalOutflow = totalExpenses + totalPurchasesPaid;

    res.json({
      success: true,
      data: {
        totalInflow,
        totalOutflow,
        netCashFlow: totalInflow - totalOutflow,
        inflowByMethod: inflows,
        expensesByMethod: expenseBreakdown,
        purchasesDisbursed: totalPurchasesPaid
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Error calculating cash flow' });
  }
};
