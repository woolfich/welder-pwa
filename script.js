import { openDatabase, addData, getAllData, updateData, deleteData, getData, OBJECT_STORES } from './indexeddb.js';

const appDiv = document.getElementById('app');

// Функция для отображения главного экрана
async function renderMainScreen() {
    appDiv.innerHTML = `
        <div class="main-screen">
            <h2>Список сварщиков</h2>
            <div class="add-welder-section">
                <input type="text" id="newWelderName" placeholder="Введите фамилию сварщика">
                <button id="addWelderBtn">Добавить сварщика</button>
            </div>
            <div id="welderList"></div>
            <div class="navigation-buttons">
                <button id="goToDbBtn">База данных</button>
                <button id="goToSummaryBtn">Сводка</button>
            </div>
        </div>
    `;

    const welderListDiv = document.getElementById('welderList');
    const addWelderBtn = document.getElementById('addWelderBtn');
    const newWelderNameInput = document.getElementById('newWelderName');
    const goToDbBtn = document.getElementById('goToDbBtn');
    const goToSummaryBtn = document.getElementById('goToSummaryBtn');

    // Загрузка и отображение сварщиков
    await loadWelders();

    addWelderBtn.addEventListener('click', async () => {
        const welderName = newWelderNameInput.value.trim();
        if (welderName) {
            await addWelder(welderName);
            newWelderNameInput.value = ''; // Очищаем поле ввода
            await loadWelders(); // Обновляем список сварщиков
        } else {
            alert('Пожалуйста, введите фамилию сварщика.');
        }
    });

    goToDbBtn.addEventListener('click', () => {
        renderScreen('database');
    });

    goToSummaryBtn.addEventListener('click', () => {
        renderScreen('summary');
    });
}

// Функция для отображения экрана Базы данных
async function renderDatabaseScreen() {
    appDiv.innerHTML = `
        <div class="database-screen">
            <h2>База данных изделий</h2>
            <div class="add-product-section">
                <input type="text" id="newProductArticle" placeholder="Введите артикул изделия">
                <button id="addProductBtn">Добавить изделие</button>
            </div>
            <div id="productList"></div>
            <button id="backToMainBtn">На главный экран</button>
        </div>
    `;

    const newProductArticleInput = document.getElementById('newProductArticle');
    const addProductBtn = document.getElementById('addProductBtn');
    const productListDiv = document.getElementById('productList');

    await loadProducts();

    addProductBtn.addEventListener('click', async () => {
        const article = newProductArticleInput.value.trim();
        if (article) {
            await addProduct(article);
            newProductArticleInput.value = '';
            await loadProducts();
        } else {
            alert('Пожалуйста, введите артикул изделия.');
        }
    });

    document.getElementById('backToMainBtn').addEventListener('click', () => {
        renderScreen('main');
    });
}

// Функция для отображения экрана Сводки
async function renderSummaryScreen() {
    appDiv.innerHTML = `
        <div class="summary-screen">
            <h2>Сводка по изделиям</h2>
            <div id="overallSummaryList"></div>
            <button id="backToMainBtn">На главный экран</button>
        </div>
    `;
    const overallSummaryListDiv = document.getElementById('overallSummaryList');
    await loadOverallSummary();

    document.getElementById('backToMainBtn').addEventListener('click', () => {
        renderScreen('main');
    });
}

