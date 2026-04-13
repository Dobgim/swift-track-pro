// ============================================================
// SwiftTrack Pro — Admin Dashboard JavaScript
// ============================================================

const SUPABASE_URL = 'https://blitracqgaggxuypqbpo.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJsaXRyYWNxZ2FnZ3h1eXBxYnBvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM5ODU1MjgsImV4cCI6MjA4OTU2MTUyOH0.vAwSRoqGk-nL0BfnXL6-rSSM6MQS6dWcoghLimdVIVs';

const sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// ── State ────────────────────────────────────────────────────
let currentUser   = null;
let allShipments  = [];
let editingId     = null;

// ── Auth Guard ───────────────────────────────────────────────
async function checkAuth() {
  const { data: { session } } = await sb.auth.getSession();
  if (!session) {
    window.location.href = 'admin-login.html';
    return null;
  }
  currentUser = session.user;
  document.getElementById('admin-email').textContent      = currentUser.email;
  document.getElementById('admin-initials').textContent   = currentUser.email.charAt(0).toUpperCase();
  return currentUser;
}

// ── Navigation ───────────────────────────────────────────────
function initNavigation() {
  const navItems = document.querySelectorAll('.nav-item[data-panel]');
  const panels   = document.querySelectorAll('.panel');

  function showPanel(panelId) {
    panels.forEach(p => p.classList.remove('active'));
    navItems.forEach(n => n.classList.remove('active'));
    const targetPanel = document.getElementById(panelId);
    const targetNav   = document.querySelector(`[data-panel="${panelId}"]`);
    if (targetPanel) targetPanel.classList.add('active');
    if (targetNav)   targetNav.classList.add('active');

    // Update header title
    const titles = {
      'panel-overview':     { h: 'Dashboard Overview',    p: 'Welcome back, Admin' },
      'panel-shipments':    { h: 'All Shipments',         p: 'Manage and track all packages' },
      'panel-create':       { h: 'Create Shipment',       p: 'Add a new package to the system' },
      'panel-update':       { h: 'Update Status',         p: 'Update shipment status and add history' },
      'panel-messages':     { h: 'Contact Messages',      p: 'Customer inquiries and messages' },
    };
    const t = titles[panelId];
    if (t) {
      document.querySelector('.header-title h2').textContent = t.h;
      document.querySelector('.header-title p').textContent  = t.p;
    }

    // Load panel data
    if (panelId === 'panel-overview')  loadOverview();
    if (panelId === 'panel-shipments') loadShipments();
    if (panelId === 'panel-update')    loadShipmentSelectForUpdate();
    if (panelId === 'panel-messages')  loadMessages();
  }

  navItems.forEach(item => {
    item.addEventListener('click', () => {
      showPanel(item.dataset.panel);
      // Close mobile sidebar
      document.querySelector('.sidebar')?.classList.remove('mobile-open');
      document.getElementById('sidebar-overlay')?.remove();
    });
  });

  // Mobile sidebar toggle
  const menuToggle = document.getElementById('menu-toggle');
  if (menuToggle) {
    menuToggle.addEventListener('click', () => {
      const sidebar = document.querySelector('.sidebar');
      sidebar.classList.toggle('mobile-open');
      if (sidebar.classList.contains('mobile-open')) {
        const overlay = document.createElement('div');
        overlay.id = 'sidebar-overlay';
        overlay.className = 'sidebar-overlay';
        overlay.addEventListener('click', () => {
          sidebar.classList.remove('mobile-open');
          overlay.remove();
        });
        document.body.appendChild(overlay);
      } else {
        document.getElementById('sidebar-overlay')?.remove();
      }
    });
  }

  // Start on overview
  showPanel('panel-overview');
}

// ── API helpers ──────────────────────────────────────────────
async function apiGet(table, params = '') {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}${params}`, {
    headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${(await sb.auth.getSession()).data.session.access_token}` }
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

