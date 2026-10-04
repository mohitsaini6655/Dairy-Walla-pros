# Known Bugs & Issues List

**Last Updated:** June 11, 2026

*The following are known non-critical issues that the engineering team is currently tracking and working to resolve in upcoming sprints.*

### Priority: High
- **Push Notification Delays:** Some Xiaomi/Redmi devices kill the background process, causing a 5-10 minute delay in push notifications for incoming orders. (Workaround: Open the app to force refresh).

### Priority: Medium
- **Location Permission Loop:** If a user denies location permission twice during onboarding, the app gets stuck in a permission request loop on some Android 11 devices.
- **Double Tap Order Submission:** Rapidly double-tapping the 'Submit Order' button occasionally creates duplicate orders. (Fix implemented in backend, frontend debounce pending).

### Priority: Low
- **UI Overflow on Small Screens:** On devices with screens smaller than 5 inches (e.g., old iPhone SE), the 'Total Products' text slightly overlaps the edge of the card in the Distributor Dashboard.
- **Timezone Issue:** Order timestamps display in UTC instead of IST (Indian Standard Time) if the user's phone time is manually set to incorrect timezone.
