(function () {
  const STORAGE_KEY = 'expense_tracker_transactions_v1';

  const form = document.querySelector('#transactionForm');
  const nameInput = document.querySelector('#transactionName');
  const amountInput = document.querySelector('#transactionAmount');
  const typeInputs = document.getElementsByName('transactionType');
  const errorEl = document.querySelector('#error');
  const balanceEl = document.querySelector('#balance');
  const incomeEl = document.querySelector('#totalIncome');
  const expenseEl = document.querySelector('#totalExpense');
  const listEl = document.querySelector('#transactionList');
  const emptyHint = document.querySelector('#emptyHint');
  const clearBtn = document.querySelector('#clearBtn');

  let transactions = [];

  function loadTransactions() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) {
        localStorage.removeItem(STORAGE_KEY);
        return [];
      }
      return parsed.filter(function (item) {
        return (
          item &&
          typeof item.name === 'string' &&
          typeof item.amount === 'number' &&
          (item.type === 'income' || item.type === 'expense') &&
          item.id
        );
      });
    } catch (err) {
      localStorage.removeItem(STORAGE_KEY);
      return [];
    }
  }

  function saveTransactions() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(transactions));
    } catch (err) {
      showError('Warning: cannot save data locally.');
    }
  }

  function formatRupee(value) {
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(value);
  }

  function getSelectedType() {
    for (var i = 0; i < typeInputs.length; i++) {
      if (typeInputs[i].checked) return typeInputs[i].value;
    }
    return 'income';
  }

  function generateId() {
    if (window.crypto && crypto.randomUUID) return crypto.randomUUID();
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 9);
  }

  function showError(msg) {
    errorEl.textContent = msg || '';
  }

  function clearError() {
    showError('');
  }

  function escapeHtml(str) {
    return String(str)
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#39;');
  }

  function calculateTotals(items) {
    var income = 0;
    var expense = 0;
    for (var i = 0; i < items.length; i++) {
      if (items[i].type === 'income') income += items[i].amount;
      else expense += items[i].amount;
    }
    return { income: income, expense: expense, balance: income - expense };
  }

  function updateTotalsDisplay() {
    var totals = calculateTotals(transactions);
    balanceEl.textContent = formatRupee(totals.balance);
    incomeEl.textContent = '+' + formatRupee(totals.income);
    expenseEl.textContent = '-' + formatRupee(totals.expense);
  }

  function renderTransactionList() {
    listEl.innerHTML = '';

    if (transactions.length === 0) {
      emptyHint.style.display = 'block';
      return;
    } else {
      emptyHint.style.display = 'none';
    }

    var sorted = transactions.slice().sort(function (a, b) {
      return b.timestamp - a.timestamp;
    });

    for (var i = 0; i < sorted.length; i++) {
      var tx = sorted[i];

      var li = document.createElement('li');
      li.className = 'transaction-item';

      var left = document.createElement('div');
      left.className = 'tx-left';

      var nameDiv = document.createElement('div');
      nameDiv.innerHTML =
        '<p class="tx-name">' +
        escapeHtml(tx.name) +
        '</p><p class="tx-meta">' +
        new Date(tx.timestamp).toLocaleString() +
        '</p>';
      left.appendChild(nameDiv);

      var right = document.createElement('div');
      right.style.display = 'flex';
      right.style.alignItems = 'center';
      right.style.gap = '10px';

      var amountDiv = document.createElement('div');
      amountDiv.className = 'tx-amount ' + (tx.type === 'income' ? 'income' : 'expense');

      var sign = tx.type === 'expense' ? '-' : '+';
      amountDiv.textContent = sign + formatRupee(tx.amount);

      var deleteBtn = document.createElement('button');
      deleteBtn.className = 'delete-btn';
      deleteBtn.textContent = 'Delete';

      (function (id) {
        deleteBtn.addEventListener('click', function () {
          deleteTransaction(id);
        });
      })(tx.id);

      right.appendChild(amountDiv);
      right.appendChild(deleteBtn);

      li.appendChild(left);
      li.appendChild(right);

      listEl.appendChild(li);
    }
  }

  function addTransaction(event) {
    event.preventDefault();
    clearError();

    var name = nameInput.value.trim();
    var amount = parseFloat(amountInput.value);
    var type = getSelectedType();

    if (!name) {
      showError('Please enter a transaction name.');
      nameInput.focus();
      return;
    }
    if (!Number.isFinite(amount) || isNaN(amount)) {
      showError('Please enter a valid amount.');
      amountInput.focus();
      return;
    }
    if (Math.abs(amount) === 0) {
      showError('Amount must be non-zero.');
      amountInput.focus();
      return;
    }

    amount = Math.abs(amount);

    var tx = {
      id: generateId(),
      name: name,
      amount: amount,
      type: type,
      timestamp: Date.now()
    };

    transactions.push(tx);
    saveTransactions();
    renderTransactionList();
    updateTotalsDisplay();

    form.reset();
    nameInput.focus();
  }

  function deleteTransaction(id) {
    var ok = confirm('Delete this transaction?');
    if (!ok) return;

    var newList = [];
    for (var i = 0; i < transactions.length; i++) {
      if (transactions[i].id !== id) newList.push(transactions[i]);
    }
    transactions = newList;

    saveTransactions();
    renderTransactionList();
    updateTotalsDisplay();
  }

  function clearAllTransactions() {
    if (transactions.length === 0) return;
    var ok = confirm('Clear all transactions?');
    if (!ok) return;

    transactions = [];
    saveTransactions();
    renderTransactionList();
    updateTotalsDisplay();
  }

  function init() {
    transactions = loadTransactions();

    if (transactions.length === 0) {
      transactions = [
        { id: generateId(), name: 'Salary', amount: 25000, type: 'income', timestamp: Date.now() - 86400000 * 2 },
        { id: generateId(), name: 'Coffee', amount: 50, type: 'expense', timestamp: Date.now() - 86400000 }
      ];
      saveTransactions();
    }

    renderTransactionList();
    updateTotalsDisplay();

    form.addEventListener('submit', addTransaction);
    clearBtn.addEventListener('click', clearAllTransactions);
  }

  init();
})();
