import { useState } from 'react';
import { Plus, Trash2, Truck, Users } from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import { useAppStore } from '../../store/appStore';
import { useToast } from '../../components/ui/Toast';
import { EmptyState } from '../../components/ui/EmptyState';
import { MobileHeader } from '../../components/layout/MobileHeader';

export function DeliveryPage() {
  const { user } = useAuthStore();
  const { deliveryGroups, connections, distributorProfiles, addDeliveryGroup, deleteDeliveryGroup } = useAppStore();
  const { show } = useToast();
  const [newGroupName, setNewGroupName] = useState('');

  const profile = distributorProfiles.find(dp => dp.userId === user?.id);
  const myGroups = deliveryGroups.filter(g => g.distributorId === profile?.id);
  const activeConnections = connections.filter(c => c.distributorId === profile?.id && c.status === 'active');

  const handleAdd = () => {
    if (!newGroupName.trim()) { show('Enter a group name', 'error'); return; }
    addDeliveryGroup(profile!.id, newGroupName.trim());
    setNewGroupName('');
    show('Delivery group added');
  };

  const handleDelete = (id: string, name: string) => {
    if (confirm(`Delete "${name}"? Shopkeepers in this group will be unassigned.`)) {
      deleteDeliveryGroup(id);
      show('Group deleted', 'error');
    }
  };

  return (
    <div className="p-4 md:p-6 max-w-3xl mx-auto">
      <MobileHeader title="Delivery Groups" subtitle="Organize by area or route" />
      <div className="hidden md:block mb-6">
        <h1 className="text-xl font-bold text-gray-900">Delivery Groups</h1>
        <p className="text-sm text-gray-500 mt-0.5">Organize shopkeepers by area or route</p>
      </div>

      {/* Add group */}
      <div className="card p-4 mb-6">
        <label className="label">New Delivery Group</label>
        <div className="flex gap-3">
          <input
            className="input flex-1"
            placeholder="e.g. Sector 12 - North"
            value={newGroupName}
            onChange={e => setNewGroupName(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleAdd()}
          />
          <button className="btn-primary" onClick={handleAdd}>
            <Plus className="w-4 h-4" /> Add
          </button>
        </div>
      </div>

      {myGroups.length === 0 ? (
        <EmptyState
          icon={<Truck className="w-8 h-8" />}
          title="No delivery groups"
          description="Create groups to organize your delivery routes"
        />
      ) : (
        <div className="space-y-3">
          {myGroups.map(group => {
            const groupShops = activeConnections.filter(c => c.deliveryGroupId === group.id);
            return (
              <div key={group.id} className="card p-4 flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-teal-100 flex items-center justify-center">
                  <Truck className="w-5 h-5 text-teal-600" />
                </div>
                <div className="flex-1">
                  <div className="font-semibold text-gray-900 text-sm">{group.name}</div>
                  <div className="flex items-center gap-1 mt-0.5">
                    <Users className="w-3 h-3 text-gray-400" />
                    <span className="text-xs text-gray-500">{groupShops.length} shopkeeper{groupShops.length !== 1 ? 's' : ''}</span>
                    {groupShops.length > 0 && (
                      <span className="text-xs text-gray-400">· {groupShops.map(s => s.shopName).join(', ')}</span>
                    )}
                  </div>
                </div>
                <button onClick={() => handleDelete(group.id, group.name)} className="btn-ghost p-2 hover:text-red-500">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
