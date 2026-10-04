import re

with open('src/pages/distributor/ShopkeeperProfilePage.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Add CheckCircle, XCircle to lucide-react imports
if 'CheckCircle' not in content:
    content = content.replace("from 'lucide-react';", ", CheckCircle, XCircle } from 'lucide-react';")
    content = content.replace("Share2 , CheckCircle", "Share2, CheckCircle")

# 2. Add updateOrderStatus, addNotification to useAppStore destructured
if 'updateOrderStatus' not in content:
    content = content.replace("fetchShopkeeperProfileById, updateOrderPaymentStatus } = useAppStore();",
                              "fetchShopkeeperProfileById, updateOrderPaymentStatus, updateOrderStatus, addNotification } = useAppStore();")

# 3. Add handleAccept and handleReject functions
handlers = """  const handlePaymentStatus = async (order: Order, paymentStatus: PaymentStatus) => {"""
new_handlers = """  const handleAccept = (order: Order) => {
    updateOrderStatus(order.id, 'accepted');
    if (order.shopkeeperId) {
      addNotification({
        userId: order.shopkeeperId,
        type: 'order_accepted',
        message: 'Your order has been accepted',
        read: false,
        createdAt: new Date().toISOString(),
      });
    }
    show(`Order from ${order.shopName} accepted`);
  };

  const handleReject = (order: Order) => {
    updateOrderStatus(order.id, 'rejected');
    if (order.shopkeeperId) {
      addNotification({
        userId: order.shopkeeperId,
        type: 'order_rejected',
        message: 'Your order was not accepted',
        read: false,
        createdAt: new Date().toISOString(),
      });
    }
    show('Order rejected', 'error');
  };

  const handlePaymentStatus = async (order: Order, paymentStatus: PaymentStatus) => {"""

if 'const handleAccept' not in content:
    content = content.replace(handlers, new_handlers)

# 4. Add the Accept and Reject buttons to the UI.
old_ui = """                    {order.status !== 'rejected' && (
                      <div className="flex justify-end gap-2 mt-2">
                        {order.paymentStatus === 'paid' ? ("""
new_ui = """                    {order.status === 'pending' && (
                      <div className="flex justify-end gap-2 mt-2">
                        <button onClick={() => handleAccept(order)} className="btn-primary py-1 px-2.5 text-xs">
                          <CheckCircle className="w-3.5 h-3.5 mr-1 inline" /> Accept
                        </button>
                        <button onClick={() => handleReject(order)} className="btn-danger py-1 px-2.5 text-xs">
                          <XCircle className="w-3.5 h-3.5 mr-1 inline" /> Reject
                        </button>
                      </div>
                    )}
                    {order.status !== 'rejected' && (
                      <div className="flex justify-end gap-2 mt-2">
                        {order.paymentStatus === 'paid' ? ("""

if 'handleAccept(order)' not in content:
    content = content.replace(old_ui, new_ui)

with open('src/pages/distributor/ShopkeeperProfilePage.tsx', 'w', encoding='utf-8') as f:
    f.write(content)

print("Patched ShopkeeperProfilePage.tsx")
