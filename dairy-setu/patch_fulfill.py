import re
import os

def patch_orders_page():
    path = 'src/pages/distributor/OrdersPage.tsx'
    with open(path, 'r', encoding='utf-8') as f:
        content = f.read()

    handlers_target = """  const handleReject = (order: Order) => {"""
    new_handlers = """  const handleFulfill = (order: Order) => {
    updateOrderStatus(order.id, 'fulfilled');
    if (order.shopkeeperId) {
      addNotification({
        userId: order.shopkeeperId,
        type: 'order_fulfilled',
        message: 'Your order has been fulfilled',
        read: false,
        createdAt: new Date().toISOString(),
      });
    }
    show(`Order from ${order.shopName} marked as fulfilled`);
  };

  const handleReject = (order: Order) => {"""
    
    if 'const handleFulfill' not in content:
        content = content.replace(handlers_target, new_handlers)

    ui_target = """                  {order.status !== 'rejected' && ("""
    new_ui = """                  {order.status === 'accepted' && (
                    <div className="flex gap-2 mb-2">
                      <button onClick={() => handleFulfill(order)} className="btn-primary py-1.5 px-3 text-xs w-full justify-center">
                        <CheckCircle className="w-3.5 h-3.5" /> Mark Fulfilled
                      </button>
                    </div>
                  )}
                  {order.status !== 'rejected' && ("""
    
    if 'Mark Fulfilled' not in content:
        content = content.replace(ui_target, new_ui)

    with open(path, 'w', encoding='utf-8') as f:
        f.write(content)

def patch_profile_page():
    path = 'src/pages/distributor/ShopkeeperProfilePage.tsx'
    with open(path, 'r', encoding='utf-8') as f:
        content = f.read()

    handlers_target = """  const handleReject = (order: Order) => {"""
    new_handlers = """  const handleFulfill = (order: Order) => {
    updateOrderStatus(order.id, 'fulfilled');
    if (order.shopkeeperId) {
      addNotification({
        userId: order.shopkeeperId,
        type: 'order_fulfilled',
        message: 'Your order has been fulfilled',
        read: false,
        createdAt: new Date().toISOString(),
      });
    }
    show(`Order from ${order.shopName} marked as fulfilled`);
  };

  const handleReject = (order: Order) => {"""
    
    if 'const handleFulfill' not in content:
        content = content.replace(handlers_target, new_handlers)

    ui_target = """                    {order.status !== 'rejected' && ("""
    new_ui = """                    {order.status === 'accepted' && (
                      <div className="flex justify-end gap-2 mt-2">
                        <button onClick={() => handleFulfill(order)} className="btn-primary py-1 px-2.5 text-xs">
                          <CheckCircle className="w-3.5 h-3.5 mr-1 inline" /> Mark Fulfilled
                        </button>
                      </div>
                    )}
                    {order.status !== 'rejected' && ("""
    
    if 'Mark Fulfilled' not in content:
        content = content.replace(ui_target, new_ui)

    with open(path, 'w', encoding='utf-8') as f:
        f.write(content)

try:
    patch_orders_page()
    patch_profile_page()
    print("Fulfill buttons patched successfully.")
except Exception as e:
    print("Error:", e)
