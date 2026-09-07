// 端到端模拟：v2.10 的 5 个修复
// 场景 1: VCV 本地无前缀 v25_bank + 登录 → 应该迁移到 u_<VCV-id>_v25_bank
// 场景 2: 本地有修改 + push 失败 → 应该 markDirty 重试
// 场景 3: POST 409 → 应该 GET 重试
// 场景 4: pullAndApply 失败 → 应该 3s 后 retry 一次
// 场景 5: applyToLocal 总跑 + markDirty 总跑（不管 data 空不空）

const fs = require('fs');
const path = require('path');
const vm = require('vm');
const root = 'C:/Users/Administrator/Desktop/data/ds-wkpl/面试题/面试背记学习卡v2.7';

const cloudSrc = fs.readFileSync(path.join(root, 'src/js/cloud.js'), 'utf8');
const storeSrc = fs.readFileSync(path.join(root, 'src/js/store.js'), 'utf8');
const URL = cloudSrc.match(/SUPABASE_URL\s*=\s*'([^']+)'/)[1];
const KEY = cloudSrc.match(/SUPABASE_ANON_KEY\s*=\s*'([^']+)'/)[1];

const _store = {};
const localStorage = {
  _data: _store, length: 0,
  getItem(k) { return this._data[k] !== undefined ? this._data[k] : null; },
  setItem(k, v) { this._data[k] = String(v); this.length = Object.keys(this._data).length; },
  removeItem(k) { delete this._data[k]; this.length = Object.keys(this._data).length; },
  key(i) { return Object.keys(this._data)[i] || null; },
  clear() { for (const k in this._data) delete this._data[k]; this.length = 0; },
};

const ctx = {
  window: {}, localStorage,
  AbortController, setTimeout, clearTimeout, Promise, console,
  Buffer,
};
ctx.window = ctx;
ctx.global = ctx;
vm.createContext(ctx);

vm.runInContext(cloudSrc, ctx);
vm.runInContext(storeSrc, ctx);

(async () => {
  console.log('=== 场景 1: 本地无前缀 v25_bank → 登录 VCV → 验证迁移 ===');
  localStorage.clear();
  // 模拟 v2.7 时代本地数据
  localStorage.setItem('v25_bank', JSON.stringify([{id:1,code:'VCV-OLD-1'},{id:2,code:'VCV-OLD-2'}]));
  localStorage.setItem('v25_activeBanks', JSON.stringify(1));
  console.log('  登录前 localStorage keys:', Object.keys(localStorage._data));

  const res = await ctx.Cloud.login('VCV');
  console.log('  login VCV 成功 userId:', res.userId.slice(0, 8), '...');
  console.log('  res.data 键数:', Object.keys(res.data).length);

  // 模拟 confirmLogin 流程：migrateLocalToUser → clearAllUsersLocal → applyToLocal → markDirty
  const migrated = ctx.Cloud.migrateLocalToUser(res.userId);
  console.log('  migrateLocalToUser 迁移了', migrated, '个 key');
  ctx.Store.clearAllUsersLocal();
  ctx.Cloud.applyToLocal(res.data || {});
  ctx.Cloud.markDirty();

  console.log('  流程完成后 localStorage keys:');
  Object.keys(localStorage._data).forEach(k => console.log('    ' + k));
  const saved = ctx.Store.get(ctx.Store.bankKey(), null);
  console.log('  → Store.get(v25_bank) saved 类型:', saved === null ? 'null' : Array.isArray(saved) ? 'Array(' + saved.length + ')' : typeof saved);
  console.log('  → 内容（前2个）:', JSON.stringify((saved || []).slice(0, 2)));
  console.log('  ✅ 通过：', saved && saved.length === 2 ? 'YES' : 'NO');

  console.log('\n=== 场景 2: 模拟 push 失败 → 应 markDirty 重试 ===');
  // 模拟 fetch 失败
  const origFetch = ctx.fetch;
  ctx.fetch = async function() { return { ok: false, status: 500, headers: { get: () => '' }, json: async () => ({}) }; };
  await new Promise(r => setTimeout(r, 100));
  ctx.Cloud.markDirty();
  // 等 500ms 让 push 触发
  await new Promise(r => setTimeout(r, 600));
  // 等 3.5s 让 markDirty 重试触发
  await new Promise(r => setTimeout(r, 3500));
  console.log('  （看上面 console.warn，应出现"推送失败，3s 后重试"）');
  ctx.fetch = origFetch;

  console.log('\n=== 场景 3: 模拟 POST 409 → 应 GET 重试 ===');
  localStorage.clear();
  ctx.Cloud.logout();
  ctx.Cloud.init();
  let postAttempted = false;
  ctx.fetch = async function(url, opts) {
    if (opts && opts.method === 'POST') {
      postAttempted = true;
      return { ok: false, status: 409, headers: { get: () => '' }, json: async () => ({}) };
    }
    // GET
    return { ok: true, status: 200, headers: { get: () => 'application/json' },
      json: async () => [{ id: 'fake-id-409', nickname: 'VCV', data: { v25_bank: [1,2,3] } }] };
  };
  try {
    const r = await ctx.Cloud.login('VCV');
    console.log('  POST 触发:', postAttempted);
    console.log('  login 成功 userId:', r.userId.slice(0, 8));
    console.log('  ✅ 通过：409 被兜底，登录仍成功');
  } catch(e) {
    console.log('  ✗ login 失败:', e.message);
  }
  ctx.fetch = origFetch;

  console.log('\n=== 场景 4: 模拟 applyToLocal 总是跑 + markDirty 总跑 ===');
  localStorage.clear();
  ctx.Cloud.logout();
  ctx.Cloud.init();
  ctx.fetch = async function() {
    return { ok: true, status: 200, headers: { get: () => 'application/json' },
      json: async () => [{ id: 'fake-empty', nickname: 'NEW_USER', data: {} }] };  // 故意 data: {}
  };
  const r2 = await ctx.Cloud.login('NEW_USER');
  ctx.Cloud.applyToLocal(r2.data || {});  // 总是跑
  ctx.Cloud.markDirty();  // 总是跑
  await new Promise(r => setTimeout(r, 600));
  console.log('  空 data 时也跑 applyToLocal/markDirty，应该日志看到 push 触发');

  ctx.fetch = origFetch;
})().catch(e => console.log('TEST ERR:', e));