async function apiPost(table, body) {
  const session = (await sb.auth.getSession()).data.session;
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}`, {
    method: 'POST',
    headers: {
      'apikey': SUPABASE_KEY,
      'Authorization': `Bearer ${session.access_token}`,
      'Content-Type': 'application/json',
      'Prefer': 'return=representation'
    },
    body: JSON.stringify(body)
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

async function apiPatch(table, id, body) {
  const session = (await sb.auth.getSession()).data.session;
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}?id=eq.${id}`, {
    method: 'PATCH',
    headers: {
      'apikey': SUPABASE_KEY,
      'Authorization': `Bearer ${session.access_token}`,
      'Content-Type': 'application/json',
      'Prefer': 'return=representation'
    },
    body: JSON.stringify(body)
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

async function apiDelete(table, id) {
  const session = (await sb.auth.getSession()).data.session;
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}?id=eq.${id}`, {
    method: 'DELETE',
    headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${session.access_token}` }
  });
  if (!res.ok) throw new Error(await res.text());
  return true;
}

// ── Generate Tracking Code ───────────────────────────────────
function generateTrackingCode() {
  const prefix = 'SWT';
  const year   = new Date().getFullYear().toString().slice(-2);
  const rand   = Math.random().toString(36).toUpperCase().slice(2, 8);
  return `${prefix}${year}${rand}`;
}

// ── Status badge HTML ────────────────────────────────────────
function statusBadge(status) {
  const labels = {
    pending: 'Pending', in_transit: 'In Transit', arrived: 'Arrived at Hub',
    out_for_delivery: 'Out for Delivery', delivered: 'Delivered',
    on_hold: 'On Hold', exception: 'Exception'
  };
  return `<span class="status-badge badge-${status}">${labels[status] || status}</span>`;
}

// ── Overview Panel ───────────────────────────────────────────
async function loadOverview() {
  try {
    const shipments = await apiGet('tracking_records', '?select=current_status,created_at&order=created_at.desc');
    const messages  = await apiGet('contact_messages', '?select=id,is_read&limit=100');

    const total     = shipments.length;
    const delivered = shipments.filter(s => s.current_status === 'delivered').length;
    const transit   = shipments.filter(s => s.current_status === 'in_transit').length;
    const pending   = shipments.filter(s => s.current_status === 'pending').length;
    const unread    = messages.filter(m => !m.is_read).length;

    document.getElementById('ov-total').textContent     = total;
    document.getElementById('ov-delivered').textContent = delivered;
    document.getElementById('ov-transit').textContent   = transit;
    document.getElementById('ov-pending').textContent   = pending;

    // Update nav badge for messages
    const msgBadge = document.getElementById('messages-badge');
    if (msgBadge && unread > 0) { msgBadge.textContent = unread; msgBadge.style.display = 'inline'; }

    // Status bars
    const statusCounts = {};
    shipments.forEach(s => { statusCounts[s.current_status] = (statusCounts[s.current_status] || 0) + 1; });
    const bars = document.querySelectorAll('.status-bar-item');
    bars.forEach(bar => {
      const status = bar.dataset.status;
      const count  = statusCounts[status] || 0;
      const pct    = total ? (count / total * 100) : 0;
      bar.querySelector('.status-bar-count').textContent = count;
      setTimeout(() => { bar.querySelector('.status-bar-fill').style.width = pct + '%'; }, 300);
    });

    // Recent activity
    const recentShipments = shipments.slice(0, 5);
    const actList = document.getElementById('activity-list');
    if (actList) {
      actList.innerHTML = recentShipments.map(s => `
        <div class="activity-item">
          <div class="activity-dot" style="background:${getStatusColor(s.current_status)}"></div>
          <div>
            <div class="activity-text">Shipment <strong>${s.tracking_code || ''}</strong> — ${statusBadge(s.current_status).replace(/<[^>]+>/g,'')}</div>
            <div class="activity-time">${new Date(s.created_at).toLocaleString('en-US',{month:'short',day:'numeric',hour:'2-digit',minute:'2-digit'})}</div>
          </div>
        </div>`).join('');
    }

    // Load recent shipments for overview table
    const recentFull = await apiGet('tracking_records', '?select=*&order=created_at.desc&limit=8');
    renderRecentTable(recentFull);

  } catch (err) {
    console.error('Overview error:', err);
  }
}

