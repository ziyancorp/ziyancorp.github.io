// State Management
const SPREADSHEET_ID = "1H9M1-V2strHR7rHGYuwLuyWCar_2GA1G8sDEn3rUpas";
let currentYear = 2026;
let currentMonth = 8; // Default Agustus
let tradeChartInstance = null;
let latestOcrData = null;

// Initial Sales Debt Seed Data
const DEFAULT_SALES_DEBTS = [
    { id: 1, sales_name: "Sales PT. Pan Barune", company_supplier: "PT. Pan Barune (R:182.717)", invoice_no: "INV-PB-717", invoice_date: "20/08/2026", due_date: "10/09/2026", total_amount: 3500000, paid_amount: 1083500, remaining_amount: 2416500, status: "Sebagian", notes: "Faktur Minyak & Sembako" },
    { id: 2, sales_name: "Sales Sanford", company_supplier: "PT. Sanford Air Mineral", invoice_no: "INV-SNF-042", invoice_date: "22/08/2026", due_date: "05/09/2026", total_amount: 2000000, paid_amount: 950000, remaining_amount: 1050000, status: "Sebagian", notes: "Galon & Botol Air Mineral" },
    { id: 3, sales_name: "Sales Setor AB-02", company_supplier: "Distributor AB-02", invoice_no: "INV-AB02-99", invoice_date: "25/08/2026", due_date: "02/09/2026", total_amount: 5000000, paid_amount: 2675000, remaining_amount: 2325000, status: "Sebagian", notes: "Setoran Stok Mingguan" },
    { id: 4, sales_name: "Sales Jojo Mart", company_supplier: "Jojo Mart Supplier", invoice_no: "INV-JM-104", invoice_date: "24/08/2026", due_date: "08/09/2026", total_amount: 2500000, paid_amount: 1226500, remaining_amount: 1273500, status: "Sebagian", notes: "Snack & Minuman Kemasan" },
    { id: 5, sales_name: "Sales Top Baker", company_supplier: "Top Baker Roti", invoice_no: "INV-TB-331", invoice_date: "26/08/2026", due_date: "08/09/2026", total_amount: 1800000, paid_amount: 1248000, remaining_amount: 552000, status: "Sebagian", notes: "Roti Tawar & Selai" },
    { id: 6, sales_name: "Sales PBD", company_supplier: "PT. PBD Distribusi", invoice_no: "INV-PBD-881", invoice_date: "27/08/2026", due_date: "12/09/2026", total_amount: 1200000, paid_amount: 347000, remaining_amount: 853000, status: "Sebagian", notes: "Bumbu Dapur & Kemasan" },
    { id: 7, sales_name: "Sales Sasa", company_supplier: "PT. Sasa Inti", invoice_no: "INV-SAS-109", invoice_date: "28/08/2026", due_date: "15/09/2026", total_amount: 500000, paid_amount: 243500, remaining_amount: 256500, status: "Sebagian", notes: "Penyedap Rasa & Tepung" }
];

function getSalesDebts() {
    const saved = localStorage.getItem("freshmart_sales_debts");
    if (!saved) {
        localStorage.setItem("freshmart_sales_debts", JSON.stringify(DEFAULT_SALES_DEBTS));
        return DEFAULT_SALES_DEBTS;
    }
    return JSON.parse(saved);
}

function saveSalesDebts(debts) {
    localStorage.setItem("freshmart_sales_debts", JSON.stringify(debts));
}

// Theme Toggle
function initTheme() {
    const savedTheme = localStorage.getItem("freshmart_theme") || "dark";
    applyTheme(savedTheme);
}

function toggleTheme() {
    const current = document.documentElement.getAttribute("data-theme") || "dark";
    const next = current === "dark" ? "light" : "dark";
    applyTheme(next);
}

function applyTheme(theme) {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem("freshmart_theme", theme);
    const btnText = document.getElementById("themeText");
    const btnIcon = document.querySelector("#themeToggleBtn i");

    if (btnText && btnIcon) {
        if (theme === "light") {
            btnText.innerText = "Mode Gelap";
            btnIcon.className = "fa-solid fa-moon text-purple";
        } else {
            btnText.innerText = "Mode Terang";
            btnIcon.className = "fa-solid fa-sun text-amber";
        }
    }
}

