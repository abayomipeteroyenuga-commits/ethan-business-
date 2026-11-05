import { Account, Client, Functions, ID } from 'appwrite';
import './style.css';

const APPWRITE_ENDPOINT = 'https://fra.cloud.appwrite.io/v1';
const APPWRITE_PROJECT = 'ethan-business';
const ONBOARDING_FUNCTION = 'ethan-business-onboarding';
const BUSINESS_FUNCTION = 'ethan-business-api';

const client = new Client().setEndpoint(APPWRITE_ENDPOINT).setProject(APPWRITE_PROJECT);
const account = new Account(client);
const functions = new Functions(client);
const root = document.querySelector('#app');

const state = {
  user: null,
  register: false,
  authEmail: '',
  authName: '',
  businesses: [],
  business: null,
  active: 'dashboard',
  records: [],
  saleProducts: [],
  saleCategories: [],
  saleCustomers: [],
  saleCart: [],
  saleSearch: '',
  saleCategory: 'all',
  saleDiscount: '0',
  saleTax: '0',
  saleAmountPaid: '',
  salePaymentMethod: 'cash',
  saleCustomerId: '',
  saleNotice: '',
  returnToSaleAfterProduct: false,
  stats: null,
  recentSales: [],
  lowStock: [],
  loading: false,
  message: '',
  error: '',
  installPrompt: null,
  search: ''
};

const modules = [
  { id: 'dashboard', label: 'Overview', icon: '▦', table: null },
  { id: 'sales', label: 'Sales & POS', icon: '◫', table: 'sales' },
  { id: 'products', label: 'Products & Stock', icon: '▤', table: 'products' },
  { id: 'categories', label: 'Categories', icon: '◈', table: 'categories' },
  { id: 'customers', label: 'Customers', icon: '♙', table: 'customers' },
  { id: 'suppliers', label: 'Suppliers', icon: '⇄', table: 'suppliers' },
  { id: 'invoices', label: 'Invoices', icon: '▧', table: 'invoices' },
  { id: 'expenses', label: 'Expenses', icon: '↘', table: 'expenses' },
  { id: 'bookings', label: 'Bookings', icon: '◷', table: 'bookings' },
  { id: 'branches', label: 'Branches', icon: '⌖', table: 'branches' }
];

const formFields = {
  products: [
    ['name', 'Product name', 'text', true], ['sku', 'SKU / code', 'text'], ['barcode', 'Barcode', 'text'],
    ['unit', 'Unit', 'select', false, ['piece', 'pack', 'carton', 'kg', 'gram', 'litre', 'metre', 'service']],
    ['cost_price', 'Cost price', 'number'], ['selling_price', 'Selling price', 'number', true],
    ['stock_quantity', 'Opening stock', 'number'], ['reorder_level', 'Low-stock alert level', 'number'],
    ['track_stock', 'Track stock quantities', 'checkbox'], ['description', 'Description', 'textarea']
  ],
  categories: [['name', 'Category name', 'text', true], ['description', 'Description', 'textarea']],
  customers: [
    ['name', 'Customer name', 'text', true], ['phone', 'Phone number', 'tel'], ['email', 'Email address', 'email'],
    ['address', 'Address', 'textarea'], ['customer_type', 'Customer type', 'select', false, ['individual', 'business']],
    ['opening_balance', 'Opening balance', 'number'], ['notes', 'Notes', 'textarea']
  ],
  suppliers: [
    ['name', 'Supplier name', 'text', true], ['contact_person', 'Contact person', 'text'], ['phone', 'Phone number', 'tel'],
    ['email', 'Email address', 'email'], ['address', 'Address', 'textarea'], ['notes', 'Notes', 'textarea']
  ],
  expenses: [
    ['category', 'Expense category', 'text', true], ['description', 'Description', 'textarea'],
    ['amount', 'Amount', 'number', true], ['payment_method', 'Payment method', 'select', false, ['cash', 'bank transfer', 'card', 'POS', 'other']],
    ['expense_date', 'Expense date', 'date']
  ],
  bookings: [
    ['customer_name', 'Customer name', 'text', true], ['customer_phone', 'Customer phone', 'tel'],
    ['service_name', 'Service / booking', 'text', true], ['starts_at', 'Start date and time', 'datetime-local', true],
    ['ends_at', 'End date and time', 'datetime-local', true], ['amount', 'Amount', 'number'], ['notes', 'Notes', 'textarea']
  ],
  branches: [
    ['branch_name', 'Branch name', 'text', true], ['branch_code', 'Branch code', 'text'],
    ['phone', 'Phone number', 'tel'], ['address', 'Address', 'textarea']
  ]
};

const columns = {
  products: [
    ['name', 'Product'], ['sku', 'SKU'], ['stock_quantity', 'In stock'], ['selling_price', 'Selling price'], ['status', 'Status']
  ],
  sales: [
    ['sale_number', 'Sale reference'], ['total_amount', 'Total'], ['amount_paid', 'Paid'], ['status', 'Status'], ['sold_at', 'Date']
  ],
  categories: [['name', 'Category'], ['description', 'Description'], ['status', 'Status']],
  customers: [['name', 'Customer'], ['phone', 'Phone'], ['email', 'Email'], ['customer_type', 'Type']],
  suppliers: [['name', 'Supplier'], ['contact_person', 'Contact person'], ['phone', 'Phone'], ['email', 'Email']],
  invoices: [['invoice_number', 'Invoice'], ['customer_id', 'Customer ID'], ['total_amount', 'Total'], ['amount_paid', 'Paid'], ['status', 'Status'], ['due_date', 'Due date']],
  expenses: [['category', 'Category'], ['description', 'Description'], ['amount', 'Amount'], ['payment_method', 'Method'], ['expense_date', 'Date']],
  bookings: [['customer_name', 'Customer'], ['service_name', 'Service'], ['starts_at', 'Start'], ['amount', 'Amount'], ['status', 'Status']],
  branches: [['branch_name', 'Branch'], ['branch_code', 'Code'], ['phone', 'Phone'], ['address', 'Address'], ['status', 'Status']]
};

const currency = () => state.business?.currency || 'NGN';
const money = value => new Intl.NumberFormat('en-NG', { style: 'currency', currency: currency(), maximumFractionDigits: 2 }).format(Number(value || 0));
const dateText = value => {
  if (!value) return '—';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? String(value) : new Intl.DateTimeFormat('en-NG', { dateStyle: 'medium' }).format(date);
};
const dateTimeText = value => {
  if (!value) return '—';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? String(value) : new Intl.DateTimeFormat('en-NG', { dateStyle: 'medium', timeStyle: 'short' }).format(date);
};
const esc = value => String(value ?? '').replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[ch]);
const initials = value => String(value || 'E').split(/\s+/).slice(0, 2).map(part => part[0]).join('').toUpperCase();

function parseExecution(execution) {
  let payload = {};
  try { payload = execution.responseBody ? JSON.parse(execution.responseBody) : {}; } catch { payload = { message: execution.responseBody || 'The service returned an unreadable response.' }; }
  const status = Number(execution.responseStatusCode || 200);
  if (status >= 400) throw new Error(payload.error || payload.message || `Request failed (${status}).`);
  if (payload.success === false || payload.ok === false) throw new Error(payload.error || payload.message || 'The request could not be completed.');
  return payload;
}

async function invoke(functionId, { path = '/', method = 'POST', body = null } = {}) {
  // Appwrite JS SDK v18 uses positional arguments for createExecution.
  const requestBody = body ? JSON.stringify(body) : '';
  const requestHeaders = body ? { 'content-type': 'application/json' } : {};
  const execution = await functions.createExecution(
    functionId,
    requestBody,
    false,
    path,
    method,
    requestHeaders
  );
  if (execution.status === 'failed' && !execution.responseBody) {
    throw new Error(execution.stderr || 'The business service could not complete this request.');
  }
  return parseExecution(execution);
}

