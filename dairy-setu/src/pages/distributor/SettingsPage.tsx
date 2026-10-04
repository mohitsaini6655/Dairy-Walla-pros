import { useState } from 'react';
import { Clock, Copy, Check, Share2 } from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import { useAppStore } from '../../store/appStore';
import { useToast } from '../../components/ui/Toast';
import { MobileHeader } from '../../components/layout/MobileHeader';
import { useTranslation } from '../../utils/i18n';

const TIME_OPTIONS = Array.from({ length: 48 }, (_, index) => {
  const hour = Math.floor(index / 2);
  const minute = index % 2 === 0 ? '00' : '30';
  const value = `${hour.toString().padStart(2, '0')}:${minute}`;
  const hour12 = hour % 12 === 0 ? 12 : hour % 12;
  const period = hour < 12 ? 'AM' : 'PM';
  return { value, label: `${hour12}:${minute} ${period}` };
});

function formatTime12(value: string) {
  const [h, m] = value.split(':');
  const hour = Number(h);
  const minute = m ?? '00';
  if (Number.isNaN(hour)) return value;
  const hour12 = hour % 12 === 0 ? 12 : hour % 12;
  const period = hour < 12 ? 'AM' : 'PM';
  return `${hour12}:${minute} ${period}`;
}

export function SettingsPage() {
  const { user } = useAuthStore();
  const { distributorProfiles, updateDistributorSettings } = useAppStore();
  const { show } = useToast();
  const { t } = useTranslation();

  const profile = distributorProfiles.find(dp => dp.userId === user?.id);
  const [start, setStart] = useState(profile?.orderWindowStart || '18:00');
  const [cutoff, setCutoff] = useState(profile?.orderWindowCutoff || '20:00');
  const [copied, setCopied] = useState(false);
  const handleSave = () => {
    if (!profile) return;
    updateDistributorSettings(profile.id, { orderWindowStart: start, orderWindowCutoff: cutoff });
    show('Settings saved');
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(profile?.connectionCode || '');
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    show('Connection code copied');
  };

  return (
    <div className="p-4 md:p-6 max-w-2xl mx-auto">
      <MobileHeader title={t('Settings')} subtitle="Business preferences" />
      <div className="hidden md:block mb-6">
        <h1 className="text-xl font-bold text-gray-900">{t('Settings')}</h1>
        <p className="text-sm text-gray-500 mt-0.5">Manage your business preferences</p>
      </div>

      {/* Business Info */}
      <div className="card p-5 mb-4">
        <h2 className="font-semibold text-gray-900 text-sm mb-4">Business Information</h2>
        <div className="space-y-3">
          <div>
            <label className="label">Business Name</label>
            <input className="input" value={profile?.businessName || ''} readOnly />
          </div>
          <div>
            <label className="label">Connection Code</label>
            <div className="flex gap-2">
              <input className="input flex-1 font-mono font-bold text-brand-600 tracking-wider" value={profile?.connectionCode || ''} readOnly />
              <button className="btn-secondary" onClick={handleCopy}>
                {copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
              </button>
            </div>
            <button className="btn-primary w-full mt-3 flex justify-center items-center gap-2" onClick={() => {
              const link = `${window.location.origin}/d/${profile?.connectionCode}`;
              if (navigator.share) {
                navigator.share({ title: 'Connect with me', text: `Connect with ${profile?.businessName} on DairyWalla:`, url: link }).catch(() => {});
              } else {
                navigator.clipboard.writeText(link);
                show('Share link copied to clipboard!');
              }
            }}>
              <Share2 className="w-4 h-4" /> Share Profile Link
            </button>
            <p className="text-xs text-gray-400 mt-3 text-center">Share this code or link with shopkeepers to connect</p>
          </div>
        </div>
      </div>

      {/* Order Window */}
      <div className="card p-5 mb-4">
        <div className="flex items-center gap-2 mb-4">
          <Clock className="w-4 h-4 text-brand-600" />
          <h2 className="font-semibold text-gray-900 text-sm">Order Window</h2>
        </div>
        <p className="text-xs text-gray-500 mb-4">
          Orders placed within this window are guaranteed (Normal Orders). Orders after the cutoff are Late Orders and need your approval.
        </p>
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div>
            <label className="label">Window Opens</label>
            <select className="input bg-white" value={start} onChange={e => setStart(e.target.value)}>
              {TIME_OPTIONS.map(option => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Cutoff Time</label>
            <select className="input bg-white" value={cutoff} onChange={e => setCutoff(e.target.value)}>
              {TIME_OPTIONS.map(option => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Visual preview */}
        <div className="bg-gray-50 rounded-xl p-3 mb-4">
          <div className="text-xs text-gray-500 mb-2">Preview</div>
          <div className="flex items-center gap-2 text-sm">
            <span className="badge-green">Normal orders</span>
            <span className="text-gray-400 text-xs">{formatTime12(start)} - {formatTime12(cutoff)}</span>
            <span className="badge-yellow">Late orders</span>
            <span className="text-gray-400 text-xs">after {formatTime12(cutoff)}</span>
          </div>
        </div>

        <button className="btn-primary" onClick={handleSave}>Save Settings</button>
      </div>



      {/* WhatsApp Bridge info */}
      <div className="card p-5 bg-green-50 border-green-200">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-lg">📲</span>
          <h2 className="font-semibold text-gray-900 text-sm">WhatsApp Bridge</h2>
          <span className="badge-green text-xs">Active</span>
        </div>
        <p className="text-xs text-gray-600">
          Shopkeepers can send orders via WhatsApp to your registered number. The system automatically converts messages into structured orders.
        </p>
        <div className="mt-3 p-2 bg-white rounded-lg border border-green-200">
          <p className="text-xs text-gray-500 font-medium mb-1">Example message format:</p>
          <p className="text-xs font-mono text-gray-700">"Amul milk 20, paneer 5, butter 10"</p>
        </div>
      </div>
    </div>
  );
}