// Format Rupiah
function formatRupiah(num) {
    if (num === null || num === undefined || isNaN(num)) return "Rp 0";
    return "Rp " + Math.round(num).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
}

function formatPercent(num) {
    if (num === null || num === undefined || isNaN(num)) return "0.00%";
    const sign = num > 0 ? "+" : "";
    return `${sign}${(num * 100).toFixed(2)}%`;
}

// Navigation Tabs
function switchTab(tabId) {
    document.querySelectorAll(".nav-tab").forEach(tab => tab.classList.remove("active"));
    document.querySelectorAll(".tab-content").forEach(sec => sec.classList.remove("active"));

    const btn = Array.from(document.querySelectorAll(".nav-tab")).find(b => b.getAttribute("onclick").includes(tabId));
    if (btn) btn.classList.add("active");

    const target = document.getElementById(`tab-${tabId}`);
    if (target) target.classList.add("active");

    if (tabId === "dashboard") loadDashboard();
    if (tabId === "daily") loadDailyTransactions(currentMonth);
    if (tabId === "debts") loadDebts();
}

// Toast
function showToast(msg) {
    const t = document.getElementById("toast");
    t.innerText = msg;
    t.classList.add("show");
    setTimeout(() => t.classList.remove("show"), 3500);
}

// Fetch Google Sheet GViz API
async function fetchGoogleSheet(sheetName) {
    const url = `https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}/gviz/tq?tqx=out:json&sheet=${encodeURIComponent(sheetName)}`;
    const res = await fetch(url);
    const raw = await res.text();
    const start = raw.indexOf("(") + 1;
    const end = raw.lastIndexOf(")");
    const data = JSON.parse(raw.substring(start, end));
    return data.table;
}

// 1. LOAD DASHBOARD
async function loadDashboard() {
    try {
        const table = await fetchGoogleSheet("RINGKASAN");
        const months = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];
        
        let totalPendapatan = 0;
        let totalEstProfit = 0;
        let totalUangSimpan = 0;
        let totalSisaProfit = 0;
        
        const rowsData = [];
        
        // Loop through rows
        table.rows.forEach((r, idx) => {
            if (idx >= 12) return;
            const b = r.c[0] ? r.c[0].v : months[idx];
            const p = r.c[1] ? (typeof r.c[1].v === 'number' ? r.c[1].v : 0) : 0;
            const ep = r.c[2] ? (typeof r.c[2].v === 'number' ? r.c[2].v : 0) : 0;
            const us = r.c[3] ? (typeof r.c[3].v === 'number' ? r.c[3].v : 0) : 0;
            const sp = r.c[4] ? (typeof r.c[4].v === 'number' ? r.c[4].v : 0) : 0;
            const gr = r.c[5] ? (typeof r.c[5].v === 'number' ? r.c[5].v : 0) : 0;
            
            totalPendapatan += p;
            totalEstProfit += ep;
            totalUangSimpan += us;
            totalSisaProfit += sp;
            
            rowsData.push({ month: b, pendapatan: p, est_profit: ep, uang_simpan: us, sisa_profit: sp, growth_pct: gr });
        });

        // Update KPIs
        document.getElementById("kpi-total-pendapatan").innerText = formatRupiah(totalPendapatan);
        document.getElementById("kpi-est-profit").innerText = formatRupiah(totalEstProfit);
        document.getElementById("kpi-uang-simpan").innerText = formatRupiah(totalUangSimpan);
        document.getElementById("kpi-sisa-profit").innerText = formatRupiah(totalSisaProfit);

        // Update Table
        const tbody = document.getElementById("bukuBesarBody");
        tbody.innerHTML = "";
        rowsData.forEach((m, i) => {
            const tr = document.createElement("tr");
            const badgeClass = m.growth_pct >= 0 ? "growth-up" : "growth-down";
            tr.innerHTML = `
                <td><strong>${m.month}</strong></td>
                <td>${formatRupiah(m.pendapatan)}</td>
                <td>${formatRupiah(m.est_profit)}</td>
                <td>${formatRupiah(m.uang_simpan)}</td>
                <td><strong style="color: var(--cyan)">${formatRupiah(m.sisa_profit)}</strong></td>
                <td><span class="badge-growth ${badgeClass}">${formatPercent(m.growth_pct)}</span></td>
                <td class="no-print">
                    <button class="btn btn-sm btn-glass" onclick="goToMonth(${i + 1})">
                        <i class="fa-solid fa-folder-open"></i> Buka Kas
                    </button>
                </td>
            `;
            tbody.appendChild(tr);
        });

        // Render Foot
        document.getElementById("bukuBesarFoot").innerHTML = `
            <tr>
                <td>TOTAL YTD</td>
                <td>${formatRupiah(totalPendapatan)}</td>
                <td>${formatRupiah(totalEstProfit)}</td>
                <td>${formatRupiah(totalUangSimpan)}</td>
                <td>${formatRupiah(totalSisaProfit)}</td>
                <td>-</td>
                <td class="no-print">-</td>
            </tr>
        `;

        renderTradeChart(rowsData);

    } catch (err) {
        console.error("Dashboard error:", err);
    }
}

