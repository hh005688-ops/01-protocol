// 初始化資料
let DATA = JSON.parse(localStorage.getItem('than_m7_v110')) || { 
    activeIndex: 0, 
    accounts: [{ name: '我的質押帳戶', debt: 0, cashflow: 0, loanAmount: 0, loanRate: 0, loanRepaid: 0, assets: [] }] 
};
let myChart;

// 側邊欄切換
function toggleSettings() { 
    const d = document.getElementById('settings-drawer');
    if (d) d.classList.toggle('translate-x-full'); 
    if (d && !d.classList.contains('translate-x-full')) loadSettings(); 
}

// 載入設定數據
function loadSettings() {
    const acc = DATA.accounts[DATA.activeIndex];
    document.getElementById('cfg-acc-name').value = acc.name || '';
    document.getElementById('cfg-debt').value = acc.debt || 0;
    document.getElementById('cfg-cashflow').value = acc.cashflow || 0;
    document.getElementById('cfg-loan-amount').value = acc.loanAmount || 0;
    document.getElementById('cfg-loan-rate').value = acc.loanRate || 0;
    document.getElementById('cfg-loan-repaid').value = acc.loanRepaid || 0;
    const container = document.getElementById('cfg-asset-rows');
    container.innerHTML = '';
    if (acc.assets) acc.assets.forEach(a => addAssetRow(a.code, a.val, a.target));
}

// 增加資產列
function addAssetRow(code='', val='', target='') {
    const div = document.createElement('div');
    div.className = "bg-white/5 p-3 rounded-xl flex gap-2 items-center";
    div.innerHTML = `
        <input type="text" placeholder="代號" class="flex-1 bg-slate-800 p-2 rounded-lg text-xs cfg-a-code font-bold outline-none border border-white/5" value="${code}">
        <input type="number" placeholder="市值" class="w-[30%] bg-slate-800 p-2 rounded-lg text-xs cfg-a-val font-bold outline-none" value="${val}">
        <input type="number" placeholder="目標%" class="w-[20%] bg-slate-800 p-2 rounded-lg text-xs cfg-a-target font-bold outline-none" value="${target}">
        <button onclick="this.parentElement.remove()" class="text-rose-500 font-bold px-1 text-lg">✕</button>`;
    document.getElementById('cfg-asset-rows').appendChild(div);
}

// 儲存並運行
function saveAndRun() {
    const acc = DATA.accounts[DATA.activeIndex];
    acc.name = document.getElementById('cfg-acc-name').value;
    acc.debt = parseFloat(document.getElementById('cfg-debt').value) || 0;
    acc.cashflow = parseFloat(document.getElementById('cfg-cashflow').value) || 0;
    acc.loanAmount = parseFloat(document.getElementById('cfg-loan-amount').value) || 0;
    acc.loanRate = parseFloat(document.getElementById('cfg-loan-rate').value) || 0;
    acc.loanRepaid = parseFloat(document.getElementById('cfg-loan-repaid').value) || 0;
    
    const codes = document.querySelectorAll('.cfg-a-code'), vals = document.querySelectorAll('.cfg-a-val'), targets = document.querySelectorAll('.cfg-a-target');
    acc.assets = [];
    codes.forEach((c, i) => { if (c.value) acc.assets.push({ code: c.value, val: parseFloat(vals[i].value) || 0, target: parseFloat(targets[i].value) || 0 }); });
    
    localStorage.setItem('than_m7_v110', JSON.stringify(DATA));
    document.getElementById('settings-drawer').classList.add('translate-x-full');
    run();
}

// 核心計算引擎
function run() {
    const acc = DATA.accounts[DATA.activeIndex];
    if (!acc) return;

    const totalAsset = acc.assets.reduce((sum, a) => sum + a.val, 0);
    const netWorth = totalAsset - acc.debt;
    const totalDebt = acc.debt + (acc.loanAmount || 0);
    
    // 斜率精算
    const slope = totalDebt > 0 ? (acc.cashflow / totalDebt) * 100 : 0;
    const slopeEl = document.getElementById('ui-slope-info');
    if (slopeEl) slopeEl.innerText = `淨值抗跌斜率: ${slope.toFixed(4)}% / Month`;

    const ratio = (acc.debt > 0 && totalAsset > 0) ? Math.round((totalAsset / acc.debt) * 100) : 0;
    const survival = ratio > 0 ? Math.round((1 - (160 / ratio)) * 100) : 0;

    const ratioEl = document.getElementById('ui-ratio');
    if (ratioEl) {
        ratioEl.innerText = (ratio > 2000 ? '>2000' : (ratio === 0 ? '0' : ratio)) + '%';
        ratioEl.style.color = (ratio > 0 && ratio < 180) ? 'var(--m7-red)' : 'var(--m7-green)';
    }

    const assetEl = document.getElementById('ui-total-assets');
    if (assetEl) assetEl.innerText = `NT$ ${Math.round(totalAsset).toLocaleString()}`;
    
    const barEl = document.getElementById('ui-survival-bar');
    if (barEl) barEl.style.width = Math.max(0, Math.min(100, survival)) + '%';

    updateLevel(netWorth, totalAsset);
    updateTable(acc.assets, totalAsset);
    updateStressTest(acc.debt, totalAsset);
    updateChart(acc.assets, totalAsset);
}