// Функция для отображения карточки сварщика
async function renderWelderCardScreen(welderId) {
    const welder = await getData(OBJECT_STORES.WELDERS, welderId);
    if (!welder) {
        console.error('Сварщик не найден:', welderId);
        renderScreen('main');
        return;
    }

    appDiv.innerHTML = `
        <div class="welder-card-screen">
            <h2>Карточка сварщика: ${welder.name}</h2>
            <div class="input-record-section">
                <input type="text" id="productArticleInput" placeholder="Артикул изделия">
                <input type="number" id="productQuantityInput" placeholder="Количество" step="0.1">
                <button id="addRecordBtn">Добавить запись</button>
            </div>
            <h3>Личная сводка:</h3>
            <div id="welderRecordsList"></div>
            <button id="backToMainBtn">На главный экран</button>
        </div>
    `;

    const productArticleInput = document.getElementById('productArticleInput');
    const productQuantityInput = document.getElementById('productQuantityInput');
    const addRecordBtn = document.getElementById('addRecordBtn');
    const welderRecordsListDiv = document.getElementById('welderRecordsList');

    await loadWelderRecords(welderId);

    addRecordBtn.addEventListener('click', async () => {
        const article = productArticleInput.value.trim();
        const quantity = parseFloat(productQuantityInput.value);

        if (article && !isNaN(quantity) && quantity > 0) {
            await addProductRecord(welderId, article, quantity);
            productArticleInput.value = '';
            productQuantityInput.value = '';
            await loadWelderRecords(welderId);
            // После добавления/обновления записи, обновим и общую сводку
            await loadOverallSummary(); 
        } else {
            alert('Пожалуйста, введите корректные артикул и количество.');
        }
    });

    document.getElementById('backToMainBtn').addEventListener('click', () => {
        renderScreen('main');
    });

    // Автодополнение для артикула
    productArticleInput.addEventListener('input', async () => {
        const query = productArticleInput.value.trim().toLowerCase();
        if (query.length > 0) {
            const products = await getAllData(OBJECT_STORES.PRODUCTS);
            const suggestions = products.filter(p => p.article.toLowerCase().includes(query));
            // TODO: Реализовать отображение подсказок
            console.log('Подсказки:', suggestions.map(s => s.article));
        }
    });
}

// Функция для переключения экранов
async function renderScreen(screenName, data = null) {
    switch (screenName) {
        case 'main':
            await renderMainScreen();
            break;
        case 'database':
            await renderDatabaseScreen();
            break;
        case 'summary':
            await renderSummaryScreen();
            break;
        case 'welderCard':
            if (data && data.welderId) {
                await renderWelderCardScreen(data.welderId);
            } else {
                console.error('Не указан ID сварщика для карточки.');
                await renderMainScreen(); // Возвращаемся на главный экран
            }
            break;
        default:
            console.error('Неизвестный экран:', screenName);
            await renderMainScreen();
    }
}

// Функция для добавления нового сварщика в IndexedDB
async function addWelder(name) {
    try {
        const id = await addData(OBJECT_STORES.WELDERS, { name: name });
        console.log(`Сварщик ${name} добавлен с ID: ${id}`);
    } catch (error) {
        console.error('Ошибка при добавлении сварщика:', error);
        alert('Не удалось добавить сварщика. Пожалуйста, попробуйте еще раз.');
    }
}

// Функция для загрузки и отображения списка сварщиков
async function loadWelders() {
    const welderListDiv = document.getElementById('welderList');
    welderListDiv.innerHTML = ''; // Очищаем список перед загрузкой
    const welders = await getAllData(OBJECT_STORES.WELDERS);

    if (welders.length === 0) {
        welderListDiv.innerHTML = '<p>Сварщики не найдены. Добавьте первого сварщика!</p>';
    } else {
        welders.forEach(welder => {
            const welderItem = document.createElement('button');
            welderItem.className = 'welder-item';
            welderItem.textContent = welder.name;
            welderItem.dataset.id = welder.id; // Сохраняем ID сварщика
            welderItem.addEventListener('click', () => {
                renderScreen('welderCard', { welderId: welder.id });
            });
            welderListDiv.appendChild(welderItem);
        });
    }
}

// Функция для добавления нового изделия в IndexedDB
async function addProduct(article) {
    try {
        // Проверяем, существует ли уже такой артикул
        const existingProducts = await getAllData(OBJECT_STORES.PRODUCTS);
        const productExists = existingProducts.some(p => p.article.toLowerCase() === article.toLowerCase());

        if (productExists) {
            alert(`Изделие с артикулом "${article}" уже существует.`);
            return;
        }

        const id = await addData(OBJECT_STORES.PRODUCTS, { article: article });
        console.log(`Изделие ${article} добавлено с ID: ${id}`);
        alert(`Изделие "${article}" успешно добавлено.`);
    } catch (error) {
        console.error('Ошибка при добавлении изделия:', error);
        alert('Не удалось добавить изделие. Пожалуйста, попробуйте еще раз.');
    }
}

// Функция для загрузки и отображения списка изделий
async function loadProducts() {
    const productListDiv = document.getElementById('productList');
    productListDiv.innerHTML = ''; // Очищаем список перед загрузкой
    const products = await getAllData(OBJECT_STORES.PRODUCTS);

    if (products.length === 0) {
        productListDiv.innerHTML = '<p>Изделия не найдены. Добавьте первое изделие!</p>';
    } else {
        products.forEach(product => {
            const productItem = document.createElement('div');
            productItem.className = 'product-item';
            productItem.textContent = product.article;
            productItem.dataset.id = product.id; // Сохраняем ID изделия
            // TODO: Добавить функционал редактирования/удаления по долгому нажатию
            productListDiv.appendChild(productItem);
        });
    }
}

