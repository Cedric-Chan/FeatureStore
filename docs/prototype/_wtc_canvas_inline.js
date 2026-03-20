/* ============================================================
   CANVAS — WideTable Figma CanvasPage (static HTML parity)
   ============================================================ */
var _cvTsName = '', _cvTsVer = 'V1', _cvTsRegion = 'ID', _cvTsStatus = 'DRAFT';

var WTC_CANVAS_W = 1060, WTC_CANVAS_H = 520;
var WTC_MM_W = 118, WTC_MM_H = 72;
var WTC_EDGES = [['A','B'],['B','C'],['B','D'],['B','E'],['C','F'],['D','F'],['E','F'],['F','G']];
var WTC_INITIAL_NODES = [
  { id:'A', type:'source', x:22, y:224, w:124, h:72, title:'START', subtitle:'Trigger' },
  { id:'B', type:'source', x:168, y:224, w:144, h:72, title:'Frame Table', subtitle:'Source Table' },
  { id:'C', type:'feature', x:336, y:108, w:185, h:72, title:'user_profile_features', subtitle:'Feature Group' },
  { id:'D', type:'feature', x:336, y:224, w:185, h:72, title:'order_history_features', subtitle:'Feature Group' },
  { id:'E', type:'feature', x:336, y:340, w:185, h:72, title:'credit_behavior_features', subtitle:'Feature Group' },
  { id:'F', type:'sink', x:548, y:224, w:188, h:72, title:'Data Sink', subtitle:'Sink Table Result' },
  { id:'G', type:'end', x:790, y:224, w:140, h:72, title:'End', subtitle:'Output · Global Vars' }
];
var WTC_NODE_CONFIGS = {
  A: { rows: [{ k:'Schedule', v:'ONCE' }] },
  B: { rows: [{ k:'Frame table', v:'ods_entity_frame' }, { k:'Partition key', v:'ds' }] },
  C: { rows: [{ k:'Feature source', v:'ods_user_profile' }, { k:'Feature key', v:'ds' }, { k:'Feature count', v:'24' }] },
  D: { rows: [{ k:'Feature source', v:'ods_order_history' }, { k:'Feature key', v:'ds' }, { k:'Feature count', v:'31' }] },
  E: { rows: [{ k:'Feature source', v:'ods_credit_events' }, { k:'Feature key', v:'ds' }, { k:'Feature count', v:'18' }] },
  F: { rows: [{ k:'Output table', v:'dwd_wide_feat_sink' }, { k:'Write mode', v:'OVERWRITE' }, { k:'Min rows', v:'1,000,000' }] },
  G: { rows: [{ k:'Output', v:'Global variables' }] }
};
var WTC_EDGE_COLORS = { success:'#22c55e', running:'#3b82f6', cache_skipped:'#f59e0b', failed:'#ef4444', waiting:'#9ca3af' };
var WTC_NSTATUS_UI = {
  waiting: { lab:'Waiting', l:'#d1d5db', ibg:'#f9fafb', ic:'#9ca3af', bd:'#f3f4f6', tx:'#6b7280', dot:'#9ca3af' },
  cache_skipped: { lab:'Cached', l:'#facc15', ibg:'#fefce8', ic:'#ca8a04', bd:'#fef9c3', tx:'#a16207', dot:'#eab308' },
  running: { lab:'Running', l:'#3b82f6', ibg:'#eff6ff', ic:'#2563eb', bd:'#dbeafe', tx:'#1d4ed8', dot:'#3b82f6' },
  failed: { lab:'Failed', l:'#f87171', ibg:'#fef2f2', ic:'#dc2626', bd:'#fee2e2', tx:'#b91c1c', dot:'#ef4444' },
  success: { lab:'Success', l:'#34d399', ibg:'#ecfdf5', ic:'#059669', bd:'#d1fae5', tx:'#047857', dot:'#10b981' }
};
var WTC_TYPE_UI = {
  source: { l:'#2dd4bf', ibg:'#f0fdfa', ic:'#0d9488' },
  feature: { l:'#60a5fa', ibg:'#eff6ff', ic:'#2563eb' },
  sink: { l:'#fbbf24', ibg:'#fffbeb', ic:'#d97706' },
  end: { l:'#9ca3af', ibg:'#fff7ed', ic:'#ea580c' }
};

