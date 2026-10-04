# Release Notes

## Version 1.1.0 - The "Admin & Blogs" Update (Current)
**Release Date:** June 11, 2026

**New Features:**
- **Admin Dashboard:** A comprehensive web-based platform for internal team monitoring.
- **Live Statistics:** Track active users, total orders, and connection requests in real-time.
- **Public Blog Engine:** Super Admins can now post, edit, and delete blogs directly from the Admin Panel, which instantly reflect on the public website.
- **Dynamic FAQ Page:** Added a dedicated Problem & Solution guide for distributors and shopkeepers.

**Bug Fixes:**
- Fixed an issue where the `/api/blogs` endpoint was throwing a 401 Unauthorized error by updating backend authentication middleware.
- Resolved Firebase deployment caching issues so new UI updates bypass browser cache using version strings.

---

## Version 1.0.0 - Initial Launch
**Release Date:** May 15, 2026

**Features:**
- Distributor and Shopkeeper profile creation.
- 8-digit secure Connection Code system.
- Daily ordering functionality with Cut-Off time enforcement.
- Order status management (Pending, Accepted, Fulfilled).
- Firebase Authentication and Push Notification integration.
