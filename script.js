let transactions = JSON.parse(localStorage.getItem("kas")) || [];
let pieChart, lineChart;

// Set default tanggal input
document.addEventListener("DOMContentLoaded", () => {
    document.getElementById("date").value = new Date().toISOString().split("T")[0];
});

// Simpan data
function save() {
    localStorage.setItem("kas", JSON.stringify(transactions));
}

// Format rupiah
function formatRupiah(num) {
    return "Rp " + num.toLocaleString("id-ID");
}

/* ===========================================================
   HITUNG MUNDUR RESET MINGGUAN (7 hari dari transaksi pertama)
   =========================================================== */
function weeklyCountdown() {
    const start = localStorage.getItem("weeklyStartDate");
    if (!start) {
        document.getElementById("weeklyCountdown").textContent = "-";
        return;
    }

    const startDate = new Date(start);
    const now = new Date();
    const diff = 7 - Math.floor((now - startDate) / (1000 * 60 * 60 * 24));

    document.getElementById("weeklyCountdown").textContent = 
        diff > 0 ? diff + " hari" : "Reset hari ini!";
}

/* ===========================================================
   HITUNG MUNDUR RESET BULANAN (sampai tanggal 1 bulan berikutnya)
   =========================================================== */
function monthlyCountdown() {
    const now = new Date();
    const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);

    const diff = Math.ceil((nextMonth - now) / (1000 * 60 * 60 * 24));

    document.getElementById("monthlyCountdown").textContent = 
        diff + " hari";
}

/* ===========================================================
   RESET OTOMATIS
   =========================================================== */
function resetIfNeeded() {
    const today = new Date();

    // RESET MINGGUAN 7 HARI
    let weeklyStart = localStorage.getItem("weeklyStartDate");

    if (weeklyStart) {
        const startDate = new Date(weeklyStart);
        const diff = (today - startDate) / (1000 * 60 * 60 * 24);

        if (diff >= 7) {
            console.log("Reset transaksi weekly (sudah 7 hari)");

            transactions = transactions.filter(t => t.category !== "weekly");

            localStorage.setItem("weeklyStartDate", today.toISOString().split("T")[0]);
            save();
        }
    }

    // RESET BULANAN ketika bulan berganti
    const currentMonth = today.getMonth();
    const lastMonthlyReset = localStorage.getItem("lastMonthlyReset");

    if (!lastMonthlyReset || parseInt(lastMonthlyReset) !== currentMonth) {
        console.log("Reset transaksi bulanan (bulan baru)");

        transactions = transactions.filter(t => t.category !== "monthly");

        localStorage.setItem("lastMonthlyReset", currentMonth);
        save();
    }
}

/* ===========================================================
   TAMBAH TRANSAKSI
   =========================================================== */
function addTransaction() {
    const t = {
        type: document.getElementById("type").value,
        category: document.getElementById("category").value,
        amount: parseInt(document.getElementById("amount").value),
        desc: document.getElementById("desc").value,
        date: document.getElementById("date").value
    };

    if (!t.amount) return alert("Nominal wajib!");
    if (!t.date) return alert("Tanggal wajib!");

    transactions.push(t);

    // Tentukan tanggal mulai weekly
    if (t.category === "weekly") {
        let start = localStorage.getItem("weeklyStartDate");
        if (!start) localStorage.setItem("weeklyStartDate", t.date);
    }

    save();
    update();
}

/* ===========================================================
   HAPUS TRANSAKSI
   =========================================================== */
function deleteTransaction(i) {
    transactions.splice(i, 1);
    save();
    update();
}

/* ===========================================================
   FILTER TRANSAKSI
   =========================================================== */
function applyFilter() {
    const f = document.getElementById("filter").value;

    if (f === "weekly") {
        const now = new Date();
        const weekAgo = new Date(now - 7 * 86400000);
        return transactions.filter(t => new Date(t.date) >= weekAgo);
    }

    if (f === "monthly") {
        const month = new Date().getMonth();
        return transactions.filter(t => new Date(t.date).getMonth() === month);
    }

    return transactions;
}

/* ===========================================================
   RENDER LIST TRANSAKSI
   =========================================================== */