async function onboardingRequest(path, method = 'GET', body = null) {
  return invoke(ONBOARDING_FUNCTION, { path, method, body });
}

async function businessRequest(action, extra = {}) {
  if (!state.business?.teamId) throw new Error('Select a business workspace first.');
  const result = await invoke(BUSINESS_FUNCTION, {
    path: '/', method: 'POST', body: { action, teamId: state.business.teamId, ...extra }
  });
  return result;
}

function setNotice(message = '', error = '') {
  state.message = message;
  state.error = error;
}

function showBusy(message = 'Please wait…') {
  state.loading = true;
  render();
  return message;
}

function finishBusy() {
  state.loading = false;
}

async function loadMyBusinesses() {
  const response = await onboardingRequest('/me');
  state.user = response.user;
  state.businesses = response.businesses || [];
  if (state.business) {
    const refreshed = state.businesses.find(item => item.id === state.business.id || item.teamId === state.business.teamId);
    state.business = refreshed || null;
  }
  if (!state.business && state.businesses.length) state.business = state.businesses[0];
}

async function loadDashboard() {
  const result = await businessRequest('dashboard');
  state.stats = result.stats || {};
  state.recentSales = result.recentSales || [];
  state.lowStock = result.lowStock || [];
}

async function loadRecords(tableId) {
  const result = await businessRequest('list_records', { tableId, limit: 100 });
  state.records = result.records || [];
}

function navMarkup() {
  return modules.map(item => `
    <button class="nav-item ${state.active === item.id ? 'active' : ''}" data-action="navigate" data-value="${item.id}">
      <span class="nav-icon">${item.icon}</span><span>${item.label}</span>
    </button>`).join('');
}

function shellMarkup(content) {
  return `
    <div class="app-shell">
      <aside class="sidebar" id="sidebar">
        <div class="brand"><div class="brand-mark">E</div><div><div class="brand-name">ETHAN <b>BUSINESS</b></div><div class="brand-tag">MANAGE. GROW. SUCCEED.</div></div></div>
        <div class="workspace-label">WORKSPACE</div>
        <div class="workspace-switch">
          <div class="workspace-avatar">${esc(initials(state.business?.name))}</div>
          <div class="workspace-meta"><strong>${esc(state.business?.name || 'My business')}</strong><small>${esc(state.business?.industry || 'Business workspace')}</small></div>
          ${state.businesses.length > 1 ? `<select id="business-switch" aria-label="Choose business">${state.businesses.map(b => `<option value="${esc(b.id)}" ${b.id === state.business?.id ? 'selected' : ''}>${esc(b.name)}</option>`).join('')}</select>` : ''}
        </div>
        <nav class="main-nav">${navMarkup()}</nav>
        <div class="sidebar-bottom">
          <div class="help-card"><div class="help-spark">✦</div><strong>Built for better business</strong><p>One workspace for your everyday operations.</p><a href="https://ethandigitalacademy.org" target="_blank" rel="noreferrer">Explore Ethan Digital ↗</a></div>
          <button class="nav-item" data-action="logout"><span class="nav-icon">⇥</span><span>Sign out</span></button>
          <div class="sidebar-foot">© ${new Date().getFullYear()} ETHAN DIGITAL ACADEMY</div>
        </div>
      </aside>
      <main class="main-area">
        <header class="topbar">
          <div class="topbar-left"><button class="mobile-menu" data-action="menu">☰</button><div class="breadcrumb">Workspace <span>/</span> <b>${esc(modules.find(m => m.id === state.active)?.label || 'Overview')}</b></div></div>
          <div class="topbar-right"><button class="icon-button" data-action="install" title="Install app" ${state.installPrompt ? '' : 'hidden'}>⇩</button><span class="today-label">${new Intl.DateTimeFormat('en-NG', { dateStyle: 'medium' }).format(new Date())}</span><div class="user-chip"><div class="user-avatar">${esc(initials(state.user?.name))}</div><div><b>${esc(state.user?.name || 'User')}</b><small>${esc(state.user?.email || '')}</small></div></div></div>
        </header>
        <section class="page-content">${noticeMarkup()}${state.loading ? `<div class="loading-bar"><span></span></div>` : ''}${content}</section>
      </main>
    </div>
    <div id="modal-root"></div>
    <div id="toast-root" class="toast-root"></div>`;
}

function noticeMarkup() {
  if (state.error) return `<div class="notice error"><span>!</span>${esc(state.error)}<button data-action="clear-notice">×</button></div>`;
  if (state.message) return `<div class="notice success"><span>✓</span>${esc(state.message)}<button data-action="clear-notice">×</button></div>`;
  return '';
}

function authMarkup() {
  return `
    <div class="auth-page">
      <div class="auth-decoration"><div class="auth-orbit orbit-one"></div><div class="auth-orbit orbit-two"></div><div class="auth-decoration-copy"><div class="brand-mark light">E</div><span class="eyebrow">THE ETHAN BUSINESS PLATFORM</span><h1>Make your business<br/><em>work smarter.</em></h1><p>Bring your products, customers, sales and daily operations into one clear workspace.</p><div class="auth-feature-list"><div>✓ Clear business overview</div><div>✓ Inventory and sales management</div><div>✓ Invoices, expenses and bookings</div></div></div><div class="auth-decoration-foot">A product of ETHAN DIGITAL ACADEMY</div></div>
      <div class="auth-panel"><div class="auth-card"><div class="brand compact"><div class="brand-mark">E</div><div><div class="brand-name">ETHAN <b>BUSINESS</b></div><div class="brand-tag">MANAGE. GROW. SUCCEED.</div></div></div><span class="eyebrow">YOUR BUSINESS, CONNECTED</span><h2>Welcome back</h2><p class="subtext">Sign in to continue to your business workspace.</p>${noticeMarkup()}
        <form id="auth-form" class="form-stack">
          <label>Email address<input type="email" name="email" placeholder="you@example.com" autocomplete="email" value="${esc(state.authEmail)}" required /></label>
          <label>Password<div class="password-wrap"><input id="auth-password" type="password" name="password" placeholder="Enter your password" autocomplete="current-password" required minlength="8"/><button type="button" data-action="toggle-password">Show</button></div></label>
          <div class="auth-options"><label class="check-label"><input type="checkbox" name="register" id="register-toggle"/> Create a new account</label><a href="#" data-action="forgot-password">Forgot password?</a></div>
          <label id="name-field" class="${state.register ? '' : 'hidden'}">Your full name<input type="text" name="name" placeholder="Full name" autocomplete="name" value="${esc(state.authName)}" /></label>
          <button class="button primary full" type="submit">${state.register ? 'Create account' : 'Sign in'} <span>→</span></button>
        </form>
        <div class="auth-divider"><span>SECURE BUSINESS ACCESS</span></div>
        <p class="auth-footnote">By continuing, you agree to use ETHAN BUSINESS responsibly and keep your account credentials secure.</p>
        <div class="auth-copyright">© ${new Date().getFullYear()} ALLON-MAADIAH INTERNATIONAL LIMITED</div>
      </div></div>
    </div>`;
}