function updateLevel(netWorth, totalAsset) {
    let lv = 1, name = "核心擴張階段", exp = 0, advice = "[ 戰略建議 ] 維持 2.5x 槓桿加速複利。";
    if (netWorth >= 10000000) {
        lv = 3; name = "終極收割階段"; exp = 100; advice = "[ 戰略建議 ] 槓桿降至 1.5x。鎖定勝局。";
    } else if (netWorth >= 5000000) {
        lv = 2; name = "戰略穩固階段"; exp = Math.round(((netWorth - 5000000) / 5000000) * 100); advice = "[ 戰略建議 ] 槓桿降至 2.0x。無視噪音。";
    } else {
        exp = Math.round((Math.max(0, netWorth) / 5000000) * 100);
    }
    document.getElementById('ui-lv-tag').innerText = `Level ${lv}`;
    document.getElementById('ui-lv-name').innerText = name;
    document.getElementById('ui-exp-percent').innerText = `${exp}%`;
    document.getElementById('ui-exp-bar').style.width = `${exp}%`;
    document.getElementById('ui-lv-advice').innerText = advice;
}

function updateTable(assets, totalAsset) {
    const tbody = document.getElementById('ui-asset-table');
    if (!tbody) return;
    tbody.innerHTML = assets.length > 0 ? assets.map(a => {
        const diff = (totalAsset * (a.target / 100)) - a.val;
        return `<tr><td class="py-5 font-bold text-lg">${a.code}</td><td class="text-right text-gray-500 font-bold">${a.target}%</td><td class="text-right font-black ${diff >= 0 ? 'text-emerald-400' : 'text-rose-400'}">${Math.round(diff).toLocaleString()}</td></tr>`;
    }).join('') : '<tr><td colspan="3" class="py-10 text-center text-gray-500 italic">請輸入資產數據</td></tr>';
}

function updateStressTest(debt, totalAsset) {
    const grid = document.getElementById('ui-stress-grid');
    if (!grid) return;
    grid.innerHTML = [10, 20, 30, 40, 50, 60].map(d => {
        const sRatio = (debt > 0 && totalAsset > 0) ? Math.round((totalAsset * (1 - d/100) / debt) * 100) : 0;
        return `<div class="bg-white/5 p-4 rounded-2xl text-center"><p class="text-[9px] text-gray-500 font-bold mb-1">大盤下跌 ${d}%</p><p class="text-lg font-black ${sRatio > 0 && sRatio < 160 ? 'text-rose-400' : 'text-emerald-400'}">${sRatio > 0 ? sRatio + '%' : '--%'}</p></div>`;
    }).join('');
}

function updateChart(assets, total) {
    const canvas = document.getElementById('weightChart');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (myChart) myChart.destroy();
    myChart = new Chart(ctx, { 
        type: 'doughnut', 
        data: { 
            labels: assets.map(a => `${a.code} (${Math.round(a.val/(total||1)*100)}%)`), 
            datasets: [{ data: assets.map(a => a.val), backgroundColor: ['#10B981', '#3B82F6', '#F59E0B', '#F43F5E', '#8B5CF6'], borderWidth: 0 }] 
        }, 
        options: { plugins: { legend: { display: false } }, cutout: '82%' } 
    });
}

function updateSwitcher() { 
    const s = document.getElementById('ui-acc-switcher');
    if (s) s.innerHTML = DATA.accounts.map((acc, i) => `<option value="${i}">${acc.name || '未命名'}</option>`).join(''); 
}
function switchAccount(idx) { DATA.activeIndex = parseInt(idx); run(); }

// 確保頁面載入後才執行
window.onload = () => { updateSwitcher(); run(); };