function getStatusColor(s) {
  const map = { pending:'#d97706', in_transit:'#2563eb', arrived:'#7c3aed', out_for_delivery:'#f97316', delivered:'#059669', on_hold:'#92400e', exception:'#dc2626' };
  return map[s] || '#64748b';
}

function renderRecentTable(shipments) {
  const tbody = document.getElementById('recent-shipments-body');
  if (!tbody) return;
  if (!shipments.length) { tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;padding:2rem;color:var(--gray-400)">No shipments yet.</td></tr>`; return; }
  tbody.innerHTML = shipments.map(s => `
    <tr>
      <td><span class="mono">${s.tracking_code}</span></td>
      <td>${s.sender_name}</td>
      <td>${s.receiver_name}</td>
      <td>${s.destination}</td>
      <td>${statusBadge(s.current_status)}</td>
      <td>${new Date(s.created_at).toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'})}</td>
    </tr>`).join('');
}

// ── Shipments Panel ──────────────────────────────────────────
async function loadShipments() {
  const tbody    = document.getElementById('shipments-tbody');
  const countEl  = document.getElementById('shipments-count');
  tbody.innerHTML = `<tr><td colspan="8" style="text-align:center;padding:2rem"><span class="spinner spinner-dark"></span> Loading…</td></tr>`;

  try {
    allShipments = await apiGet('tracking_records', '?select=*&order=created_at.desc');
    countEl.textContent = allShipments.length + ' shipments';
    renderShipmentsTable(allShipments);
  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="8" style="text-align:center;color:var(--red);padding:2rem">Failed to load shipments.</td></tr>`;
  }
}

function renderShipmentsTable(data) {
  const tbody = document.getElementById('shipments-tbody');
  if (!data.length) {
    tbody.innerHTML = `<tr><td colspan="8" style="text-align:center;padding:3rem;color:var(--gray-400)">No shipments found.</td></tr>`;
    return;
  }
  tbody.innerHTML = data.map(s => `
    <tr>
      <td><span class="mono">${s.tracking_code}</span></td>
      <td>${s.sender_name}</td>
      <td>${s.receiver_name}</td>
      <td>${s.origin}</td>
      <td>${s.destination}</td>
      <td>${statusBadge(s.current_status)}</td>
      <td>${s.weight ? s.weight + ' kg' : '—'}</td>
      <td>
        <div class="action-btns">
          <button class="action-btn" title="View details" onclick="openViewModal('${s.id}')">👁</button>
          <button class="action-btn" title="Edit shipment" onclick="openEditModal('${s.id}')">✏️</button>
          <button class="action-btn danger" title="Delete" onclick="deleteShipment('${s.id}','${s.tracking_code}')">🗑</button>
        </div>
      </td>
    </tr>`).join('');
}

// ── Filter & Search ──────────────────────────────────────────
function initShipmentFilters() {
  const searchInput  = document.getElementById('shipment-search');
  const statusFilter = document.getElementById('status-filter');

  function applyFilters() {
    const q      = searchInput?.value.toLowerCase() || '';
    const status = statusFilter?.value || '';
    const filtered = allShipments.filter(s => {
      const matchQ = !q || [s.tracking_code, s.sender_name, s.receiver_name, s.origin, s.destination].join(' ').toLowerCase().includes(q);
      const matchS = !status || s.current_status === status;
      return matchQ && matchS;
    });
    renderShipmentsTable(filtered);
    document.getElementById('shipments-count').textContent = filtered.length + ' shipments';
  }

  searchInput?.addEventListener('input', applyFilters);
  statusFilter?.addEventListener('change', applyFilters);
}

// ── Create Shipment ──────────────────────────────────────────
function initCreateForm() {
  const form    = document.getElementById('create-shipment-form');
  const codeEl  = document.getElementById('generated-code');
  const genBtn  = document.getElementById('regenerate-code');

  // Generate initial code
  let currentCode = generateTrackingCode();
  if (codeEl) codeEl.textContent = currentCode;

  genBtn?.addEventListener('click', () => {
    currentCode = generateTrackingCode();
    codeEl.textContent = currentCode;
  });

  document.getElementById('copy-gen-code')?.addEventListener('click', () => {
    navigator.clipboard.writeText(currentCode).then(() => {
      const btn = document.getElementById('copy-gen-code');
      btn.textContent = 'Copied!';
      setTimeout(() => { btn.textContent = 'Copy'; }, 2000);
    });
  });

  form?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const submitBtn = form.querySelector('[type=submit]');
    const msgDiv    = document.getElementById('create-msg');
    const origHtml  = submitBtn.innerHTML;
    submitBtn.innerHTML = '<span class="spinner"></span> Creating…';
    submitBtn.disabled  = true;
    msgDiv.innerHTML    = '';

    const body = {
      tracking_code:     currentCode,
      sender_name:       form.querySelector('[name=sender_name]').value.trim(),
      receiver_name:     form.querySelector('[name=receiver_name]').value.trim(),
      origin:            form.querySelector('[name=origin]').value.trim(),
      destination:       form.querySelector('[name=destination]').value.trim(),
      description:       form.querySelector('[name=description]').value.trim() || null,
      weight:            form.querySelector('[name=weight]').value.trim() || null,
      current_status:    form.querySelector('[name=current_status]').value,
      estimated_delivery:form.querySelector('[name=estimated_delivery]').value || null,
      special_notes:     form.querySelector('[name=special_notes]').value.trim() || null,
    };

    try {
      const created = await apiPost('tracking_records', body);
      // Add initial status history
      await apiPost('tracking_status_updates', {
        tracking_id: created[0].id,
        status:      body.current_status,
        location:    body.origin,
        description: 'Shipment created and registered in system.',
        timestamp:   new Date().toISOString(),
      });

      msgDiv.innerHTML = `<div class="alert alert-success">✓ Shipment created! Tracking code: <strong>${currentCode}</strong></div>`;
      form.reset();
      currentCode = generateTrackingCode();
      if (codeEl) codeEl.textContent = currentCode;
    } catch (err) {
      msgDiv.innerHTML = `<div class="alert alert-error">✗ Failed to create shipment. ${err.message}</div>`;
    } finally {
      submitBtn.innerHTML = origHtml;
      submitBtn.disabled  = false;
    }
  });
}

// ── View Modal ───────────────────────────────────────────────
async function openViewModal(id) {
  const shipment = allShipments.find(s => s.id === id);
  if (!shipment) return;

  document.getElementById('view-modal-code').textContent        = shipment.tracking_code;
  document.getElementById('view-modal-status').innerHTML        = statusBadge(shipment.current_status);
  document.getElementById('view-modal-sender').textContent      = shipment.sender_name;
  document.getElementById('view-modal-receiver').textContent    = shipment.receiver_name;
  document.getElementById('view-modal-origin').textContent      = shipment.origin;
  document.getElementById('view-modal-destination').textContent = shipment.destination;
  document.getElementById('view-modal-weight').textContent      = shipment.weight ? shipment.weight + ' kg' : '—';
  document.getElementById('view-modal-eta').textContent         = shipment.estimated_delivery
    ? new Date(shipment.estimated_delivery).toLocaleDateString('en-US', { month:'long', day:'numeric', year:'numeric' }) : '—';
  document.getElementById('view-modal-description').textContent = shipment.description || '—';
  document.getElementById('view-modal-notes').textContent       = shipment.special_notes || '—';
  document.getElementById('view-modal-created').textContent     = new Date(shipment.created_at).toLocaleString('en-US', { month:'short', day:'numeric', year:'numeric', hour:'2-digit', minute:'2-digit' });

  // Load history
  const historyDiv = document.getElementById('view-modal-history');
  historyDiv.innerHTML = '<div style="color:var(--gray-400);font-size:.875rem">Loading history…</div>';

  try {
    const history = await apiGet('tracking_status_updates', `?tracking_id=eq.${id}&order=timestamp.desc&select=*`);
    if (!history.length) {
      historyDiv.innerHTML = '<div style="color:var(--gray-400);font-size:.875rem">No history entries.</div>';
    } else {
      historyDiv.innerHTML = `<div class="status-history">${history.map((h,i) => `
        <div class="history-item ${i===0?'latest':''}">
          <div>
            <strong style="font-size:.85rem;color:var(--navy)">${h.status.replace(/_/g,' ').toUpperCase()}</strong>
            <div style="font-size:.8rem;color:var(--gray-500);margin:.2rem 0">${h.location || '—'}</div>
            ${h.description ? `<div style="font-size:.8rem;color:var(--gray-600)">${h.description}</div>` : ''}
            <div style="font-size:.75rem;color:var(--gray-400);margin-top:.3rem">${new Date(h.timestamp).toLocaleString('en-US',{month:'short',day:'numeric',year:'numeric',hour:'2-digit',minute:'2-digit'})}</div>
          </div>
        </div>`).join('')}</div>`;
    }
  } catch { historyDiv.innerHTML = '<div style="color:var(--red);font-size:.875rem">Failed to load history.</div>'; }

  document.getElementById('view-modal').classList.add('open');
}

// ── Edit Modal ───────────────────────────────────────────────
function openEditModal(id) {
  const shipment = allShipments.find(s => s.id === id);
  if (!shipment) return;
  editingId = id;

  const form = document.getElementById('edit-form');
  form.querySelector('[name=sender_name]').value      = shipment.sender_name || '';
  form.querySelector('[name=receiver_name]').value    = shipment.receiver_name || '';
  form.querySelector('[name=origin]').value           = shipment.origin || '';
  form.querySelector('[name=destination]').value      = shipment.destination || '';
  form.querySelector('[name=description]').value      = shipment.description || '';
  form.querySelector('[name=weight]').value           = shipment.weight || '';
  form.querySelector('[name=current_status]').value   = shipment.current_status || 'pending';
  form.querySelector('[name=estimated_delivery]').value = shipment.estimated_delivery || '';
  form.querySelector('[name=special_notes]').value    = shipment.special_notes || '';

  document.getElementById('edit-modal-title').textContent = `Edit: ${shipment.tracking_code}`;
  document.getElementById('edit-modal').classList.add('open');
}

function initEditModal() {
  const form   = document.getElementById('edit-form');
  const msgDiv = document.getElementById('edit-msg');

  form?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn     = form.querySelector('[type=submit]');
    const origHtml = btn.innerHTML;
    btn.innerHTML = '<span class="spinner"></span> Saving…';
    btn.disabled  = true;
    msgDiv.innerHTML = '';

    const body = {
      sender_name:       form.querySelector('[name=sender_name]').value.trim(),
      receiver_name:     form.querySelector('[name=receiver_name]').value.trim(),
      origin:            form.querySelector('[name=origin]').value.trim(),
      destination:       form.querySelector('[name=destination]').value.trim(),
      description:       form.querySelector('[name=description]').value.trim() || null,
      weight:            form.querySelector('[name=weight]').value.trim() || null,
      current_status:    form.querySelector('[name=current_status]').value,
      estimated_delivery:form.querySelector('[name=estimated_delivery]').value || null,
      special_notes:     form.querySelector('[name=special_notes]').value.trim() || null,
      updated_at:        new Date().toISOString(),
    };

    try {
      await apiPatch('tracking_records', editingId, body);
      msgDiv.innerHTML = `<div class="alert alert-success">✓ Shipment updated successfully.</div>`;
      loadShipments();
    } catch (err) {
      msgDiv.innerHTML = `<div class="alert alert-error">✗ Update failed: ${err.message}</div>`;
    } finally {
      btn.innerHTML = origHtml;
      btn.disabled  = false;
    }
  });
}

// ── Delete ───────────────────────────────────────────────────
async function deleteShipment(id, code) {
  if (!confirm(`Delete shipment ${code}? This cannot be undone.`)) return;
  try {
    await apiDelete('tracking_status_updates', `${id}&tracking_id=eq.${id}`);
  } catch {}
  try {
    await apiDelete('tracking_records', id);
    await loadShipments();
    showToast('Shipment deleted.', 'success');
  } catch (err) {
    showToast('Failed to delete shipment.', 'error');
  }
}

// ── Update Status Panel ──────────────────────────────────────
async function loadShipmentSelectForUpdate() {
  const sel = document.getElementById('update-shipment-select');
  sel.innerHTML = '<option value="">Loading shipments…</option>';
  try {
    const shipments = await apiGet('tracking_records', '?select=id,tracking_code,sender_name,receiver_name,current_status&order=created_at.desc');
    sel.innerHTML = '<option value="">— Select a shipment —</option>' +
      shipments.map(s => `<option value="${s.id}" data-code="${s.tracking_code}">${s.tracking_code} | ${s.sender_name} → ${s.receiver_name}</option>`).join('');
  } catch {
    sel.innerHTML = '<option value="">Failed to load</option>';
  }
}

function initUpdateForm() {
  const sel    = document.getElementById('update-shipment-select');
  const form   = document.getElementById('update-status-form');
  const msgDiv = document.getElementById('update-msg');
  const prevDiv= document.getElementById('current-status-preview');

  sel?.addEventListener('change', async () => {
    const id = sel.value;
    if (!id) { prevDiv.innerHTML = ''; return; }
    try {
      const [shipment] = await apiGet('tracking_records', `?id=eq.${id}&select=current_status,tracking_code`);
      prevDiv.innerHTML = `<div class="alert alert-info">Current status: ${statusBadge(shipment.current_status)}</div>`;
    } catch {}
  });

  form?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const id       = sel.value;
    if (!id) { msgDiv.innerHTML = `<div class="alert alert-error">Please select a shipment.</div>`; return; }

    const btn      = form.querySelector('[type=submit]');
    const origHtml = btn.innerHTML;
    btn.innerHTML  = '<span class="spinner"></span> Updating…';
    btn.disabled   = true;
    msgDiv.innerHTML = '';

    const newStatus  = form.querySelector('[name=new_status]').value;
    const location   = form.querySelector('[name=location]').value.trim();
    const description= form.querySelector('[name=update_description]').value.trim();
    const timestamp  = form.querySelector('[name=timestamp]').value || new Date().toISOString();

    try {
      // Update shipment record
      await apiPatch('tracking_records', id, { current_status: newStatus, updated_at: new Date().toISOString() });
      // Add history entry
      await apiPost('tracking_status_updates', {
        tracking_id: id,
        status:      newStatus,
        location:    location || null,
        description: description || null,
        timestamp:   new Date(timestamp).toISOString(),
      });

      msgDiv.innerHTML = `<div class="alert alert-success">✓ Status updated to <strong>${newStatus.replace(/_/g,' ')}</strong> successfully.</div>`;
      form.querySelector('[name=location]').value = '';
      form.querySelector('[name=update_description]').value = '';
      form.querySelector('[name=timestamp]').value = '';

      // Refresh select
      await loadShipmentSelectForUpdate();
      sel.value = '';
      prevDiv.innerHTML = '';

    } catch (err) {
      msgDiv.innerHTML = `<div class="alert alert-error">✗ Update failed: ${err.message}</div>`;
    } finally {
      btn.innerHTML = origHtml;
      btn.disabled  = false;
    }
  });
}

// ── Messages Panel ───────────────────────────────────────────
async function loadMessages() {
  const tbody = document.getElementById('messages-tbody');
  const countEl = document.getElementById('messages-count');
  if (!tbody) return;
  tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;padding:2rem"><span class="spinner spinner-dark"></span></td></tr>`;

  try {
    const msgs = await apiGet('contact_messages', '?select=*&order=created_at.desc');
    countEl && (countEl.textContent = msgs.length + ' messages');
    if (!msgs.length) {
      tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;padding:3rem;color:var(--gray-400)">No messages yet.</td></tr>`;
      return;
    }
    tbody.innerHTML = msgs.map(m => `
      <tr style="${!m.is_read ? 'background:var(--blue-pale)' : ''}">
        <td style="font-weight:${m.is_read?'400':'700'}">${m.name}</td>
        <td>${m.email}</td>
        <td>${m.subject}</td>
        <td style="max-width:200px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${m.message}</td>
        <td><span class="status-badge ${m.is_read?'badge-delivered':'badge-pending'}">${m.is_read?'Read':'Unread'}</span></td>
        <td>
          <div class="action-btns">
            <button class="action-btn" onclick="openMessageModal('${m.id}')" title="View">👁</button>
            ${!m.is_read ? `<button class="action-btn" onclick="markMessageRead('${m.id}')" title="Mark read">✓</button>` : ''}
            <button class="action-btn danger" onclick="deleteMessage('${m.id}')" title="Delete">🗑</button>
          </div>
        </td>
      </tr>`).join('');

    // Store for modal
    window._messages = msgs;
  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;color:var(--red);padding:2rem">Failed to load messages.</td></tr>`;
  }
}

async function openMessageModal(id) {
  const msg = (window._messages || []).find(m => m.id === id);
  if (!msg) return;
  const modal = document.getElementById('message-modal');
  modal.querySelector('.msg-from').textContent    = msg.name;
  modal.querySelector('.msg-email').textContent   = msg.email;
  modal.querySelector('.msg-phone').textContent   = msg.phone || '—';
  modal.querySelector('.msg-subject').textContent = msg.subject;
  modal.querySelector('.msg-body').textContent    = msg.message;
  modal.querySelector('.msg-time').textContent    = new Date(msg.created_at).toLocaleString('en-US',{month:'long',day:'numeric',year:'numeric',hour:'2-digit',minute:'2-digit'});
  modal.classList.add('open');
  if (!msg.is_read) markMessageRead(id);
}

async function markMessageRead(id) {
  try {
    await apiPatch('contact_messages', id, { is_read: true });
    loadMessages();
  } catch {}
}

async function deleteMessage(id) {
  if (!confirm('Delete this message?')) return;
  try {
    await apiDelete('contact_messages', id);
    loadMessages();
  } catch { showToast('Failed to delete message.', 'error'); }
}

// ── Modal close handlers ─────────────────────────────────────
function initModals() {
  document.querySelectorAll('.modal-close, .modal-overlay').forEach(el => {
    el.addEventListener('click', (e) => {
      if (e.target === el || e.target.classList.contains('modal-close')) {
        document.querySelectorAll('.modal-overlay.open').forEach(m => m.classList.remove('open'));
      }
    });
  });
}

// ── Toast notification ───────────────────────────────────────
function showToast(message, type = 'success') {
  const toast = document.createElement('div');
  toast.className = `alert alert-${type}`;
  toast.style.cssText = 'position:fixed;top:1.5rem;right:1.5rem;z-index:9999;min-width:280px;box-shadow:0 8px 30px rgba(0,0,0,.15);animation:slideUp .3s ease';
  toast.textContent = message;
  document.body.appendChild(toast);
  setTimeout(() => { toast.style.opacity = '0'; toast.style.transition = 'opacity .3s'; setTimeout(() => toast.remove(), 300); }, 3500);
}

// ── Logout ───────────────────────────────────────────────────
document.getElementById('logout-btn')?.addEventListener('click', async () => {
  await sb.auth.signOut();
  window.location.href = 'admin-login.html';
});

// ── Global context for onclick attributes ────────────────────
window.openViewModal    = openViewModal;
window.openEditModal    = openEditModal;
window.deleteShipment   = deleteShipment;
window.openMessageModal = openMessageModal;
window.markMessageRead  = markMessageRead;
window.deleteMessage    = deleteMessage;

// ── Bootstrap ────────────────────────────────────────────────
async function init() {
  const user = await checkAuth();
  if (!user) return;

  initNavigation();
  initShipmentFilters();
  initCreateForm();
  initEditModal();
  initUpdateForm();
  initModals();
}

document.addEventListener('DOMContentLoaded', init);