function onboardingMarkup() {
  return `
    <div class="onboarding-page"><div class="onboarding-top"><div class="brand"><div class="brand-mark">E</div><div><div class="brand-name">ETHAN <b>BUSINESS</b></div><div class="brand-tag">MANAGE. GROW. SUCCEED.</div></div></div><button class="text-button" data-action="logout">Sign out</button></div>
      <div class="onboarding-card"><div class="step-indicator"><span>01</span><div></div><span>02</span></div><span class="eyebrow">LET'S GET YOUR WORKSPACE READY</span><h1>Set up your business</h1><p class="subtext">Tell us a little about your business. You can update these details later.</p>
        <form id="business-form" class="form-grid">
          <label class="wide">Business name<input name="businessName" placeholder="e.g. Ethan Digital Academy" required minlength="2" maxlength="160" /></label>
          <label>Industry<select name="industry"><option value="Retail">Retail</option><option value="Education">Education</option><option value="Professional services">Professional services</option><option value="Hospitality">Hospitality</option><option value="Health & beauty">Health & beauty</option><option value="Manufacturing">Manufacturing</option><option value="Wholesale & distribution">Wholesale & distribution</option><option value="Other">Other</option></select></label>
          <label>Currency<select name="currency"><option value="NGN">NGN — Nigerian Naira</option><option value="USD">USD — US Dollar</option><option value="GBP">GBP — British Pound</option><option value="EUR">EUR — Euro</option><option value="CAD">CAD — Canadian Dollar</option></select></label>
          <label>Business phone<input name="phone" type="tel" placeholder="e.g. 08012345678" /></label>
          <label>Business email<input name="email" type="email" placeholder="business@example.com" value="${esc(state.user?.email || '')}" /></label>
          <label class="wide">Business address<textarea name="address" rows="2" placeholder="Street, city, state"></textarea></label>
          <div class="wide section-mini-title">FIRST BRANCH</div>
          <label class="wide">Branch name<input name="branchName" value="Main Branch" required maxlength="140" /></label>
          <div class="wide onboarding-note"><span>✦</span><p>Your business workspace is private. You control who joins and what each team member can access.</p></div>
          <button class="button primary wide" type="submit">Create my business workspace <span>→</span></button>
        </form>
      </div><div class="onboarding-foot">SECURE SETUP · POWERED BY ETHAN DIGITAL ACADEMY</div>
    </div>`;
}

function dashboardMarkup() {
  const s = state.stats || {};
  const stats = [
    ['Revenue today', money(s.todayRevenue), 'From recorded sales', '◫'],
    ['Total products', Number(s.productCount || 0).toLocaleString(), 'Items in your catalogue', '▤'],
    ['Customers', Number(s.customerCount || 0).toLocaleString(), 'Customer records', '♙'],
    ['Outstanding', money(s.receivables), 'Unpaid invoices and sales', '◷']
  ];
  return `
    <div class="page-heading"><div><span class="eyebrow">BUSINESS OVERVIEW</span><h1>Good ${greeting()}, ${esc((state.user?.name || 'there').split(' ')[0])}.</h1><p>Here's what's happening in ${esc(state.business?.name || 'your business')}.</p></div><div class="heading-actions"><button class="button secondary" data-action="reload">↻ Refresh</button><button class="button primary" data-action="new-sale">＋ New sale</button></div></div>
    <div class="stat-grid">${stats.map((item, i) => `<div class="stat-card"><div class="stat-top"><span>${item[0]}</span><span class="stat-icon stat-icon-${i}">${item[3]}</span></div><strong>${item[1]}</strong><small>${item[2]}</small></div>`).join('')}</div>
    <div class="dashboard-grid"><div class="panel large-panel"><div class="panel-heading"><div><h3>Recent sales</h3><p>Your latest recorded transactions</p></div><button class="link-button" data-action="navigate" data-value="sales">View all →</button></div>${state.recentSales.length ? `<div class="table-wrap"><table><thead><tr><th>REFERENCE</th><th>DATE</th><th>AMOUNT</th><th>STATUS</th></tr></thead><tbody>${state.recentSales.map(row => `<tr><td><b>${esc(row.sale_number || 'Sale')}</b></td><td>${dateTimeText(row.sold_at)}</td><td>${money(row.total_amount)}</td><td>${statusPill(row.status)}</td></tr>`).join('')}</tbody></table></div>` : emptyState('◫', 'No sales recorded yet', 'Your sales will appear here after your first transaction.', '<button class="button primary small" data-action="new-sale">Record your first sale</button>')}</div>
      <div class="panel"><div class="panel-heading"><div><h3>Quick actions</h3><p>Common tasks</p></div></div><div class="quick-actions"><button data-action="navigate" data-value="products"><span>＋</span><div><b>Add a product</b><small>Update your inventory</small></div><i>→</i></button><button data-action="navigate" data-value="customers"><span>♙</span><div><b>Add a customer</b><small>Grow your customer list</small></div><i>→</i></button><button data-action="navigate" data-value="expenses"><span>↘</span><div><b>Record an expense</b><small>Keep track of spending</small></div><i>→</i></button><button data-action="navigate" data-value="invoices"><span>▧</span><div><b>Create an invoice</b><small>Bill a customer</small></div><i>→</i></button></div></div>
      <div class="panel"><div class="panel-heading"><div><h3>Inventory attention</h3><p>Products at or below reorder level</p></div><button class="link-button" data-action="navigate" data-value="products">Inventory →</button></div>${state.lowStock.length ? `<div class="low-stock-list">${state.lowStock.map(p => `<div class="low-stock-item"><div class="product-dot">${esc(initials(p.name))}</div><div><b>${esc(p.name)}</b><small>${esc(p.sku || 'No SKU')}</small></div><strong>${Number(p.stock_quantity || 0)} left</strong></div>`).join('')}</div>` : emptyState('✓', 'Stock looks healthy', 'Low-stock items will be listed here when action is needed.')}</div>
      <div class="panel business-snapshot"><div class="panel-heading"><div><h3>Business snapshot</h3><p>A quick pulse on your operations</p></div></div><div class="snapshot-row"><span>Total sales recorded</span><b>${Number(s.salesCount || 0).toLocaleString()}</b></div><div class="snapshot-row"><span>Invoices created</span><b>${Number(s.invoiceCount || 0).toLocaleString()}</b></div><div class="snapshot-row"><span>Expenses recorded</span><b>${money(s.totalExpenses)}</b></div><div class="snapshot-row"><span>Upcoming bookings</span><b>${Number(s.upcomingBookings || 0).toLocaleString()}</b></div><div class="snapshot-foot">All figures reflect information currently recorded in this workspace.</div></div>
    </div>`;
}

function greeting() {
  const hour = new Date().getHours();
  return hour < 12 ? 'morning' : hour < 17 ? 'afternoon' : 'evening';
}

function emptyState(icon, title, description, action = '') {
  return `<div class="empty-state"><div class="empty-icon">${icon}</div><b>${title}</b><p>${description}</p>${action}</div>`;
}

function statusPill(status) {
  const value = String(status || 'active').toLowerCase();
  const tone = ['paid', 'active', 'completed', 'booked'].includes(value) ? 'positive' : ['cancelled', 'void', 'inactive'].includes(value) ? 'negative' : 'neutral';
  return `<span class="status-pill ${tone}">${esc(value.replaceAll('_', ' '))}</span>`;
}

function displayCell(key, value) {
  if (['selling_price', 'cost_price', 'total_amount', 'amount_paid', 'amount', 'opening_balance'].includes(key)) return money(value);
  if (['sold_at', 'expense_date', 'due_date', 'issue_date', 'starts_at'].includes(key)) return key === 'starts_at' ? dateTimeText(value) : dateText(value);
  if (key === 'status') return statusPill(value);
  return esc(value || '—');
}

