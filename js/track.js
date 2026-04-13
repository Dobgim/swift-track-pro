// ============================================================
// SwiftTrack Pro — Tracking Page JavaScript
// ============================================================

const SUPABASE_URL = 'https://blitracqgaggxuypqbpo.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJsaXRyYWNxZ2FnZ3h1eXBxYnBvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM5ODU1MjgsImV4cCI6MjA4OTU2MTUyOH0.vAwSRoqGk-nL0BfnXL6-rSSM6MQS6dWcoghLimdVIVs';

const STATUS_CONFIG = {
  pending:           { label: 'Pending',            icon: '<i data-lucide="clock" style="width:1.2em; height:1.2em; vertical-align:-0.2em; display:inline-block;"></i>', color: '#d97706', progress: 5 },
  in_transit:        { label: 'In Transit',          icon: '<i data-lucide="truck" style="width:1.2em; height:1.2em; vertical-align:-0.2em; display:inline-block;"></i>', color: '#2563eb', progress: 45 },
  arrived:           { label: 'Arrived at Hub',      icon: '<i data-lucide="package" style="width:1.2em; height:1.2em; vertical-align:-0.2em; display:inline-block;"></i>', color: '#7c3aed', progress: 65 },
  out_for_delivery:  { label: 'Out for Delivery',    icon: '<i data-lucide="fast-forward" style="width:1.2em; height:1.2em; vertical-align:-0.2em; display:inline-block;"></i>', color: '#f97316', progress: 85 },
  delivered:         { label: 'Delivered',           icon: '<i data-lucide="check-circle-2" style="width:1.2em; height:1.2em; vertical-align:-0.2em; display:inline-block;"></i>', color: '#059669', progress: 100 },
  on_hold:           { label: 'On Hold',             icon: '⏸️', color: '#92400e', progress: 30 },
  exception:         { label: 'Exception',           icon: '<i data-lucide="alert-triangle" style="width:1.2em; height:1.2em; vertical-align:-0.2em; display:inline-block;"></i>️', color: '#dc2626', progress: 20 },
};

// ── Fetch shipment data ──────────────────────────────────────
async function fetchShipment(trackingCode) {
  const url = `${SUPABASE_URL}/rest/v1/tracking_records?tracking_code=eq.${encodeURIComponent(trackingCode)}&select=*`;
  const res = await fetch(url, {
    headers: {
      'apikey': SUPABASE_KEY,
      'Authorization': `Bearer ${SUPABASE_KEY}`,
    }
  });
  if (!res.ok) throw new Error('Network error');
  const data = await res.json();
  return data[0] || null;
}

async function fetchHistory(trackingId) {
  const url = `${SUPABASE_URL}/rest/v1/tracking_status_updates?tracking_id=eq.${trackingId}&order=timestamp.desc&select=*`;
  const res = await fetch(url, {
    headers: {
      'apikey': SUPABASE_KEY,
      'Authorization': `Bearer ${SUPABASE_KEY}`,
    }
  });
  if (!res.ok) throw new Error('Network error');
  return await res.json();
}

// ── Render result ────────────────────────────────────────────
function renderResult(shipment, history) {
  const cfg = STATUS_CONFIG[shipment.current_status] || STATUS_CONFIG.pending;

  // Status badge
  document.getElementById('result-status-badge').innerHTML =
    `<span class="status-badge badge-${shipment.current_status}" style="font-size:1rem;padding:.5rem 1.25rem;">
      ${cfg.icon} ${cfg.label}
    </span>`;

  // Tracking code
  document.getElementById('result-tracking-code').textContent = shipment.tracking_code;

  // Progress bar
  const progress = document.getElementById('result-progress');
  if (progress) {
    setTimeout(() => {
      progress.style.width = cfg.progress + '%';
    }, 200);
  }

  // Info grid
  document.getElementById('result-sender').textContent      = shipment.sender_name || '—';
  document.getElementById('result-receiver').textContent    = shipment.receiver_name || '—';
  document.getElementById('result-origin').textContent      = shipment.origin || '—';
  document.getElementById('result-destination').textContent = shipment.destination || '—';
  document.getElementById('result-weight').textContent      = shipment.weight ? shipment.weight + ' kg' : '—';
  document.getElementById('result-eta').textContent         = shipment.estimated_delivery
    ? new Date(shipment.estimated_delivery).toLocaleDateString('en-US', { weekday:'long', year:'numeric', month:'long', day:'numeric' })
    : 'Not specified';
  document.getElementById('result-description').textContent = shipment.description || '—';
  document.getElementById('result-notes').textContent       = shipment.special_notes || 'None';
  document.getElementById('result-created').textContent     = new Date(shipment.created_at).toLocaleDateString('en-US', { year:'numeric', month:'short', day:'numeric' });
  document.getElementById('result-updated').textContent     = new Date(shipment.updated_at).toLocaleString('en-US', { month:'short', day:'numeric', hour:'2-digit', minute:'2-digit' });

  // Timeline
  const timeline = document.getElementById('result-timeline');
  if (timeline) {
    if (!history || history.length === 0) {
      timeline.innerHTML = `<div class="track-event"><p style="color:var(--gray-400);font-size:.875rem;">No history updates available yet.</p></div>`;
    } else {
      timeline.innerHTML = history.map((h, i) => {
        const isFirst     = i === 0;
        const isDelivered = h.status === 'delivered';
        const hCfg        = STATUS_CONFIG[h.status] || {};
        return `
        <div class="track-event ${isFirst ? 'current' : ''} ${isDelivered ? 'delivered' : ''}">
          <div class="track-event-status">${hCfg.icon || '<i data-lucide="map-pin" style="width:1.2em; height:1.2em; vertical-align:-0.2em; display:inline-block;"></i>'} ${hCfg.label || h.status}</div>
          <div class="track-event-location">${h.location || 'Location not specified'}</div>
          ${h.description ? `<div class="track-event-desc">${h.description}</div>` : ''}
          <div class="track-event-time">${new Date(h.timestamp).toLocaleString('en-US', { weekday:'short', month:'short', day:'numeric', year:'numeric', hour:'2-digit', minute:'2-digit' })}</div>
        </div>`;
      }).join('');
    }
  }

  // Show result
  document.getElementById('result-area').classList.add('active');
  document.getElementById('result-area').scrollIntoView({ behavior: 'smooth', block: 'start' });
}

