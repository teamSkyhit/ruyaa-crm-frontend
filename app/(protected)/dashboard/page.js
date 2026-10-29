'use client';

import { useQuery } from '@tanstack/react-query';
import { dashboardAPI } from '@/lib/api';
import ProtectedRoute from '@/components/protected-route';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
  CartesianGrid,
} from 'recharts';
import { AlertTriangle, TrendingUp, ShoppingCart, Package } from 'lucide-react';
import { format } from 'date-fns';

const STATUS_COLORS = {
  PENDING: '#C9A96E',
  CONFIRMED: '#4A5C38',
  PROCESSING: '#6B7280',
  SHIPPED: '#3B82F6',
  DELIVERED: '#22C55E',
  CANCELLED: '#EF4444',
  RETURNED: '#F97316',
};

function StatCard({ title, value, icon: Icon, sub }) {
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground">{title}</p>
            <p className="text-2xl font-bold mt-1">{value}</p>
            {sub && <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>}
          </div>
          <div className="h-10 w-10 rounded-full bg-[#4A5C38]/10 flex items-center justify-center">
            <Icon className="h-5 w-5 text-[#4A5C38]" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function DashboardContent() {
  const { data, isLoading, isError } = useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: async () => {
      const res = await dashboardAPI.getStats();
      if (!res?.success) throw new Error(res?.error || 'Failed to load');
      return res.data;
    },
    refetchInterval: 60000,
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i}>
              <CardContent className="pt-6">
                <div className="h-16 bg-muted animate-pulse rounded" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="flex items-center justify-center h-64 text-muted-foreground">
        Failed to load dashboard data.
      </div>
    );
  }

  const statusChartData = Object.entries(data.orders?.byStatus || {}).map(
    ([status, count]) => ({ status, count })
  );

  const lowStock = data.products?.lowStock || [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Dashboard</h1>
        {lowStock.length > 0 && (
          <Badge variant="destructive" className="flex items-center gap-1">
            <AlertTriangle className="h-3 w-3" />
            {lowStock.length} low stock
          </Badge>
        )}
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Today's Revenue"
          value={`₹${Number(data.revenue?.today || 0).toFixed(2)}`}
          icon={TrendingUp}
          sub="vs yesterday"
        />
        <StatCard
          title="Month Revenue"
          value={`₹${Number(data.revenue?.thisMonth || 0).toFixed(2)}`}
          icon={TrendingUp}
          sub={`All time: ₹${Number(data.revenue?.allTime || 0).toFixed(2)}`}
        />
        <StatCard
          title="Orders Today"
          value={data.orders?.today ?? 0}
          icon={ShoppingCart}
          sub={`This week: ${data.orders?.thisWeek ?? 0}`}
        />
        <StatCard
          title="Total Orders"
          value={data.orders?.total ?? 0}
          icon={Package}
          sub={`Active products: ${data.products?.totalActive ?? 0}`}
        />
      </div>

      {/* Low stock alert */}
      {lowStock.length > 0 && (
        <Card className="border-amber-300 bg-amber-50 dark:bg-amber-950/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2 text-amber-700 dark:text-amber-400">
              <AlertTriangle className="h-4 w-4" />
              Low Stock Alert
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {lowStock.map((p) => (
                <Badge
                  key={p.id || p.name}
                  variant="outline"
                  className="border-amber-400 text-amber-700 dark:text-amber-400"
                >
                  {p.name} — {p.quantity} left
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Orders by status */}
        {statusChartData.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-semibold">Orders by Status</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={statusChartData} margin={{ top: 4, right: 4, left: -20, bottom: 4 }}>
                  <XAxis
                    dataKey="status"
                    tick={{ fontSize: 11 }}
                    tickFormatter={(v) => v.charAt(0) + v.slice(1).toLowerCase()}
                  />
                  <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                  <Tooltip
                    formatter={(v) => [v, 'Orders']}
                    labelFormatter={(l) => l.charAt(0) + l.slice(1).toLowerCase()}
                  />
                  <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                    {statusChartData.map((entry) => (
                      <Cell
                        key={entry.status}
                        fill={STATUS_COLORS[entry.status] || '#4A5C38'}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}

        {/* Top products */}
        {(data.topProducts || []).length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-semibold">Top Products</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {data.topProducts.slice(0, 5).map((p, i) => (
                  <div key={i} className="flex items-center justify-between text-sm">
                    <span className="truncate max-w-[200px] text-foreground">{p.productName}</span>
                    <Badge variant="secondary">{p.totalQuantity} sold</Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Daily revenue chart */}
      {(data.dailyRevenue || []).some((d) => d.revenue > 0) && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-semibold">Daily Revenue — Last 30 Days</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <LineChart
                data={(data.dailyRevenue || []).map((d) => ({
                  date: format(new Date(d.date), 'dd MMM'),
                  revenue: d.revenue,
                }))}
                margin={{ top: 4, right: 4, left: -20, bottom: 4 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 10 }}
                  interval={4}
                />
                <YAxis tick={{ fontSize: 10 }} tickFormatter={(v) => `₹${v}`} />
                <Tooltip formatter={(v) => [`₹${Number(v).toFixed(2)}`, 'Revenue']} />
                <Line
                  type="monotone"
                  dataKey="revenue"
                  stroke="#4A5C38"
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 4 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Recent orders */}
      {(data.recentOrders || []).length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-semibold">Recent Orders</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-muted-foreground">
                    <th className="text-left py-2 pr-4 font-medium">Order #</th>
                    <th className="text-left py-2 pr-4 font-medium">Customer</th>
                    <th className="text-left py-2 pr-4 font-medium">Status</th>
                    <th className="text-right py-2 font-medium">Total</th>
                    <th className="text-right py-2 pl-4 font-medium">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {data.recentOrders.map((order, i) => (
                    <tr key={i} className="border-b last:border-0">
                      <td className="py-2 pr-4 font-mono text-xs">{order.orderNumber}</td>
                      <td className="py-2 pr-4">{order.customerName || '—'}</td>
                      <td className="py-2 pr-4">
                        <Badge
                          style={{
                            backgroundColor: STATUS_COLORS[order.status] + '20',
                            color: STATUS_COLORS[order.status],
                            border: `1px solid ${STATUS_COLORS[order.status]}40`,
                          }}
                          className="text-xs"
                        >
                          {order.status}
                        </Badge>
                      </td>
                      <td className="py-2 text-right">₹{Number(order.total).toFixed(2)}</td>
                      <td className="py-2 pl-4 text-right text-muted-foreground text-xs">
                        {order.createdAt
                          ? format(new Date(order.createdAt), 'dd MMM, HH:mm')
                          : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

export default function DashboardPage() {
  return (
    <ProtectedRoute>
      <DashboardContent />
    </ProtectedRoute>
  );
}