function listMarkup(module) {
  const config = modules.find(m => m.id === module);
  const title = config?.label || 'Records';
  const tableId = config?.table;
  const rows = state.records.filter(row => {
    if (!state.search) return true;
    return JSON.stringify(row).toLowerCase().includes(state.search.toLowerCase());
  });
  const headers = columns[tableId] || [];
  const canCreate = Boolean(formFields[tableId]) || tableId === 'sales' || tableId === 'invoices';
  return `
    <div class="page-heading"><div><span class="eyebrow">BUSINESS OPERATIONS</span><h1>${esc(title)}</h1><p>Manage your ${esc(title.toLowerCase())} in one place.</p></div><div class="heading-actions">${tableId === 'sales' ? `<button class="button primary" data-action="new-sale">＋ New sale</button>` : tableId === 'invoices' ? `<button class="button primary" data-action="new-invoice">＋ New invoice</button>` : canCreate ? `<button class="button primary" data-action="new-record" data-value="${tableId}">＋ Add ${singular(title)}</button>` : ''}</div></div>
    <div class="panel records-panel"><div class="records-toolbar"><div class="record-count"><b>${rows.length}</b><span>records</span></div><div class="toolbar-right"><div class="search-box"><span>⌕</span><input id="record-search" placeholder="Search ${esc(title.toLowerCase())}" value="${esc(state.search)}" /></div><button class="button secondary small" data-action="reload">↻ Refresh</button></div></div>
    ${rows.length ? `<div class="table-wrap"><table><thead><tr>${headers.map(h => `<th>${h[1].toUpperCase()}</th>`).join('')}<th class="actions-col">ACTIONS</th></tr></thead><tbody>${rows.map(row => `<tr>${headers.map(([key]) => `<td>${displayCell(key, row[key])}</td>`).join('')}<td class="row-actions">${tableId === 'products' ? `<button class="table-action" data-action="adjust-stock" data-id="${esc(row.$id)}" data-name="${esc(row.name)}">Adjust stock</button>` : ''}${tableId === 'invoices' && !['paid','cancelled'].includes(row.status) ? `<button class="table-action" data-action="invoice-payment" data-id="${esc(row.$id)}" data-total="${esc(row.total_amount)}" data-paid="${esc(row.amount_paid)}">Add payment</button>` : ''}${['categories','customers','suppliers','bookings'].includes(tableId) ? `<button class="table-action danger-text" data-action="delete-record" data-id="${esc(row.$id)}" data-table="${tableId}">Delete</button>` : '<span class="muted-dash">—</span>'}</td></tr>`).join('')}</tbody></table></div>` : tableId === 'products' ? emptyState('▤', 'Your product catalogue is empty', 'Add the products or services you sell. They will appear automatically in Sales & POS.', '<button class="button primary small" data-action="new-record" data-value="products">＋ Add your first product</button>') : emptyState('⌕', 'Nothing here yet', `New ${esc(title.toLowerCase())} will appear in this list.`, canCreate ? `<button class="button primary small" data-action="${tableId === 'sales' ? 'new-sale' : tableId === 'invoices' ? 'new-invoice' : 'new-record'}" data-value="${tableId}">＋ Add your first ${singular(title)}</button>` : '')}
    </div>`;
}

function singular(value) {
  return ({ Products: 'product', 'Products & Stock': 'product', Categories: 'category', Customers: 'customer', Suppliers: 'supplier', Expenses: 'expense', Bookings: 'booking', Branches: 'branch', Invoices: 'invoice' })[value] || value.toLowerCase().replace(/s$/, '');
}

function fieldMarkup(field) {
  const [key, label, type, required = false, options = []] = field;
  const value = type === 'date' && key === 'expense_date' ? new Date().toISOString().slice(0, 10) : '';
  if (type === 'textarea') return `<label class="wide">${label}<textarea name="${key}" rows="2" placeholder="${label}" ${required ? 'required' : ''}></textarea></label>`;
  if (type === 'select') return `<label>${label}<select name="${key}">${options.map(o => `<option value="${esc(o)}">${esc(o[0].toUpperCase() + o.slice(1))}</option>`).join('')}</select></label>`;
  if (type === 'checkbox') return `<label class="check-label product-stock-toggle"><input type="hidden" name="${key}" value="false"><input type="checkbox" name="${key}" value="true" checked> ${label}</label>`;
  return `<label>${label}<input name="${key}" type="${type}" ${['number'].includes(type) ? 'min="0" step="0.01"' : ''} ${value ? `value="${value}"` : ''} ${required ? 'required' : ''} placeholder="${label}" /></label>`;
}

function modalMarkup(title, description, content) {
  document.querySelector('#modal-root').innerHTML = `<div class="modal-backdrop" data-action="close-modal"><section class="modal" role="dialog" aria-modal="true" aria-labelledby="modal-title"><div class="modal-head"><div><span class="eyebrow">ETHAN BUSINESS</span><h2 id="modal-title">${esc(title)}</h2><p>${esc(description)}</p></div><button class="modal-close" data-action="close-modal">×</button></div>${content}</section></div>`;
  document.querySelector('.modal')?.addEventListener('click', event => event.stopPropagation());
}

function openRecordModal(tableId) {
  const title = `Add ${singular(modules.find(m => m.table === tableId)?.label || tableId)}`;
  const fields = formFields[tableId] || [];
  modalMarkup(title, 'Enter the details below to save this record.', `<form id="record-form" data-table="${tableId}" class="modal-form"><div class="form-grid">${fields.map(fieldMarkup).join('')}</div><div class="modal-actions"><button type="button" class="button secondary" data-action="close-modal">Cancel</button><button class="button primary" type="submit">Save record <span>→</span></button></div></form>`);
}

function saleTotals() {
  const subtotal = state.saleCart.reduce((sum, item) => sum + Number(item.product.selling_price || 0) * item.quantity, 0);
  const discount = Math.max(0, Number(state.saleDiscount || 0));
  const tax = Math.max(0, Number(state.saleTax || 0));
  const total = Math.max(0, subtotal - discount + tax);
  const received = state.saleAmountPaid === '' ? total : Math.max(0, Number(state.saleAmountPaid || 0));
  return { subtotal, discount, tax, total, received, amountPaid: Math.min(received, total), change: state.salePaymentMethod === 'cash' ? Math.max(0, received - total) : 0, due: Math.max(0, total - Math.min(received, total)) };
}

function saleCatalogMarkup() {
  const search = String(state.saleSearch || '').trim().toLowerCase();
  const categoryId = state.saleCategory || 'all';
  const visible = state.saleProducts.filter(product => {
    const searchable = [product.name, product.sku, product.barcode, product.description].join(' ').toLowerCase();
    return (!search || searchable.includes(search)) && (categoryId === 'all' || product.category_id === categoryId);
  });
  const categoryButtons = ['<button type="button" class="pos-category-chip ' + (categoryId === 'all' ? 'active' : '') + '" data-action="pos-category" data-value="all">All items</button>']
    .concat(state.saleCategories.map(category => '<button type="button" class="pos-category-chip ' + (categoryId === category.$id ? 'active' : '') + '" data-action="pos-category" data-value="' + esc(category.$id) + '">' + esc(category.name) + '</button>'))
    .join('');
  if (!state.saleProducts.length) {
    return '<div class="pos-empty-catalog"><div class="pos-empty-icon">▤</div><h3>Your product catalogue is empty</h3><p>Add the products or services you sell. They will appear here automatically when you record a sale.</p><button type="button" class="button primary" data-action="add-first-pos-product">＋ Add your first product</button><small>You only need a name and selling price to get started.</small></div>';
  }
  if (!visible.length) return '<div class="pos-category-filter">' + categoryButtons + '</div><div class="pos-no-results"><b>No matching products</b><p>Try another product name, SKU or barcode, or choose a different category.</p></div>';
  const cards = visible.map(product => {
    const inCart = state.saleCart.find(item => item.product.$id === product.$id);
    const quantity = inCart ? inCart.quantity : 0;
    const stock = Math.max(0, Number(product.stock_quantity || 0));
    const outOfStock = Boolean(product.track_stock) && stock <= quantity;
    const category = state.saleCategories.find(item => item.$id === product.category_id);
    const stockText = product.track_stock ? stock + ' in stock' : 'Service / no stock tracking';
    return '<button type="button" class="pos-product-tile" data-action="pos-add-product" data-id="' + esc(product.$id) + '" ' + (outOfStock ? 'disabled' : '') + '>' +
      '<span class="pos-product-initial">' + esc(initials(product.name)) + '</span>' +
      '<span class="pos-product-name">' + esc(product.name) + '</span>' +
      '<span class="pos-product-meta">' + esc(product.sku || (category ? category.name : stockText)) + '</span>' +
      '<strong>' + money(product.selling_price) + '</strong>' +
      '<small class="' + (outOfStock ? 'out-of-stock' : 'in-stock') + '">' + (outOfStock ? 'Out of stock' : stockText) + '</small>' +
      (quantity ? '<span class="pos-in-cart">' + quantity + ' in cart</span>' : '') +
      '</button>';
  }).join('');
  return '<div class="pos-category-filter">' + categoryButtons + '</div><div class="pos-product-grid">' + cards + '</div>';
}

