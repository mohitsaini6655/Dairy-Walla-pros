import re
import os

def patch_distributor_connections():
    path = 'src/pages/distributor/ConnectionsPage.tsx'
    with open(path, 'r', encoding='utf-8') as f:
        content = f.read()

    # Add deleteConnection to useAppStore
    use_app_store_pattern = r'(\s*updateConnectionStatus,\s*addNotification,\s*)} = useAppStore\(\);'
    replacement = r'\1 deleteConnection, } = useAppStore();'
    if 'deleteConnection' not in content:
        content = re.sub(use_app_store_pattern, replacement, content)

    # Add handleDisconnect function
    handler_target = """  const handleReject = (connId: string, shopName: string, shopkeeperId: string) => {"""
    new_handler = """  const handleDisconnect = async (connId: string) => {
    if (confirm('Are you sure you want to disconnect this shopkeeper?')) {
      const success = await deleteConnection(connId);
      if (success) {
        show('Shopkeeper disconnected successfully');
      } else {
        show('Failed to disconnect shopkeeper', 'error');
      }
    }
  };

  const handleReject = (connId: string, shopName: string, shopkeeperId: string) => {"""
    
    if 'const handleDisconnect' not in content:
        content = content.replace(handler_target, new_handler)

    # Add Disconnect button to active connections
    button_target = """                  {phone && (
                    <a href={`tel:${tel}`} className="btn-secondary py-1.5 px-3 text-xs inline-flex items-center gap-1">
                      <Phone className="w-3.5 h-3.5" /> Call
                    </a>
                  )}
                </div>"""
    new_button = """                  {phone && (
                    <a href={`tel:${tel}`} className="btn-secondary py-1.5 px-3 text-xs inline-flex items-center gap-1">
                      <Phone className="w-3.5 h-3.5" /> Call
                    </a>
                  )}
                  <button onClick={() => handleDisconnect(conn.id)} className="btn-danger py-1.5 px-3 text-xs">
                    <XCircle className="w-3.5 h-3.5 inline mr-1" /> Disconnect
                  </button>
                </div>"""
    
    if 'Disconnect' not in content:
        content = content.replace(button_target, new_button)

    with open(path, 'w', encoding='utf-8') as f:
        f.write(content)

def patch_shopkeeper_connection():
    path = 'src/pages/shopkeeper/ConnectionPage.tsx'
    with open(path, 'r', encoding='utf-8') as f:
        content = f.read()

    # Add deleteConnection to useAppStore
    use_app_store_pattern = r'(\s*requestConnection,\s*toggleConnectionAutoOrder,\s*notifications\s*)} = useAppStore\(\);'
    replacement = r'\1, deleteConnection } = useAppStore();'
    if 'deleteConnection' not in content:
        content = re.sub(use_app_store_pattern, replacement, content)

    # Add handleDisconnect function
    handler_target = """  const handleConnect = async () => {"""
    new_handler = """  const handleDisconnect = async (connId: string, isPending: boolean) => {
    const msg = isPending ? 'Cancel connection request?' : 'Are you sure you want to disconnect from this distributor?';
    if (confirm(msg)) {
      const success = await deleteConnection(connId);
      if (success) {
        show(isPending ? 'Request cancelled' : 'Disconnected successfully');
      } else {
        show('Failed to complete action', 'error');
      }
    }
  };

  const handleConnect = async () => {"""
    
    if 'const handleDisconnect' not in content:
        content = content.replace(handler_target, new_handler)

    # Add Disconnect/Cancel button to connection card
    button_target = """                {conn.status === 'pending' && (
                  <p className="text-xs text-yellow-700 mt-2">
                    Your request is waiting for the distributor to approve. You will be notified once approved.
                  </p>
                )}
              </div>"""
    new_button = """                {conn.status === 'pending' && (
                  <p className="text-xs text-yellow-700 mt-2">
                    Your request is waiting for the distributor to approve. You will be notified once approved.
                  </p>
                )}
                
                <div className="pt-3 mt-3 border-t border-gray-100 flex justify-end">
                  <button onClick={() => handleDisconnect(conn.id, conn.status === 'pending')} className="btn-danger py-1 px-3 text-xs">
                    {conn.status === 'pending' ? 'Cancel Request' : 'Disconnect'}
                  </button>
                </div>
              </div>"""
    
    if 'Cancel Request' not in content:
        content = content.replace(button_target, new_button)

    with open(path, 'w', encoding='utf-8') as f:
        f.write(content)

try:
    patch_distributor_connections()
    patch_shopkeeper_connection()
    print("Disconnect buttons patched successfully.")
except Exception as e:
    print("Error:", e)