function renderList(list) {
    const box = document.getElementById("transactionList");
    box.innerHTML = "";

    list.forEach((t, i) => {
        box.innerHTML += `
            <div class="transaction-card">
                <div>
                    <strong>${t.type === "income" ? "Pemasukan" : "Pengeluaran"}</strong>
                    (${t.category})<br>
                    ${formatRupiah(t.amount)} - ${t.desc}
                    <br><small>${t.date}</small>
                </div>
                <button class="delete-btn" onclick="deleteTransaction(${i})">Hapus</button>
            </div>
        `;
    });
}

/* ===========================================================
   DASHBOARD SALDO MINGGUAN & BULANAN
   =========================================================== */
function updateDashboard(list) {
    let weeklyIncome = 0, weeklyExpense = 0;
    let monthlyIncome = 0, monthlyExpense = 0;

    list.forEach(t => {
        if (t.category === "weekly") {
            if (t.type === "income") weeklyIncome += t.amount;
            else weeklyExpense += t.amount;
        }

        if (t.category === "monthly") {
            if (t.type === "income") monthlyIncome += t.amount;
            else monthlyExpense += t.amount;
        }
    });

    const saldoWeekly = weeklyIncome - weeklyExpense;
    const saldoMonthly = monthlyIncome - monthlyExpense;

    document.getElementById("saldoWeekly").textContent = formatRupiah(saldoWeekly);
    document.getElementById("saldoMonthly").textContent = formatRupiah(saldoMonthly);
    document.getElementById("saldoTotal").textContent = formatRupiah(saldoWeekly + saldoMonthly);
}

/* ===========================================================
   PIE CHART
   =========================================================== */
function renderPieChart(list) {
    const income = list.filter(t => t.type === "income").reduce((a,b)=>a+b.amount,0);
    const expense = list.filter(t => t.type === "expense").reduce((a,b)=>a+b.amount,0);

    if (pieChart) pieChart.destroy();

    pieChart = new Chart(document.getElementById("pieChart"), {
        type: "pie",
        data: {
            labels: ["Pemasukan", "Pengeluaran"],
            datasets: [{
                data: [income, expense],
                backgroundColor: ["#34c759", "#ff3b30"]
            }]
        }
    });
}

/* ===========================================================
   LINE CHART
   =========================================================== */
function renderLineChart(list) {
    const byDate = {};

    list.forEach(t => {
        byDate[t.date] = (byDate[t.date] || 0) + (t.type === "income" ? t.amount : -t.amount);
    });

    const labels = Object.keys(byDate).sort();
    const values = labels.map(d => byDate[d]);

    if (lineChart) lineChart.destroy();

    lineChart = new Chart(document.getElementById("lineChart"), {
        type: "line",
        data: {
            labels,
            datasets: [{
                label: "Tren Saldo Harian",
                data: values,
                borderColor: "#4a90e2",
                borderWidth: 2,
                tension: 0.3
            }]
        }
    });
}

/* ===========================================================
   EXPORT EXCEL
   =========================================================== */
function exportExcel() {
    const ws = XLSX.utils.json_to_sheet(transactions);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Kas");
    XLSX.writeFile(wb, "buku_kas.xlsx");
}

/* ===========================================================
   EXPORT PDF
   =========================================================== */
function exportPDF() {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();

    doc.text("Laporan Buku Kas Digital", 14, 10);

    doc.autoTable({
        startY: 20,
        head: [["Jenis", "Kategori", "Nominal", "Deskripsi", "Tanggal"]],
        body: transactions.map(t => [
            t.type,
            t.category,
            formatRupiah(t.amount),
            t.desc,
            t.date
        ])
    });

    doc.save("buku_kas.pdf");
}

/* ===========================================================
   TES FILTER + UI UPDATE
   =========================================================== */
function renderFiltered() {
    const list = applyFilter();
    updateDashboard(list);
    renderList(list);
    renderPieChart(list);
    renderLineChart(list);
    weeklyCountdown();
    monthlyCountdown();
}

/* ===========================================================
   INIT
   =========================================================== */
function update() {
    renderFiltered();
}

resetIfNeeded();
update();