function saleCartMarkup() {
  if (!state.saleCart.length) return '<div class="pos-cart-empty"><span>＋</span><b>Your sale is empty</b><p>Choose a product from the catalogue to add it here.</p></div>';
  return state.saleCart.map(item => {
    const product = item.product;
    const stock = Math.max(0, Number(product.stock_quantity || 0));
    const canAddMore = !product.track_stock || item.quantity < stock;
    return '<div class="pos-cart-line">' +
      '<div class="pos-cart-line-info"><b>' + esc(product.name) + '</b><small>' + money(product.selling_price) + ' each</small></div>' +
      '<div class="pos-cart-line-controls"><button type="button" aria-label="Reduce quantity" data-action="pos-qty-down" data-id="' + esc(product.$id) + '">−</button><span>' + item.quantity + '</span><button type="button" aria-label="Increase quantity" data-action="pos-qty-up" data-id="' + esc(product.$id) + '" ' + (canAddMore ? '' : 'disabled') + '>+</button></div>' +
      '<strong class="pos-cart-line-total">' + money(Number(product.selling_price || 0) * item.quantity) + '</strong>' +
      '<button type="button" class="pos-remove-item" aria-label="Remove item" data-action="pos-remove-item" data-id="' + esc(product.$id) + '">×</button>' +
      '</div>';
  }).join('');
}

function renderSaleCatalog() {
  const catalog = document.querySelector('#pos-products');
  if (catalog) catalog.innerHTML = saleCatalogMarkup();
}

function renderSaleTotals() {
  const totals = saleTotals();
  const updateText = (id, value) => { const node = document.getElementById(id); if (node) node.textContent = value; };
  updateText('pos-subtotal', money(totals.subtotal));
  updateText('pos-discount-value', money(totals.discount));
  updateText('pos-tax-value', money(totals.tax));
  updateText('pos-total', money(totals.total));
  updateText('pos-amount-due', money(totals.due));
  updateText('pos-change-due', money(totals.change));
  const invalidDiscount = totals.discount > totals.subtotal;
  const rawReceived = state.saleAmountPaid === '' ? totals.total : Number(state.saleAmountPaid);
  const invalidReceived = !Number.isFinite(rawReceived) || rawReceived < 0;
  const excessNonCash = state.salePaymentMethod !== 'cash' && rawReceived > totals.total;
  const feedback = document.querySelector('#pos-payment-feedback');
  if (feedback) {
    feedback.textContent = invalidDiscount ? 'Discount cannot be greater than the subtotal.' : invalidReceived ? 'Enter a valid amount received.' : excessNonCash ? 'Amount received cannot exceed the total for this payment method.' : totals.change > 0 ? 'Give this change to the customer.' : totals.due > 0 ? 'The remaining balance will be recorded as unpaid.' : 'Payment complete.';
    feedback.className = 'pos-payment-feedback ' + (invalidDiscount || invalidReceived || excessNonCash ? 'error' : 'help');
  }
  const submit = document.querySelector('#pos-submit-sale');
  if (submit) submit.disabled = !state.saleCart.length || invalidDiscount || invalidReceived || excessNonCash;
}

function renderSaleCart() {
  const lines = document.querySelector('#pos-cart-lines');
  if (lines) lines.innerHTML = saleCartMarkup();
  renderSaleTotals();
}

function addProductToSale(productId) {
  const product = state.saleProducts.find(item => item.$id === productId);
  if (!product) return;
  const existing = state.saleCart.find(item => item.product.$id === productId);
  const nextQuantity = (existing?.quantity || 0) + 1;
  const stock = Math.max(0, Number(product.stock_quantity || 0));
  if (product.track_stock && nextQuantity > stock) {
    state.saleNotice = 'There is not enough stock for ' + product.name + '.';
    const message = document.querySelector('#pos-scan-feedback'); if (message) message.textContent = state.saleNotice;
    return;
  }
  if (existing) existing.quantity = nextQuantity;
  else state.saleCart.push({ product, quantity: 1 });
  state.saleNotice = product.name + ' added to the sale.';
  const message = document.querySelector('#pos-scan-feedback'); if (message) message.textContent = state.saleNotice;
  renderSaleCatalog(); renderSaleCart();
}

function changeSaleQuantity(productId, change) {
  const item = state.saleCart.find(entry => entry.product.$id === productId);
  if (!item) return;
  const next = item.quantity + change;
  if (next < 1) state.saleCart = state.saleCart.filter(entry => entry.product.$id !== productId);
  else {
    const stock = Math.max(0, Number(item.product.stock_quantity || 0));
    if (change > 0 && item.product.track_stock && next > stock) {
      state.saleNotice = 'Only ' + stock + ' units of ' + item.product.name + ' are available.';
      const message = document.querySelector('#pos-scan-feedback'); if (message) message.textContent = state.saleNotice;
      return;
    }
    item.quantity = next;
  }
  renderSaleCatalog(); renderSaleCart();
}

function addSaleProductByCode(value) {
  const code = String(value || '').trim().toLowerCase();
  if (!code) return;
  const product = state.saleProducts.find(item => String(item.barcode || '').trim().toLowerCase() === code || String(item.sku || '').trim().toLowerCase() === code);
  if (!product) {
    state.saleNotice = 'No product matched that barcode or SKU.';
    const message = document.querySelector('#pos-scan-feedback'); if (message) message.textContent = state.saleNotice;
    return;
  }
  addProductToSale(product.$id);
  const input = document.querySelector('#pos-barcode'); if (input) input.value = '';
}