// Функция для добавления записи о работе сварщика
async function addProductRecord(welderId, article, quantity) {
    try {
        const now = new Date();
        const dateString = now.toISOString().split('T')[0]; // "2025-09-14"

        // Проверяем, есть ли уже запись для этого сварщика и артикула
        const records = await getAllData(OBJECT_STORES.WELDER_RECORDS);
        let existingRecord = records.find(r => r.welderId === welderId && r.article.toLowerCase() === article.toLowerCase());

        if (existingRecord) {
            // Обновляем существующую запись
            existingRecord.quantity += quantity;
            existingRecord.date = dateString;
            await updateData(OBJECT_STORES.WELDER_RECORDS, existingRecord);
            console.log(`Запись для сварщика ${welderId} и артикула ${article} обновлена.`);
        } else {
            // Добавляем новую запись
            await addData(OBJECT_STORES.WELDER_RECORDS, { welderId, article, quantity, date: dateString });
            console.log(`Новая запись для сварщика ${welderId} и артикула ${article} добавлена.`);
        }
        alert('Запись успешно добавлена/обновлена!');
    } catch (error) {
        console.error('Ошибка при добавлении/обновлении записи о работе сварщика:', error);
        alert('Не удалось добавить/обновить запись. Пожалуйста, попробуйте еще раз.');
    }
}

// Функция для загрузки и отображения личной сводки сварщика
async function loadWelderRecords(welderId) {
    const welderRecordsListDiv = document.getElementById('welderRecordsList');
    welderRecordsListDiv.innerHTML = ''; // Очищаем список перед загрузкой

    const allRecords = await getAllData(OBJECT_STORES.WELDER_RECORDS);
    const welderRecords = allRecords.filter(record => record.welderId === welderId);

    if (welderRecords.length === 0) {
        welderRecordsListDiv.innerHTML = '<p>Записей о работе пока нет.</p>';
    } else {
        // Сортировка по дате (последняя запись сверху)
        welderRecords.sort((a, b) => new Date(b.date) - new Date(a.date));

        welderRecords.forEach(record => {
            const recordItem = document.createElement('div');
            recordItem.className = 'welder-record-item';
            recordItem.textContent = `${record.article} ${record.quantity} шт ${record.date}`;
            
            // Переменные для отслеживания долгого нажатия
            let longPressTimer;
            let isLongPress = false;
            
            // Обработчик начала нажатия (мышь и тач)
            const startPress = (e) => {
                isLongPress = false;
                longPressTimer = setTimeout(() => {
                    isLongPress = true;
                    showContextMenu(record, welderId);
                }, 500); // 500ms для долгого нажатия
            };
            
            // Обработчик окончания нажатия
            const endPress = (e) => {
                clearTimeout(longPressTimer);
                if (!isLongPress) {
                    // Короткий клик - автозаполнение артикула
                    const productArticleInput = document.getElementById('productArticleInput');
                    if (productArticleInput) {
                        productArticleInput.value = record.article;
                        const productQuantityInput = document.getElementById('productQuantityInput');
                        if (productQuantityInput) {
                            productQuantityInput.focus();
                        }
                    }
                }
            };
            
            // Добавляем обработчики для мыши и тача
            recordItem.addEventListener('mousedown', startPress);
            recordItem.addEventListener('mouseup', endPress);
            recordItem.addEventListener('mouseleave', () => clearTimeout(longPressTimer));
            recordItem.addEventListener('touchstart', startPress);
            recordItem.addEventListener('touchend', endPress);
            
            welderRecordsListDiv.prepend(recordItem);
        });
    }
}

