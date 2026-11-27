# ioBroker.sainlogic — Improvement & Bugfix Tracker

Assessment baseline: `v1.3.0` (`npm run lint` passes; `npx tsc --noEmit` fails with 13 errors; `npm test` fails on `mocha --opts`).

---

## P0 — Immediate Bugs & Broken Test Runner

- [x] **Fix broken Mocha test runner**
  - `package.json` (`test:js`) runs `mocha --opts test/mocha.custom.opts`, which fails with `SyntaxError` on modern Mocha.
  - Replace `test/mocha.custom.opts` with `.mocharc.json` (or CLI flags) and update `package.json`.
- [x] **Fix `gw_address` undefined check in Scheduler**
  - Add `"gw_address": ""` to `native` in `io-package.json`.
  - Change `if (this.gw_address != '')` in `lib/scheduler.js` to `if (this.gw_address)` so `undefined` does not trigger `http://undefined/get_iot_device_list` on every tick.
- [x] **Fix typos & swapped metadata in `lib/constants.js`**
  - Fix `uvi_time` mapping: `scheduler: 'ivu_time'` → `'uvi_time'` (line 1037).
  - Fix `Get Daily Min Data` parser: `.uint16('pressurerl')` → `'pressurerel'` (line 2866).
  - Add missing `DATAFIELDS` definition for `heatindex` (parsed in `Get Current Data` and `Get Max Data`).
  - Fix swapped metadata between `depth_ch` (distance in `mm`, lines 2261–2278) and `ldsbatt` (battery voltage in `V`, lines 2280–2297).
- [x] **Fix inverted rain unit-conversion constants (`lib/constants.js`)**
  - Lines 11–12 swap the formulas (`mm_to_inch` multiplies by `25.4`; `inch_to_mm` divides by `25.4`). Rename/correct formulas and review rounding precision for inches (`roundTo(..., 1)` truncates small rainfall like `1 mm` = `0.04 in` to `0`).
- [x] **Guard unmapped attributes in `main.js` (`setStates`)**
  - Check `my_attr_def.length` before accessing `my_attr_def[0].unit_config` (lines 352–361) to prevent `TypeError` on unknown fields.
- [x] **Fix `Listener` WU forwarding & `forward_url` safety (`lib/listener.js`)**
  - Do not attach internal `last_listener_update` to the query object forwarded via `searchParams` in `PROT_WU` (lines 73, 84).
  - Wrap `new URL(this.forward_url)` in `try/catch` (lines 82, 117) so an invalid configured URL does not throw inside request handling.
- [x] **Fix `Gateway` event-listener leak & unconverted value bug (`lib/gateway.js`)**
  - Move `this.adapter.on('stateChange', ...)` out of `Gateway.run()` (line 30), which currently registers a new listener on every scheduler interval.
  - Pass converted `myobj[c_id]` instead of raw `json_data[name]` to `verify_datapoint` (lines 101–106).

---

## P1 — Reliability, Concurrency & Networking

- [x] **Eliminate async races & per-packet DB lookups in `main.js`**
  - Refactor `verify_datapoint`, `checkUnit`, and `migrateTemperatureDatapoints` to pure `async/await` (`getObjectAsync`, `setObjectNotExistsAsync`, `getStateAsync`, `setStateAsync`, `extendObjectAsync`).
  - Eliminate the race where `checkUnit` asynchronously reads/writes the old state value while `verify_datapoint` writes the new value.
  - Cache known/initialized datapoint IDs in memory instead of calling `getObject` for every field on every incoming update.
  - Re-subscribe writable states (`subscribeStates`) on adapter startup for already-existing objects, not only during object creation.
- [x] **Fix `Listener` regex matching & HTTP hardening (`lib/listener.js`, `lib/constants.js`)**
  - Replace `DATAFIELDS.filter(...)` + shared `element_index` mutation in `Listener.extract_values` (lines 189–196) with `.find()` or a deterministic matcher so later matches cannot overwrite `element_index`.
  - Anchor channel regexes in `lib/constants.js` with `$` where missing (e.g., `^soilmoisture([0-9]*)`, `^soilad([0-9]*)`, `^wh80batt([0-9]*)`).
  - Replace deprecated `url.parse()` (line 62) with WHATWG `new URL(...)`.
  - Enforce a maximum POST body size in `PROT_EW` (lines 101–105).
  - Verify `admin/jsonConfig.json` `listener_ip` default (`"listenOnAllPorts"`, line 27) vs `""` / `"0.0.0.0"` so `webServer.listen` cannot fail with `ENOTFOUND`.
  - Await `webServer.close(callback)` in `onUnload` (`main.js` line 433) so shutdown waits for the socket to close cleanly.
- [x] **Harden `Scheduler` TCP handling (`lib/scheduler.js`)**
  - Buffer incoming TCP chunks instead of assuming each `data` event contains one complete response frame.
  - Add a socket/request timeout and guard `this.activeCalls.length === 0` in `client_connect()`.