function openSaleModal() {
  const customerOptions = ['<option value="">Walk-in customer</option>'].concat(state.saleCustomers.map(customer => '<option value="' + esc(customer.$id) + '">' + esc(customer.name) + (customer.phone ? ' · ' + esc(customer.phone) : '') + '</option>')).join('');
  const content =
    '<form id="sale-form" class="pos-form">' +
      '<div class="pos-workspace">' +
        '<section class="pos-catalog-panel">' +
          '<div class="pos-tools">' +
            '<label class="pos-search-field"><span>⌕</span><input id="pos-search" type="search" placeholder="Search products, SKU or barcode" autocomplete="off"></label>' +
            '<label class="pos-barcode-field"><span>▦</span><input id="pos-barcode" type="text" placeholder="Scan barcode or enter SKU, then press Enter" autocomplete="off"></label>' +
          '</div>' +
          '<div id="pos-scan-feedback" class="pos-scan-feedback">' + esc(state.saleNotice || 'A USB barcode scanner can be used here like a keyboard.') + '</div>' +
          '<div id="pos-products" class="pos-products-area">' + saleCatalogMarkup() + '</div>' +
        '</section>' +
        '<aside class="pos-cart-panel">' +
          '<div class="pos-cart-heading"><div><span class="eyebrow">CHECKOUT</span><h3>Current sale</h3></div><button type="button" class="text-button" data-action="pos-clear-cart" ' + (state.saleCart.length ? '' : 'disabled') + '>Clear cart</button></div>' +
          '<div id="pos-cart-lines" class="pos-cart-lines">' + saleCartMarkup() + '</div>' +
          '<div class="pos-sale-fields">' +
            '<label class="wide">Customer (optional)<select id="pos-customer">' + customerOptions + '</select></label>' +
            '<div class="pos-two-fields"><label>Discount<input id="pos-discount" type="number" min="0" step="0.01" value="' + esc(state.saleDiscount) + '"></label><label>Tax<input id="pos-tax" type="number" min="0" step="0.01" value="' + esc(state.saleTax) + '"></label></div>' +
            '<label>Amount received<input id="pos-amount-paid" type="number" min="0" step="0.01" value="' + esc(state.saleAmountPaid) + '" placeholder="Blank = full payment"></label>' +
            '<label>Payment method<select id="pos-payment-method"><option value="cash" selected>Cash</option><option value="bank transfer">Bank transfer</option><option value="POS">POS terminal</option><option value="card">Card</option><option value="other">Other</option></select></label>' +
          '</div>' +
          '<div class="pos-summary">' +
            '<div><span>Subtotal</span><b id="pos-subtotal">' + money(saleTotals().subtotal) + '</b></div>' +
            '<div><span>Discount</span><b id="pos-discount-value">' + money(saleTotals().discount) + '</b></div>' +
            '<div><span>Tax</span><b id="pos-tax-value">' + money(saleTotals().tax) + '</b></div>' +
            '<div class="pos-summary-total"><span>Total to pay</span><b id="pos-total">' + money(saleTotals().total) + '</b></div>' +
            '<div class="pos-balance-row"><span>Balance due</span><b id="pos-amount-due">' + money(saleTotals().due) + '</b></div>' +
            '<div class="pos-balance-row change"><span>Change to return</span><b id="pos-change-due">' + money(saleTotals().change) + '</b></div>' +
            '<p id="pos-payment-feedback" class="pos-payment-feedback help">Payment complete.</p>' +
          '</div>' +
        '</aside>' +
      '</div>' +
      '<div class="pos-footer"><button type="button" class="button secondary" data-action="close-modal">Cancel</button><span class="pos-footer-hint">Stock updates automatically when the sale is saved.</span><button id="pos-submit-sale" class="button primary" type="submit" ' + (state.saleCart.length ? '' : 'disabled') + '>Complete sale <span>→</span></button></div>' +
    '</form>';
  modalMarkup('New sale', 'Select items, adjust quantities and complete the checkout.', content);
  document.querySelector('.modal')?.classList.add('pos-modal');
  renderSaleTotals();
}

async function openSaleWithProducts() {
  const [productsResult, categoriesResult, customersResult] = await Promise.all([
    businessRequest('list_records', { tableId: 'products', limit: 100 }),
    businessRequest('list_records', { tableId: 'categories', limit: 100 }),
    businessRequest('list_records', { tableId: 'customers', limit: 100 })
  ]);
  state.saleProducts = (productsResult.records || []).filter(item => item.status !== 'inactive').sort((a, b) => String(a.name).localeCompare(String(b.name)));
  state.saleCategories = categoriesResult.records || [];
  state.saleCustomers = customersResult.records || [];
  state.saleCart = [];
  state.saleSearch = '';
  state.saleCategory = 'all';
  state.saleDiscount = '0';
  state.saleTax = '0';
  state.saleAmountPaid = '';
  state.salePaymentMethod = 'cash';
  state.saleCustomerId = '';
  state.saleNotice = '';
  openSaleModal();
}

async function openInvoiceModal() {
  const customerResult = await businessRequest('list_records', { tableId: 'customers', limit: 100 });
  const customers = customerResult.records || [];
  modalMarkup('Create invoice', 'Create a simple invoice with line items for a customer.', `<form id="invoice-form" class="modal-form"><div class="form-grid"><label class="wide">Customer<select name="customerId" required>${customers.map(c => `<option value="${esc(c.$id)}">${esc(c.name)}${c.phone ? ` · ${esc(c.phone)}` : ''}</option>`).join('')}</select></label><label>Invoice due date<input name="dueDate" type="date" /></label><label>Issue date<input name="issueDate" type="date" value="${new Date().toISOString().slice(0,10)}" /></label><label class="wide">Description<input name="description" placeholder="What is this invoice for?" required /></label><label>Quantity<input name="quantity" type="number" min="0.01" step="0.01" value="1" required /></label><label>Unit price<input name="unitPrice" type="number" min="0" step="0.01" required /></label><label>Discount<input name="discountAmount" type="number" min="0" step="0.01" value="0" /></label><label>Tax<input name="taxAmount" type="number" min="0" step="0.01" value="0" /></label><label class="wide">Notes<textarea name="notes" rows="2"></textarea></label></div><div class="modal-actions"><button type="button" class="button secondary" data-action="close-modal">Cancel</button><button class="button primary" type="submit">Create invoice <span>→</span></button></div></form>`);
  if (!customers.length) {
    document.querySelector('#invoice-form button[type="submit"]').disabled = true;
    document.querySelector('#invoice-form .modal-form')?.insertAdjacentHTML('afterbegin', '<p class="inline-warning">Add a customer before creating an invoice.</p>');
  }
}

function pageContent() {
  if (state.active === 'dashboard') return dashboardMarkup();
  const module = modules.find(m => m.id === state.active);
  return module?.table ? listMarkup(state.active) : dashboardMarkup();
}

function render() {
  if (!state.user) {
    root.innerHTML = authMarkup();
    const register = document.querySelector('#register-toggle');
    if (register) register.checked = Boolean(state.register);
    return;
  }
  if (!state.business) {
    root.innerHTML = `${state.error ? `<div class="floating-error">${esc(state.error)}</div>` : ''}${onboardingMarkup()}`;
    return;
  }
  root.innerHTML = shellMarkup(pageContent());
}

async function refreshCurrent() {
  showBusy('Refreshing data…');
  setNotice();
  try {
    if (state.active === 'dashboard') await loadDashboard();
    else {
      const module = modules.find(m => m.id === state.active);
      if (module?.table) await loadRecords(module.table);
    }
  } catch (error) {
    setNotice('', error.message);
  } finally {
    finishBusy();
    render();
  }
}

async function navigate(moduleId) {
  state.active = moduleId;
  state.search = '';
  state.records = [];
  setNotice();
  showBusy('Loading your workspace…');
  try {
    if (moduleId === 'dashboard') await loadDashboard();
    else {
      const module = modules.find(m => m.id === moduleId);
      if (module?.table) await loadRecords(module.table);
    }
  } catch (error) {
    setNotice('', error.message);
  } finally {
    finishBusy();
    render();
  }
}

async function switchBusiness(id) {
  state.business = state.businesses.find(b => b.id === id) || null;
  await navigate('dashboard');
}

function validateCredentials(email, password) {
  if (!email) throw new Error('Please enter your email address.');
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error('Enter a valid email address.');
  if (!password) throw new Error('Please enter your password.');
}

async function signIn(email, password) {
  validateCredentials(email, password);
  await account.createEmailPasswordSession(email, password);
  state.user = await account.get();
  await loadMyBusinesses();
  if (state.business) await navigate('dashboard');
  else render();
}

async function registerAccount(name, email, password) {
  validateCredentials(email, password);
  if (!name || name.trim().length < 2) throw new Error('Enter your full name.');
  if (password.length < 8) throw new Error('Your password must contain at least 8 characters.');
  await account.create(ID.unique(), email, password, name.trim());
  await account.createEmailPasswordSession(email, password);
  state.user = await account.get();
  await loadMyBusinesses();
  render();
}

async function signOut() {
  try { await account.deleteSession('current'); } catch {}
  state.user = null; state.business = null; state.businesses = []; state.stats = null; state.records = [];
  state.active = 'dashboard'; state.register = false; state.search = ''; setNotice(); render();
}

