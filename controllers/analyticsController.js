const Order = require('../models/Order');
const OrderItem = require('../models/OrderItem');
const Product = require('../models/Product');

// @route   GET api/analytics
// @desc    Get analytics data (sales, top products, etc.)
// @access  Private (Admin)
exports.getAnalytics = async (req, res) => {
    try {
        const { range } = req.query; // '7d', '30d', '90d', 'all'

        // 1. Date Filter Setup
        let startDate = new Date();
        startDate.setHours(0, 0, 0, 0);

        if (range === '7d') {
            startDate.setDate(startDate.getDate() - 7);
        } else if (range === '90d') {
            startDate.setDate(startDate.getDate() - 90);
        } else if (range === 'all') {
            startDate = new Date(0); // Beginning of time
        } else {
            // Default to 30 days
            startDate.setDate(startDate.getDate() - 30);
        }

        const dateFilter = { createdAt: { $gte: startDate } };

        // 2. Sales Over Time (Line Chart Data)
        // We want to return data for every day in the range, even if 0 sales.
        // However, aggregation will only return days with data. Frontend can fill gaps.
        const salesData = await Order.aggregate([
            {
                $match: {
                    ...dateFilter,
                    status: { $nin: ['cancelled', 'rejected'] } // Exclude failed orders
                }
            },
            {
                $group: {
                    _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
                    totalSales: { $sum: "$total_amount" },
                    orderCount: { $sum: 1 }
                }
            },
            { $sort: { _id: 1 } }
        ]);

        // 3. Top Selling Products (Bar Chart Data)
        const topProducts = await OrderItem.aggregate([
            // A. Lookup Order to check status and date
            {
                $lookup: {
                    from: 'orders',
                    localField: 'order',
                    foreignField: '_id',
                    as: 'orderFn'
                }
            },
            { $unwind: '$orderFn' },
            // B. Filter by valid orders and date range
            {
                $match: {
                    'orderFn.status': { $nin: ['cancelled', 'rejected', 'pending'] },
                    'orderFn.createdAt': { $gte: startDate }
                }
            },
            // C. Group by Product
            {
                $group: {
                    _id: '$product',
                    totalQuantity: { $sum: '$quantity' },
                    totalRevenue: { $sum: { $multiply: ['$quantity', '$price_at_purchase'] } }
                }
            },
            // D. Sort by Quantity
            { $sort: { totalQuantity: -1 } },
            // E. Limit to top 5
            { $limit: 5 },
            // F. Populate Product Name
            {
                $lookup: {
                    from: 'products',
                    localField: '_id',
                    foreignField: '_id',
                    as: 'productInfo'
                }
            },
            { $unwind: '$productInfo' },
            // G. Format Output
            {
                $project: {
                    name: '$productInfo.name',
                    quantity: '$totalQuantity',
                    revenue: '$totalRevenue'
                }
            }
        ]);

        // 4. Order Status Distribution (Pie Chart Data)
        const statusDistribution = await Order.aggregate([
            { $match: dateFilter },
            {
                $group: {
                    _id: '$status',
                    count: { $sum: 1 }
                }
            }
        ]);

        // 5. Fragrance Popularity (Bonus)
        // Counts how many times each fragrance was selected
        // Note: selected_fragrances is an array of IDs in OrderItem
        // This requires unwinding twice (OrderItem -> selected_fragrances)
        /*
        const fragranceStats = await OrderItem.aggregate([
            { $lookup: { from: 'orders', localField: 'order', foreignField: '_id', as: 'orderFn' } },
            { $unwind: '$orderFn' },
            { $match: { 'orderFn.status': { $nin: ['cancelled', 'rejected'] }, 'orderFn.createdAt': { $gte: startDate } } },
            { $unwind: '$selected_fragrances' },
            { $group: { _id: '$selected_fragrances', count: { $sum: 1 } } },
            { $sort: { count: -1 } },
            { $limit: 5 },
            { $lookup: { from: 'fragrances', localField: '_id', foreignField: '_id', as: 'fragInfo' } },
            { $unwind: '$fragInfo' },
            { $project: { name: '$fragInfo.name', count: 1 } }
        ]);
        */

        res.json({
            salesData,
            topProducts,
            statusDistribution,
            // fragranceStats
        });

    } catch (err) {
        console.error("Analytics Error:", err.message);
        res.status(500).send('Server Error');
    }
};
