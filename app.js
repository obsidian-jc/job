(function () {
  var FLOORS = ['4f', '3f', '2f'];
  var FLOOR_LABEL = { '4f': '지하4층', '3f': '지하3층', '2f': '지하2층' };
  var LS_KEY_PREFIX = 'parking_pins_';

  var state = {
    floor: '4f',
    mode: 'view',
    pins: { '4f': [], '3f': [], '2f': [] },
    loaded: { '4f': false, '3f': false, '2f': false }
  };

  function showToast(msg) {
    var t = document.getElementById('toast');
    t.textContent = msg;
    t.classList.add('show');
    setTimeout(function () { t.classList.remove('show'); }, 1700);
  }

  function lsKey(floor) { return LS_KEY_PREFIX + floor; }

  function loadLocal(floor) {
    try {
      var raw = localStorage.getItem(lsKey(floor));
      if (raw) return JSON.parse(raw);
    } catch (e) {}
    return null;
  }

  function saveLocal(floor) {
    try {
      localStorage.setItem(lsKey(floor), JSON.stringify(state.pins[floor]));
    } catch (e) {}
  }

  function fetchFloorData(floor) {
    return fetch('data/' + floor + '.json', { cache: 'no-store' })
      .then(function (res) {
        if (!res.ok) throw new Error('not found');
        return res.json();
      })
      .then(function (json) {
        return (json && json.pins) ? json.pins : [];
      })
      .catch(function () {
        return [];
      });
  }

  function ensureFloorLoaded(floor) {
    if (state.loaded[floor]) return Promise.resolve();
    var local = loadLocal(floor);
    if (local) {
      state.pins[floor] = local;
      state.loaded[floor] = true;
      return Promise.resolve();
    }
    return fetchFloorData(floor).then(function (pins) {
      state.pins[floor] = pins;
      state.loaded[floor] = true;
    });
  }

  function nextId(floor) {
    var max = 0;
    state.pins[floor].forEach(function (p) {
      var n = parseInt(p.id, 10);
      if (!isNaN(n) && n > max) max = n;
    });
    return String(max + 1);
  }

  function renderFloorImage() {
    document.getElementById('floorImg').src = 'images/' + state.floor + '.jpg';
  }

  function renderStats() {
    var list = state.pins[state.floor];
    var withNote = list.filter(function (p) { return p.note && p.note.trim(); }).length;
    document.getElementById('statsBar').textContent =
      FLOOR_LABEL[state.floor] + ' · 지점 ' + list.length + '개 · 메모 있음 ' + withNote + '개';
  }

  function renderPins() {
    var stage = document.getElementById('stage');
    stage.querySelectorAll('.pin').forEach(function (el) { el.remove(); });
    state.pins[state.floor].forEach(function (p) {
      var hasNote = !!(p.note && p.note.trim());
      var pin = document.createElement('div');
      pin.className = 'pin' + (hasNote ? ' has-note' : '');
      pin.style.left = p.x + '%';
      pin.style.top = p.y + '%';
      pin.dataset.id = p.id;
      pin.textContent = p.label || '';
      pin.addEventListener('click', function (ev) {
        ev.stopPropagation();
        onPinClick(p);
      });
      pin.addEventListener('touchend', function (ev) {
        ev.stopPropagation();
      });
      stage.appendChild(pin);
    });
    renderStats();
  }

  function onPinClick(p) {
    if (state.mode === 'delete') {
      if (confirm((p.label || '이 지점') + ' 을 삭제할까요?')) {
        state.pins[state.floor] = state.pins[state.floor].filter(function (x) { return x.id !== p.id; });
        saveLocal(state.floor);
        renderPins();
        showToast('삭제됨');
      }
      return;
    }
    openSheet(p);
  }

  function openSheet(p) {
    var root = document.getElementById('sheetRoot');
    root.innerHTML = '';

    var bg = document.createElement('div');
    bg.className = 'sheet-bg';
    bg.addEventListener('click', closeSheet);

    var sheet = document.createElement('div');
    sheet.className = 'sheet';

    var title = document.createElement('h3');
    title.textContent = FLOOR_LABEL[state.floor] + ' 지점';
    sheet.appendChild(title);

    var labelInputLabel = document.createElement('label');
    labelInputLabel.textContent = '이름/번호';
    sheet.appendChild(labelInputLabel);

    var labelInput = document.createElement('input');
    labelInput.type = 'text';
    labelInput.id = 'pinLabelInput';
    labelInput.value = p.label || '';
    labelInput.placeholder = '예: 491, A-12 등';
    sheet.appendChild(labelInput);

    var noteLabel = document.createElement('label');
    noteLabel.textContent = '메모';
    sheet.appendChild(noteLabel);

    var textarea = document.createElement('textarea');
    textarea.id = 'pinNoteInput';
    textarea.value = p.note || '';
    textarea.placeholder = '예: 소화전 위치, 균열 발견, CCTV 등';
    sheet.appendChild(textarea);

    var actions = document.createElement('div');
    actions.className = 'sheet-actions';

    var saveBtn = document.createElement('button');
    saveBtn.className = 'btn primary';
    saveBtn.textContent = '저장';
    saveBtn.addEventListener('click', function () {
      p.label = document.getElementById('pinLabelInput').value.trim();
      p.note = document.getElementById('pinNoteInput').value.trim();
      saveLocal(state.floor);
      renderPins();
      closeSheet();
      showToast('저장됨');
    });

    var delBtn = document.createElement('button');
    delBtn.className = 'btn danger';
    delBtn.textContent = '삭제';
    delBtn.addEventListener('click', function () {
      if (confirm('이 지점을 삭제할까요?')) {
        state.pins[state.floor] = state.pins[state.floor].filter(function (x) { return x.id !== p.id; });
        saveLocal(state.floor);
        renderPins();
        closeSheet();
        showToast('삭제됨');
      }
    });

    var cancelBtn = document.createElement('button');
    cancelBtn.className = 'btn';
    cancelBtn.textContent = '닫기';
    cancelBtn.addEventListener('click', closeSheet);

    actions.appendChild(saveBtn);
    actions.appendChild(delBtn);
    actions.appendChild(cancelBtn);
    sheet.appendChild(actions);

    root.appendChild(bg);
    root.appendChild(sheet);
    setTimeout(function () { labelInput.focus(); }, 50);
  }

  function closeSheet() {
    document.getElementById('sheetRoot').innerHTML = '';
  }

  function setFloor(floor) {
    state.floor = floor;
    document.querySelectorAll('.tab').forEach(function (t) {
      t.classList.toggle('active', t.dataset.floor === floor);
    });
    renderFloorImage();
    ensureFloorLoaded(floor).then(renderPins);
  }

  function setMode(mode) {
    state.mode = mode;
    document.querySelectorAll('.modebtn').forEach(function (b) {
      b.classList.toggle('active', b.dataset.mode === mode);
    });
    var hint = document.getElementById('hintBar');
    if (mode === 'view') hint.textContent = '지점을 탭하면 메모를 볼 수 있습니다.';
    else if (mode === 'add') hint.textContent = '도면을 탭한 위치에 새 지점이 추가됩니다.';
    else if (mode === 'edit') hint.textContent = '지점을 탭하면 메모를 수정할 수 있습니다.';
    else if (mode === 'delete') hint.textContent = '지점을 탭하면 바로 삭제 확인이 뜹니다.';
  }

  function onStageClick(ev) {
    if (state.mode !== 'add') return;
    if (ev.target.closest('.pin')) return;
    var stage = document.getElementById('stage');
    var rect = stage.getBoundingClientRect();
    var xPct = ((ev.clientX - rect.left) / rect.width) * 100;
    var yPct = ((ev.clientY - rect.top) / rect.height) * 100;
    if (xPct < 0 || xPct > 100 || yPct < 0 || yPct > 100) return;
    var label = prompt('이름/번호를 입력하세요 (생략 가능)') || '';
    var id = nextId(state.floor);
    state.pins[state.floor].push({
      id: id,
      x: Math.round(xPct * 100) / 100,
      y: Math.round(yPct * 100) / 100,
      label: label.trim(),
      note: ''
    });
    saveLocal(state.floor);
    renderPins();
    var newPin = state.pins[state.floor][state.pins[state.floor].length - 1];
    showToast('지점 추가됨');
    openSheet(newPin);
  }

  function doSearch() {
    var q = document.getElementById('searchInput').value.trim().toLowerCase();
    if (!q) return;
    var floors = [state.floor].concat(FLOORS.filter(function (f) { return f !== state.floor; }));

    function tryFloor(idx) {
      if (idx >= floors.length) {
        showToast('"' + q + '" 를 찾을 수 없습니다');
        return;
      }
      var f = floors[idx];
      ensureFloorLoaded(f).then(function () {
        var hit = state.pins[f].find(function (p) {
          return (p.label && p.label.toLowerCase().indexOf(q) !== -1) ||
                 (p.note && p.note.toLowerCase().indexOf(q) !== -1);
        });
        if (!hit) {
          tryFloor(idx + 1);
          return;
        }
        if (f !== state.floor) {
          setFloor(f);
          setTimeout(function () { focusPin(hit); }, 250);
        } else {
          focusPin(hit);
        }
      });
    }
    tryFloor(0);
  }

  function focusPin(p) {
    var stageWrap = document.getElementById('stageWrap');
    var stage = document.getElementById('stage');
    var targetX = (p.x / 100) * stage.offsetWidth;
    var targetY = (p.y / 100) * stage.offsetHeight;
    stageWrap.scrollTo({
      left: Math.max(0, targetX - stageWrap.clientWidth / 2),
      top: Math.max(0, targetY - stageWrap.clientHeight / 2),
      behavior: 'smooth'
    });
    setTimeout(function () {
      var pinEl = stage.querySelector('.pin[data-id="' + p.id + '"]');
      if (pinEl) {
        pinEl.classList.remove('blink');
        void pinEl.offsetWidth;
        pinEl.classList.add('blink');
      }
    }, 350);
  }

  function exportData() {
    var payload = {};
    FLOORS.forEach(function (f) {
      payload[f] = { floor: f, pins: state.pins[f] || [] };
    });
    var blob = new Blob([JSON.stringify(payload, null, 1)], { type: 'application/json' });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = '주차장지점데이터.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showToast('내보내기 완료');
  }

  function importData(file) {
    var reader = new FileReader();
    reader.onload = function (e) {
      try {
        var payload = JSON.parse(e.target.result);
        FLOORS.forEach(function (f) {
          if (payload[f] && payload[f].pins) {
            state.pins[f] = payload[f].pins;
            state.loaded[f] = true;
            saveLocal(f);
          }
        });
        renderPins();
        showToast('불러오기 완료');
      } catch (err) {
        showToast('파일 형식이 올바르지 않습니다');
      }
    };
    reader.readAsText(file);
  }

  function init() {
    document.querySelectorAll('.tab').forEach(function (t) {
      t.addEventListener('click', function () { setFloor(t.dataset.floor); });
    });
    document.querySelectorAll('.modebtn').forEach(function (b) {
      b.addEventListener('click', function () { setMode(b.dataset.mode); });
    });
    document.getElementById('stage').addEventListener('click', onStageClick);
    document.getElementById('searchBtn').addEventListener('click', doSearch);
    document.getElementById('searchInput').addEventListener('keydown', function (e) {
      if (e.key === 'Enter') doSearch();
    });
    document.getElementById('exportBtn').addEventListener('click', exportData);
    document.getElementById('importBtn').addEventListener('click', function () {
      document.getElementById('fileInput').click();
    });
    document.getElementById('fileInput').addEventListener('change', function (e) {
      if (e.target.files && e.target.files[0]) importData(e.target.files[0]);
    });

    renderFloorImage();
    ensureFloorLoaded(state.floor).then(renderPins);
  }

  init();
})();