// ── Track button handler ─────────────────────────────────────
async function handleTrack(code) {
  const resultArea  = document.getElementById('result-area');
  const errorBox    = document.getElementById('track-error');
  const trackBtn    = document.getElementById('track-btn');
  const trackInput  = document.getElementById('track-input');

  if (errorBox)   errorBox.innerHTML = '';
  if (resultArea) resultArea.classList.remove('active');

  const trackCode = (code || trackInput?.value || '').trim().toUpperCase();
  if (!trackCode) {
    if (errorBox) errorBox.innerHTML = `<div class="alert alert-error"><i data-lucide="alert-triangle" style="width:1.2em; height:1.2em; vertical-align:-0.2em; display:inline-block;"></i> Please enter a tracking number.</div>`;
    return;
  }

  // Loading state
  if (trackBtn) {
    trackBtn.innerHTML = '<span class="spinner"></span> Tracking…';
    trackBtn.disabled  = true;
  }

  try {
    const shipment = await fetchShipment(trackCode);
    if (!shipment) {
      if (errorBox) errorBox.innerHTML = `
        <div class="alert alert-error">
          <i data-lucide="x" style="width:1.2em; height:1.2em; vertical-align:-0.2em; display:inline-block;"></i> No shipment found for <strong>${trackCode}</strong>. Please check the tracking number and try again.
        </div>`;
      return;
    }

    const history = await fetchHistory(shipment.id);
    renderResult(shipment, history);

    // Update URL without reload
    const newUrl = `${window.location.pathname}?code=${encodeURIComponent(trackCode)}`;
    window.history.pushState({}, '', newUrl);

  } catch (err) {
    if (errorBox) errorBox.innerHTML = `<div class="alert alert-error"><i data-lucide="x" style="width:1.2em; height:1.2em; vertical-align:-0.2em; display:inline-block;"></i> An error occurred. Please check your connection and try again.</div>`;
    console.error(err);
  } finally {
    if (trackBtn) {
      trackBtn.innerHTML = '<span><i data-lucide="search" style="width:1.2em; height:1.2em; vertical-align:-0.2em; display:inline-block;"></i></span> Track Shipment';
      trackBtn.disabled  = false;
    }
  }
}

// ── Init ─────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  const form      = document.getElementById('track-form');
  const trackBtn  = document.getElementById('track-btn');
  const trackInput = document.getElementById('track-input');

  if (form) {
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      handleTrack();
    });
  }

  // Check URL param
  const params = new URLSearchParams(window.location.search);
  const code   = params.get('code');
  if (code) {
    if (trackInput) trackInput.value = code;
    handleTrack(code);
  }

  // Copy tracking code button
  document.addEventListener('click', (e) => {
    if (e.target.closest('#copy-tracking-code')) {
      const code = document.getElementById('result-tracking-code')?.textContent;
      if (code) {
        navigator.clipboard.writeText(code).then(() => {
          const btn = e.target.closest('#copy-tracking-code');
          btn.textContent = 'Copied!';
          setTimeout(() => { btn.textContent = 'Copy'; }, 2000);
        });
      }
    }
  });
});
