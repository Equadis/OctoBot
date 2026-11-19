// Optional sound alerts for the World Info raid panels. Off by default; nothing is requested or played until the visitor turns it on.
// Sounds are streamed from Wowhead's sound CDN (wow.zamimg.com) when played; no audio file is stored in this repository.
// Blizzard Entertainment sound effects, shown on Wowhead's sound pages. Settings live only in this browser.
(function () {
  'use strict';
  var CDN = 'https://wow.zamimg.com/sound-ids/live/enus/';
  // id, label, Wowhead sound page id (for reference), file path on the CDN
  var SOUNDS = [
    { id: 'raid-warning', label: 'Raid warning', wowhead: 8959, file: '101/567397/RaidWarning.ogg' },
    { id: 'map-ping', label: 'Map ping', wowhead: 3175, file: '120/567416/MapPing.ogg' },
    { id: 'alarm-clock', label: 'Alarm clock', wowhead: 12889, file: '162/567458/AlarmClockWarning3.ogg' },
    { id: 'alarm-clock-soft', label: 'Alarm clock (long)', wowhead: 18871, file: '140/567436/AlarmClockWarning1.ogg' },
    { id: 'dragon-roar', label: 'Dragon roar', wowhead: 7274, file: '22/547606/DragonAggro.ogg' },
    { id: 'nefarian-roar', label: 'Nefarian roar', wowhead: 8470, file: '30/569374/NefarianZoneDeath1.ogg' },
    { id: 'proto-dragon-roar', label: 'Proto-dragon roar', wowhead: 13753, file: '159/558495/ProtoDragonRoar.ogg' },
    { id: 'fel-reaver', label: 'Fel Reaver alarm', wowhead: 10571, file: '16/548880/FelReaverPreAggro.ogg' },
    { id: 'gong', label: 'Gong', wowhead: 12827, file: '60/565564/G_GongTroll01.ogg' },
    { id: 'scourge-horn', label: 'Scourge horn', wowhead: 13363, file: '90/567386/scourge_horn.ogg' },
    { id: 'zeppelin-horn', label: 'Zeppelin horn', wowhead: 16381, file: '191/566719/ZeppelinHorn.ogg' },
    { id: 'war-horn', label: 'Warsong war horn', wowhead: 43448, file: '35/1036067/FX_Warsong_WarHorn_6.ogg' },
    { id: 'level-up', label: 'Level up', wowhead: 888, file: '249/569593/LevelUp.ogg' },
    { id: 'ready-check', label: 'Ready check', wowhead: 8960, file: '182/567478/levelup2.ogg' },
    { id: 'quest-activate', label: 'Quest activated', wowhead: 618, file: '104/567400/iQuestActivate.ogg' }
  ];
  var EVENTS = [
    { key: 'soon', label: 'Estimated clear ending soon', note: 'When the estimated clear is close, a few minutes from now.' },
    { key: 'finished', label: 'Raid finished', note: 'Chronicle final boss kill preferred; otherwise a sustained roster departure. One alert per raid.' },
    { key: 'allianceDrop', label: 'Head dropped: Alliance', note: 'A confirmed Rallying Cry announcement in Stormwind.' },
    { key: 'hordeDrop', label: 'Head dropped: Horde', note: 'A confirmed Rallying Cry announcement in Orgrimmar.' }
  ];
  var KEY = 'octobot-raid-sounds';
  // Events that can be switched off by the page. "soon" stays unavailable until the clear estimate has medium or high confidence.
  var availability = { soon: false };
  var rowRefs = {};
  var DEFAULTS = {
    enabled: false, volume: 60, soonMinutes: 5,
    events: {
      soon: { on: true, sound: 'map-ping' },
      finished: { on: true, sound: 'raid-warning' },
      allianceDrop: { on: true, sound: 'dragon-roar' },
      hordeDrop: { on: true, sound: 'war-horn' }
    }
  };
  var soundById = function (id) { return SOUNDS.find(function (s) { return s.id === id; }) || null; };

  function load() {
    var settings = JSON.parse(JSON.stringify(DEFAULTS));
    try {
      var saved = JSON.parse(localStorage.getItem(KEY) || '{}');
      settings.enabled = saved.enabled === true;
      if (Number.isFinite(saved.volume)) settings.volume = Math.min(100, Math.max(0, Math.round(saved.volume)));
      if ([2, 5, 10].indexOf(saved.soonMinutes) >= 0) settings.soonMinutes = saved.soonMinutes;
      EVENTS.forEach(function (e) {
        var s = saved.events && saved.events[e.key];
        if (s && typeof s === 'object') {
          if (typeof s.on === 'boolean') settings.events[e.key].on = s.on;
          if (soundById(s.sound)) settings.events[e.key].sound = s.sound;
        }
      });
    } catch (error) { /* storage unavailable or damaged: defaults apply */ }
    return settings;
  }
  var settings = load();
  function save() { try { localStorage.setItem(KEY, JSON.stringify(settings)); } catch (error) { /* ignore */ } }

  var blockedNote = null;
  // Only one sound plays at a time: a new sound cuts the one that is still playing short.
  var playing = null;
  function stopCurrent() {
    if (!playing) return;
    try { playing.pause(); playing.currentTime = 0; } catch (error) { /* already finished */ }
    playing = null;
  }
  function play(soundId, options) {
    var sound = soundById(soundId);
    if (!sound) return;
    stopCurrent();
    var audio = new Audio(CDN + sound.file);
    playing = audio;
    audio.addEventListener('ended', function () { if (playing === audio) playing = null; });
    audio.volume = Math.min(1, Math.max(0, settings.volume / 100));
    var promise = audio.play();
    if (promise && promise.catch) promise.catch(function () {
      if (blockedNote && !(options && options.quiet)) blockedNote('Your browser blocked the sound. Click anywhere on the page once, then try again.');
    });
  }
  // Called by the World Info page when something happens. Nothing plays unless alerts are on and that event is on.
  function notify(eventKey) {
    if (!settings.enabled) return false;
    if (availability[eventKey] === false) return false;
    var event = settings.events[eventKey];
    if (!event || !event.on) return false;
    play(event.sound);
    return true;
  }

  function el(tag, attrs, children) {
    var node = document.createElement(tag);
    Object.keys(attrs || {}).forEach(function (k) { if (k === 'text') node.textContent = attrs[k]; else if (k === 'class') node.className = attrs[k]; else node.setAttribute(k, attrs[k]); });
    (children || []).forEach(function (c) { node.append(c); });
    return node;
  }

  // Greys out an event's row while it is unavailable, with a note saying why.
  function applyAvailability() {
    Object.keys(rowRefs).forEach(function (key) {
      var ref = rowRefs[key], ok = availability[key] !== false;
      ref.row.classList.toggle('disabled', !ok);
      ref.inputs.forEach(function (input) { input.disabled = !ok; });
      if (ref.note) ref.note.hidden = ok;
    });
  }
  function setAvailability(key, ok) {
    if (availability[key] === ok) return;
    availability[key] = ok;
    applyAvailability();
  }

  function mount(button, panel, stateLabel) {
    var status = el('p', { class: 'sound-note', role: 'status' });
    blockedNote = function (message) { status.textContent = message; };
    var refreshButton = function () { stateLabel.textContent = settings.enabled ? 'On' : 'Off'; button.classList.toggle('on', settings.enabled); };

    var master = el('input', { type: 'checkbox', id: 'sound-enabled' });
    master.checked = settings.enabled;
    master.addEventListener('change', function () {
      settings.enabled = master.checked; save(); refreshButton();
      status.textContent = settings.enabled ? 'Sound alerts are on while this page is open.' : '';
    });
    var volume = el('input', { type: 'range', min: '0', max: '100', step: '5', id: 'sound-volume', 'aria-label': 'Volume' });
    volume.value = String(settings.volume);
    var volumeText = el('span', { class: 'sound-volume-text', text: settings.volume + '%' });
    volume.addEventListener('input', function () { settings.volume = Number(volume.value); volumeText.textContent = settings.volume + '%'; save(); });

    var rows = EVENTS.map(function (event) {
      var on = el('input', { type: 'checkbox', 'aria-label': event.label });
      on.checked = settings.events[event.key].on;
      on.addEventListener('change', function () { settings.events[event.key].on = on.checked; save(); });
      var select = el('select', { 'aria-label': event.label + ' sound' });
      SOUNDS.forEach(function (s) { var o = el('option', { value: s.id, text: s.label }); if (s.id === settings.events[event.key].sound) o.selected = true; select.append(o); });
      select.addEventListener('change', function () { settings.events[event.key].sound = select.value; save(); play(select.value, { quiet: false }); });
      var test = el('button', { type: 'button', class: 'sound-test', title: 'Play this sound', 'aria-label': 'Play ' + event.label + ' sound' });
      test.innerHTML = '<svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true"><polygon points="7,4 20,12 7,20" fill="currentColor"/></svg>';
      test.addEventListener('click', function () { play(settings.events[event.key].sound); });
      var label = el('label', { class: 'sound-event-label' }, [on, el('span', { text: event.label })]);
      var controls = el('div', { class: 'sound-controls' }, [select, test]);
      var row = el('div', { class: 'sound-row', title: event.note }, [label, controls]);
      rowRefs[event.key] = { row: row, inputs: [on, select, test], note: event.key === 'soon' ? el('p', { class: 'sound-disabled-note', text: 'This option is disabled until estimated clear confidence is higher.' }) : null };
      if (rowRefs[event.key].note) row.append(rowRefs[event.key].note);
      return row;
    });

    panel.append(
      el('div', { class: 'sound-row sound-master' }, [el('label', { class: 'sound-event-label' }, [master, el('span', { text: 'Play sound alerts' })]), el('label', { class: 'sound-volume' }, [el('span', { text: 'Volume' }), volume, volumeText])]),
      el('div', { class: 'sound-list' }, rows),
      status,
      el('p', { class: 'sound-fine', text: 'Off by default. Alerts play only while this page is open. Sound effects are streamed from Wowhead; they are Blizzard Entertainment content.' })
    );
    refreshButton();
    applyAvailability();
    button.addEventListener('click', function () {
      var open = panel.hidden;
      panel.hidden = !open;
      button.setAttribute('aria-expanded', String(open));
    });
  }

  window.RaidSounds = { stop: stopCurrent, setAvailability: setAvailability, SOUNDS: SOUNDS, EVENTS: EVENTS, settings: function () { return settings; }, notify: notify, play: play, mount: mount, KEY: KEY };
})();