async function createBusiness(form) {
  const data = Object.fromEntries(new FormData(form).entries());
  showBusy('Creating your business workspace…');
  setNotice();
  try {
    const response = await onboardingRequest('/businesses', 'POST', data);
    await loadMyBusinesses();
    const created = response.business;
    state.business = state.businesses.find(b => b.id === created?.id || b.teamId === created?.teamId) || state.businesses[0] || null;
    if (!state.business && created) {
      state.business = { id: created.id, teamId: created.teamId || created.id, name: created.name, industry: data.industry, currency: created.currency, timezone: created.timezone };
    }
    state.active = 'dashboard';
    setNotice('Your business workspace is ready.');
    if (state.business) await loadDashboard();
  } catch (error) {
    setNotice('', error.message);
  } finally {
    finishBusy(); render();
  }
}

function formDataObject(form) {
  const data = {};
  new FormData(form).forEach((value, key) => {
    if (value === '') return;
    if (key === 'track_stock') data[key] = value === 'true';
    else if (['cost_price','selling_price','stock_quantity','reorder_level','opening_balance','amount','discountAmount','taxAmount','amountPaid','quantity','unitPrice'].includes(key)) data[key] = Number(value);
    else data[key] = value;
  });
  return data;
}

async function submitRecord(form) {
  const tableId = form.dataset.table;
  const data = formDataObject(form);
  let reopenPos = false;
  if (tableId === 'expenses' && data.expense_date) data.expense_date = new Date(data.expense_date + 'T12:00:00').toISOString();
  if (tableId === 'bookings') {
    if (data.starts_at) data.starts_at = new Date(data.starts_at).toISOString();
    if (data.ends_at) data.ends_at = new Date(data.ends_at).toISOString();
  }
  if (tableId === 'products' && data.unit === 'service') data.track_stock = false;
  showBusy('Saving record…');
  try {
    await businessRequest('create_record', { tableId, data });
    document.querySelector('#modal-root').innerHTML = '';
    setNotice(tableId === 'products' ? 'Product saved. It is now available in Sales & POS.' : 'Record saved successfully.');
    await loadRecords(tableId);
    if (tableId === 'products' && state.returnToSaleAfterProduct) {
      reopenPos = true;
      state.returnToSaleAfterProduct = false;
    }
  } catch (error) { setNotice('', error.message); }
  finally {
    finishBusy();
    render();
    if (reopenPos) {
      try { await openSaleWithProducts(); }
      catch (error) { setNotice('', error.message); render(); }
    }
  }
}

async function submitSale(form) {
  if (!state.saleCart.length) throw new Error('Add at least one product to the sale.');
  const totals = saleTotals();
  if (totals.discount > totals.subtotal) throw new Error('Discount cannot exceed the subtotal.');
  const received = state.saleAmountPaid === '' ? totals.total : Number(state.saleAmountPaid);
  if (!Number.isFinite(received) || received < 0) throw new Error('Enter a valid amount received.');
  if (state.salePaymentMethod !== 'cash' && received > totals.total) throw new Error('The amount received cannot exceed the total for this payment method.');
  const body = {
    items: state.saleCart.map(item => ({ productId: item.product.$id, quantity: item.quantity })),
    discountAmount: totals.discount,
    taxAmount: totals.tax,
    amountPaid: Math.min(received, totals.total),
    paymentMethod: state.salePaymentMethod || 'cash'
  };
  const customerId = document.querySelector('#pos-customer')?.value || '';
  if (customerId) body.customerId = customerId;
  showBusy('Recording sale…');
  try {
    const result = await businessRequest('create_sale', body);
    document.querySelector('#modal-root').innerHTML = '';
    state.saleCart = [];
    state.active = 'sales';
    setNotice('Sale ' + (result.sale?.sale_number || '') + ' recorded successfully. Stock levels have been updated.');
    await loadRecords('sales');
    await loadDashboard();
  } catch (error) { setNotice('', error.message); }
  finally { finishBusy(); render(); }
}

async function submitInvoice(form) {
  const fd = new FormData(form);
  const body = {
    customerId: fd.get('customerId'),
    issueDate: fd.get('issueDate') ? new Date(`${fd.get('issueDate')}T12:00:00`).toISOString() : new Date().toISOString(),
    dueDate: fd.get('dueDate') ? new Date(`${fd.get('dueDate')}T12:00:00`).toISOString() : null,
    discountAmount: Number(fd.get('discountAmount') || 0), taxAmount: Number(fd.get('taxAmount') || 0),
    notes: fd.get('notes') || '',
    items: [{ description: fd.get('description'), quantity: Number(fd.get('quantity') || 1), unitPrice: Number(fd.get('unitPrice') || 0) }]
  };
  showBusy('Creating invoice…');
  try {
    await businessRequest('create_invoice', body);
    document.querySelector('#modal-root').innerHTML = '';
    state.active = 'invoices'; setNotice('Invoice created successfully.');
    await loadRecords('invoices'); await loadDashboard();
  } catch (error) { setNotice('', error.message); }
  finally { finishBusy(); render(); }
}

async function adjustStock(id, name) {
  modalMarkup('Adjust stock', `Update the available quantity for ${name}.`, `<form id="stock-form" class="modal-form" data-id="${esc(id)}"><div class="form-grid"><label>Adjustment<select name="direction"><option value="add">Add stock</option><option value="remove">Remove stock</option></select></label><label>Quantity<input name="quantity" type="number" min="0.01" step="0.01" required /></label><label class="wide">Reason<input name="notes" placeholder="e.g. New delivery or damaged item" /></label></div><div class="modal-actions"><button type="button" class="button secondary" data-action="close-modal">Cancel</button><button class="button primary" type="submit">Save adjustment</button></div></form>`);
}

async function recordInvoicePayment(id, total, paid) {
  const outstanding = Math.max(0, Number(total) - Number(paid));
  modalMarkup('Record invoice payment', `Outstanding balance: ${money(outstanding)}.`, `<form id="payment-form" class="modal-form" data-id="${esc(id)}"><div class="form-grid"><label>Payment amount<input name="amount" type="number" min="0.01" max="${outstanding}" step="0.01" required /></label><label>Payment method<select name="paymentMethod"><option value="cash">Cash</option><option value="bank transfer">Bank transfer</option><option value="POS">POS</option><option value="card">Card</option><option value="other">Other</option></select></label><label class="wide">Reference<input name="reference" placeholder="Transfer reference (optional)" /></label></div><div class="modal-actions"><button type="button" class="button secondary" data-action="close-modal">Cancel</button><button class="button primary" type="submit">Record payment</button></div></form>`);
}

async function deleteRecord(tableId, rowId) {
  if (!confirm('Delete this record? This action cannot be undone.')) return;
  showBusy('Deleting record…');
  try {
    await businessRequest('delete_record', { tableId, rowId });
    await loadRecords(tableId); setNotice('Record deleted.');
  } catch (error) { setNotice('', error.message); }
  finally { finishBusy(); render(); }
}

async function submitStock(form) {
  const fd = new FormData(form);
  showBusy('Updating stock…');
  try {
    await businessRequest('adjust_stock', { productId: form.dataset.id, direction: fd.get('direction'), quantity: Number(fd.get('quantity')), notes: fd.get('notes') || '' });
    document.querySelector('#modal-root').innerHTML = '';
    await loadRecords('products'); await loadDashboard(); setNotice('Stock adjustment saved.');
  } catch (error) { setNotice('', error.message); }
  finally { finishBusy(); render(); }
}

async function submitPayment(form) {
  const fd = new FormData(form);
  showBusy('Recording payment…');
  try {
    await businessRequest('record_invoice_payment', { invoiceId: form.dataset.id, amount: Number(fd.get('amount')), paymentMethod: fd.get('paymentMethod'), reference: fd.get('reference') || '' });
    document.querySelector('#modal-root').innerHTML = '';
    await loadRecords('invoices'); await loadDashboard(); setNotice('Invoice payment recorded.');
  } catch (error) { setNotice('', error.message); }
  finally { finishBusy(); render(); }
}

