# MS Access 2016 — Ресторан (обслуживание клиентов)

## Файлы
- restaurant_access_2016_schema.sql — структура таблиц (DDL)
- restaurant_access_2016_sample_data.sql — тестовые данные (INSERT)

## Шаги развертывания
1. Создайте новую базу данных в Access 2016 (.accdb).
2. Вкладка «Создание» → «Конструктор запросов» → «Закрыть окно выбора таблиц» → «SQL».
3. Откройте `restaurant_access_2016_schema.sql` в любом редакторе, скопируйте SQL и выполните в Access (можно частями по таблицам, если потребуется).
4. Выполните `restaurant_access_2016_sample_data.sql` для заполнения тестовыми данными.
5. Настройте связи: «Инструменты базы данных» → «Схема данных (Relationships)»:
   - Соедините поля так:
     - Reservations.ClientID → Clients.ClientID
     - Reservations.TableID → DiningTables.TableID
     - Visits.ClientID → Clients.ClientID
     - Visits.TableID → DiningTables.TableID
     - Visits.EmployeeID → Employees.EmployeeID
     - Orders.VisitID → Visits.VisitID
     - OrderItems.OrderID → Orders.OrderID
     - OrderItems.ItemID → MenuItems.ItemID
     - Payments.VisitID → Visits.VisitID
     - Tickets.ClientID → Clients.ClientID
     - Tickets.VisitID → Visits.VisitID
     - Reviews.ClientID → Clients.ClientID
     - Reviews.VisitID → Visits.VisitID
   - Включите «Обеспечение целостности данных» (и каскад по желанию).

## Полезные запросы (пример)
-- Брони на сегодня
SELECT r.ReservationID, c.FullName, d.TableNumber, r.ReservedFor, r.Guests, r.Status
FROM Reservations AS r
INNER JOIN Clients AS c ON r.ClientID=c.ClientID
INNER JOIN DiningTables AS d ON r.TableID=d.TableID
WHERE DateValue(r.ReservedFor)=Date()
ORDER BY r.ReservedFor;

-- Открытые визиты
SELECT v.VisitID, c.FullName, d.TableNumber, v.CheckIn, e.FullName AS Waiter
FROM Visits AS v
INNER JOIN Clients AS c ON v.ClientID=c.ClientID
INNER JOIN DiningTables AS d ON v.TableID=d.TableID
LEFT JOIN Employees AS e ON v.EmployeeID=e.EmployeeID
WHERE v.Status='open';

-- Чек по визиту
SELECT v.VisitID, SUM(oi.Qty*oi.Price) AS Total
FROM Visits AS v
INNER JOIN Orders AS o ON o.VisitID=v.VisitID
INNER JOIN OrderItems AS oi ON oi.OrderID=o.OrderID
WHERE v.VisitID=[Введите ID визита]
GROUP BY v.VisitID;

-- ТОП клиентов по сумме
SELECT c.FullName, SUM(p.Amount) AS TotalPaid
FROM Clients AS c
INNER JOIN Visits AS v ON v.ClientID=c.ClientID
INNER JOIN Payments AS p ON p.VisitID=v.VisitID
GROUP BY c.FullName
ORDER BY SUM(p.Amount) DESC;

-- Открытые обращения
SELECT t.TicketID, c.FullName, t.Subject, t.CreatedAt, t.Status
FROM Tickets AS t
INNER JOIN Clients AS c ON c.ClientID=t.ClientID
WHERE t.Status<>'closed'
ORDER BY t.CreatedAt DESC;

## Рекомендации по формам/отчетам
- Форма «Клиент» + подформы «Брони», «Визиты», «Обращения», «Отзывы».
- Форма «Визит» + подформы «Заказы» и «Позиции заказа», раздел «Оплата».
- Отчёт «Чек по визиту» — по соответствующему запросу.

## Примечания по Access 2016
- Использованы имена без пробелов, в квадратных скобках — совместимо с Access 2016.
- Тип LONGTEXT соответствует «Длинный текст» (раньше MEMO).
- Значения по умолчанию лучше задавать в свойствах поля через конструктор (если DDL не применит). В данных примерах даты подставляются через Now()/DateAdd в INSERT.
