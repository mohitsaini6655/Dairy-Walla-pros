const fs = require('fs');

let dashboardPath = 'e:/Dairy Walla Kiro/dairy-setu/src/pages/distributor/DashboardPage.tsx';
let dashboardContent = fs.readFileSync(dashboardPath, 'utf8');

dashboardContent = dashboardContent.replace(
  '{profile?.businessName} · Order window: {profile?.orderWindowStart} – {profile?.orderWindowCutoff}\r\n        </p>\r\n      </div>',
  `{profile?.businessName} · Order window: {profile?.orderWindowStart} – {profile?.orderWindowCutoff}
        </p>
        <button className="btn-secondary text-sm py-2 px-4 mt-4 flex items-center gap-2" onClick={() => {
          const link = \`\${window.location.origin}/d/\${profile?.connectionCode}\`;
          if (navigator.share) {
            navigator.share({ title: 'Connect with me', text: \`Connect with \${profile?.businessName} on DairyWalla:\`, url: link }).catch(() => {});
          } else {
            navigator.clipboard.writeText(link);
            show('Share link copied to clipboard!');
          }
        }}>
          <Share2 className="w-4 h-4 text-brand-600" /> Share Profile Link
        </button>
      </div>`
);

// Fallback for LF only
dashboardContent = dashboardContent.replace(
  '{profile?.businessName} · Order window: {profile?.orderWindowStart} – {profile?.orderWindowCutoff}\n        </p>\n      </div>',
  `{profile?.businessName} · Order window: {profile?.orderWindowStart} – {profile?.orderWindowCutoff}
        </p>
        <button className="btn-secondary text-sm py-2 px-4 mt-4 flex items-center gap-2" onClick={() => {
          const link = \`\${window.location.origin}/d/\${profile?.connectionCode}\`;
          if (navigator.share) {
            navigator.share({ title: 'Connect with me', text: \`Connect with \${profile?.businessName} on DairyWalla:\`, url: link }).catch(() => {});
          } else {
            navigator.clipboard.writeText(link);
            show('Share link copied to clipboard!');
          }
        }}>
          <Share2 className="w-4 h-4 text-brand-600" /> Share Profile Link
        </button>
      </div>`
);

fs.writeFileSync(dashboardPath, dashboardContent);

let settingsPath = 'e:/Dairy Walla Kiro/dairy-setu/src/pages/distributor/SettingsPage.tsx';
let settingsContent = fs.readFileSync(settingsPath, 'utf8');

settingsContent = settingsContent.replace(
  '</div>\r\n            <p className="text-xs text-gray-400 mt-1">Share this code with shopkeepers to connect</p>\r\n          </div>',
  `</div>
            <button className="btn-primary w-full mt-3 flex justify-center items-center gap-2" onClick={() => {
              const link = \`\${window.location.origin}/d/\${profile?.connectionCode}\`;
              if (navigator.share) {
                navigator.share({ title: 'Connect with me', text: \`Connect with \${profile?.businessName} on DairyWalla:\`, url: link }).catch(() => {});
              } else {
                navigator.clipboard.writeText(link);
                show('Share link copied to clipboard!');
              }
            }}>
              <Share2 className="w-4 h-4" /> Share Profile Link
            </button>
            <p className="text-xs text-gray-400 mt-3 text-center">Share this code or link with shopkeepers to connect</p>
          </div>`
);

// Fallback for LF only
settingsContent = settingsContent.replace(
  '</div>\n            <p className="text-xs text-gray-400 mt-1">Share this code with shopkeepers to connect</p>\n          </div>',
  `</div>
            <button className="btn-primary w-full mt-3 flex justify-center items-center gap-2" onClick={() => {
              const link = \`\${window.location.origin}/d/\${profile?.connectionCode}\`;
              if (navigator.share) {
                navigator.share({ title: 'Connect with me', text: \`Connect with \${profile?.businessName} on DairyWalla:\`, url: link }).catch(() => {});
              } else {
                navigator.clipboard.writeText(link);
                show('Share link copied to clipboard!');
              }
            }}>
              <Share2 className="w-4 h-4" /> Share Profile Link
            </button>
            <p className="text-xs text-gray-400 mt-3 text-center">Share this code or link with shopkeepers to connect</p>
          </div>`
);

fs.writeFileSync(settingsPath, settingsContent);

console.log("Patched successfully");