function renderTradeChart(data) {
    const ctx = document.getElementById("tradeChart").getContext("2d");
    if (tradeChartInstance) tradeChartInstance.destroy();

    const labels = data.map(d => d.month);
    const pendapatan = data.map(d => d.pendapatan);
    const estProfit = data.map(d => d.est_profit);
    const uangSimpan = data.map(d => d.uang_simpan);

    tradeChartInstance = new Chart(ctx, {
        type: "bar",
        data: {
            labels: labels,
            datasets: [
                {
                    label: "Pendapatan (Omset)",
                    data: pendapatan,
                    backgroundColor: "rgba(59, 130, 246, 0.75)",
                    borderRadius: 6
                },
                {
                    label: "Est. Profit 10%",
                    data: estProfit,
                    backgroundColor: "rgba(16, 185, 129, 0.85)",
                    borderRadius: 6
                },
                {
                    label: "Uang Simpan",
                    data: uangSimpan,
                    backgroundColor: "rgba(245, 158, 11, 0.85)",
                    borderRadius: 6
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { labels: { color: "#94a3b8" } }
            },
            scales: {
                x: { ticks: { color: "#94a3b8" }, grid: { color: "rgba(255,255,255,0.05)" } },
                y: { ticks: { color: "#94a3b8" }, grid: { color: "rgba(255,255,255,0.05)" } }
            }
        }
    });
}

function goToMonth(m) {
    currentMonth = m;
    switchTab("daily");
}

// 2. BUKU KAS HARIAN
const MONTH_NAMES = ["", "Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];

function renderMonthPills() {
    const container = document.getElementById("monthPills");
    container.innerHTML = "";
    for (let m = 1; m <= 12; m++) {
        const btn = document.createElement("button");
        btn.className = `month-pill ${m === currentMonth ? 'active' : ''}`;
        btn.innerText = MONTH_NAMES[m];
        btn.onclick = () => {
            currentMonth = m;
            renderMonthPills();
            loadDailyTransactions(m);
        };
        container.appendChild(btn);
    }
}

async function loadDailyTransactions(month) {
    renderMonthPills();
    const sheetName = MONTH_NAMES[month].toUpperCase();
    document.getElementById("daily-table-title").innerHTML = `<i class="fa-solid fa-calendar-check text-blue"></i> Transaksi Kas Harian: Bulan ${MONTH_NAMES[month]} 2026`;

    try {
        const table = await fetchGoogleSheet(sheetName);
        const tbody = document.getElementById("dailyTableBody");
        tbody.innerHTML = "";

        let sumMasuk = 0;
        let sumQris = 0;
        let sumCelengan = 0;
        let rowCount = 0;

        table.rows.forEach(r => {
            if (!r.c || !r.c[0] || !r.c[1]) return;
            const tgl = r.c[0].f || r.c[0].v;
            const masuk = r.c[1] ? (typeof r.c[1].v === 'number' ? r.c[1].v : 0) : 0;
            const keluar = r.c[2] ? (typeof r.c[2].v === 'number' ? r.c[2].v : 0) : 0;
            const baki = r.c[3] ? (typeof r.c[3].v === 'number' ? r.c[3].v : 0) : 0;
            const cash = r.c[4] ? (typeof r.c[4].v === 'number' ? r.c[4].v : 0) : 0;
            const simpan = r.c[5] ? (typeof r.c[5].v === 'number' ? r.c[5].v : 0) : 0;
            const gr = r.c[6] ? (typeof r.c[6].v === 'number' ? r.c[6].v : 0) : 0;
            const celengan = r.c[7] ? (typeof r.c[7].v === 'number' ? r.c[7].v : 0) : 0;
            const qris = r.c[8] ? (typeof r.c[8].v === 'number' ? r.c[8].v : 0) : 0;
            const arijal = r.c[9] ? (typeof r.c[9].v === 'number' ? r.c[9].v : 0) : 0;
            const riyan = r.c[10] ? (typeof r.c[10].v === 'number' ? r.c[10].v : 0) : 0;
            const azrafi = r.c[11] ? (typeof r.c[11].v === 'number' ? r.c[11].v : 0) : 0;
            const rumah = r.c[12] ? (typeof r.c[12].v === 'number' ? r.c[12].v : 0) : 0;
            const toko = r.c[13] ? (typeof r.c[13].v === 'number' ? r.c[13].v : 0) : 0;

            sumMasuk += masuk;
            sumQris += qris;
            sumCelengan += celengan;
            if (masuk > 0) rowCount++;

            const tr = document.createElement("tr");
            tr.innerHTML = `
                <td><strong>${tgl}</strong></td>
                <td><strong>${formatRupiah(masuk)}</strong></td>
                <td style="color: #f43f5e">${formatRupiah(keluar)}</td>
                <td>${formatRupiah(baki)}</td>
                <td><strong style="color: var(--amber)">${formatRupiah(cash)}</strong></td>
                <td>${formatRupiah(simpan)}</td>
                <td><span class="badge-growth ${gr >= 0 ? 'growth-up':'growth-down'}">${formatPercent(gr)}</span></td>
                <td>${formatRupiah(celengan)}</td>
                <td style="color: var(--cyan)">${formatRupiah(qris)}</td>
                <td>${formatRupiah(arijal)}</td>
                <td>${formatRupiah(riyan)}</td>
                <td>${formatRupiah(azrafi)}</td>
                <td>${formatRupiah(rumah)}</td>
                <td>${formatRupiah(toko)}</td>
            `;
            tbody.appendChild(tr);
        });

        document.getElementById("daily-month-omset").innerText = formatRupiah(sumMasuk);
        document.getElementById("daily-month-avg").innerText = formatRupiah(rowCount > 0 ? sumMasuk / rowCount : 0);
        document.getElementById("daily-month-qris").innerText = formatRupiah(sumQris);
        document.getElementById("daily-month-celengan").innerText = formatRupiah(sumCelengan);

    } catch (e) {
        console.error("Daily load error:", e);
    }
}

// 3. BUKU HUTANG SALES & SUPPLIER
function loadDebts() {
    const debts = getSalesDebts();
    const totalRemaining = debts.filter(d => d.status !== 'Lunas').reduce((acc, curr) => acc + curr.remaining_amount, 0);
    const totalPaid = debts.reduce((acc, curr) => acc + curr.paid_amount, 0);

    document.getElementById("debts-total-sales").innerText = formatRupiah(totalRemaining);
    document.getElementById("debts-total-lunas").innerText = formatRupiah(totalPaid);

    const body = document.getElementById("salesDebtBody");
    body.innerHTML = "";
    debts.forEach(d => {
        const tr = document.createElement("tr");
        const statusBadge = d.status === 'Lunas' 
            ? `<span class="badge-growth growth-up">Lunas</span>` 
            : `<span class="badge-growth growth-down">${d.status}</span>`;

        tr.innerHTML = `
            <td><strong>${d.sales_name}</strong></td>
            <td>${d.company_supplier}</td>
            <td>${d.invoice_no || '-'}</td>
            <td>${formatRupiah(d.total_amount)}</td>
            <td>${formatRupiah(d.paid_amount)}</td>
            <td><strong class="text-amber">${formatRupiah(d.remaining_amount)}</strong></td>
            <td>${d.due_date || '-'}</td>
            <td>${statusBadge}</td>
            <td class="no-print">
                ${d.status !== 'Lunas' ? `
                <button class="btn btn-sm btn-primary" onclick="openPaySalesModal(${d.id}, '${d.sales_name} (${d.company_supplier})', ${d.remaining_amount})">
                    <i class="fa-solid fa-handshake-angle"></i> Setor Uang
                </button>` : '<span style="color: #34d399; font-weight:700;"><i class="fa-solid fa-check-circle"></i> Lunas</span>'}
            </td>
        `;
        body.appendChild(tr);
    });
}

function openSalesModal() {
    document.getElementById("salesModal").classList.add("active");
}
function closeSalesModal() {
    document.getElementById("salesModal").classList.remove("active");
}
function handleSalesSubmit(e) {
    e.preventDefault();
    const debts = getSalesDebts();
    const total = parseFloat(document.getElementById("sales-amount").value) || 0;
    const newDebt = {
        id: Date.now(),
        sales_name: document.getElementById("sales-name").value,
        company_supplier: document.getElementById("sales-company").value,
        invoice_no: document.getElementById("sales-inv").value,
        invoice_date: document.getElementById("sales-date").value,
        due_date: document.getElementById("sales-due").value,
        total_amount: total,
        paid_amount: 0,
        remaining_amount: total,
        status: "Belum Lunas",
        notes: document.getElementById("sales-notes").value
    };
    debts.unshift(newDebt);
    saveSalesDebts(debts);
    showToast("Faktur Sales berhasil disimpan!");
    closeSalesModal();
    loadDebts();
}

function openPaySalesModal(id, target, rem) {
    document.getElementById("paySales-id").value = id;
    document.getElementById("paySales-target").value = target;
    document.getElementById("paySales-remaining").value = formatRupiah(rem);
    document.getElementById("paySales-amount").value = rem;
    document.getElementById("paySales-date").value = "31/08/2026";
    document.getElementById("paySalesModal").classList.add("active");
}
function closePaySalesModal() {
    document.getElementById("paySalesModal").classList.remove("active");
}
function handlePaySalesSubmit(e) {
    e.preventDefault();
    const id = parseInt(document.getElementById("paySales-id").value);
    const amount = parseFloat(document.getElementById("paySales-amount").value) || 0;
    const debts = getSalesDebts();
    const item = debts.find(d => d.id === id);
    if (item) {
        item.paid_amount += amount;
        item.remaining_amount = Math.max(0, item.total_amount - item.paid_amount);
        item.status = item.remaining_amount === 0 ? "Lunas" : "Sebagian";
        saveSalesDebts(debts);
        showToast("Setoran ke sales berhasil dicatat!");
        closePaySalesModal();
        loadDebts();
    }
}

function syncGoogleSheets() {
    showToast("Menyinkronkan data dengan Google Sheets...");
    loadDashboard();
    loadDailyTransactions(currentMonth);
}

function openInputModal() {
    document.getElementById("inputModal").classList.add("active");
}
function closeInputModal() {
    document.getElementById("inputModal").classList.remove("active");
}
function calculateBalance() {
    const masuk = parseFloat(document.getElementById("form-masuk").value) || 0;
    const keluar = parseFloat(document.getElementById("form-keluar").value) || 0;
    const baki = parseFloat(document.getElementById("form-baki").value) || 0;
    document.getElementById("form-cash").value = baki + masuk - keluar;
}

// Initial Load
document.addEventListener("DOMContentLoaded", () => {
    initTheme();
    loadDashboard();
});
