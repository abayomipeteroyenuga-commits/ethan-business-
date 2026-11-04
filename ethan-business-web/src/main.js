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
  businesses: [],
  business: null,
  active: 'dashboard',
  records: [],
  saleProducts: [],
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
    ['description', 'Description', 'textarea']
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
  const execution = await functions.createExecution({
    functionId,
    path,
    method,
    body: body ? JSON.stringify(body) : '',
    async: false,
    headers: body ? { 'content-type': 'application/json' } : {}
  });
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
          <label>Email address<input type="email" name="email" placeholder="you@example.com" autocomplete="email" required /></label>
          <label>Password<div class="password-wrap"><input id="auth-password" type="password" name="password" placeholder="Enter your password" autocomplete="current-password" required minlength="8"/><button type="button" data-action="toggle-password">Show</button></div></label>
          <div class="auth-options"><label class="check-label"><input type="checkbox" name="register" id="register-toggle"/> Create a new account</label><a href="#" data-action="forgot-password">Forgot password?</a></div>
          <label id="name-field" class="${state.register ? '' : 'hidden'}">Your full name<input type="text" name="name" placeholder="Full name" autocomplete="name" /></label>
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
    ${rows.length ? `<div class="table-wrap"><table><thead><tr>${headers.map(h => `<th>${h[1].toUpperCase()}</th>`).join('')}<th class="actions-col">ACTIONS</th></tr></thead><tbody>${rows.map(row => `<tr>${headers.map(([key]) => `<td>${displayCell(key, row[key])}</td>`).join('')}<td class="row-actions">${tableId === 'products' ? `<button class="table-action" data-action="adjust-stock" data-id="${esc(row.$id)}" data-name="${esc(row.name)}">Adjust stock</button>` : ''}${tableId === 'invoices' && !['paid','cancelled'].includes(row.status) ? `<button class="table-action" data-action="invoice-payment" data-id="${esc(row.$id)}" data-total="${esc(row.total_amount)}" data-paid="${esc(row.amount_paid)}">Add payment</button>` : ''}${['categories','customers','suppliers','bookings'].includes(tableId) ? `<button class="table-action danger-text" data-action="delete-record" data-id="${esc(row.$id)}" data-table="${tableId}">Delete</button>` : '<span class="muted-dash">—</span>'}</td></tr>`).join('')}</tbody></table></div>` : emptyState('⌕', 'Nothing here yet', `New ${esc(title.toLowerCase())} will appear in this list.`, canCreate ? `<button class="button primary small" data-action="${tableId === 'sales' ? 'new-sale' : tableId === 'invoices' ? 'new-invoice' : 'new-record'}" data-value="${tableId}">＋ Add your first ${singular(title)}</button>` : '')}
    </div>`;
}

function singular(value) {
  return ({ Products: 'product', 'Products & Stock': 'product', Categories: 'category', Customers: 'customer', Suppliers: 'supplier', Expenses: 'expense', Bookings: 'booking', Branches: 'branch', Invoices: 'invoice' })[value] || value.toLowerCase().replace(/s$/, '');
}

function fieldMarkup(field) {
  const [key, label, type, required = false, options = []] = field;
  const value = type === 'date' && key === 'expense_date' ? new Date().toISOString().slice(0, 10) : '';
  if (type === 'textarea') return `<label class="${type === 'textarea' ? 'wide' : ''}">${label}<textarea name="${key}" rows="2" placeholder="${label}" ${required ? 'required' : ''}></textarea></label>`;
  if (type === 'select') return `<label>${label}<select name="${key}">${options.map(o => `<option value="${esc(o)}">${esc(o[0].toUpperCase() + o.slice(1))}</option>`).join('')}</select></label>`;
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

function openSaleModal() {
  const products = state.saleProducts || [];
  modalMarkup('Record a sale', 'Select products and record the amount received.', `<form id="sale-form" class="modal-form"><div id="sale-lines"><div class="sale-line"><label class="wide">Product<select name="productId" required>${products.map(p => `<option value="${esc(p.$id)}">${esc(p.name)} · ${money(p.selling_price)} (${Number(p.stock_quantity || 0)} in stock)</option>`).join('')}</select></label><label>Quantity<input name="quantity" type="number" min="0.01" step="0.01" value="1" required /></label></div></div><button type="button" class="text-button add-line" data-action="add-sale-line">＋ Add another product</button><div class="form-grid compact-grid"><label>Discount<input name="discountAmount" type="number" min="0" step="0.01" value="0" /></label><label>Tax<input name="taxAmount" type="number" min="0" step="0.01" value="0" /></label><label>Amount received<input name="amountPaid" type="number" min="0" step="0.01" placeholder="Leave blank for full payment" /></label><label>Payment method<select name="paymentMethod"><option value="cash">Cash</option><option value="bank transfer">Bank transfer</option><option value="POS">POS</option><option value="card">Card</option><option value="other">Other</option></select></label></div><div class="modal-actions"><button type="button" class="button secondary" data-action="close-modal">Cancel</button><button class="button primary" type="submit">Save sale <span>→</span></button></div></form>`);
  if (!products.length) {
    document.querySelector('#sale-lines').innerHTML = emptyState('▤', 'No products available', 'Add at least one product before recording a sale.', '<button type="button" class="button secondary small" data-action="goto-products">Go to products</button>');
    document.querySelector('#sale-form button[type="submit"]').disabled = true;
  }
}

async function openSaleWithProducts() {
  state.saleProducts = (await businessRequest('list_records', { tableId: 'products', limit: 100 })).records || [];
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

async function signIn(email, password) {
  await account.createEmailPasswordSession({ email, password });
  state.user = await account.get();
  await loadMyBusinesses();
  if (state.business) await navigate('dashboard');
  else render();
}

async function registerAccount(name, email, password) {
  await account.create({ userId: ID.unique(), email, password, name });
  await account.createEmailPasswordSession({ email, password });
  state.user = await account.get();
  await loadMyBusinesses();
  render();
}

async function signOut() {
  try { await account.deleteSession({ sessionId: 'current' }); } catch {}
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
    if (['cost_price','selling_price','stock_quantity','reorder_level','opening_balance','amount','discountAmount','taxAmount','amountPaid','quantity','unitPrice'].includes(key)) data[key] = Number(value);
    else data[key] = value;
  });
  return data;
}

async function submitRecord(form) {
  const tableId = form.dataset.table;
  const data = formDataObject(form);
  if (tableId === 'expenses' && data.expense_date) data.expense_date = new Date(`${data.expense_date}T12:00:00`).toISOString();
  if (tableId === 'bookings') {
    if (data.starts_at) data.starts_at = new Date(data.starts_at).toISOString();
    if (data.ends_at) data.ends_at = new Date(data.ends_at).toISOString();
  }
  showBusy('Saving record…');
  try {
    await businessRequest('create_record', { tableId, data });
    document.querySelector('#modal-root').innerHTML = '';
    setNotice('Record saved successfully.');
    await loadRecords(tableId);
  } catch (error) { setNotice('', error.message); }
  finally { finishBusy(); render(); }
}

async function submitSale(form) {
  const lineNodes = [...form.querySelectorAll('.sale-line')];
  const items = lineNodes.map(line => ({ productId: line.querySelector('[name="productId"]')?.value, quantity: Number(line.querySelector('[name="quantity"]')?.value || 0) })).filter(item => item.productId && item.quantity > 0);
  const fd = new FormData(form);
  const amountPaidValue = fd.get('amountPaid');
  const body = {
    items,
    discountAmount: Number(fd.get('discountAmount') || 0),
    taxAmount: Number(fd.get('taxAmount') || 0),
    paymentMethod: fd.get('paymentMethod') || 'cash'
  };
  if (amountPaidValue !== '') body.amountPaid = Number(amountPaidValue);
  showBusy('Recording sale…');
  try {
    await businessRequest('create_sale', body);
    document.querySelector('#modal-root').innerHTML = '';
    state.active = 'sales';
    setNotice('Sale recorded successfully. Stock levels have been updated.');
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
    const fd = new FormData(form);
    const email = String(fd.get('email') || '').trim();
    const password = String(fd.get('password') || '');
    const register = Boolean(state.register);
    showBusy(register ? 'Creating your account…' : 'Signing in…'); setNotice();
    try {
      if (register) {
        const name = String(fd.get('name') || '').trim();
        if (name.length < 2) throw new Error('Enter your full name.');
        await registerAccount(name, email, password);
      } else await signIn(email, password);
      setNotice();
    } catch (error) { setNotice('', error.message); }
    finally { finishBusy(); render(); }
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
    else if (action === 'new-invoice') await openInvoiceModal();
    else if (action === 'close-modal') { if (target.classList.contains('modal-backdrop') || target.classList.contains('modal-close') || target.closest('.modal-actions')) document.querySelector('#modal-root').innerHTML = ''; }
    else if (action === 'adjust-stock') adjustStock(target.dataset.id, target.dataset.name);
    else if (action === 'invoice-payment') recordInvoicePayment(target.dataset.id, target.dataset.total, target.dataset.paid);
    else if (action === 'delete-record') await deleteRecord(target.dataset.table, target.dataset.id);
    else if (action === 'toggle-password') { const input = document.querySelector('#auth-password'); if (input) { input.type = input.type === 'password' ? 'text' : 'password'; target.textContent = input.type === 'password' ? 'Show' : 'Hide'; } }
    else if (action === 'forgot-password') {
      event.preventDefault();
      const email = document.querySelector('#auth-form [name="email"]')?.value?.trim();
      if (!email) throw new Error('Enter your email address first.');
      await account.createRecovery({ email, url: `${location.origin}/` });
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
    state.register = event.target.checked;
    render();
  }
  if (event.target.id === 'business-switch') await switchBusiness(event.target.value);
});

root.addEventListener('input', event => {
  if (event.target.id === 'record-search') {
    state.search = event.target.value;
    const selection = event.target.selectionStart;
    const activeModule = state.active;
    render();
    const input = document.querySelector('#record-search');
    if (input) { input.focus(); input.setSelectionRange(selection, selection); }
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