// Функция для показа контекстного меню при долгом нажатии
function showContextMenu(record, welderId) {
    // Создаем модальное окно
    const modal = document.createElement('div');
    modal.className = 'context-modal';
    modal.innerHTML = `
        <div class="context-modal-content">
            <h3>Артикул: ${record.article}</h3>
            <p>Текущее количество: ${record.quantity} шт</p>
            <div class="context-buttons">
                <button id="editQuantityBtn">Редактировать количество</button>
                <button id="showHistoryBtn">История за месяц</button>
                <button id="closeModalBtn">Закрыть</button>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    // Обработчики кнопок
    document.getElementById('editQuantityBtn').addEventListener('click', () => {
        editQuantity(record, welderId);
        document.body.removeChild(modal);
    });
    
    document.getElementById('showHistoryBtn').addEventListener('click', () => {
        showArticleHistory(record.article, welderId);
        document.body.removeChild(modal);
    });
    
    document.getElementById('closeModalBtn').addEventListener('click', () => {
        document.body.removeChild(modal);
    });
}

// Функция для редактирования количества записи
async function editQuantity(record, welderId) {
    // Создаем модальное окно для редактирования
    const modal = document.createElement('div');
    modal.className = 'context-modal';
    modal.innerHTML = `
        <div class="context-modal-content">
            <h3>Редактировать количество</h3>
            <p>Артикул: ${record.article}</p>
            <input type="number" id="editQuantityInput" value="${record.quantity}" step="0.1" min="0.1" style="width: 100%; padding: 8px; margin: 10px 0;">
            <div class="context-buttons">
                <button id="saveQuantityBtn">Сохранить</button>
                <button id="cancelEditBtn">Отмена</button>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    const editInput = document.getElementById('editQuantityInput');
    const saveBtn = document.getElementById('saveQuantityBtn');
    const cancelBtn = document.getElementById('cancelEditBtn');
    
    // Фокус на поле ввода
    editInput.focus();
    editInput.select();
    
    // Обработчик сохранения
    saveBtn.addEventListener('click', async () => {
        const newQuantity = parseFloat(editInput.value);
        if (!isNaN(newQuantity) && newQuantity > 0) {
            // Обновляем запись
            record.quantity = newQuantity;
            try {
                await updateData(OBJECT_STORES.WELDER_RECORDS, record);
                console.log(`Количество для записи ${record.id} обновлено до ${newQuantity}`);
                alert('Количество успешно обновлено!');
                
                // Обновляем отображение
                await loadWelderRecords(welderId);
                
                // Удаляем модальное окно
                document.body.removeChild(modal);
            } catch (error) {
                console.error('Ошибка при обновлении записи:', error);
                alert('Не удалось обновить запись. Попробуйте еще раз.');
            }
        } else {
            alert('Пожалуйста, введите корректное количество (больше 0).');
        }
    });
    
    // Обработчик отмены
    cancelBtn.addEventListener('click', () => {
        document.body.removeChild(modal);
    });
    
    // Закрытие по нажатию Enter в поле ввода
    editInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            saveBtn.click();
        }
    });
}
// Функция для отображения истории записи артикула за месяц
async function showArticleHistory(article, welderId) {
    // Создаем модальное окно для истории
    const modal = document.createElement('div');
    modal.className = 'context-modal';
    modal.innerHTML = `
        <div class="context-modal-content">
            <h3>История для: ${article}</h3>
            <div id="historyList" style="text-align: left; max-height: 300px; overflow-y: auto; margin: 10px 0;">
                <p>Загрузка истории...</p>
            </div>
            <div class="context-buttons">
                <button id="closeHistoryBtn">Закрыть</button>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    const historyList = document.getElementById('historyList');
    const closeBtn = document.getElementById('closeHistoryBtn');
    
    try {
        // Получаем все записи для этого сварщика и артикула
        const allRecords = await getAllData(OBJECT_STORES.WELDER_RECORDS);
        const articleRecords = allRecords.filter(record => 
            record.welderId === welderId && 
            record.article.toLowerCase() === article.toLowerCase()
        );
        
        if (articleRecords.length === 0) {
            historyList.innerHTML = '<p>История отсутствует.</p>';
            return;
        }
        
        // Сортируем по дате (новые сверху)
        articleRecords.sort((a, b) => new Date(b.date) - new Date(a.date));
        
        // Определяем текущий месяц и год для фильтрации
        const now = new Date();
        const currentMonth = now.getMonth();
        const currentYear = now.getFullYear();
        
        // Фильтруем записи только за текущий месяц
        const currentMonthRecords = articleRecords.filter(record => {
            const recordDate = new Date(record.date);
            return recordDate.getMonth() === currentMonth && 
                   recordDate.getFullYear() === currentYear;
        });
        
        if (currentMonthRecords.length === 0) {
            historyList.innerHTML = '<p>Нет записей за текущий месяц.</p>';
            return;
        }
        
        // Формируем HTML для истории
        let historyHTML = '<h4>Записи за текущий месяц:</h4>';
        currentMonthRecords.forEach(record => {
            const recordDate = new Date(record.date);
            const formattedDate = recordDate.toLocaleDateString('ru-RU');
            historyHTML += `<p>${formattedDate}: ${record.quantity} шт</p>`;
        });
        
        historyList.innerHTML = historyHTML;
        
    } catch (error) {
        console.error('Ошибка при загрузке истории:', error);
        historyList.innerHTML = '<p>Ошибка загрузки истории.</p>';
    }
    
    // Обработчик закрытия
    closeBtn.addEventListener('click', () => {
        document.body.removeChild(modal);
    });
}

// Функция для загрузки и отображения общей сводки по изделиям с группировкой по месяцам
async function loadOverallSummary() {
    const overallSummaryListDiv = document.getElementById('overallSummaryList');
    overallSummaryListDiv.innerHTML = ''; // Очищаем список перед загрузкой

    const allRecords = await getAllData(OBJECT_STORES.WELDER_RECORDS);
    
    if (allRecords.length === 0) {
        overallSummaryListDiv.innerHTML = '<p>Сводка пока пуста. Добавьте записи о работе сварщиков.</p>';
        return;
    }

    // Сортировка записей по дате (новые сверху)
    allRecords.sort((a, b) => new Date(b.date) - new Date(a.date));

    // Группировка записей по месяцам
    const recordsByMonth = {};
    const monthNames = ["Январь", "Февраль", "Март", "Апрель", "Май", "Июнь",
                        "Июль", "Август", "Сентябрь", "Октябрь", "Ноябрь", "Декабрь"];

    allRecords.forEach(record => {
        const recordDate = new Date(record.date);
        const year = recordDate.getFullYear();
        const monthIndex = recordDate.getMonth();
        const monthKey = `${year}-${monthIndex}`; // Уникальный ключ для месяца

        if (!recordsByMonth[monthKey]) {
            recordsByMonth[monthKey] = {
                displayName: `${monthNames[monthIndex]} ${year}`,
                records: []
            };
        }
        recordsByMonth[monthKey].records.push(record);
    });

    // Получаем отсортированные ключи месяцев в обратном порядке (новые сверху)
    const sortedMonthKeys = Object.keys(recordsByMonth).sort().reverse();

    // Для каждого месяца считаем сводку
    sortedMonthKeys.forEach((monthKey, index) => {
        const monthGroup = recordsByMonth[monthKey];
        
        // Создаем сводку для текущего месяца
        const summary = {};
        monthGroup.records.forEach(record => {
            const article = record.article.toLowerCase();
            if (summary[article]) {
                summary[article] += record.quantity;
            } else {
                summary[article] = record.quantity;
            }
        });

        // Добавляем заголовок месяца
        const monthHeader = document.createElement('div');
        monthHeader.className = 'month-header';
        monthHeader.textContent = monthGroup.displayName;
        monthHeader.style.fontWeight = 'bold';
        monthHeader.style.backgroundColor = '#d1ecf1';
        monthHeader.style.padding = '8px';
        monthHeader.style.marginTop = '10px';
        monthHeader.style.borderRadius = '4px';
        overallSummaryListDiv.appendChild(monthHeader);

        // Добавляем записи сводки месяца
        const sortedArticles = Object.keys(summary).sort();
        if (sortedArticles.length === 0) {
            const emptyItem = document.createElement('div');
            emptyItem.className = 'summary-item';
            emptyItem.textContent = 'Нет записей';
            emptyItem.style.backgroundColor = '#f8f9fa';
            emptyItem.style.padding = '8px';
            emptyItem.style.borderRadius = '4px';
            overallSummaryListDiv.appendChild(emptyItem);
        } else {
            sortedArticles.forEach(article => {
                const summaryItem = document.createElement('div');
                summaryItem.className = 'summary-item';
                summaryItem.textContent = `${article}: ${summary[article].toFixed(1)} шт`;
                overallSummaryListDiv.appendChild(summaryItem);
            });
        }
    });
}

// Инициализация приложения при загрузке DOM
document.addEventListener('DOMContentLoaded', async () => {
    try {
        await openDatabase();
        console.log('IndexedDB успешно открыта и готова к работе.');
        // После открытия БД, отображаем главный экран
        await renderScreen('main');
    } catch (error) {
        console.error('Ошибка при открытии IndexedDB:', error);
    }
});
