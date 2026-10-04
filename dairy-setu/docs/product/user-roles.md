# User Roles Explanation

The DairyWalla ecosystem consists of three strictly isolated user roles. A user account is tied to a specific role upon registration.

## 1. Distributor
The Distributor is the primary supplier of dairy or ice-cream goods.
- **Core Function:** They receive orders, consolidate them, and dispatch deliveries.
- **Data Privacy:** A distributor can ONLY see orders and details of shopkeepers who have successfully connected to them using their Connection Code. They cannot see other distributors or shopkeepers.
- **Control:** They have the authority to accept/reject shopkeeper connections and accept/reject orders. They define the "rules" of the trade (e.g., Cut-off times).

## 2. Shopkeeper (Retailer)
The Shopkeeper runs a retail store and purchases goods from the Distributor daily.
- **Core Function:** They place daily orders.
- **Data Privacy:** A shopkeeper can ONLY see the profile and product catalog of the ONE distributor they are connected to. They cannot browse a marketplace of other distributors.
- **Limitations:** They cannot place an order after the Cut-off time set by their distributor.

## 3. Super Admin
The Super Admin is the internal DairyWalla management team.
- **Core Function:** Platform monitoring, analytics, and content management.
- **Data Access:** Has access to aggregated platform metrics, user lists, and can publish blogs. Admin does NOT interfere with individual B2B transactions between distributors and shopkeepers.
