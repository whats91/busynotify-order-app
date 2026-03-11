# 🚀 Busy Notify - Internal Ordering Portal

A modern, production-ready internal ordering system portal for customers and salesmen. Built with cutting-edge technologies for the [busynotify.in](https://busynotify.in) platform.

**Deploy by [whats91.com](https://whats91.com)**

## ✨ Technology Stack

This portal provides a robust foundation built with:

### 🎯 Core Framework
- **⚡ Next.js 16** - The React framework for production with App Router
- **📘 TypeScript 5** - Type-safe JavaScript for better developer experience
- **🎨 Tailwind CSS 4** - Utility-first CSS framework for rapid UI development

### 🧩 UI Components & Styling
- **🧩 shadcn/ui** - High-quality, accessible components built on Radix UI
- **🎯 Lucide React** - Beautiful & consistent icon library
- **🌈 Framer Motion** - Production-ready motion library for React
- **🎨 Next Themes** - Perfect dark mode in 2 lines of code

### 📋 Forms & Validation
- **🎣 React Hook Form** - Performant forms with easy validation
- **✅ Zod** - TypeScript-first schema validation

### 🔄 State Management & Data Fetching
- **🐻 Zustand** - Simple, scalable state management
- **🔄 TanStack Query** - Powerful data synchronization for React
- **🌐 Fetch** - Promise-based HTTP request

### 🗄️ Database & Backend
- **🗄️ Prisma** - Next-generation TypeScript ORM
- **🔐 NextAuth.js** - Complete open-source authentication solution

### 🎨 Advanced UI Features
- **📊 TanStack Table** - Headless UI for building tables and datagrids
- **🖱️ DND Kit** - Modern drag and drop toolkit for React
- **📊 Recharts** - Redefined chart library built with React and D3
- **🖼️ Sharp** - High performance image processing

### 🌍 Internationalization & Utilities
- **🌍 Custom i18n** - Built-in multi-language support (English & Hindi)
- **📅 Date-fns** - Modern JavaScript date utility library
- **🪝 ReactUse** - Collection of essential React hooks for modern development

## 🎯 Why Busy Notify?

- **🏎️ Fast Development** - Pre-configured tooling and best practices
- **🎨 Beautiful UI** - Complete shadcn/ui component library with advanced interactions
- **🔒 Type Safety** - Full TypeScript configuration with Zod validation
- **📱 Responsive** - Mobile-first design principles with smooth animations
- **🗄️ Database Ready** - Prisma ORM configured for rapid backend development
- **🔐 Auth Included** - Role-based authentication (Customer, Salesman, Admin)
- **📊 Data Visualization** - Charts, tables, and drag-and-drop functionality
- **🌍 i18n Ready** - Multi-language support with English and Hindi
- **🚀 Production Ready** - Optimized build and deployment settings
- **🏷️ White-Label Ready** - Configurable branding for multi-tenant deployment

## 🚀 Quick Start

```bash
# Install dependencies
bun install

# Start development server
bun run dev

# Build for production
bun run build

# Start production server
bun start
```

Open [http://localhost:3000](http://localhost:3000) to see your application running.

## 🔐 Demo Credentials

| Username | Password | Role |
|----------|----------|------|
| `admin` | `admin` | Admin access |
| `customer` | `customer` | Customer access |
| `salesman` | `salesman` | Salesman access |

## 📁 Project Structure

```
src/
├── app/                 # Next.js App Router pages
│   ├── login/          # Login page
│   ├── dashboard/      # Role-based dashboard
│   ├── order/          # Product listing & cart
│   └── orders/         # Order history
├── shared/             # Shared across versions
│   ├── types/          # TypeScript interfaces
│   ├── translations/   # EN/HI translations
│   ├── config/         # Brand & navigation config
│   ├── lib/            # Stores & contexts
│   └── components/     # Shared UI components
├── versions/           # Version-specific code
│   └── v1/             # Version 1 implementation
│       ├── mock-data/  # Mock data files
│       ├── repositories/  # Data access layer
│       ├── services/   # Business logic
│       └── controllers/   # Request handlers
└── components/         # Reusable React components
    └── ui/             # shadcn/ui components
```

## 🎨 Features

### 🔐 Authentication & Roles
- **Role-Based Access**: Customer, Salesman, Admin roles
- **Protected Routes**: Client-side route protection
- **Session Management**: Persistent login state

### 📦 Order Management
- **Product Catalog**: Browse products by category
- **Shopping Cart**: Add, update, remove items
- **Order Placement**: Place orders with GST calculation
- **Order History**: View and filter past orders

### 👥 Customer Features
- **Self-Service Ordering**: Customers place their own orders
- **Order Tracking**: View order status and history

### 🧑‍💼 Salesman Features
- **Customer Selection**: Select customer to place order for
- **Order Management**: Create orders on behalf of customers
- **Customer Search**: Search customers by name or phone

### 🌍 Internationalization
- **English**: Full English translations
- **Hindi**: Complete Hindi translations
- **Easy Switch**: Language switcher in header

## 🏷️ White-Label Configuration

The portal supports white-labeling through configuration:

```typescript
// src/shared/config/brand.config.ts
export const defaultBrandConfig = {
  name: 'Busy Notify',
  tagline: 'Internal Ordering Portal',
  logo: '/logo.svg',
  primaryColor: '#10B981',
  companyName: 'Busy Notify Pvt. Ltd.',
  currency: 'INR',
  currencySymbol: '₹',
};
```

## 🚀 Deployment

Ready to deploy your instance?

**Deploy by [whats91.com](https://whats91.com)**

Visit [busynotify.in](https://busynotify.in) for more information.

## 🔄 Version Architecture

The project supports independent versioning:
- Each version lives in `src/versions/vX/`
- Copy entire v1 folder to create v2
- Shared code in `src/shared/` for common functionality
- Easy migration without breaking existing users

## 📞 Support

- **Website**: [busynotify.in](https://busynotify.in)
- **Deployment**: [whats91.com](https://whats91.com)

---

Built with ❤️ for the business community. Powered by [busynotify.in](https://busynotify.in) 🚀

**Deploy by [whats91.com](https://whats91.com)**