var _wtcNodes = [];
var _wtcPan = { x: 0, y: 0 };
var _wtcZoom = 0.88;
var _wtcZoomRef = 0.88;
var _wtcSel = null;
var _wtcRow = null;
var _wtcInstances = [];
var _wtcSelectedInst = null;
var _wtcViewMode = 'current-config';
var _wtcInstView = false;
var _wtcNodeStatus = {};
var _wtcDrag = null;
var _wtcDragMoved = false;
var _wtcPanning = false;
var _wtcPanStart = { mx:0, my:0, px:0, py:0 };
var _wtcHostRef = null;
var _wtcActiveDd = null;
var _wtcRpTab = 'config';
var _wtcEventsBound = false;

function wtcEsc(s) {
  return String(s == null ? '' : s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/"/g,'&quot;');
}
function wtcCloneNodes() { return JSON.parse(JSON.stringify(WTC_INITIAL_NODES)); }
function wtcNodeById(id) {
  for (var i = 0; i < _wtcNodes.length; i++) {
    if (_wtcNodes[i].id === id) return _wtcNodes[i];
  }
  return null;
}

function wtcFindRow(name) {
  for (var i = 0; i < WT_DATA.length; i++) {
    if (WT_DATA[i].name === name) return WT_DATA[i];
  }
  return null;
}

function wtcGetMockNodeStatuses(s) {
  switch (s) {
    case 'SUCCESS': return { A:'success', B:'success', C:'success', D:'success', E:'success', F:'success', G:'success' };
    case 'FAILED': return { A:'success', B:'success', C:'success', D:'failed', E:'waiting', F:'waiting', G:'waiting' };
    case 'RUNNING': return { A:'success', B:'success', C:'cache_skipped', D:'running', E:'waiting', F:'waiting', G:'waiting' };
    case 'PENDING': return { A:'waiting', B:'waiting', C:'waiting', D:'waiting', E:'waiting', F:'waiting', G:'waiting' };
    case 'KILLED': return { A:'success', B:'cache_skipped', C:'failed', D:'waiting', E:'waiting', F:'waiting', G:'waiting' };
    default: return { A:'success', B:'success', C:'success', D:'success', E:'success', F:'success', G:'success' };
  }
}

function cvSinkVmModalCancel() {
  var m = document.getElementById('cvVmModal');
  if (m) m.classList.remove('visible');
}

function initCanvas() { wtcInit(); }

function wtcInit() {
  _wtcNodes = wtcCloneNodes();
  _wtcRow = wtcFindRow(_cvTsName);
  _wtcInstances = (_wtcRow && _wtcRow.instances) ? _wtcRow.instances.slice() : [];
  _wtcSelectedInst = null;
  if (_wtcInstId) {
    for (var j = 0; j < _wtcInstances.length; j++) {
      if (_wtcInstances[j].id === _wtcInstId) { _wtcSelectedInst = _wtcInstances[j]; break; }
    }
  }
  _wtcViewMode = _wtcInstId ? 'instance-view' : 'current-config';

  _wtcInstView = (_wtcViewMode === 'instance-view');
  _wtcNodeStatus = (_wtcInstView && _wtcSelectedInst) ? wtcGetMockNodeStatuses(_wtcSelectedInst.status) : {};

  wtcBindUiText();
  wtcRenderModePill();
  wtcRenderHistoryDropdown();
  wtcRenderActionDropdown();
  wtcFitInitial();
  wtcRenderGraph();
  wtcClosePanel();
  if (!_wtcEventsBound) { wtcBindEvents(); _wtcEventsBound = true; }
  setTimeout(function() {
    wtcFitInitial();
    wtcApplyTransform();
    wtcRenderGraph();
  }, 0);
}

function wtcBindUiText() {
  var n = document.getElementById('wtcMetaName');
  if (n) n.textContent = _cvTsName || 'wide_table';
  var r = document.getElementById('wtcChipRegion');
  if (r) r.textContent = _cvTsRegion || 'ID';
  var ed = document.getElementById('wtcEditMeta');
  if (ed) {
    ed.disabled = _wtcInstView;
    ed.title = _wtcInstView ? 'Only available in Config Canvas' : 'Edit metadata';
  }
  var eb = document.getElementById('wtcErrBanner');
  if (eb) { eb.classList.remove('show'); eb.textContent = ''; }
  var strip = document.getElementById('wtcInstStrip');
  if (strip) {
    strip.classList.toggle('show', _wtcInstView);
    strip.innerHTML = _wtcInstView && _wtcSelectedInst
      ? '<span style="font-weight:600;color:#374151">Pipeline</span> <span style="font-family:ui-monospace;color:#2563eb">' + wtcEsc(_wtcSelectedInst.id) + '</span>'
      : '';
  }
  var bc = document.getElementById('wtcBackConfigBtn');
  if (bc) bc.style.display = _wtcInstView ? 'inline-block' : 'none';
  var hw = document.getElementById('wtcHistoryWrap');
  if (hw) hw.style.display = (_wtcViewMode === 'current-config') ? '' : 'none';
}

function wtcInstBadgeHtml(st) {
  var cfg = {
    SUCCESS:{bg:'#ecfdf5',c:'#047857',dot:'#10b981'},
    FAILED:{bg:'#fef2f2',c:'#b91c1c',dot:'#ef4444'},
    RUNNING:{bg:'#eff6ff',c:'#1d4ed8',dot:'#3b82f6'},
    PENDING:{bg:'#fffbeb',c:'#b45309',dot:'#f59e0b'},
    KILLED:{bg:'#f3f4f6',c:'#6b7280',dot:'#9ca3af'}
  };
  var x = cfg[st] || cfg.PENDING;
  return '<span class="wtc-inst-badge" style="background:'+x.bg+';color:'+x.c+'"><span class="wtc-sdot" style="background:'+x.dot+'"></span>'+wtcEsc(st)+'</span>';
}

function wtcRenderModePill() {
  var box = document.getElementById('wtcModeCenter');
  if (!box) return;
  if (_wtcViewMode === 'current-config') {
    box.innerHTML = '<div class="wtc-mode-pill"><span class="wtc-mode-dot teal"></span> Current Config</div>';
    return;
  }
  var inst = _wtcSelectedInst;
  var extra = '';
  if (inst) {
    extra = '<span class="wtc-vbar"></span><span class="wtc-mode-inst-mono" title="'+wtcEsc(inst.id)+'">'+wtcEsc(inst.id)+'</span> '+wtcInstBadgeHtml(inst.status);
  }
  box.innerHTML = '<div class="wtc-mode-pill"><span class="wtc-mode-dot blue"></span> <span class="wtc-mode-tag">Instance View</span>'+extra+'</div>';
}

function wtcRenderHistoryDropdown() {
  var panel = document.getElementById('wtcHistoryPanel');
  if (!panel) return;
  var total = _wtcInstances.length;
  var head = '<div class="wtc-dd-hd"><div style="display:flex;align-items:center;gap:8px"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#6b7280" stroke-width="2"><path d="M3 12a9 9 0 109-9 9.75 9.75 0 00-6.74 2.74L3 8"/><path d="M3 3v5h5"/></svg><span>Instance History</span></div><span style="font-size:12px;color:#9ca3af">'+total+' instances total</span></div>';
  var grid = total ? '<div class="wtc-hist-grid"><span>INSTANCE ID</span><span>STATUS</span><span>START</span><span>END</span></div>' : '';
  var rows = '<div class="wtc-hist-rows">';
  if (!total) rows += '<div style="padding:24px;text-align:center;font-size:12px;color:#9ca3af">No runs yet.</div>';
  else {
    for (var i = 0; i < _wtcInstances.length; i++) {
      var inst = _wtcInstances[i];
      var on = _wtcSelectedInst && _wtcSelectedInst.id === inst.id;
      var latest = i === 0 ? '<div class="wtc-latest-tag">Latest</div>' : '';
      rows += '<button type="button" class="wtc-hist-row'+(on?' on':'')+'" data-iid="'+wtcEsc(inst.id)+'">'+
        '<div><div class="wtc-hist-id">'+wtcEsc(inst.id.length>20?inst.id.slice(0,20)+'…':inst.id)+'</div>'+latest+'</div>'+
        '<div>'+wtcInstBadgeHtml(inst.status)+'</div>'+
        '<span style="font-size:12px;color:#6b7280">'+wtcEsc(inst.startTime||'—')+'</span>'+
        '<span style="font-size:12px;color:#6b7280">'+wtcEsc(inst.finishTime||'—')+'</span>'+
        '</button>';
    }
  }
  rows += '</div>';
  var foot = '<div class="wtc-dd-hint">Click an instance to view its pipeline execution — read only</div>';
  panel.innerHTML = head + grid + rows + foot;
  var hr = panel.querySelectorAll('.wtc-hist-row');
  for (var hi = 0; hi < hr.length; hi++) {
    hr[hi].onclick = (function(btn) {
      return function() {
        var id = btn.getAttribute('data-iid');
        for (var k = 0; k < _wtcInstances.length; k++) {
          if (_wtcInstances[k].id === id) { _wtcSelectedInst = _wtcInstances[k]; break; }
        }
        _wtcViewMode = 'instance-view';
        _wtcInstView = true;
        _wtcNodeStatus = wtcGetMockNodeStatuses(_wtcSelectedInst.status);
        wtcSetDd(null);
        wtcBindUiText();
        wtcRenderModePill();
        wtcRenderGraph();
        wtcClosePanel();
      };
    })(hr[hi]);
  }
}

function wtcRenderActionDropdown() {
  var panel = document.getElementById('wtcActionPanel');
  if (!panel) return;
  var runOrPend = false;
  for (var ri = 0; ri < _wtcInstances.length; ri++) {
    if (_wtcInstances[ri].status === 'RUNNING' || _wtcInstances[ri].status === 'PENDING') { runOrPend = true; break; }
  }
  var canKill = _wtcInstView && _wtcSelectedInst && (_wtcSelectedInst.status === 'RUNNING' || _wtcSelectedInst.status === 'PENDING');
  var trigDis = _wtcInstView;
  var killHint = !canKill ? '<span style="margin-left:auto;font-size:10px;color:#d1d5db">' + (!_wtcInstView ? 'run view only' : 'not active') + '</span>' : '';
  panel.innerHTML =
    '<button type="button" id="wtcActTrigger" '+(trigDis?'disabled':'')+'><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M13 2L3 14h8l-1 8 10-12h-8l1-8z"/></svg> Trigger Instance</button>'+
    '<hr class="wtc-zsep" style="margin:4px 0;border:none;border-top:1px solid #f3f4f6"/>'+
    '<button type="button" id="wtcActKill" class="danger" '+(canKill?'':'disabled')+'><span style="width:13px;height:13px;border:2px solid currentColor;display:inline-block;border-radius:2px"></span> Kill '+killHint+'</button>';
  var bt = document.getElementById('wtcActTrigger');
  if (bt && !trigDis) bt.onclick = function() {
    if (runOrPend) {
      var eb = document.getElementById('wtcErrBanner');
      if (eb) { eb.textContent = 'Cannot trigger: a RUNNING or PENDING instance exists. Kill it first.'; eb.classList.add('show'); }
      wtcSetDd(null);
      return;
    }
    wtcSetDd(null);
    showToast('Trigger Instance (prototype)', 'info');
  };
  var bk = document.getElementById('wtcActKill');
  if (bk && canKill) bk.onclick = function() {
    wtcSetDd(null);
    showToast('Kill requested (prototype)', 'info');
  };
}

function wtcSetDd(which) {
  _wtcActiveDd = which;
  var hp = document.getElementById('wtcHistoryPanel');
  var ap = document.getElementById('wtcActionPanel');
  if (hp) hp.classList.toggle('open', which === 'h');
  if (ap) ap.classList.toggle('open', which === 'a');
}

function wtcFitInitial() {
  var host = document.getElementById('wtcCanvasHost');
  _wtcHostRef = host;
  if (!host) return;
  var rect = host.getBoundingClientRect();
  var iz = 0.88;
  _wtcZoom = iz;
  _wtcZoomRef = iz;
  _wtcPan = { x: rect.width / 2 - 530 * iz, y: rect.height / 2 - 256 * iz };
  wtcApplyTransform();
}

function wtcApplyTransform() {
  _wtcZoomRef = _wtcZoom;
  var tr = document.getElementById('wtcTransform');
  if (tr) tr.style.transform = 'translate('+_wtcPan.x+'px,'+_wtcPan.y+'px) scale('+_wtcZoom+')';
  var z = document.getElementById('wtcZoomPct');
  if (z) z.textContent = Math.round(_wtcZoom * 100) + '%';
  wtcUpdateMinimap();
}

function wtcMarkerColKey(col) {
  if (col === '#22c55e') return 'green';
  if (col === '#3b82f6') return 'blue';
  if (col === '#f59e0b') return 'amber';
  if (col === '#ef4444') return 'red';
  return 'gray';
}

function wtcEdgeColor(fromId) {
  if (_wtcInstView && _wtcNodeStatus[fromId]) return WTC_EDGE_COLORS[_wtcNodeStatus[fromId]] || '#9ca3af';
  return '#9ca3af';
}

function wtcDrawEdges() {
  var svg = document.getElementById('wtcEdges');
  if (!svg) return;
  var nodeMap = {};
  _wtcNodes.forEach(function(n) { nodeMap[n.id] = n; });
  var cols = { gray:'#9ca3af', green:'#22c55e', blue:'#3b82f6', amber:'#f59e0b', red:'#ef4444' };
  var defs = '<defs>';
  Object.keys(cols).forEach(function(k) {
    var c = cols[k];
    defs += '<marker id="wtc-arr-'+k+'" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="5" markerHeight="5" orient="auto"><path d="M0,1.5 L8,5 L0,8.5 L2.5,5 Z" fill="'+c+'"/></marker>';
  });
  defs += '</defs>';
  var paths = '';
  for (var e = 0; e < WTC_EDGES.length; e++) {
    var edge = WTC_EDGES[e];
    var f = nodeMap[edge[0]], t = nodeMap[edge[1]];
    if (!f || !t) continue;
    var x1 = f.x + f.w, y1 = f.y + f.h / 2, x2 = t.x, y2 = t.y + t.h / 2, mx = (x1 + x2) / 2;
    var col = wtcEdgeColor(edge[0]);
    var mk = wtcMarkerColKey(col);
    paths += '<path d="M'+x1+','+y1+' C'+mx+','+y1+' '+mx+','+y2+' '+x2+','+y2+'" fill="none" stroke="'+col+'" stroke-width="1.5" marker-end="url(#wtc-arr-'+mk+')"/>';
  }
  svg.innerHTML = defs + paths;
}

function wtcIconSvg(t) {
  if (t === 'source') return '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="5 3 19 12 5 21 5 3"/></svg>';
  if (t === 'feature') return '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/></svg>';
  if (t === 'sink') return '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"/><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"/></svg>';
  return '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/><line x1="4" y1="22" x2="4" y2="15"/></svg>';
}

function wtcRenderNodes() {
  var layer = document.getElementById('wtcNodes');
  if (!layer) return;
  var html = '';
  for (var i = 0; i < _wtcNodes.length; i++) {
    var n = _wtcNodes[i];
    var tu = WTC_TYPE_UI[n.type];
    var ns = _wtcInstView ? _wtcNodeStatus[n.id] : null;
    var su = ns ? WTC_NSTATUS_UI[ns] : null;
    var accent = (su ? su.l : tu.l);
    var ibg = (su ? su.ibg : tu.ibg);
    var ic = (su ? su.ic : tu.ic);
    var stHtml = '';
    if (_wtcInstView && su) {
      stHtml = '<span class="wtc-node-st" style="background:'+su.bd+';color:'+su.tx+'"><span class="wtc-sdot" style="background:'+su.dot+'"></span>'+su.lab+'</span>';
    }
    var sel = _wtcSel === n.id ? ' wtc-sel' : '';
    var iv = _wtcInstView ? ' wtc-inst' : '';
    html += '<div class="wtc-node wtc-type-'+n.type+sel+iv+'" data-nid="'+n.id+'" style="left:'+n.x+'px;top:'+n.y+'px;width:'+n.w+'px;height:'+n.h+'px;border-left-color:'+accent+'">'+
      '<div class="wtc-node-inner">'+
      '<div class="wtc-node-ico" style="background:'+ibg+';color:'+ic+'">'+wtcIconSvg(n.type === 'end' ? 'end' : n.type === 'sink' ? 'sink' : n.type === 'feature' ? 'feature' : 'source')+'</div>'+
      '<div class="wtc-node-txt"><div class="wtc-node-title">'+wtcEsc(n.title)+'</div><div class="wtc-node-sub">'+wtcEsc(n.subtitle)+'</div>'+stHtml+'</div></div></div>';
  }
  layer.innerHTML = html;
  layer.querySelectorAll('.wtc-node').forEach(function(el) {
    el.onmousedown = function(e) {
      if (e.button !== 0) return;
      e.stopPropagation();
      var nid = el.getAttribute('data-nid');
      wtcNodeDragStart(nid, e);
    };
    el.onclick = function(e) {
      e.stopPropagation();
      if (_wtcDragMoved) return;
      wtcSelectNode(el.getAttribute('data-nid'));
    };
  });
}

function wtcRenderGraph() {
  wtcDrawEdges();
  wtcRenderNodes();
}

function wtcUpdateMinimap() {
  var svg = document.getElementById('wtcMinimapSvg');
  var host = document.getElementById('wtcCanvasHost');
  if (!svg || !host) return;
  var cw = host.clientWidth, ch = host.clientHeight;
  var sx = WTC_MM_W / WTC_CANVAS_W, sy = WTC_MM_H / WTC_CANVAS_H;
  var tc = { source:'#2dd4bf', feature:'#60a5fa', sink:'#fbbf24', end:'#9ca3af' };
  var bg = '<rect width="'+WTC_MM_W+'" height="'+WTC_MM_H+'" fill="#f8fafc" rx="4"/>';
  var ep = '';
  for (var e = 0; e < WTC_EDGES.length; e++) {
    var edge = WTC_EDGES[e];
    var f = wtcNodeById(edge[0]);
    var t = wtcNodeById(edge[1]);
    if (!f || !t) continue;
    var x1 = (f.x + f.w) * sx, y1 = (f.y + f.h / 2) * sy, x2 = t.x * sx, y2 = (t.y + t.h / 2) * sy, mx = (x1 + x2) / 2;
    ep += '<path d="M'+x1+','+y1+' C'+mx+','+y1+' '+mx+','+y2+' '+x2+','+y2+'" fill="none" stroke="#d1d5db" stroke-width="0.8"/>';
  }
  var nr = '';
  for (var i = 0; i < _wtcNodes.length; i++) {
    var n = _wtcNodes[i];
    nr += '<rect x="'+(n.x*sx)+'" y="'+(n.y*sy)+'" width="'+(n.w*sx)+'" height="'+(n.h*sy)+'" rx="2" fill="'+tc[n.type]+'" opacity="0.7"/>';
  }
  var vpX = -_wtcPan.x / _wtcZoom, vpY = -_wtcPan.y / _wtcZoom;
  var vpW = cw / _wtcZoom, vpH = ch / _wtcZoom;
  var rx = vpX * sx, ry = vpY * sy, rw = Math.max(8, vpW * sx), rh = Math.max(8, vpH * sy);
  var vp = '<rect x="'+rx+'" y="'+ry+'" width="'+rw+'" height="'+rh+'" fill="rgba(99,102,241,0.08)" stroke="#6366f1" stroke-width="1" rx="2"/>';
  svg.innerHTML = bg + ep + nr + vp;
}

function wtcNodeDragStart(nid, e) {
  if (_wtcInstView) return;
  _wtcDragMoved = false;
  var n = null;
  for (var i = 0; i < _wtcNodes.length; i++) {
    if (_wtcNodes[i].id === nid) { n = _wtcNodes[i]; break; }
  }
  if (!n) return;
  _wtcDrag = { id: nid, sx: e.clientX, sy: e.clientY, nx: n.x, ny: n.y };
  document.addEventListener('mousemove', wtcOnNodeDrag);
  document.addEventListener('mouseup', wtcEndNodeDrag);
}

function wtcOnNodeDrag(e) {
  if (!_wtcDrag) return;
  var dx = (e.clientX - _wtcDrag.sx) / _wtcZoomRef;
  var dy = (e.clientY - _wtcDrag.sy) / _wtcZoomRef;
  if (Math.abs(dx) > 2 || Math.abs(dy) > 2) _wtcDragMoved = true;
  for (var i = 0; i < _wtcNodes.length; i++) {
    if (_wtcNodes[i].id === _wtcDrag.id) {
      _wtcNodes[i].x = _wtcDrag.nx + dx;
      _wtcNodes[i].y = _wtcDrag.ny + dy;
      break;
    }
  }
  var el = document.querySelector('.wtc-node[data-nid="'+_wtcDrag.id+'"]');
  if (el) {
    var nn = wtcNodeById(_wtcDrag.id);
    if (nn) { el.style.left = nn.x + 'px'; el.style.top = nn.y + 'px'; }
  }
  wtcDrawEdges();
  wtcUpdateMinimap();
}

function wtcEndNodeDrag() {
  document.removeEventListener('mousemove', wtcOnNodeDrag);
  document.removeEventListener('mouseup', wtcEndNodeDrag);
  _wtcDrag = null;
  setTimeout(function() { _wtcDragMoved = false; }, 0);
}

function wtcSelectNode(nid) {
  _wtcSel = nid;
  document.querySelectorAll('.wtc-node').forEach(function(el) {
    el.classList.toggle('wtc-sel', el.getAttribute('data-nid') === nid);
  });
  wtcOpenPanel(nid);
}

function wtcClosePanel() {
  _wtcSel = null;
  var p = document.getElementById('wtcRightPanel');
  if (p) p.classList.remove('open');
  document.querySelectorAll('.wtc-node').forEach(function(el) { el.classList.remove('wtc-sel'); });
}

function wtcOpenPanel(nid) {
  var p = document.getElementById('wtcRightPanel');
  var t = document.getElementById('wtcRpTitle');
  var s = document.getElementById('wtcRpSub');
  var b = document.getElementById('wtcRpBody');
  var tabs = document.getElementById('wtcRpTabs');
  if (!p || !b) return;
  var node = wtcNodeById(nid);
  var cfg = WTC_NODE_CONFIGS[nid];
  if (t) t.textContent = node ? node.title : nid;
  if (s) s.textContent = node ? node.subtitle : '';
  var showTabs = nid === 'B';
  if (tabs) tabs.style.display = showTabs ? 'flex' : 'none';
  _wtcRpTab = 'config';
  if (showTabs) {
    tabs.querySelectorAll('.wtc-rp-tab').forEach(function(tab) {
      tab.classList.toggle('active', tab.getAttribute('data-tab') === 'config');
      tab.onclick = function() {
        _wtcRpTab = tab.getAttribute('data-tab');
        tabs.querySelectorAll('.wtc-rp-tab').forEach(function(x) {
          x.classList.toggle('active', x.getAttribute('data-tab') === _wtcRpTab);
        });
        wtcFillPanelBody(nid);
      };
    });
  }
  wtcFillPanelBody(nid);
  p.classList.add('open');
}

function wtcFillPanelBody(nid) {
  var b = document.getElementById('wtcRpBody');
  if (!b) return;
  var cfg = WTC_NODE_CONFIGS[nid];
  if (nid === 'B' && _wtcRpTab === 'last') {
    b.innerHTML = '<div class="wtc-sec-label">LAST INSTANCE</div><div style="font-size:12px;color:#64748b">Mock execution logs for Frame Table (prototype).</div>';
    return;
  }
  if (!cfg) { b.innerHTML = '<div style="color:#9ca3af;font-size:12px">No extra config (prototype).</div>'; return; }
  var rows = cfg.rows.map(function(r) {
    return '<div class="wtc-pr-row"><span class="wtc-pr-k">'+wtcEsc(r.k)+'</span><span class="wtc-pr-v">'+wtcEsc(r.v)+'</span></div>';
  }).join('');
  b.innerHTML = '<div class="wtc-sec-label">CONFIGURATION</div>' + rows;
}

function wtcBindEvents() {
  var host = document.getElementById('wtcCanvasHost');
  if (!host) return;
  host.addEventListener('wheel', function(e) {
    e.preventDefault();
    var rect = host.getBoundingClientRect();
    var mx = e.clientX - rect.left, my = e.clientY - rect.top;
    var pz = _wtcZoom;
    var nz = Math.min(Math.max(pz * (e.deltaY < 0 ? 1.12 : 0.9), 0.15), 3);
    _wtcPan.x = mx - (mx - _wtcPan.x) * (nz / pz);
    _wtcPan.y = my - (my - _wtcPan.y) * (nz / pz);
    _wtcZoom = nz;
    wtcApplyTransform();
  }, { passive: false });

  host.addEventListener('mousedown', function(e) {
    if (e.button === 2) {
      _wtcPanning = true;
      _wtcPanStart = { mx: e.clientX, my: e.clientY, px: _wtcPan.x, py: _wtcPan.y };
      host.classList.add('panning');
    }
  });
  window.addEventListener('mousemove', function(e) {
    if (_wtcPanning) {
      _wtcPan.x = _wtcPanStart.px + e.clientX - _wtcPanStart.mx;
      _wtcPan.y = _wtcPanStart.py + e.clientY - _wtcPanStart.my;
      wtcApplyTransform();
    }
  });
  window.addEventListener('mouseup', function() {
    if (_wtcPanning) {
      _wtcPanning = false;
      host.classList.remove('panning');
    }
  });
  host.addEventListener('contextmenu', function(e) { e.preventDefault(); });
  host.addEventListener('mousedown', function(e) {
    if (e.target === host || e.target.classList.contains('wtc-hint') || e.target.closest('.wtc-bottom-left')) return;
    if (e.button === 0 && !e.target.closest('.wtc-node')) wtcClosePanel();
  });

  var zin = document.getElementById('wtcZoomIn');
  var zout = document.getElementById('wtcZoomOut');
  var zfit = document.getElementById('wtcZoomFit');
  if (zin) zin.onclick = function() {
    var rect = host.getBoundingClientRect();
    var cx = rect.width / 2, cy = rect.height / 2, pz = _wtcZoom, nz = Math.min(pz + 0.1, 3);
    _wtcPan.x = cx - (cx - _wtcPan.x) * (nz / pz);
    _wtcPan.y = cy - (cy - _wtcPan.y) * (nz / pz);
    _wtcZoom = nz;
    wtcApplyTransform();
  };
  if (zout) zout.onclick = function() {
    var rect = host.getBoundingClientRect();
    var cx = rect.width / 2, cy = rect.height / 2, pz = _wtcZoom, nz = Math.max(pz - 0.1, 0.15);
    _wtcPan.x = cx - (cx - _wtcPan.x) * (nz / pz);
    _wtcPan.y = cy - (cy - _wtcPan.y) * (nz / pz);
    _wtcZoom = nz;
    wtcApplyTransform();
  };
  if (zfit) zfit.onclick = function() {
    var rect = host.getBoundingClientRect(), pad = 80;
    var xs = [], ys = [];
    _wtcNodes.forEach(function(n) { xs.push(n.x, n.x + n.w); ys.push(n.y, n.y + n.h); });
    var minX = Math.min.apply(null, xs) - 20, maxX = Math.max.apply(null, xs) + 20;
    var minY = Math.min.apply(null, ys) - 20, maxY = Math.max.apply(null, ys) + 20;
    var bw = maxX - minX, bh = maxY - minY;
    var nz = Math.min((rect.width - pad) / bw, (rect.height - pad) / bh, 1.5);
    _wtcZoom = nz;
    _wtcPan.x = (rect.width - bw * nz) / 2 - minX * nz;
    _wtcPan.y = (rect.height - bh * nz) / 2 - minY * nz;
    wtcApplyTransform();
  };

  var hb = document.getElementById('wtcHistoryBtn');
  if (hb) hb.onclick = function(e) {
    e.stopPropagation();
    wtcSetDd(_wtcActiveDd === 'h' ? null : 'h');
  };
  var ab = document.getElementById('wtcActionBtn');
  if (ab) ab.onclick = function(e) {
    e.stopPropagation();
    wtcRenderActionDropdown();
    wtcSetDd(_wtcActiveDd === 'a' ? null : 'a');
  };
  var bc = document.getElementById('wtcBackConfigBtn');
  if (bc) bc.onclick = function() {
    _wtcViewMode = 'current-config';
    _wtcInstView = false;
    _wtcNodeStatus = {};
    _wtcInstId = null;
    wtcBindUiText();
    wtcRenderModePill();
    wtcRenderGraph();
  };
  var em = document.getElementById('wtcEditMeta');
  if (em) em.onclick = function() {
    if (_wtcInstView) return;
    showToast('Edit metadata (prototype)', 'info');
  };
  var rc = document.getElementById('wtcRpClose');
  if (rc) rc.onclick = function() { wtcClosePanel(); };

  document.addEventListener('click', function(e) {
    if (!e.target.closest('.wtc-dd')) wtcSetDd(null);
  });
}

document.addEventListener('click', function(e) {
  if (!e.target.closest('.fs-input-params-select')) {
    var dd = document.getElementById('mdInputParamsDropdown');
    if (dd) dd.classList.remove('show');
  }
}, true);