- [x] **Pre-compile `expr-eval` expressions**
  - Compile conversion formulas once at module/adapter startup instead of instantiating `new Parser()` in `toDisplayUnit`, `checkUnit`, `Listener.extract_values`, and `Scheduler.updateIODataStore`.
- [x] **Complete or clean up `Gateway` & choice-action stubs**
  - Replace/implement `TODO` stubs in `handleChoiceChange` / `executeChoiceAction` (`main.js` lines 221–254) for `water_action`, or cleanly gate/remove unfinished write handling.
  - Erledigt: `water_action` ist read-only; Schreib-/Subscribe-Logik (`onStateChange`, `handleChoiceChange`, `Gateway.onStateChange`) entfernt. Bestehende Objekte bekommen `write: false` beim ersten Update.

---

## P2 — Testing, Type Safety & Maintainability

- [ ] **Build real unit test coverage**
  - Replace the dummy test in `main.test.js` with unit tests for:
    - `lib/constants.js` integrity (`COMMANDS` ↔ `DATAFIELDS` parity, valid regexes, valid `units`).
    - `Listener.extract_values` (Wunderground & Ecowitt payloads, multi-digit channels like `soilmoisture12`, unmapped keys).
    - `Scheduler` binary response parsing and `timestamp_convert`.
    - `toDisplayUnit` / `checkUnit` unit conversions and migrations.
- [ ] **Fix TypeScript (`checkJs`) errors & enforce in CI**
  - Resolve all 13 `npx tsc --noEmit` errors across `lib/gateway.js`, `lib/listener.js`, `lib/scheduler.js`, `main.js`, and `main.test.js`.
  - Add a `check:ts` script to `package.json` and run it in `.github/workflows/test-and-release.yml`.
- [ ] **Tighten `min`/`max` limits & reject station sentinel values (`lib/constants.js`)**
  - Live test against an EasyWeatherV1.7.6 station (2026-11-27) stored placeholder values because they lie within the current limits:
    - `weather.maxvalues.absolut.UVraw` = `65535` (`0xffff`, limit `max: 100000`)
    - `weather.maxvalues.absolut.solarradiation` = `300000` lx (raw `0x002dc6c0`, limit `max: 300000`)
    - `weather.current.totalrainin` = `6000` mm (raw `0x0000ea60` = 60000, no `max` defined)
  - Set realistic limits (e.g. `UVraw` ≤ 20000, `solarradiation` < 200000 lx) or explicitly treat `0xffff` / `0xffffffff` as "no value".
  - Check whether `totalrainin` = 60000 is a station counter cap or a real value; add a `max` if needed.
  - Review all `DATAFIELDS` without `min`/`max`.
- [ ] **Deduplicate `lib/constants.js`**
  - Extract shared unit-definition presets (`TEMP_UNITS`, `RAIN_UNITS`, `PRESSURE_UNITS`, `WIND_UNITS`, `SOLAR_UNITS`) to reduce file size (~2,872 lines) and prevent copy-paste drift (e.g., `"Rainrate (Daily)"` reused for `eventrain`/`hourlyrain`/`dailyrain`, `weather.info` vs `info` channels).
  - Align unit options across `io-package.json`, `admin/jsonConfig.json`, and `lib/constants.js` (`mmHg` in `constants.js` vs `jsonConfig.json`; unused `unit_uv` in `io-package.json`).
- [ ] **Repository & documentation cleanup**
  - Remove legacy `admin/index_m.html_old`.
  - Clean up `package.json` (`"contributors": [{ "name": "tbd" }]`, unused `@types/gulp`).
  - Update `README.md` (remove dead `david-dm.org` / `nodei.co` badges, fix `EFWS290` typo, document Ecowitt protocol & Gateway support).

---

## CI / GitHub Automations

- [x] **Harden `test-and-release.yml` concurrency & permissions**
  - Restrict `cancel-in-progress` to `github.event_name == 'pull_request'` so `master` / tag deploys cannot be cancelled mid-run.
  - Set `permissions: contents: read` at workflow top level (with `contents: write` / `id-token: write` scoped only to `deploy`).
- [ ] **Add TypeScript check (`tsc --noEmit`) to CI**
  - Add `check:ts` in `package.json` and run it in `check-and-lint` once the 13 `tsc` errors are resolved.
- [x] **Make `automerge-dependabot.yml` options explicit**
  - Set `wait-for-checks: 'true'` and `merge-method: 'squash'` explicitly in `.github/workflows/automerge-dependabot.yml`.
- [x] **Group Dependabot updates in `.github/dependabot.yml`**
  - Add `groups` for `development` dependencies and `github-actions` to cut down on individual PRs and CI matrix runs.
- [ ] **GitHub repo settings & branch cleanup (manual in GitHub UI)**
  - Add a Ruleset / Branch Protection on `master` requiring `check-and-lint` and `adapter-tests` (0 required approvals, admin bypass enabled for `npm run release`).
  - Enable **Automatically delete head branches** in Repo Settings → General and clean up stale remote `dependabot/*` / old feature branches.

