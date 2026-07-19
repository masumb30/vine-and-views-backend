

```markdown
# RentEase Server ⚙️ [API Deployment](https://rental-backend-eyqy.onrender.com/)

This is the robust, production-ready REST API built to power the **RentEase** property rental and booking platform. It features strict role-based access control (RBAC), robust server-side querying structures, data aggregation for charts, and safe checkout endpoints.

---

## 🛡️ Core Capabilities

* **Role-Based Access Control (RBAC):** Custom middleware validating sessions and mapping actions specifically to `Tenant`, `Owner`, and `Admin` permissions.
* **Backend Search & Filter Engine:** Fully server-side location searching, dropdown categorization, and dynamic price sorting for optimal front-end rendering performance.
* **Pagination Layer:** Integrated MongoDB cursors across heavy datasets to keep responses snappy and lightweight.
* **Stripe Integration:** Secure backend endpoints built to generate payment intents and verify transaction logs accurately.
* **Aggregation Pipelines:** Custom Mongo queries computing current-owner analytics and historical 12-month earning records for analytics visualization.

---

## 🛠️ Tech Stack & Dependencies

* **Runtime Environment:** Node.js
* **Language:** TypeScript
* **Framework:** Express.js
* **Database ORM:** Mongoose (MongoDB)
* **Authentication:** better auth
* **Payment Gateway:** Stripe SDK
* **Development Tools:** TS-Node-Dev, ESLint

---

## 📦 Environment Variables Configuration

To run this server locally, create a `.env` file in the root directory:

```env
PORT=5000
MONGO_URI=mongodb+srv://<username>:<password>@cluster.mongodb.net/rentease
# vine-and-views-backend