root.addEventListener('submit', async event => {
  event.preventDefault();
  const form = event.target;
  if (form.id === 'auth-form') {
    // Read directly from the live controls before any render can replace them.
    const emailControl = form.querySelector('input[name="email"]');
    const passwordControl = form.querySelector('input[name="password"]');
    const nameControl = form.querySelector('input[name="name"]');
    const registerControl = form.querySelector('#register-toggle');
    const email = String(emailControl?.value || '').trim().toLowerCase();
    const password = String(passwordControl?.value || '');
    const name = String(nameControl?.value || '').trim();
    const register = Boolean(registerControl?.checked);
    state.register = register;
    state.authEmail = email;
    state.authName = name;
    setNotice();
    try {
      validateCredentials(email, password);
      if (register) {
        if (name.length < 2) throw new Error('Enter your full name.');
        showBusy('Creating your account…');
        await registerAccount(name, email, password);
      } else {
        showBusy('Signing in…');
        await signIn(email, password);
      }
      state.authEmail = '';
      state.authName = '';
      setNotice();
    } catch (error) {
      setNotice('', error?.message || 'Unable to complete authentication. Please check your details and try again.');
    } finally {
      finishBusy();
      render();
    }
  } else if (form.id === 'business-form') await createBusiness(form);
  else if (form.id === 'record-form') await submitRecord(form);
  else if (form.id === 'sale-form') await submitSale(form);
  else if (form.id === 'invoice-form') await submitInvoice(form);
  else if (form.id === 'stock-form') await submitStock(form);
  else if (form.id === 'payment-form') await submitPayment(form);
});

root.addEventListener('click', async event => {
  const target = event.target.closest('[data-action]');
  if (!target) return;
  const action = target.dataset.action;
  const value = target.dataset.value;
  try {
    if (action === 'navigate') await navigate(value);
    else if (action === 'logout') await signOut();
    else if (action === 'reload') await refreshCurrent();
    else if (action === 'clear-notice') { setNotice(); render(); }
    else if (action === 'new-record') openRecordModal(value);
    else if (action === 'new-sale') await openSaleWithProducts();
    else if (action === 'pos-add-product') addProductToSale(target.dataset.id);
    else if (action === 'pos-category') { state.saleCategory = value; renderSaleCatalog(); }
    else if (action === 'pos-qty-up') changeSaleQuantity(target.dataset.id, 1);
    else if (action === 'pos-qty-down') changeSaleQuantity(target.dataset.id, -1);
    else if (action === 'pos-remove-item') { state.saleCart = state.saleCart.filter(item => item.product.$id !== target.dataset.id); renderSaleCatalog(); renderSaleCart(); }
    else if (action === 'pos-clear-cart') { state.saleCart = []; renderSaleCatalog(); renderSaleCart(); }
    else if (action === 'add-first-pos-product') { state.returnToSaleAfterProduct = true; await navigate('products'); openRecordModal('products'); }
    else if (action === 'new-invoice') await openInvoiceModal();
    else if (action === 'close-modal') { if (target.classList.contains('modal-backdrop') || target.classList.contains('modal-close') || target.closest('.modal-actions')) { document.querySelector('#modal-root').innerHTML = ''; state.returnToSaleAfterProduct = false; } }
    else if (action === 'adjust-stock') adjustStock(target.dataset.id, target.dataset.name);
    else if (action === 'invoice-payment') recordInvoicePayment(target.dataset.id, target.dataset.total, target.dataset.paid);
    else if (action === 'delete-record') await deleteRecord(target.dataset.table, target.dataset.id);
    else if (action === 'toggle-password') { const input = document.querySelector('#auth-password'); if (input) { input.type = input.type === 'password' ? 'text' : 'password'; target.textContent = input.type === 'password' ? 'Show' : 'Hide'; } }
    else if (action === 'forgot-password') {
      event.preventDefault();
      const email = document.querySelector('#auth-form [name="email"]')?.value?.trim();
      if (!email) throw new Error('Enter your email address first.');
      await account.createRecovery(email, `${location.origin}/`);
      alert('Password reset instructions have been sent, if the email address is registered.');
    }
    else if (action === 'add-sale-line') {
      const first = document.querySelector('.sale-line');
      if (first) document.querySelector('#sale-lines').insertAdjacentHTML('beforeend', first.outerHTML);
    }
    else if (action === 'goto-products') { document.querySelector('#modal-root').innerHTML = ''; await navigate('products'); }
    else if (action === 'menu') document.querySelector('#sidebar')?.classList.toggle('open');
    else if (action === 'install' && state.installPrompt) { state.installPrompt.prompt(); state.installPrompt = null; render(); }
  } catch (error) { setNotice('', error.message); render(); }
});

root.addEventListener('change', async event => {
  if (event.target.id === 'register-toggle') {
    // Do not re-render authMarkup here: replacing the form destroys the email
    // and password values the user has already typed.
    state.register = event.target.checked;
    const nameField = document.querySelector('#name-field');
    const nameInput = document.querySelector('#name-field [name="name"]');
    const submitButton = document.querySelector('#auth-form button[type="submit"]');
    const passwordInput = document.querySelector('#auth-password');
    if (nameField) nameField.classList.toggle('hidden', !state.register);
    if (nameInput) nameInput.required = state.register;
    if (passwordInput) passwordInput.autocomplete = state.register ? 'new-password' : 'current-password';
    if (submitButton) submitButton.innerHTML = `${state.register ? 'Create account' : 'Sign in'} <span>→</span>`;
  }
  if (event.target.name === 'unit' && event.target.form?.dataset.table === 'products') {
    const stockToggle = event.target.form.querySelector('input[type="checkbox"][name="track_stock"]');
    if (stockToggle) { stockToggle.disabled = event.target.value === 'service'; if (event.target.value === 'service') stockToggle.checked = false; }
  }
  if (event.target.id === 'pos-payment-method') { state.salePaymentMethod = event.target.value; renderSaleTotals(); }
  if (event.target.id === 'pos-customer') state.saleCustomerId = event.target.value;
  if (event.target.id === 'business-switch') await switchBusiness(event.target.value);
});

root.addEventListener('input', event => {
  if (event.target.name === 'email' && event.target.form?.id === 'auth-form') state.authEmail = event.target.value;
  if (event.target.name === 'name' && event.target.form?.id === 'auth-form') state.authName = event.target.value;
  if (event.target.id === 'pos-search') { state.saleSearch = event.target.value; renderSaleCatalog(); }
  if (event.target.id === 'pos-discount') { state.saleDiscount = event.target.value; renderSaleTotals(); }
  if (event.target.id === 'pos-tax') { state.saleTax = event.target.value; renderSaleTotals(); }
  if (event.target.id === 'pos-amount-paid') { state.saleAmountPaid = event.target.value; renderSaleTotals(); }
  if (event.target.id === 'record-search') {
    state.search = event.target.value;
    const selection = event.target.selectionStart;
    const activeModule = state.active;
    render();
    const input = document.querySelector('#record-search');
    if (input) { input.focus(); input.setSelectionRange(selection, selection); }
  }
});

root.addEventListener('keydown', event => {
  if (event.target.id === 'pos-barcode' && event.key === 'Enter') {
    event.preventDefault();
    addSaleProductByCode(event.target.value);
    event.target.value = '';
  }
});

window.addEventListener('beforeinstallprompt', event => {
  event.preventDefault(); state.installPrompt = event; render();
});
window.addEventListener('appinstalled', () => { state.installPrompt = null; setNotice('ETHAN BUSINESS has been installed on this device.'); render(); });

async function start() {
  render();
  if ('serviceWorker' in navigator) navigator.serviceWorker.register('/sw.js').catch(() => {});
  try {
    state.user = await account.get();
    await loadMyBusinesses();
    if (state.business) await navigate('dashboard');
    else render();
  } catch {
    state.user = null; render();
  }
}

start();
